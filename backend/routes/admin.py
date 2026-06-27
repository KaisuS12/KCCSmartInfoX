import os
import io
import csv
import json
import logging
import shutil
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, cast, Integer
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

from models.database import get_db, AdminUser, StaffAccount, ChatLog, KnowledgeDoc, Subscriber, Feedback, AdminLoginLog, ActivityLog
from utils.auth import verify_password, create_access_token, hash_password, get_current_admin
from utils.audit import log_activity
from rag.ingestion import ingest_pdf, ingest_docx, ingest_txt, ingest_text, delete_document
from groq import Groq

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


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class LogoutAction(BaseModel):
    action: str = "logout"  # "logout" | "timeout"


class TextIngestion(BaseModel):
    source: str = "manual"
    content: str

class TextUpdate(BaseModel):
    source: str
    content: str


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/admin/login")
@limiter.limit("5/minute")
async def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")[:255]

    # Check admin table first
    admin = db.query(AdminUser).filter(AdminUser.username == data.username).first()
    if admin and verify_password(data.password, admin.password_hash):
        db.add(AdminLoginLog(username=admin.username, action="success", ip_address=ip, user_agent=ua))
        db.commit()
        log_activity(db, "Admin", "admin", "login", detail=f"Login from {ip}")
        db.commit()
        token = create_access_token({"sub": admin.username, "role": "admin"})
        return {"token": token, "role": "admin", "permissions": [], "display_name": "Admin"}

    # Check staff table
    staff = db.query(StaffAccount).filter(StaffAccount.username == data.username).first()
    if staff and staff.is_active and verify_password(data.password, staff.password_hash):
        db.add(AdminLoginLog(username=staff.username, action="success", ip_address=ip, user_agent=ua))
        display_name = staff.full_name or staff.username
        log_activity(db, display_name, "staff", "login", detail=f"Login from {ip}")
        db.commit()
        perms = json.loads(staff.permissions or "[]")
        token = create_access_token({"sub": staff.username, "role": "staff", "permissions": perms})
        return {"token": token, "role": "staff", "permissions": perms, "display_name": display_name}

    db.add(AdminLoginLog(username=data.username, action="failed", ip_address=ip, user_agent=ua))
    db.commit()
    raise HTTPException(status_code=401, detail="Invalid credentials")


@router.get("/admin/login-logs")
async def get_login_logs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    logs = db.query(AdminLoginLog).order_by(AdminLoginLog.created_at.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "username": l.username,
            "action": l.action,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "created_at": l.created_at.isoformat() + "Z",
        }
        for l in logs
    ]


