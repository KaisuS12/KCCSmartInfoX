from sqlalchemy import create_engine, Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
import os
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


class AdminAILog(Base):
    __tablename__ = "admin_ai_logs"
    id         = Column(Integer, primary_key=True, index=True)
    action     = Column(String(100))
    details    = Column(Text)
    status     = Column(String(20), default="success")
    created_at = Column(DateTime, default=datetime.utcnow)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
