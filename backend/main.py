import asyncio
import logging
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from models.database import init_db, engine, SessionLocal, Announcement, Subscriber, SchoolInfo, OfficeProcess, Settings
from notifications.service import send_announcement_email
from routes import chat, announcements, subscribers, admin, admin_ai, school_info, office_processes, concerns, live_chat, user_auth, staff_mgmt, settings as settings_router

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

_extra = os.getenv("ALLOWED_ORIGINS", "")
_cors_origins = [o.strip() for o in _extra.split(",") if o.strip()] if _extra else []
_cors_origins += [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DIST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")

app.include_router(chat.router,          prefix="/api") 
app.include_router(announcements.router, prefix="/api")
app.include_router(subscribers.router,   prefix="/api")
app.include_router(admin.router,         prefix="/api")
app.include_router(admin_ai.router,      prefix="/api")
app.include_router(school_info.router,        prefix="/api")
app.include_router(office_processes.router,   prefix="/api")
app.include_router(concerns.router,           prefix="/api")
app.include_router(live_chat.router,          prefix="/api")
app.include_router(user_auth.router,          prefix="/api")
app.include_router(staff_mgmt.router,         prefix="/api")
app.include_router(settings_router.router,    prefix="/api")

# Mount announcement images BEFORE the SPA catch-all so it isn't intercepted
_img_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "knowledge_base", "announcement_images")
os.makedirs(_img_dir, exist_ok=True)
app.mount("/api/announcement-images", StaticFiles(directory=_img_dir), name="announcement-images")