@router.get("/admin/activity-logs")
async def get_activity_logs(
    actor: str = None,
    action: str = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    q = db.query(ActivityLog).order_by(ActivityLog.created_at.desc())
    if actor:
        q = q.filter(ActivityLog.actor == actor)
    if action:
        q = q.filter(ActivityLog.action == action)
    logs = q.limit(min(limit, 200)).all()
    return [
        {
            "id":          l.id,
            "actor":       l.actor,
            "actor_role":  l.actor_role,
            "action":      l.action,
            "target_type": l.target_type,
            "target_id":   l.target_id,
            "detail":      l.detail,
            "created_at":  l.created_at.isoformat() + "Z",
        }
        for l in logs
    ]


@router.post("/admin/logout-log")
async def logout_log(data: LogoutAction, request: Request, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    ip = request.client.host if request.client else "unknown"
    ua = request.headers.get("user-agent", "")[:255]
    username = admin.get("sub", "admin") if isinstance(admin, dict) else str(admin)
    role = admin.get("role", "admin") if isinstance(admin, dict) else "admin"
    # Resolve display name for activity log
    if role == "staff":
        staff_acc = db.query(StaffAccount).filter(StaffAccount.username == username).first()
        display_name = staff_acc.full_name or username if staff_acc else username
    else:
        display_name = "Admin"
    db.add(AdminLoginLog(username=username, action=data.action, ip_address=ip, user_agent=ua))
    log_activity(db, display_name, role, data.action, detail=f"From {ip}")
    db.commit()
    return {"ok": True}


@router.post("/admin/setup")
async def setup(request: SetupRequest, db: Session = Depends(get_db)):
    if db.query(AdminUser).first():
        raise HTTPException(status_code=400, detail="Admin already exists")
    db.add(AdminUser(username=request.username, password_hash=hash_password(request.password)))
    db.commit()
    return {"message": "Admin account created"}


# ── Settings ──────────────────────────────────────────────────────────────────

@router.put("/admin/change-password")
async def change_password(
    data: PasswordChange,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # get_current_admin returns the full JWT payload dict e.g. {"sub": "admin", "exp": ...}
    username = admin["sub"]
    admin_user = db.query(AdminUser).filter(AdminUser.username == username).first()
    if not admin_user:
        raise HTTPException(status_code=404, detail="Admin not found")
    if not verify_password(data.current_password, admin_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    admin_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed successfully"}


# ── Analytics ─────────────────────────────────────────────────────────────────

@router.get("/admin/analytics")
async def analytics(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    total_questions   = db.query(ChatLog).count()
    unanswered        = db.query(ChatLog).filter(ChatLog.is_answered == False).count()
    total_subscribers = db.query(Subscriber).count()
    total_documents   = db.query(KnowledgeDoc).count()
    thumbs_up         = db.query(Feedback).filter(Feedback.rating == "up").count()
    thumbs_down       = db.query(Feedback).filter(Feedback.rating == "down").count()

    # Questions per day — last 14 days, zero-filled so the chart line is continuous
    fourteen_days_ago = datetime.utcnow() - timedelta(days=14)
    daily_rows = (
        db.query(
            func.date(ChatLog.created_at).label("date"),
            func.count().label("count"),
            func.sum(cast(ChatLog.is_answered == False, Integer)).label("unanswered_count"),
        )
        .filter(ChatLog.created_at >= fourteen_days_ago)
        .group_by(func.date(ChatLog.created_at))
        .all()
    )
    by_date = {str(r.date): r for r in daily_rows}
    daily = []
    for i in range(13, -1, -1):
        d = (datetime.utcnow() - timedelta(days=i)).date()
        row = by_date.get(str(d))
        total = row.count if row else 0
        unans = (row.unanswered_count or 0) if row else 0
        daily.append({
            "date": str(d),
            "count": total,
            "answered": total - unans,
            "unanswered": unans,
        })

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
        "daily_data":        daily,
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
async def export_chatlogs(token: str = None, filter: str = "unanswered", db: Session = Depends(get_db)):
    from jose import JWTError, jwt as _jwt
    import os as _os
    _key = _os.getenv("SECRET_KEY", "kccsmartinfox-change-this-in-production")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        _jwt.decode(token, _key, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    query = db.query(ChatLog)
    if filter == "answered":
        query = query.filter(ChatLog.is_answered == True)
    elif filter == "unanswered":
        query = query.filter(ChatLog.is_answered == False)
    rows = query.order_by(ChatLog.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Question", "Answer", "Status", "Date"])
    for q in rows:
        writer.writerow([
            q.id,
            q.question,
            q.answer or "",
            "Answered" if q.is_answered else "Unanswered",
            str(q.created_at)
        ])

    output.seek(0)
    label = filter if filter in ("answered", "unanswered") else "all"
    filename = f"chatlogs_{label}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.post("/admin/analytics/faq-suggestions")
async def generate_faq_suggestions(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    unanswered = (
        db.query(ChatLog)
        .filter(ChatLog.is_answered == False)
        .order_by(ChatLog.created_at.desc())
        .limit(50)
        .all()
    )
    if not unanswered:
        return {"suggestions": [], "based_on": 0}

    questions_text = "\n".join([f"- {q.question}" for q in unanswered])

    prompt = f"""You are a knowledge base assistant for Kabankalan Catholic College (KCC).

Students asked these questions that the AI chatbot could not answer:
{questions_text}

Generate 4 knowledge base entries that would help answer these questions. Each entry should be:
- A complete, accurate-sounding school information paragraph
- Written as official school information (the admin will verify and edit before adding)
- Practical and specific to a Philippine Catholic college setting

Format EXACTLY like this (repeat for each entry):
TOPIC: [short topic name]
CONTENT: [2-4 sentences of helpful school information content]

Only output the 4 entries in that format. Nothing else."""

    groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
        max_tokens=800,
    )

    raw = response.choices[0].message.content.strip()
    suggestions = []
    for block in raw.split("TOPIC:")[1:]:
        parts = block.split("CONTENT:", 1)
        if len(parts) == 2:
            topic = parts[0].strip()
            content = parts[1].strip()
            if topic and content:
                suggestions.append({"topic": topic, "content": content})

    return {"suggestions": suggestions, "based_on": len(unanswered)}


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

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".pdf", ".docx", ".txt"):
        raise HTTPException(status_code=400, detail="Only PDF, DOCX, and TXT files are supported.")

    content = await file.read()
    if len(content) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20 MB.")

    filepath = os.path.join(DOCS_DIR, file.filename)
    with open(filepath, "wb") as f:
        f.write(content)

    # Remove old vector chunks and DB record if this file was uploaded before
    existing = db.query(KnowledgeDoc).filter(KnowledgeDoc.filename == file.filename).first()
    if existing:
        delete_document(file.filename)
        db.delete(existing)
        db.commit()
        logger.info("Replaced existing knowledge: %s", file.filename)

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

        content = await file.read()
        if len(content) > 20 * 1024 * 1024:
            results.append({"filename": file.filename, "status": "skipped", "message": "File too large (max 20 MB)"})
            continue

        filepath = os.path.join(DOCS_DIR, file.filename)
        with open(filepath, "wb") as f:
            f.write(content)

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
    db.add(KnowledgeDoc(filename=data.source, filepath="text://manual", content=data.content))
    db.commit()
    return {"message": f"Added {chunks} chunks from text.", "source": data.source}


@router.put("/admin/knowledge/{doc_id}")
async def update_text(
    doc_id: int,
    data: TextUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    doc = db.query(KnowledgeDoc).filter(KnowledgeDoc.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.content is None:
        raise HTTPException(status_code=400, detail="File uploads cannot be edited — delete and re-upload")
    delete_document(doc.filename)          # remove old ChromaDB chunks
    ingest_text(data.content, data.source) # re-ingest updated content
    doc.filename = data.source
    doc.content  = data.content
    db.commit()
    return {"message": "Updated and re-indexed successfully.", "source": data.source}


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


@router.delete("/admin/subscribers/{id}")
async def delete_subscriber(
    id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    sub = db.query(Subscriber).filter(Subscriber.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(sub)
    db.commit()
    return {"message": "Subscriber removed"}


@router.get("/admin/chatlogs")
async def get_chatlogs(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    rows = db.query(ChatLog).order_by(ChatLog.created_at.desc()).limit(2000).all()
    return [
        {
            "id": r.id,
            "question": r.question,
            "answer": r.answer,
            "is_answered": r.is_answered,
            "created_at": str(r.created_at),
        }
        for r in rows
    ]

