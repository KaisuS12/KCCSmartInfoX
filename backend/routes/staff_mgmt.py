import json
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from models.database import get_db, StaffAccount, LiveChat
from utils.auth import hash_password, get_current_admin
from utils.audit import log_activity

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.staff")

VALID_PERMISSIONS = {
    "dashboard", "knowledge", "announcements", "analytics",
    "subscribers", "office-processes", "chatlogs", "concerns",
    "live-chats", "qrcode",
}


class CreateStaffRequest(BaseModel):
    username: str
    password: str
    full_name: Optional[str] = None
    permissions: List[str] = []


class UpdateStaffRequest(BaseModel):
    full_name: Optional[str] = None
    permissions: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ResetPasswordRequest(BaseModel):
    new_password: str


def _staff_dict(s: StaffAccount, db: Session = None):
    result = {
        "id":          s.id,
        "username":    s.username,
        "full_name":   s.full_name,
        "permissions": json.loads(s.permissions or "[]"),
        "is_active":   s.is_active,
        "created_at":  str(s.created_at),
        "avg_rating":  None,
        "total_ratings": 0,
        "rating_breakdown": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
        "recent_feedbacks": [],
    }
    if db:
        display_name = s.full_name or s.username
        rated_chats = (
            db.query(LiveChat)
            .filter(LiveChat.opened_by == display_name, LiveChat.rating.isnot(None))
            .order_by(LiveChat.closed_at.desc())
            .all()
        )
        if rated_chats:
            result["total_ratings"] = len(rated_chats)
            result["avg_rating"] = round(sum(c.rating for c in rated_chats) / len(rated_chats), 1)
            breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for c in rated_chats:
                breakdown[c.rating] = breakdown.get(c.rating, 0) + 1
            result["rating_breakdown"] = breakdown
            result["recent_feedbacks"] = [
                {
                    "user_name":     c.user_name,
                    "rating":        c.rating,
                    "feedback_text": c.feedback_text,
                    "date":          str(c.closed_at or c.created_at),
                }
                for c in rated_chats[:5]
            ]
    return result


def _require_admin(admin):
    # Tokens issued before RBAC won't have a role field — treat them as admin.
    # Only explicitly reject staff tokens.
    if admin.get("role") == "staff":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.post("/admin/staff")
def create_staff(data: CreateStaffRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    _require_admin(admin)
    if db.query(StaffAccount).filter(StaffAccount.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    perms = [p for p in data.permissions if p in VALID_PERMISSIONS]
    staff = StaffAccount(
        username=data.username,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        permissions=json.dumps(perms),
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    log_activity(db, "Admin", "admin", "staff_created", "staff_account", staff.id,
                 f"Created staff account @{data.username}")
    db.commit()
    logger.info("Staff account created: %s by admin %s", data.username, admin.get("sub"))
    return _staff_dict(staff, db)


@router.get("/admin/staff")
def list_staff(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    _require_admin(admin)
    return [_staff_dict(s, db) for s in db.query(StaffAccount).order_by(StaffAccount.created_at.desc()).all()]


@router.put("/admin/staff/{staff_id}")
def update_staff(staff_id: int, data: UpdateStaffRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    _require_admin(admin)
    staff = db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    if data.full_name is not None:
        staff.full_name = data.full_name
    if data.permissions is not None:
        staff.permissions = json.dumps([p for p in data.permissions if p in VALID_PERMISSIONS])
    if data.is_active is not None:
        staff.is_active = data.is_active
    action = "staff_deactivated" if data.is_active is False else "staff_updated"
    detail = f"Updated staff account @{staff.username}"
    if data.is_active is False:
        detail = f"Deactivated staff account @{staff.username}"
    elif data.is_active is True:
        detail = f"Activated staff account @{staff.username}"
    elif data.permissions is not None:
        detail = f"Updated permissions for @{staff.username}"
    log_activity(db, "Admin", "admin", action, "staff_account", staff_id, detail)
    db.commit()
    db.refresh(staff)
    logger.info("Staff %s updated by admin %s", staff.username, admin.get("sub"))
    return _staff_dict(staff, db)


@router.put("/admin/staff/{staff_id}/reset-password")
def reset_staff_password(staff_id: int, data: ResetPasswordRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    _require_admin(admin)
    staff = db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    staff.password_hash = hash_password(data.new_password)
    log_activity(db, "Admin", "admin", "staff_password_reset", "staff_account", staff_id,
                 f"Reset password for @{staff.username}")
    db.commit()
    logger.info("Staff %s password reset by admin %s", staff.username, admin.get("sub"))
    return {"message": "Password updated"}


@router.delete("/admin/staff/{staff_id}")
def delete_staff(staff_id: int, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    _require_admin(admin)
    staff = db.query(StaffAccount).filter(StaffAccount.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    log_activity(db, "Admin", "admin", "staff_deleted", "staff_account", staff_id,
                 f"Deleted staff account @{staff.username}")
    db.delete(staff)
    db.commit()
    logger.info("Staff %s deleted by admin %s", staff.username, admin.get("sub"))
    return {"message": "Staff deleted"}
