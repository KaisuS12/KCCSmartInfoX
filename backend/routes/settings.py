import logging
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from models.database import get_db, Settings
from utils.auth import get_current_admin

router = APIRouter()
logger = logging.getLogger("kccsmartinfox.settings")

CHAT_KEYS = {
    "chat_enabled", "use_office_hours",
    "office_hours_start", "office_hours_end", "office_days",
    "chat_offline_message",
}

CHAT_DEFAULTS = {
    "chat_enabled":         "true",
    "use_office_hours":     "false",
    "office_hours_start":   "08:00",
    "office_hours_end":     "17:00",
    "office_days":          "Mon,Tue,Wed,Thu,Fri",
    "chat_offline_message": "Live chat is currently unavailable. Please submit a concern or try again during office hours.",
}


def _rows(db) -> dict:
    return {r.key: r.value for r in db.query(Settings).all()}


def is_chat_available(db) -> dict:
    rows = {**CHAT_DEFAULTS, **_rows(db)}

    # Master switch — admin directly turned it off
    if rows.get("chat_enabled", "true") != "true":
        return {**rows, "is_available": False}

    # Optional schedule restriction
    if rows.get("use_office_hours", "false") != "true":
        return {**rows, "is_available": True}

    # Check office hours in Philippines time
    try:
        from pytz import timezone as tz
        now = datetime.now(tz("Asia/Manila"))
    except Exception:
        now = datetime.utcnow()
    day = now.strftime("%a")
    days = [d.strip() for d in rows.get("office_days", "Mon,Tue,Wed,Thu,Fri").split(",")]
    sh, sm = map(int, rows.get("office_hours_start", "08:00").split(":"))
    eh, em = map(int, rows.get("office_hours_end",   "17:00").split(":"))
    now_m = now.hour * 60 + now.minute
    available = day in days and (sh * 60 + sm) <= now_m < (eh * 60 + em)
    return {**rows, "is_available": available}


@router.get("/settings/chat")
def get_chat_settings(db: Session = Depends(get_db)):
    return is_chat_available(db)


class ChatSettingsUpdate(BaseModel):
    chat_enabled: Optional[str] = None
    use_office_hours: Optional[str] = None
    office_hours_start: Optional[str] = None
    office_hours_end: Optional[str] = None
    office_days: Optional[str] = None
    chat_offline_message: Optional[str] = None


@router.put("/admin/settings/chat")
def update_chat_settings(data: ChatSettingsUpdate, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    updates = {k: v for k, v in data.dict().items() if v is not None and k in CHAT_KEYS}
    for key, value in updates.items():
        row = db.query(Settings).filter(Settings.key == key).first()
        if row:
            row.value = value
            row.updated_at = datetime.utcnow()
        else:
            db.add(Settings(key=key, value=value))
    db.commit()
    logger.info("Chat settings updated by %s: %s", admin.get("sub"), list(updates.keys()))
    return is_chat_available(db)
