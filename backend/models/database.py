from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kccsmartinfox.db")

connect_args = {"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Announcement(Base):
    __tablename__ = "announcements"
    id           = Column(Integer, primary_key=True, index=True)
    title        = Column(String(255), nullable=False)
    content      = Column(Text, nullable=False)
    publish_at   = Column(DateTime, nullable=True)   # null = publish immediately
    expires_at   = Column(DateTime, nullable=True)   # null = never expires
    image_path   = Column(String(500), nullable=True)
    email_sent   = Column(Boolean, default=False)    # True once subscribers have been emailed
    created_at   = Column(DateTime, default=datetime.now)


class Subscriber(Base):
    __tablename__ = "subscribers"
    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class ChatLog(Base):
    __tablename__ = "chat_logs"
    id          = Column(Integer, primary_key=True, index=True)
    question    = Column(Text, nullable=False)
    answer      = Column(Text)
    is_answered = Column(Boolean, default=True)
    created_at  = Column(DateTime, default=datetime.utcnow)


class KnowledgeDoc(Base):
    __tablename__ = "knowledge_docs"
    id          = Column(Integer, primary_key=True, index=True)
    filename    = Column(String(255), nullable=False)
    filepath    = Column(String(500), nullable=False)
    content     = Column(Text, nullable=True)   # stored for text entries only; null for file uploads
    uploaded_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    id          = Column(Integer, primary_key=True, index=True)
    chat_log_id = Column(Integer, ForeignKey("chat_logs.id"), nullable=True)
    question    = Column(Text)
    answer      = Column(Text)
    rating      = Column(String(10))   # "up" or "down"
    created_at  = Column(DateTime, default=datetime.utcnow)


class SchoolInfo(Base):
    __tablename__ = "school_info"
    id         = Column(Integer, primary_key=True, index=True)
    title      = Column(String(255), nullable=False)
    content    = Column(Text, nullable=False)
    order      = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminUser(Base):
    __tablename__ = "admin_users"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)


class StaffAccount(Base):
    __tablename__ = "staff_accounts"
    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name     = Column(String(255), nullable=True)
    permissions   = Column(Text, default="[]")   # JSON array of page keys
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)


class OfficeProcess(Base):
    __tablename__ = "office_processes"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String(255), nullable=False)
    tagline    = Column(String(255), nullable=False)
    icon       = Column(String(50), default="BookOpen")   # lucide icon name
    color      = Column(String(20), default="blue")        # yellow | blue | green | purple
    order      = Column(Integer, default=0)
    sections   = Column(Text, nullable=False, default="[]") # JSON: [{heading, steps:[]}]
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AdminLoginLog(Base):
    __tablename__ = "admin_login_logs"
    id         = Column(Integer, primary_key=True, index=True)
    username   = Column(String(100), nullable=False)
    action     = Column(String(20), nullable=False)   # "success" | "failed"
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id          = Column(Integer, primary_key=True, index=True)
    actor       = Column(String(255), nullable=False)   # display name, e.g. "Juan dela Cruz" or "Admin"
    actor_role  = Column(String(20), nullable=False)    # "admin" | "staff"
    action      = Column(String(50), nullable=False)    # e.g. "concern_replied"
    target_type = Column(String(50), nullable=True)     # "concern" | "live_chat" | "staff_account"
    target_id   = Column(String(100), nullable=True)    # resource ID
    detail      = Column(Text, nullable=True)           # human-readable description
    created_at  = Column(DateTime, default=datetime.utcnow)


class Concern(Base):
    __tablename__ = "concerns"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(255), nullable=False)
    email            = Column(String(255), nullable=False)
    message          = Column(Text, nullable=False)
    related_question = Column(Text, nullable=True)
    status           = Column(String(20), default="pending")  # "pending" | "resolved"
    admin_reply      = Column(Text, nullable=True)
    replied_by       = Column(String(255), nullable=True)      # display name of who replied/resolved
    created_at       = Column(DateTime, default=datetime.utcnow)
    replied_at       = Column(DateTime, nullable=True)


class UserAccount(Base):
    __tablename__ = "user_accounts"
    id            = Column(Integer, primary_key=True, index=True)
    email         = Column(String(255), unique=True, nullable=False)
    name          = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)


class LiveChat(Base):
    __tablename__ = "live_chats"
    id               = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id          = Column(Integer, ForeignKey("user_accounts.id"), nullable=True)
    user_name        = Column(String(255), nullable=False)
    user_email       = Column(String(255), nullable=True)
    related_question = Column(Text, nullable=True)
    status           = Column(String(20), default="active")   # "active" | "closed"
    device_type      = Column(String(20), nullable=True)       # "Mobile" | "Tablet" | "Desktop"
    last_seen        = Column(DateTime, nullable=True)         # updated by heartbeat
    admin_opened_at  = Column(DateTime, nullable=True)         # set when admin/staff first opens the session
    opened_by        = Column(String(255), nullable=True)       # display name of who opened (admin or staff name)
    closed_by        = Column(String(255), nullable=True)       # display name of who closed
    rating           = Column(Integer, nullable=True)            # 1-5 star user rating after chat ends
    feedback_text    = Column(Text, nullable=True)               # optional user comment
    created_at       = Column(DateTime, default=datetime.utcnow)
    closed_at        = Column(DateTime, nullable=True)


class LiveMessage(Base):
    __tablename__ = "live_messages"
    id      = Column(Integer, primary_key=True, index=True)
    chat_id = Column(String(36), ForeignKey("live_chats.id"), nullable=False, index=True)
    sender  = Column(String(10), nullable=False)   # "user" | "admin"
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
