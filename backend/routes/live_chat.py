import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, LiveChat, LiveMessage
from utils.auth import get_current_admin, get_current_user

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.live_chat")


def detect_device(user_agent: str) -> str:
    ua = (user_agent or "").lower()
    if "ipad" in ua or "tablet" in ua:
        return "Tablet"
    if any(x in ua for x in ["mobile", "android", "iphone"]):
        return "Mobile"
    return "Desktop"


def _online_status(last_seen: Optional[datetime]) -> str:
    if not last_seen:
        return "offline"
    delta = (datetime.utcnow() - last_seen).total_seconds()
    if delta < 30:
        return "online"
    if delta < 120:
        return "away"
    return "offline"


class StartChatRequest(BaseModel):
    related_question: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


def _msg_dict(m: LiveMessage):
    return {
        "id":      m.id,
        "chat_id": m.chat_id,
        "sender":  m.sender,
        "content": m.content,
        "sent_at": str(m.sent_at),
    }


def _chat_dict(c: LiveChat, db: Session):
    msgs = db.query(LiveMessage).filter(LiveMessage.chat_id == c.id)
    last = msgs.order_by(LiveMessage.sent_at.desc()).first()
    return {
        "id":               c.id,
        "user_name":        c.user_name,
        "user_email":       c.user_email,
        "related_question": c.related_question,
        "status":           c.status,
        "device_type":      c.device_type,
        "online_status":    _online_status(c.last_seen),
        "created_at":       str(c.created_at),
        "closed_at":        str(c.closed_at) if c.closed_at else None,
        "message_count":    msgs.count(),
        "last_message_at":  str(last.sent_at) if last else None,
    }


# ── Public (user) ─────────────────────────────────────────────────────────────

@router.post("/live-chat/start")
async def start_chat(
    data: StartChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    ua = request.headers.get("User-Agent", "")
    chat = LiveChat(
        user_id=int(user["sub"]),
        user_name=user["name"],
        user_email=user["email"],
        related_question=data.related_question,
        device_type=detect_device(ua),
        last_seen=datetime.utcnow(),
    )
    db.add(chat)
    db.commit()
    db.refresh(chat)

    greeting = LiveMessage(
        chat_id=chat.id,
        sender="admin",
        content="You're now connected. An admin will reply shortly.",
    )
    db.add(greeting)
    db.commit()

    logger.info("Live chat started: id=%s user=%s", chat.id, chat.user_name)
    return {"chat_id": chat.id, "user_name": chat.user_name, "status": chat.status}


@router.post("/live-chat/{chat_id}/message")
async def user_send_message(chat_id: str, data: SendMessageRequest, db: Session = Depends(get_db)):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if chat.status != "active":
        raise HTTPException(status_code=400, detail="Chat session is closed")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = LiveMessage(chat_id=chat_id, sender="user", content=data.content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _msg_dict(msg)


@router.get("/live-chat/{chat_id}/messages")
async def user_poll_messages(
    chat_id: str,
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    messages = (
        db.query(LiveMessage)
        .filter(LiveMessage.chat_id == chat_id, LiveMessage.id > offset)
        .order_by(LiveMessage.sent_at.asc())
        .all()
    )
    return {
        "messages":     [_msg_dict(m) for m in messages],
        "chat_status":  chat.status,
        "admin_opened": chat.admin_opened_at is not None,
    }


@router.put("/live-chat/{chat_id}/heartbeat")
async def user_heartbeat(chat_id: str, db: Session = Depends(get_db)):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id, LiveChat.status == "active").first()
    if chat:
        chat.last_seen = datetime.utcnow()
        db.commit()
    return {"ok": True}


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/live-chats")
async def admin_list_chats(
    status: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    q = db.query(LiveChat)
    if status:
        q = q.filter(LiveChat.status == status)
    chats = q.order_by(LiveChat.created_at.desc()).all()
    return [_chat_dict(c, db) for c in chats]


@router.get("/admin/live-chats/{chat_id}/messages")
async def admin_get_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    if not chat.admin_opened_at:
        chat.admin_opened_at = datetime.utcnow()
        db.commit()

    messages = (
        db.query(LiveMessage)
        .filter(LiveMessage.chat_id == chat_id)
        .order_by(LiveMessage.sent_at.asc())
        .all()
    )
    return {
        "chat":     _chat_dict(chat, db),
        "messages": [_msg_dict(m) for m in messages],
    }


@router.post("/admin/live-chats/{chat_id}/message")
async def admin_send_message(
    chat_id: str,
    data: SendMessageRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")
    if chat.status != "active":
        raise HTTPException(status_code=400, detail="Chat session is closed")
    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = LiveMessage(chat_id=chat_id, sender="admin", content=data.content.strip())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    logger.info("Admin replied to chat id=%s", chat_id)
    return _msg_dict(msg)


@router.put("/admin/live-chats/{chat_id}/close")
async def admin_close_chat(
    chat_id: str,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat session not found")

    chat.status    = "closed"
    chat.closed_at = datetime.utcnow()
    db.commit()
    logger.info("Admin closed chat id=%s", chat_id)
    return {"message": "Chat closed", "chat_id": chat_id}
