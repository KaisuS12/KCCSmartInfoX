import asyncio
import logging
import os
from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from models.database import init_db, SessionLocal, Announcement, Subscriber
from notifications.service import send_announcement_email
from routes import chat, announcements, subscribers, admin, admin_ai

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kccsmartinfox")

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="KCCSmartInfoX API", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router,          prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(subscribers.router,   prefix="/api")
app.include_router(admin.router,         prefix="/api")
app.include_router(admin_ai.router,      prefix="/api")


async def scheduled_email_dispatcher():
    """Runs every 60 seconds. Finds scheduled announcements that have gone live
    and haven't been emailed yet, then sends emails and marks them as sent."""
    while True:
        await asyncio.sleep(60)
        try:
            db = SessionLocal()
            now = datetime.utcnow()
            pending = (
                db.query(Announcement)
                .filter(Announcement.publish_at != None)
                .filter(Announcement.publish_at <= now)
                .filter(Announcement.email_sent == False)
                .all()
            )
            if pending:
                emails = [s.email for s in db.query(Subscriber).all()]
                for ann in pending:
                    send_announcement_email(emails, ann.title, ann.content)
                    ann.email_sent = True
                    logger.info("Scheduled email sent for announcement id=%s", ann.id)
                db.commit()
            db.close()
        except Exception as e:
            logger.error("Scheduled email dispatcher error: %s", e)


@app.on_event("startup")
async def startup():
    init_db()
    img_dir = "./knowledge_base/announcement_images"
    os.makedirs(img_dir, exist_ok=True)
    app.mount("/api/announcement-images", StaticFiles(directory=img_dir), name="announcement-images")
    asyncio.create_task(scheduled_email_dispatcher())
    logger.info("KCCSmartInfoX API is running")


@app.get("/")
def root():
    return {"message": "KCCSmartInfoX API", "status": "running"}
