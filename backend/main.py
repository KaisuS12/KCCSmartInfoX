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
from models.database import init_db, SessionLocal, Announcement, Subscriber, SchoolInfo
from notifications.service import send_announcement_email
from routes import chat, announcements, subscribers, admin, admin_ai, school_info

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
app.include_router(school_info.router,   prefix="/api")


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


DEFAULT_SCHOOL_INFO = [
    ("Enrollment Process", """1. Secure enrollment form from the Registrar's Office.
2. Fill out the form completely and accurately.
3. Submit required documents (report card, birth certificate, ID photo).
4. Pay enrollment fees at the Cashier's Office.
5. Receive your class schedule and student ID.

For transferees: present Transfer Credentials and honorable dismissal."""),
    ("How to Get Your TOR", """1. Visit the Registrar's Office and request a Transcript of Records form.
2. Fill out the request form and indicate the purpose.
3. Pay the required fee at the Cashier's Office.
4. Submit the official receipt back to the Registrar.
5. Wait for processing (typically 3–5 working days).
6. Claim your TOR on the specified release date."""),
    ("Discipline Office (DO) Policies", """Students are expected to follow the school's Code of Conduct.
Common violations and corresponding sanctions are outlined in the Student Handbook.
For inquiries about specific penalties, visit the Discipline Office directly or ask the chatbot for details."""),
    ("School Fees & Payment", """Tuition and other fees are set each academic year.
Payment can be made at the Cashier's Office during office hours.
Instalment plans may be available — inquire at the Accounting Office.
Official receipts are issued for every payment."""),
    ("Office Hours", """Monday to Friday: 8:00 AM – 5:00 PM
Saturday: 8:00 AM – 12:00 NN (selected offices only)
Offices are closed on Sundays and holidays."""),
    ("Contact & Offices", """Kabankalan Catholic College, Inc.
Kabankalan City, Negros Occidental

Registrar's Office — for academic records, enrollment
Discipline Office — for student conduct matters
Accounting/Cashier — for payments and fees
Guidance Office — for student welfare and counseling

You may also use this chatbot to ask specific questions!"""),
]


@app.on_event("startup")
async def startup():
    init_db()
    img_dir = "./knowledge_base/announcement_images"
    os.makedirs(img_dir, exist_ok=True)
    app.mount("/api/announcement-images", StaticFiles(directory=img_dir), name="announcement-images")

    # Seed school info sections if table is empty
    db = SessionLocal()
    if db.query(SchoolInfo).count() == 0:
        for i, (title, content) in enumerate(DEFAULT_SCHOOL_INFO):
            db.add(SchoolInfo(title=title, content=content, order=i))
        db.commit()
        logger.info("School info seeded with %d sections", len(DEFAULT_SCHOOL_INFO))
    db.close()

    asyncio.create_task(scheduled_email_dispatcher())
    logger.info("KCCSmartInfoX API is running")


@app.get("/")
def root():
    return {"message": "KCCSmartInfoX API", "status": "running"}