async def scheduled_email_dispatcher():
    """Runs every 60 seconds. Finds scheduled announcements that have gone live
    and haven't been emailed yet, then sends emails and marks them as sent."""
    while True:
        await asyncio.sleep(60)
        db = SessionLocal()
        try:
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
        except Exception as e:
            logger.error("Scheduled email dispatcher error: %s", e)
            db.rollback()
        finally:
            db.close()


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

    # Column migrations for tables that may have been created before these columns were added
    from sqlalchemy import text
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN user_id INTEGER REFERENCES user_accounts(id)"))
            conn.commit()
            logger.info("Migration: added user_id column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN device_type VARCHAR(20)"))
            conn.commit()
            logger.info("Migration: added device_type column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN last_seen DATETIME"))
            conn.commit()
            logger.info("Migration: added last_seen column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN admin_opened_at DATETIME"))
            conn.commit()
            logger.info("Migration: added admin_opened_at column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN opened_by VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added opened_by column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN rating INTEGER"))
            conn.commit()
            logger.info("Migration: added rating column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN feedback_text TEXT"))
            conn.commit()
            logger.info("Migration: added feedback_text column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE live_chats ADD COLUMN closed_by VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added closed_by column to live_chats")
        except Exception:
            pass  # column already exists
        try:
            conn.execute(text("ALTER TABLE concerns ADD COLUMN replied_by VARCHAR(255)"))
            conn.commit()
            logger.info("Migration: added replied_by column to concerns")
        except Exception:
            pass  # column already exists

    import json as _json
    db = SessionLocal()

    # Seed school info
    if db.query(SchoolInfo).count() == 0:
        for i, (title, content) in enumerate(DEFAULT_SCHOOL_INFO):
            db.add(SchoolInfo(title=title, content=content, order=i))
        db.commit()
        logger.info("School info seeded with %d sections", len(DEFAULT_SCHOOL_INFO))

    # Seed office processes
    if db.query(OfficeProcess).count() == 0:
        defaults = [
            OfficeProcess(name="Cashier / Accounting", tagline="Payments, fees & receipts", icon="DollarSign", color="yellow", order=0, sections=_json.dumps([
                {"heading": "How to Pay School Fees", "steps": ["Go to the Cashier's Office during office hours (Mon–Fri 8AM–5PM).", "Present your Assessment Form / Statement of Account.", "Choose your payment option: full payment or installment plan.", "Pay the required amount. Official Receipt (OR) will be issued immediately.", "Keep your OR — it is required for clearance and enrollment."]},
                {"heading": "Payment Methods", "steps": ["Cash payment at the Cashier's Window.", "Installment plan — inquire at the Accounting Office for terms.", "Scholarships & discounts are applied automatically — confirm with Accounting."]},
            ])),
            OfficeProcess(name="Registrar's Office", tagline="Enrollment, TOR & records", icon="BookOpen", color="blue", order=1, sections=_json.dumps([
                {"heading": "Enrollment Process", "steps": ["Secure an Enrollment Form from the Registrar's Office.", "Fill out the form completely and accurately.", "Submit required documents: Report Card, Birth Certificate, ID photo.", "Have your form assessed and get your Statement of Account.", "Pay the required fees at the Cashier's Office.", "Return your Official Receipt to the Registrar to receive your Class Schedule."]},
                {"heading": "How to Request a TOR", "steps": ["Visit the Registrar's Office and request a TOR form.", "Fill out the form and indicate the purpose.", "Pay the required fee at the Cashier's Office.", "Submit the Official Receipt to the Registrar.", "Wait for processing — typically 3–5 working days.", "Claim your TOR on the specified release date."]},
                {"heading": "Other Documents", "steps": ["Certifications (Good Moral, Enrollment, Grades) — request at the window.", "Diploma — available upon graduation; inquire for release schedule.", "For transferees: present Transfer Credentials and Honorable Dismissal."]},
            ])),
            OfficeProcess(name="Scholarship Office", tagline="Financial aid & grants", icon="Award", color="green", order=2, sections=_json.dumps([
                {"heading": "Types of Scholarships", "steps": ["Academic Scholarship — for students with outstanding grades (GWA 1.0–1.5).", "Government Scholarships — CHED, UNIFAST, TUPAD beneficiaries.", "Institutional Grants — partial discounts for deserving students.", "Sports & Cultural Grants — for varsity athletes and cultural performers."]},
                {"heading": "Application Requirements", "steps": ["Accomplished Scholarship Application Form (from Scholarship Office).", "Latest Report Card / Grade Sheet with qualifying GWA.", "Certificate of Good Moral Character.", "Copy of Enrollment Form / Registration."]},
                {"heading": "Application Process", "steps": ["Get an application form from the Scholarship Office.", "Fill out the form and attach all required documents.", "Submit to the Scholarship Office on or before the deadline.", "Wait for evaluation — results are posted on the bulletin board.", "If approved, report to Accounting for discount application."]},
            ])),
        ]
        for op in defaults:
            db.add(op)
        db.commit()
        logger.info("Office processes seeded with %d entries", len(defaults))

    # Seed chat settings defaults (includes any newly added keys)
    from routes.settings import CHAT_DEFAULTS
    for k, v in CHAT_DEFAULTS.items():
        if not db.query(Settings).filter(Settings.key == k).first():
            db.add(Settings(key=k, value=v))
    db.commit()

    # Sync all office processes into AI knowledge base on every startup
    from rag.ingestion import ingest_text, delete_document
    from routes.office_processes import build_knowledge_text, kb_source
    all_offices = db.query(OfficeProcess).all()
    for op in all_offices:
        delete_document(kb_source(op.id))
        ingest_text(build_knowledge_text(op), source=kb_source(op.id))
    logger.info("Synced %d office processes to AI knowledge base", len(all_offices))

    db.close()

    asyncio.create_task(scheduled_email_dispatcher())
    logger.info("KCCSmartInfoX API is running")


@app.get("/api/health", include_in_schema=False)
def health():
    return {"status": "ok"}


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_spa(full_path: str):
    if not os.path.isdir(DIST_DIR):
        return {"message": "KCCSmartInfoX API", "status": "running"}
    target = os.path.join(DIST_DIR, full_path) if full_path else os.path.join(DIST_DIR, "index.html")
    if os.path.isfile(target):
        return FileResponse(target)
    return FileResponse(os.path.join(DIST_DIR, "index.html"))
