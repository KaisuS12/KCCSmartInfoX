from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.database import get_db, ChatLog, Feedback
from rag.pipeline import query_rag

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class ChatRequest(BaseModel):
    question: str
    session_id: str = None


class FeedbackRequest(BaseModel):
    chat_log_id: int
    question: str
    answer: str
    rating: str   # "up" or "down"


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest, db: Session = Depends(get_db)):
    answer, is_answered = query_rag(body.question)

    log = ChatLog(
        question=body.question,
        answer=answer,
        is_answered=is_answered,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {"answer": answer, "is_answered": is_answered, "chat_log_id": log.id}


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
