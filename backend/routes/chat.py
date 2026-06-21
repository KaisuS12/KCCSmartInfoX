import asyncio
import socket
from datetime import date
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from models.database import get_db, ChatLog, Feedback
from rag.pipeline import query_rag

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class ChatRequest(BaseModel):
    question: str
    history: list = []
    lang: str = "en"   # "en" or "fil"


class FeedbackRequest(BaseModel):
    chat_log_id: int
    question: str
    answer: str
    rating: str   # "up" or "down"


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest, db: Session = Depends(get_db)):
    loop = asyncio.get_event_loop()
    answer, is_answered, sources, followups = await loop.run_in_executor(
        None, lambda: query_rag(body.question, history=body.history, lang=body.lang)
    )

    log = ChatLog(
        question=body.question,
        answer=answer,
        is_answered=is_answered,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "answer": answer,
        "is_answered": is_answered,
        "chat_log_id": log.id,
        "sources": sources,
        "followups": followups,
    }


@router.get("/stats")
async def public_stats(db: Session = Depends(get_db)):
    total = db.query(ChatLog).count()
    answered = db.query(ChatLog).filter(ChatLog.is_answered == True).count()
    rate = round(answered / total * 100) if total else 0
    today_count = db.query(ChatLog).filter(
        func.date(ChatLog.created_at) == date.today()
    ).count()
    return {"total": total, "answer_rate": rate, "today": today_count}


@router.get("/local-ip")
async def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return {"ip": ip}
    except Exception:
        return {"ip": "localhost"}


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
