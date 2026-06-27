import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, LiveChat, LiveMessage
from utils.auth import get_current_admin, get_current_user
from utils.audit import resolve_actor, log_activity
from routes.settings import is_chat_available

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


class FeedbackRequest(BaseModel):
    rating: int          # 1-5
    feedback_text: Optional[str] = None


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
        "opened_by":        c.opened_by,
    }


# ── Public (user) ─────────────────────────────────────────────────────────────

@router.post("/live-chat/start")
async def start_chat(
    data: StartChatRequest,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    avail = is_chat_available(db)
    if not avail["is_available"]:
        raise HTTPException(status_code=503, detail=avail.get("chat_offline_message", "Live chat is currently unavailable."))

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

    # Queue position + estimated wait (only relevant while waiting)
    if not chat.admin_opened_at and chat.status == "active":
        waiting_before = db.query(LiveChat).filter(
            LiveChat.status == "active",
            LiveChat.admin_opened_at == None,
            LiveChat.created_at < chat.created_at,
            LiveChat.id != chat_id,
        ).count()
        queue_position = waiting_before + 1
        recent = db.query(LiveChat).filter(
            LiveChat.admin_opened_at != None,
        ).order_by(LiveChat.created_at.desc()).limit(20).all()
        times = [
            min(15, (c.admin_opened_at - c.created_at).total_seconds() / 60)
            for c in recent if c.admin_opened_at and c.created_at
        ]
        avg_min = min(10, max(5, int(sum(times) / len(times)))) if times else 5
        estimated_wait = queue_position * avg_min
    else:
        queue_position = 0
        estimated_wait = 0

    return {
        "messages":              [_msg_dict(m) for m in messages],
        "chat_status":           chat.status,
        "admin_opened":          chat.admin_opened_at is not None,
        "opened_by":             chat.opened_by,
        "queue_position":        queue_position,
        "estimated_wait_minutes": estimated_wait,
    }


@router.post("/live-chat/{chat_id}/feedback")
async def submit_feedback(chat_id: str, data: FeedbackRequest, db: Session = Depends(get_db)):
    if not 1 <= data.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if chat.rating is not None:
        raise HTTPException(status_code=400, detail="Feedback already submitted")
    chat.rating = data.rating
    chat.feedback_text = data.feedback_text
    db.commit()
    logger.info("Feedback submitted for chat %s: %d stars", chat_id, data.rating)
    return {"message": "Thank you for your feedback!"}


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
    chats = q.order_by(LiveChat.created_at.asc()).all()
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

    my_name, my_role = resolve_actor(admin, db)

    # If already claimed by someone else, only admin can override
    if chat.opened_by and chat.opened_by != my_name and my_role == "staff":
        raise HTTPException(
            status_code=403,
            detail=f"This chat is already being handled by {chat.opened_by}",
        )

    if not chat.admin_opened_at:
        chat.admin_opened_at = datetime.utcnow()
        chat.opened_by = my_name
        log_activity(db, my_name, my_role, "chat_opened", "live_chat", chat_id,
                     f"Opened chat with {chat.user_name}")
        db.add(LiveMessage(
            chat_id=chat.id,
            sender="admin",
            content=f"Hi {chat.user_name}! 👋 {my_name} is here and will help with your concern and inquiries.",
        ))
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

    my_name, my_role = resolve_actor(admin, db)

    # Staff can only reply to their own claimed chats
    if my_role == "staff" and chat.opened_by and chat.opened_by != my_name:
        raise HTTPException(status_code=403, detail="You are not the handler of this chat")

    msg = LiveMessage(chat_id=chat_id, sender="admin", content=data.content.strip())
    db.add(msg)
    log_activity(db, my_name, my_role, "chat_message_sent", "live_chat", chat_id,
                 f"Sent message in chat with {chat.user_name}")
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

    my_name, my_role = resolve_actor(admin, db)
    chat.status    = "closed"
    chat.closed_at = datetime.utcnow()
    chat.closed_by = my_name
    log_activity(db, my_name, my_role, "chat_closed", "live_chat", chat_id,
                 f"Closed chat with {chat.user_name}")
    db.commit()
    logger.info("Admin closed chat id=%s", chat_id)
    return {"message": "Chat closed", "chat_id": chat_id}
