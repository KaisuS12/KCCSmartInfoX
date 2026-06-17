import os
import re
import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

from models.database import (
    get_db, ChatLog, KnowledgeDoc,
    Subscriber, Feedback, Announcement, OfficeProcess
)
from utils.auth import get_current_admin
from rag.ingestion import ingest_text, delete_document

load_dotenv()
router = APIRouter()
logger = logging.getLogger("kccsmartinfox.admin_ai")
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))


INTENT_PROMPT = """You are an AI assistant for the KCCSmartInfoX admin panel.
Analyze the admin's message and return ONLY a valid JSON object — no extra text.

Available intents:
- add_knowledge: Admin wants to add information/text to the knowledge base
  params: { "content": "the text to add", "source": "short label for this info" }
- delete_knowledge: Admin wants to delete a knowledge document by name/source
  params: { "filename": "exact source name or filename to delete" }
- post_announcement: Admin wants to create/post an announcement
  params: { "title": "announcement title", "content": "announcement body text" }
- delete_announcement: Admin wants to delete an announcement by ID
  params: { "id": <number> }
- get_stats: Admin wants dashboard statistics (totals, answer rate, etc.)
  params: {}
- get_unanswered: Admin wants to see unanswered questions
  params: {}
- get_top_questions: Admin wants the most frequently asked questions
  params: {}
- get_subscribers: Admin wants subscriber count or list
  params: {}
- get_documents: Admin wants to see uploaded knowledge base documents
  params: {}
- get_office_processes: Admin wants to see the office process cards on the landing page
  params: {}
- general: Anything else — you answer it directly
  params: { "answer": "your concise answer" }

Return format (JSON only):
{
  "intent": "<intent name>",
  "params": { ... },
  "message": "<1-sentence confirmation of what you understood>"
}

Examples:
Input: "add to knowledge base: library is open 8am to 5pm"
Output: {"intent":"add_knowledge","params":{"content":"library is open 8am to 5pm","source":"library hours"},"message":"Adding library hours to the knowledge base."}

Input: "delete knowledge: sdf"
Output: {"intent":"delete_knowledge","params":{"filename":"sdf"},"message":"Deleting knowledge entry named sdf."}

Input: "show office processes"
Output: {"intent":"get_office_processes","params":{},"message":"Fetching office process cards."}

Input: "post announcement: no classes on friday"
Output: {"intent":"post_announcement","params":{"title":"No Classes on Friday","content":"There will be no classes on Friday."},"message":"Posting announcement about no classes on Friday."}

Input: "show me the stats"
Output: {"intent":"get_stats","params":{},"message":"Fetching dashboard statistics."}
"""


class AIChatRequest(BaseModel):
    message: str


def parse_intent(raw: str) -> dict:
    """Extract JSON from LLM response even if there's extra text around it."""
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        return json.loads(raw)
    except Exception:
        return {"intent": "general", "params": {"answer": raw}, "message": raw}


