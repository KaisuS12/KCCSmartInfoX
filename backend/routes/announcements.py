import os
import shutil
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from models.database import get_db, Announcement, Subscriber
from notifications.service import send_announcement_email
from utils.auth import get_current_admin

router = APIRouter()

UPLOADS_DIR = "./knowledge_base/announcement_images"
ALLOWED_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


@router.get("/announcements")
async def get_announcements(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    announcements = (
        db.query(Announcement)
        .filter((Announcement.publish_at == None) | (Announcement.publish_at <= now))
        .filter((Announcement.expires_at == None) | (Announcement.expires_at >= now))
        .order_by(Announcement.created_at.desc())
        .all()
    )
    return [_serialize(a) for a in announcements]


@router.get("/announcements/all")
async def get_all_announcements(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    announcements = db.query(Announcement).order_by(Announcement.created_at.desc()).all()
    return [_serialize(a) for a in announcements]


@router.post("/announcements")
async def create_announcement(
    title:      str           = Form(...),
    content:    str           = Form(...),
    publish_at: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    image:      Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    pub = datetime.fromisoformat(publish_at.replace('Z', '+00:00')).replace(tzinfo=None) if publish_at else None
    exp = datetime.fromisoformat(expires_at.replace('Z', '+00:00')).replace(tzinfo=None) if expires_at else None

    # Save image if provided
    image_path = None
    if image and image.filename:
        ext = os.path.splitext(image.filename)[1].lower()
        if ext not in ALLOWED_EXTS:
            raise HTTPException(status_code=400, detail="Only JPG, PNG, GIF, WEBP images allowed.")
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        safe_name = f"{int(datetime.utcnow().timestamp())}_{image.filename}"
        dest = os.path.join(UPLOADS_DIR, safe_name)
        with open(dest, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_path = f"/api/announcement-images/{safe_name}"

    announcement = Announcement(
        title=title,
        content=content,
        publish_at=pub,
        expires_at=exp,
        image_path=image_path,
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # Send email only for instant posts
    if not pub:
        emails = [s.email for s in db.query(Subscriber).all()]
        send_announcement_email(emails, title, content)

    return {"message": "Announcement created", "id": announcement.id}


@router.delete("/announcements/{id}")
async def delete_announcement(
    id: int,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    item = db.query(Announcement).filter(Announcement.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    # Delete image file if exists
    if item.image_path:
        fname = item.image_path.split("/")[-1]
        fpath = os.path.join(UPLOADS_DIR, fname)
        if os.path.exists(fpath):
            os.remove(fpath)
    db.delete(item)
    db.commit()
    return {"message": "Deleted"}


def _serialize(a: Announcement):
    return {
        "id":         a.id,
        "title":      a.title,
        "content":    a.content,
        "image_url":  a.image_path,
        "publish_at": str(a.publish_at) if a.publish_at else None,
        "expires_at": str(a.expires_at) if a.expires_at else None,
        "created_at": str(a.created_at),
    }
