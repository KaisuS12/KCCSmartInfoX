import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from models.database import init_db
from routes import chat, announcements, subscribers, admin, admin_ai, users

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
app.include_router(users.router,         prefix="/api")


@app.on_event("startup")
async def startup():
    init_db()
    img_dir = "./knowledge_base/announcement_images"
    os.makedirs(img_dir, exist_ok=True)
    app.mount("/api/announcement-images", StaticFiles(directory=img_dir), name="announcement-images")
    logger.info("KCCSmartInfoX API is running")


@app.get("/")
def root():
    return {"message": "KCCSmartInfoX API", "status": "running"}