@router.post("/admin/ai/chat")
async def ai_chat(
    body: AIChatRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # 1. Detect intent via Groq
    try:
        res = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": INTENT_PROMPT},
                {"role": "user", "content": body.message},
            ],
            temperature=0.0,
            max_tokens=400,
        )
        raw = res.choices[0].message.content.strip()
        data = parse_intent(raw)
    except Exception as e:
        logger.error("Intent detection failed: %s", e)
        return {"reply": "❌ AI service error. Please try again.", "intent": "error"}

    intent = data.get("intent", "general")
    params = data.get("params", {})
    reply = ""
    action_details = ""
    status = "success"

    # 2. Execute action
    try:
        if intent == "add_knowledge":
            content = params.get("content", "").strip()
            source = params.get("source", "admin-ai-entry")
            if content:
                chunks = ingest_text(content, source)
                db.add(KnowledgeDoc(filename=source, filepath="text://admin-ai"))
                db.commit()
                reply = f"✅ Done! Added **\"{source}\"** to the knowledge base ({chunks} chunks indexed)."
                action_details = f"Added knowledge: {source} — {content[:120]}"
            else:
                reply = "❌ I couldn't find the content to add. Tell me what info to add, like:\n\n*\"add to knowledge base: tuition fee for BSIT is ₱15,000\"*"
                status = "error"

        elif intent == "post_announcement":
            title = params.get("title", "Announcement").strip()
            content = params.get("content", "").strip()
            if content:
                ann = Announcement(title=title, content=content)
                db.add(ann)
                db.commit()
                reply = f"✅ Announcement posted!\n\n**{title}**\n\n{content}"
                action_details = f"Posted announcement: {title}"
            else:
                reply = "❌ I need a title and content. Try:\n\n*\"post announcement: No classes on Friday due to holiday\"*"
                status = "error"

        elif intent == "delete_announcement":
            ann_id = params.get("id")
            if ann_id:
                ann = db.query(Announcement).filter(Announcement.id == int(ann_id)).first()
                if ann:
                    title = ann.title
                    db.delete(ann)
                    db.commit()
                    reply = f"✅ Announcement **#{ann_id}** \"{title}\" has been deleted."
                    action_details = f"Deleted announcement #{ann_id}: {title}"
                else:
                    reply = f"❌ No announcement found with ID **#{ann_id}**."
                    status = "error"
            else:
                reply = "❌ Please specify the announcement ID, e.g.:\n\n*\"delete announcement #3\"*"
                status = "error"

        elif intent == "get_stats":
            total_q  = db.query(ChatLog).count()
            unanswered = db.query(ChatLog).filter(ChatLog.is_answered == False).count()
            answered = total_q - unanswered
            rate = round(answered / total_q * 100, 1) if total_q else 0
            subs = db.query(Subscriber).count()
            docs = db.query(KnowledgeDoc).count()
            thumbs_up   = db.query(Feedback).filter(Feedback.rating == "up").count()
            thumbs_down = db.query(Feedback).filter(Feedback.rating == "down").count()
            reply = (
                f"📊 **Dashboard Stats**\n\n"
                f"- Total questions: **{total_q}**\n"
                f"- Answered: **{answered}** ({rate}%)\n"
                f"- Unanswered: **{unanswered}**\n"
                f"- Subscribers: **{subs}**\n"
                f"- Knowledge documents: **{docs}**\n"
                f"- 👍 Helpful ratings: **{thumbs_up}**\n"
                f"- 👎 Needs improvement: **{thumbs_down}**"
            )
            action_details = "Viewed dashboard stats"

        elif intent == "get_unanswered":
            rows = (
                db.query(ChatLog)
                .filter(ChatLog.is_answered == False)
                .order_by(ChatLog.created_at.desc())
                .limit(10)
                .all()
            )
            if rows:
                items = "\n".join([f"- {r.question}" for r in rows])
                reply = f"❓ **Unanswered Questions** (latest {len(rows)})\n\n{items}"
            else:
                reply = "✅ Great news — no unanswered questions right now!"
            action_details = "Viewed unanswered questions"

        elif intent == "get_top_questions":
            rows = (
                db.query(ChatLog.question, func.count(ChatLog.question).label("cnt"))
                .group_by(ChatLog.question)
                .order_by(func.count(ChatLog.question).desc())
                .limit(7)
                .all()
            )
            if rows:
                items = "\n".join([f"{i+1}. {r.question} *({r.cnt}x)*" for i, r in enumerate(rows)])
                reply = f"🔥 **Top Asked Questions**\n\n{items}"
            else:
                reply = "No question data yet."
            action_details = "Viewed top questions"

        elif intent == "get_subscribers":
            count = db.query(Subscriber).count()
            recent = db.query(Subscriber).order_by(Subscriber.created_at.desc()).limit(5).all()
            emails = "\n".join([f"- {s.email}" for s in recent])
            reply = f"👥 **Total Subscribers: {count}**\n\nMost recent:\n{emails}" if recent else f"👥 **Total Subscribers: {count}**"
            action_details = "Viewed subscribers"

        elif intent == "get_documents":
            docs = db.query(KnowledgeDoc).order_by(KnowledgeDoc.uploaded_at.desc()).limit(10).all()
            if docs:
                items = "\n".join([f"- {d.filename} {'*(text)*' if d.content is not None else ''}" for d in docs])
                reply = f"📁 **Knowledge Base** ({len(docs)} latest)\n\n{items}"
            else:
                reply = "No documents uploaded yet."
            action_details = "Viewed documents"

        elif intent == "delete_knowledge":
            filename = params.get("filename", "").strip()
            if filename:
                doc = db.query(KnowledgeDoc).filter(KnowledgeDoc.filename == filename).first()
                if doc:
                    delete_document(doc.filename)
                    if doc.filepath and not doc.filepath.startswith("text://") and __import__('os').path.exists(doc.filepath):
                        __import__('os').remove(doc.filepath)
                    db.delete(doc)
                    db.commit()
                    reply = f"✅ Deleted **\"{filename}\"** from the knowledge base. The AI no longer has that info."
                    action_details = f"Deleted knowledge: {filename}"
                else:
                    reply = f"❌ No knowledge entry found with the name **\"{filename}\"**.\n\nTry: *\"show documents\"* to see exact names."
                    status = "error"
            else:
                reply = "❌ Please specify what to delete, e.g.:\n\n*\"delete knowledge: library hours\"*"
                status = "error"

        elif intent == "get_office_processes":
            offices = db.query(OfficeProcess).order_by(OfficeProcess.order).all()
            if offices:
                items = "\n".join([f"{i+1}. **{o.name}** — {o.tagline}" for i, o in enumerate(offices)])
                reply = f"🏢 **Office Processes** ({len(offices)} cards on landing page)\n\n{items}\n\nTo edit steps, go to **Admin → Office Processes**."
            else:
                reply = "No office processes yet. Add them at Admin → Office Processes."
            action_details = "Viewed office processes"

        else:  # general
            answer = params.get("answer", "").strip()
            if not answer:
                r2 = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for the KCCSmartInfoX admin panel of Kabankalan Catholic College. Answer admin questions concisely."},
                        {"role": "user", "content": body.message},
                    ],
                    temperature=0.7,
                    max_tokens=300,
                )
                answer = r2.choices[0].message.content.strip()
            reply = answer
            action_details = ""  # don't log pure info queries

    except Exception as e:
        logger.error("Action execution error (%s): %s", intent, e, exc_info=True)
        reply = f"❌ Something went wrong while executing: {intent}. Error: {str(e)}"
        status = "error"
        action_details = f"Failed {intent}: {str(e)[:80]}"

    return {"reply": reply, "intent": intent}
