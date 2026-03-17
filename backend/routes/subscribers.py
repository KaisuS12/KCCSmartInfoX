from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db, Subscriber

router = APIRouter()


class SubscribeRequest(BaseModel):
    email: str


@router.post("/subscribe")
async def subscribe(request: SubscribeRequest, db: Session = Depends(get_db)):
    existing = db.query(Subscriber).filter(Subscriber.email == request.email).first()
    if existing:
        return {"message": "Already subscribed!"}

    db.add(Subscriber(email=request.email))
    db.commit()
    return {"message": "Subscribed successfully!"}


@router.get("/subscribers")
async def get_subscriber_count(db: Session = Depends(get_db)):
    return {"count": db.query(Subscriber).count()}
