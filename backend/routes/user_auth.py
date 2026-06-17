import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, UserAccount, LiveChat, LiveMessage
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.user_auth")


class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def _chat_summary(c: LiveChat, db: Session):
    msgs = db.query(LiveMessage).filter(LiveMessage.chat_id == c.id)
    last = msgs.order_by(LiveMessage.sent_at.desc()).first()
    return {
        "id":               c.id,
        "related_question": c.related_question,
        "status":           c.status,
        "created_at":       str(c.created_at),
        "closed_at":        str(c.closed_at) if c.closed_at else None,
        "message_count":    msgs.count(),
        "last_message_at":  str(last.sent_at) if last else None,
    }


@router.post("/user/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    data.email = data.email.strip().lower()
    if not data.email or not data.name.strip() or not data.password:
        raise HTTPException(status_code=400, detail="All fields are required")
    existing = db.query(UserAccount).filter(UserAccount.email == data.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = UserAccount(
        email=data.email,
        name=data.name.strip(),
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name, "role": "user"})
    logger.info("New user registered: %s", user.email)
    return {"token": token}


@router.post("/user/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    data.email = data.email.strip().lower()
    user = db.query(UserAccount).filter(UserAccount.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": str(user.id), "email": user.email, "name": user.name, "role": "user"})
    logger.info("User logged in: %s", user.email)
    return {"token": token}


@router.get("/user/me")
async def get_me(db: Session = Depends(get_db), user=Depends(get_current_user)):
    user_id = int(user["sub"])
    account = db.query(UserAccount).filter(UserAccount.id == user_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="User not found")
    return {"id": account.id, "email": account.email, "name": account.name}


@router.get("/user/live-chats")
async def get_user_chats(db: Session = Depends(get_db), user=Depends(get_current_user)):
    user_id = int(user["sub"])
    chats = (
        db.query(LiveChat)
        .filter(LiveChat.user_id == user_id)
        .order_by(LiveChat.created_at.desc())
        .all()
    )
    return [_chat_summary(c, db) for c in chats]


@router.get("/user/live-chats/{chat_id}/messages")
async def get_user_chat_messages(
    chat_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    user_id = int(user["sub"])
    chat = db.query(LiveChat).filter(LiveChat.id == chat_id, LiveChat.user_id == user_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    messages = (
        db.query(LiveMessage)
        .filter(LiveMessage.chat_id == chat_id)
        .order_by(LiveMessage.sent_at.asc())
        .all()
    )
    return {
        "chat": _chat_summary(chat, db),
        "messages": [
            {"id": m.id, "sender": m.sender, "content": m.content, "sent_at": str(m.sent_at)}
            for m in messages
        ],
    }
