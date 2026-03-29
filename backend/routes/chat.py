from fastapi import APIRouter, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.database import get_db, ChatLog, Feedback, User
from rag.pipeline import query_rag
from utils.auth import get_current_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer(auto_error=False)


class ChatRequest(BaseModel):
    question: str
    history: list = []


class FeedbackRequest(BaseModel):
    chat_log_id: int
    question: str
    answer: str
    rating: str   # "up" or "down"


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    body: ChatRequest,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
):
    # Resolve logged-in user if token provided (optional)
    user = None
    user_profile = None
    if credentials:
        try:
            payload = get_current_user(credentials)
            user = db.query(User).filter(User.email == payload["sub"]).first()
            if user:
                user_profile = {
                    "name": user.name,
                    "course": user.course,
                    "year_level": user.year_level,
                }
        except Exception:
            pass  # Anonymous fallback

    answer, is_answered, sources = query_rag(
        body.question,
        history=body.history,
        user_profile=user_profile,
    )

    log = ChatLog(
        question=body.question,
        answer=answer,
        is_answered=is_answered,
        user_id=user.id if user else None,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "answer": answer,
        "is_answered": is_answered,
        "chat_log_id": log.id,
        "sources": sources,
    }


@router.post("/chat/feedback")
async def submit_feedback(body: FeedbackRequest, db: Session = Depends(get_db)):
    fb = Feedback(
        chat_log_id=body.chat_log_id,
        question=body.question,
        answer=body.answer,
        rating=body.rating,
    )
    db.add(fb)
    db.commit()
    return {"message": "Feedback recorded"}
