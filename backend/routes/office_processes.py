import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from models.database import get_db, OfficeProcess
from utils.auth import get_current_admin
from rag.ingestion import ingest_text, delete_document

router = APIRouter()


class SectionModel(BaseModel):
    heading: str
    steps: List[str]


class OfficeProcessCreate(BaseModel):
    name: str
    tagline: str
    icon: str = "BookOpen"
    color: str = "blue"
    order: int = 0
    sections: List[SectionModel] = []


class OfficeProcessUpdate(BaseModel):
    name: str
    tagline: str
    icon: str
    color: str
    order: int
    sections: List[SectionModel]


def serialize(op: OfficeProcess):
    return {
        "id": op.id,
        "name": op.name,
        "tagline": op.tagline,
        "icon": op.icon,
        "color": op.color,
        "order": op.order,
        "sections": json.loads(op.sections or "[]"),
    }


def build_knowledge_text(op: OfficeProcess) -> str:
    """Convert an office process into plain text for the AI knowledge base."""
    sections = json.loads(op.sections or "[]")
    lines = [
        f"Office: {op.name}",
        f"About: {op.tagline}",
        "",
    ]
    for section in sections:
        lines.append(f"{section['heading']}:")
        for i, step in enumerate(section.get("steps", []), 1):
            lines.append(f"  {i}. {step}")
        lines.append("")
    return "\n".join(lines)


def kb_source(op_id: int) -> str:
    """Unique source key used in ChromaDB for this office process."""
    return f"office_process_{op_id}"


def sync_to_kb(op: OfficeProcess):
    """Delete old chunks and re-ingest updated content into ChromaDB."""
    source = kb_source(op.id)
    delete_document(source)          # remove old version
    text = build_knowledge_text(op)
    ingest_text(text, source=source) # add new version


# ── Public ────────────────────────────────────────────────────────────────────

@router.get("/office-processes")
def list_offices(db: Session = Depends(get_db)):
    offices = db.query(OfficeProcess).order_by(OfficeProcess.order).all()
    return [serialize(o) for o in offices]


# ── Admin CRUD ────────────────────────────────────────────────────────────────

@router.post("/admin/office-processes")
def create_office(body: OfficeProcessCreate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    op = OfficeProcess(
        name=body.name,
        tagline=body.tagline,
        icon=body.icon,
        color=body.color,
        order=body.order,
        sections=json.dumps([s.dict() for s in body.sections]),
    )
    db.add(op)
    db.commit()
    db.refresh(op)
    sync_to_kb(op)   # ← auto-ingest into AI
    return serialize(op)


@router.put("/admin/office-processes/{op_id}")
def update_office(op_id: int, body: OfficeProcessUpdate, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    op = db.query(OfficeProcess).filter(OfficeProcess.id == op_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Not found")
    op.name     = body.name
    op.tagline  = body.tagline
    op.icon     = body.icon
    op.color    = body.color
    op.order    = body.order
    op.sections = json.dumps([s.dict() for s in body.sections])
    db.commit()
    sync_to_kb(op)   # ← auto-update AI knowledge
    return serialize(op)


@router.delete("/admin/office-processes/{op_id}")
def delete_office(op_id: int, db: Session = Depends(get_db), _=Depends(get_current_admin)):
    op = db.query(OfficeProcess).filter(OfficeProcess.id == op_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Not found")
    source = kb_source(op.id)
    db.delete(op)
    db.commit()
    delete_document(source)  # ← remove from AI knowledge
    return {"message": "Deleted"}
