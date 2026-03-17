import os
import io
import csv
import logging
import shutil
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.database import get_db, AdminUser, ChatLog, KnowledgeDoc, Subscriber, Feedback, Announcement
from utils.auth import verify_password, create_access_token, hash_password, get_current_admin
from rag.ingestion import ingest_pdf, ingest_docx, ingest_txt, ingest_text, delete_document

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.admin")
limiter = Limiter(key_func=get_remote_address)

DOCS_DIR = "./knowledge_base/documents"


class LoginRequest(BaseModel):
    username: str
    password: str


class SetupRequest(BaseModel):
    username: str
    password: str


class TextIngestion(BaseModel):
    source: str = "manual"
    content: str


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    publish_at: Optional[str] = None   # ISO datetime string or null
    expires_at: Optional[str] = None


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/admin/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == request.username).first()
    if not admin or not verify_password(request.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": admin.username})
    return {"token": token}


@router.post("/admin/setup")
async def setup(request: SetupRequest, db: Session = Depends(get_db)):
    if db.query(AdminUser).first():
        raise HTTPException(status_code=400, detail="Admin already exists")
    db.add(AdminUser(username=request.username, password_hash=hash_password(request.password)))
    db.commit()
    return {"message": "Admin account created"}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/admin/analytics")
async def analytics(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    total_questions   = db.query(ChatLog).count()
    unanswered        = db.query(ChatLog).filter(ChatLog.is_answered == False).count()
    total_subscribers = db.query(Subscriber).count()
    total_documents   = db.query(KnowledgeDoc).count()
    thumbs_up         = db.query(Feedback).filter(Feedback.rating == "up").count()
    thumbs_down       = db.query(Feedback).filter(Feedback.rating == "down").count()

    # Questions per day — last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    daily = (
        db.query(func.date(ChatLog.created_at).label("date"), func.count().label("count"))
        .filter(ChatLog.created_at >= seven_days_ago)
        .group_by(func.date(ChatLog.created_at))
        .all()
    )

    # Top 10 most asked questions
    top_questions = (
        db.query(ChatLog.question, func.count(ChatLog.question).label("count"))
        .group_by(ChatLog.question)
        .order_by(func.count(ChatLog.question).desc())
        .limit(10)
        .all()
    )

    unanswered_qs = (
        db.query(ChatLog)
        .filter(ChatLog.is_answered == False)
        .order_by(ChatLog.created_at.desc())
        .all()
    )

    # Thumbs down questions (most useful for improving)
    bad_answers = (
        db.query(Feedback)
        .filter(Feedback.rating == "down")
        .order_by(Feedback.created_at.desc())
        .limit(20)
        .all()
    )

    answered = total_questions - unanswered
    answer_rate = round((answered / total_questions * 100), 1) if total_questions else 0

    return {
        "total_questions":   total_questions,
        "answered":          answered,
        "unanswered":        unanswered,
        "answer_rate":       answer_rate,
        "total_subscribers": total_subscribers,
        "total_documents":   total_documents,
        "thumbs_up":         thumbs_up,
        "thumbs_down":       thumbs_down,
        "daily_data":        [{"date": str(r.date), "count": r.count} for r in daily],
        "top_questions":     [{"question": r.question, "count": r.count} for r in top_questions],
        "unanswered_questions": [
            {"id": q.id, "question": q.question, "created_at": str(q.created_at)}
            for q in unanswered_qs
        ],
        "bad_answers": [
            {"id": f.id, "question": f.question, "answer": f.answer, "created_at": str(f.created_at)}
            for f in bad_answers
        ],
    }


@router.get("/admin/analytics/unanswered/export")
async def export_unanswered(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    rows = (
        db.query(ChatLog)
        .filter(ChatLog.is_answered == False)
        .order_by(ChatLog.created_at.desc())
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Question", "Date"])
    for q in rows:
        writer.writerow([q.id, q.question, str(q.created_at)])

    output.seek(0)
    filename = f"unanswered_questions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ── Knowledge Base ────────────────────────────────────────────────────────────

@router.post("/admin/knowledge/upload")
@limiter.limit("30/minute")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    os.makedirs(DOCS_DIR, exist_ok=True)
    filepath = os.path.join(DOCS_DIR, file.filename)

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".txt"):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported.")

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    doc = KnowledgeDoc(filename=file.filename, filepath=filepath)
    db.add(doc)
    db.commit()

    try:
        if ext == ".pdf":
            chunks = ingest_pdf(filepath, file.filename)
        elif ext == ".docx":
            chunks = ingest_docx(filepath, file.filename)
        else:
            chunks = ingest_txt(filepath, file.filename)
        logger.info("Indexed %s chunks from file: %s", chunks, file.filename)
        message = f"Uploaded and indexed {chunks} chunks."
    except Exception as e:
        logger.error("Indexing failed for %s: %s", file.filename, str(e), exc_info=True)
        message = f"File saved but indexing failed: {str(e)}"

    return {"message": message, "filename": file.filename}


@router.post("/admin/knowledge/upload-bulk")
@limiter.limit("10/minute")
async def upload_bulk(
    request: Request,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    os.makedirs(DOCS_DIR, exist_ok=True)
    results = []

    for file in files:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in (".pdf", ".docx", ".txt"):
            results.append({"filename": file.filename, "status": "skipped", "message": "Unsupported type"})
            continue

        filepath = os.path.join(DOCS_DIR, file.filename)
        with open(filepath, "wb") as f:
            shutil.copyfileobj(file.file, f)

        doc = KnowledgeDoc(filename=file.filename, filepath=filepath)
        db.add(doc)
        db.commit()

        try:
            if ext == ".pdf":
                chunks = ingest_pdf(filepath, file.filename)
            elif ext == ".docx":
                chunks = ingest_docx(filepath, file.filename)
            else:
                chunks = ingest_txt(filepath, file.filename)
            results.append({"filename": file.filename, "status": "ok", "message": f"{chunks} chunks indexed"})
        except Exception as e:
            results.append({"filename": file.filename, "status": "error", "message": str(e)})

    return {"results": results}


@router.post("/admin/knowledge/text")
async def add_text(
    data: TextIngestion,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    chunks = ingest_text(data.content, data.source)
    db.add(KnowledgeDoc(filename=data.source, filepath="text://manual"))
    db.commit()
    return {"message": f"Added {chunks} chunks from text.", "source": data.source}


@router.get("/admin/knowledge")
async def get_documents(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    return db.query(KnowledgeDoc).order_by(KnowledgeDoc.uploaded_at.desc()).all()


@router.delete("/admin/knowledge/{id}")
async def remove_document(
    id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    doc = db.query(KnowledgeDoc).filter(KnowledgeDoc.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")

    delete_document(doc.filename)
    if os.path.exists(doc.filepath):
        os.remove(doc.filepath)

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}


# ── Subscribers ───────────────────────────────────────────────────────────────

@router.get("/admin/subscribers")
async def get_subscribers(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    subs = db.query(Subscriber).order_by(Subscriber.created_at.desc()).all()
    return [{"id": s.id, "email": s.email, "created_at": str(s.created_at)} for s in subs]


# ── Announcements (admin) ──────────────────────────────────────────────────────

@router.post("/admin/announcements")
async def create_announcement(
    data: AnnouncementCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    publish_at = datetime.fromisoformat(data.publish_at) if data.publish_at else None
    expires_at = datetime.fromisoformat(data.expires_at) if data.expires_at else None

    ann = Announcement(
        title=data.title,
        content=data.content,
        publish_at=publish_at,
        expires_at=expires_at,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return {"message": "Announcement created", "id": ann.id}


@router.delete("/admin/announcements/{id}")
async def delete_announcement(
    id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    ann = db.query(Announcement).filter(Announcement.id == id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ann)
    db.commit()
    return {"message": "Deleted"}
