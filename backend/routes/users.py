from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from models.database import get_db, User, ChatLog
from utils.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()
security = HTTPBearer()

COURSES = [
    "BSIT", "BSBA", "BSN", "BEED", "BSED", "BSCRIM", "BSA", "BSHRM", "Other"
]
YEAR_LEVELS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year", "Graduate"]


class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    course: Optional[str] = None
    year_level: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    course: Optional[str] = None
    year_level: Optional[str] = None


@router.post("/users/register")
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == body.email.lower()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        name=body.name,
        course=body.course,
        year_level=body.year_level,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": user.email, "role": "user"})
    return {"token": token, "user": _profile(user)}


@router.post("/users/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower()).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token({"sub": user.email, "role": "user"})
    return {"token": token, "user": _profile(user)}


@router.get("/users/me")
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    payload = get_current_user(credentials)
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _profile(user)


@router.patch("/users/me")
def update_profile(
    body: UpdateProfileRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    payload = get_current_user(credentials)
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.course is not None:
        user.course = body.course
    if body.year_level is not None:
        user.year_level = body.year_level
    db.commit()
    db.refresh(user)
    return _profile(user)


@router.get("/users/history")
def get_history(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    payload = get_current_user(credentials)
    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    logs = (
        db.query(ChatLog)
        .filter(ChatLog.user_id == user.id)
        .order_by(ChatLog.created_at.desc())
        .limit(30)
        .all()
    )
    return [
        {
            "id": log.id,
            "question": log.question,
            "answer": log.answer,
            "is_answered": log.is_answered,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/users/meta")
def get_meta():
    return {"courses": COURSES, "year_levels": YEAR_LEVELS}


def _profile(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "course": user.course,
        "year_level": user.year_level,
    }
