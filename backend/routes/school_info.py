from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from models.database import get_db, SchoolInfo
from utils.auth import get_current_admin

router = APIRouter()


class SchoolInfoUpdate(BaseModel):
    title: str
    content: str


@router.get("/school-info")
def get_school_info(db: Session = Depends(get_db)):
    return db.query(SchoolInfo).order_by(SchoolInfo.order).all()


@router.put("/school-info/{id}")
def update_school_info(
    id: int,
    body: SchoolInfoUpdate,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    item = db.query(SchoolInfo).filter(SchoolInfo.id == id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    item.title   = body.title
    item.content = body.content
    db.commit()
    db.refresh(item)
    return item
