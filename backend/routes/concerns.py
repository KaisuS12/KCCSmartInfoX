import os
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from models.database import get_db, Concern
from utils.auth import get_current_admin
from notifications.service import send_concern_notification, send_concern_reply

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.concerns")


class ConcernCreate(BaseModel):
    name: str
    email: str
    message: str
    related_question: Optional[str] = None


class ConcernReply(BaseModel):
    reply: str


def _concern_dict(c: Concern):
    return {
        "id":               c.id,
        "name":             c.name,
        "email":            c.email,
        "message":          c.message,
        "related_question": c.related_question,
        "status":           c.status,
        "admin_reply":      c.admin_reply,
        "created_at":       str(c.created_at),
        "replied_at":       str(c.replied_at) if c.replied_at else None,
    }


# ── Public ────────────────────────────────────────────────────────────────────

@router.post("/concerns")
async def submit_concern(data: ConcernCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    concern = Concern(
        name=data.name.strip(),
        email=data.email.strip(),
        message=data.message.strip(),
        related_question=data.related_question,
    )
    db.add(concern)
    db.commit()
    db.refresh(concern)

    admin_email = os.getenv("EMAIL_USER", "")
    if admin_email:
        background_tasks.add_task(
            send_concern_notification,
            admin_email, data.name, data.email, data.message, data.related_question or ""
        )

    logger.info("New concern submitted by %s <%s>", data.name, data.email)
    return {"message": "Concern submitted successfully", "id": concern.id}


# ── Admin ─────────────────────────────────────────────────────────────────────

@router.get("/admin/concerns")
async def list_concerns(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concerns = db.query(Concern).order_by(Concern.created_at.asc()).all()
    return [_concern_dict(c) for c in concerns]


@router.put("/admin/concerns/{id}/reply")
async def reply_concern(
    id: int,
    data: ConcernReply,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    concern = db.query(Concern).filter(Concern.id == id).first()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")

    concern.admin_reply = data.reply.strip()
    concern.status      = "resolved"
    concern.replied_at  = datetime.utcnow()
    db.commit()

    background_tasks.add_task(
        send_concern_reply,
        concern.email, concern.name, concern.message, data.reply
    )

    logger.info("Replied to concern id=%s for %s", id, concern.email)
    return _concern_dict(concern)


@router.put("/admin/concerns/{id}/resolve")
async def resolve_concern(id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concern = db.query(Concern).filter(Concern.id == id).first()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    concern.status     = "resolved"
    concern.replied_at = datetime.utcnow()
    db.commit()
    return _concern_dict(concern)


@router.delete("/admin/concerns/{id}")
async def delete_concern(id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    concern = db.query(Concern).filter(Concern.id == id).first()
    if not concern:
        raise HTTPException(status_code=404, detail="Concern not found")
    db.delete(concern)
    db.commit()
    return {"message": "Deleted"}
