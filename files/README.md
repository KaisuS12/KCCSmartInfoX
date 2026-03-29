# KCCSmartInfoX

An Integrated Administration Information Application for Kabankalan Catholic College, Inc.

An AI-powered chatbot that answers questions strictly from KCC's own uploaded documents (RAG system). No hallucination — it only uses information the admin has provided.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts, Lucide |
| Backend | FastAPI, Python 3.11+ |
| AI Model | Llama 3.1 (llama-3.1-8b-instant) via Groq API |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 (local) |
| Vector DB | ChromaDB (local persistent) |
| Database | SQLite |
| Email | Gmail SMTP (smtplib, App Password) |
| Auth | JWT + bcrypt |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Groq API key — https://console.groq.com
- Gmail account with App Password enabled (for email announcements)

---

## Setup

### 1. Clone / open the project

```
C:\KCCSmartInfoX\
```

### 2. Backend setup

```bash
cd C:\KCCSmartInfoX\backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

Create `.env` file in `backend/`:

```env
GROQ_API_KEY=your_groq_api_key_here
SECRET_KEY=your_random_secret_key_here
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
DATABASE_URL=sqlite:///./kccsmartinfox.db
```

### 3. Frontend setup

```bash
cd C:\KCCSmartInfoX\frontend
npm install
```

---

## Running the System

### Backend (FastAPI)

```bash
cd C:\KCCSmartInfoX\backend
source venv/Scripts/activate     # Windows Git Bash
# or: venv\Scripts\activate      # Windows CMD
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

> Note: Wait ~15–20 seconds for the AI model to load before using the system.

### Frontend (Vite)

```bash
cd C:\KCCSmartInfoX\frontend
npm run dev -- --host
```

- **Local**: http://localhost:5173
- **Network (phone/tablet)**: http://YOUR_LOCAL_IP:5173

---

## Admin Login

- **URL**: http://localhost:5173/admin/login
- **Username**: `admin`
- **Password**: `admin123`

To create a fresh admin account (first-time setup):

```bash
curl -X POST http://localhost:8000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

---

## How It Works

1. Admin uploads KCC documents (PDF, DOCX, TXT) or pastes text via the Knowledge Base page
2. Documents are chunked and embedded into ChromaDB (vector database)
3. When a student asks a question, the system:
   - Spell-fixes and rewrites the question (handles Taglish/typos via Groq)
   - Converts the clean question to an embedding (local, no API cost)
   - Finds the most relevant document chunks in ChromaDB
   - Sends those chunks + the question to Llama 3.1 via Groq
   - Returns an answer based ONLY on the provided documents
4. If no relevant document is found, the question is logged as "unanswered" for admin review

---

## Features

### Student / User Side
- AI chat with KCC knowledge base (RAG)
- **Voice input** — speak your question (Chrome browser required)
- **Language toggle (EN/FIL)** — AI responds in English or Filipino/Taglish
- Conversation context (last 3 exchanges remembered)
- Source citation (shows which document was used)
- Human fallback contact card when AI can't answer
- Follow-up question suggestions
- Dark/light mode
- Announcement carousel on landing page
- Office process cards (Cashier, Registrar, Scholarship) — expandable
- About KCC section

### Admin Panel
- **Dashboard** — live stats, recent unanswered questions
- **Knowledge Base** — upload PDF/DOCX/TXT or add text directly
- **Announcements** — post instantly or schedule, attach images, emails subscribers
- **Scheduled announcements** — auto-sent via background task every 60s
- **Analytics** — total questions, answer rate, top questions chart, unanswered list, feedback
- **FAQ Auto-Generator** — AI analyzes unanswered questions and suggests knowledge base content
- **School Info** — editable school information sections shown in chat sidebar
- **Subscribers** — manage email subscribers
- **Admin AI Assistant** — floating chatbot for admin queries and actions

---

## Key URLs

| URL | Description |
|---|---|
| http://localhost:5173 | Landing page (announcements, office processes, about) |
| http://localhost:5173/chat | Student chat interface |
| http://localhost:5173/admin/login | Admin login |
| http://localhost:8000/docs | FastAPI Swagger docs |

---

## Project Structure

```
KCCSmartInfoX/
├── backend/
│   ├── main.py                  ← FastAPI entry point + scheduled email task
│   ├── requirements.txt
│   ├── .env                     ← API keys (never commit this)
│   ├── models/database.py       ← SQLAlchemy models
│   ├── routes/
│   │   ├── chat.py              ← POST /api/chat (lang, history, rate limit)
│   │   ├── admin.py             ← Admin API + FAQ suggestions
│   │   ├── announcements.py     ← Announcements + image upload
│   │   ├── subscribers.py       ← Email subscribers
│   │   ├── school_info.py       ← School info GET/PUT
│   │   └── admin_ai.py          ← Admin AI assistant
│   ├── rag/
│   │   ├── chroma_store.py      ← Singleton ChromaDB client (shared)
│   │   ├── pipeline.py          ← RAG query (EN + FIL language support)
│   │   └── ingestion.py         ← PDF/DOCX/TXT ingestion
│   ├── utils/auth.py            ← JWT + bcrypt
│   ├── notifications/service.py ← Gmail SMTP email
│   └── knowledge_base/
│       ├── documents/           ← Uploaded files
│       ├── announcement_images/ ← Uploaded announcement images
│       └── vectorstore/         ← ChromaDB vector data
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx       ← Carousel + office cards + about
        │   ├── user/ChatPage.jsx     ← Chat UI (voice, lang toggle, fallback)
        │   └── admin/               ← All admin pages
        ├── components/
        │   ├── shared/AdminLayout.jsx
        │   └── user/                ← AnnouncementsPanel, SchoolInfoPanel
        └── assets/kcc-logo.png
```

---

## Rate Limits

| Endpoint | Limit |
|---|---|
| POST /api/chat | 20 requests/minute per IP |
| POST /api/admin/knowledge/upload | 30 requests/minute per IP |

---

## Supported File Types

| Format | Status |
|---|---|
| PDF (.pdf) | Supported |
| Word (.docx) | Supported |
| Plain text (.txt) | Supported |
| Manual text paste | Supported |

---

## Change Log

| Date | Change |
|---|---|
| 2026-03-30 | Voice input + EN/FIL language toggle + FAQ Auto-Generator |
| 2026-03-29 | Landing page redesign (carousel, office cards, about section) |
| 2026-03-29 | Announcement posting fix (background email task) |
| 2026-03-29 | email_sent column migration fix |
| 2026-03-28 | Scheduled announcement emails (asyncio background task) |
| 2026-03-28 | Editable School Info Panel (admin page + DB model) |
| 2026-03-27 | DOCX upload fix (shared ChromaDB singleton) |
| 2026-03-27 | Source citation, conversation context, human fallback added |
| 2026-03-27 | Replaced SendGrid with Gmail SMTP |
| 2026-03-27 | Admin AI Assistant (floating chatbot in admin panel) |
