# KCCSmartInfoX — System Documentation

> AI-powered information assistant for Kabankalan Catholic College (KCC)

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [How to Run](#how-to-run)
5. [Architecture](#architecture)
6. [Features](#features)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [AI / RAG Pipeline](#ai--rag-pipeline)
10. [Admin Panel](#admin-panel)
11. [Known Issues & Fixes](#known-issues--fixes)
12. [Analytics & Unanswered Questions](#analytics--unanswered-questions)

---

## Overview

KCCSmartInfoX is a full-stack AI chatbot web application for Kabankalan Catholic College.
Students and visitors can ask questions about enrollment, courses, tuition, scholarships,
and school policies. An admin panel lets staff manage the knowledge base, view analytics,
and send announcements.

---

## Tech Stack

| Layer       | Technology                                              |
|-------------|--------------------------------------------------------|
| Backend     | Python 3.11, FastAPI, Uvicorn                          |
| AI Engine   | Groq API (`llama-3.1-8b-instant`)                      |
| Embeddings  | `sentence-transformers/all-MiniLM-L6-v2` (local)      |
| Vector DB   | ChromaDB (persistent, local)                           |
| Database    | SQLite via SQLAlchemy ORM                               |
| Auth        | JWT (python-jose) + bcrypt (v4.0.1) via passlib        |
| Email       | SendGrid                                               |
| Frontend    | React 18, Vite 5, TailwindCSS 3                        |
| Charts      | Recharts                                               |
| HTTP client | Axios                                                  |
| Rate limit  | slowapi                                                |

---

## Project Structure

```
KCCSmartInfoX/
├── backend/
│   ├── main.py                   # FastAPI app entry point, CORS, routers
│   ├── .env                      # Environment variables (never commit this)
│   ├── kccsmartinfox.db          # SQLite database
│   ├── models/
│   │   └── database.py           # SQLAlchemy models + DB session
│   ├── routes/
│   │   ├── admin.py              # Admin endpoints (auth, knowledge, analytics)
│   │   └── chat.py               # Chat endpoint
│   ├── rag/
│   │   ├── pipeline.py           # RAG query pipeline (embeddings + Groq)
│   │   └── ingestion.py          # Document ingestion (PDF, DOCX, TXT, text)
│   ├── utils/
│   │   └── auth.py               # JWT, bcrypt, admin dependency
│   ├── notifications/            # Email via SendGrid
│   ├── knowledge_base/
│   │   ├── documents/            # Uploaded files (PDF, DOCX, TXT)
│   │   └── vectorstore/          # ChromaDB persistent storage
│   └── venv/                     # Python virtual environment
│
└── frontend/
    ├── src/
    │   ├── assets/
    │   │   └── kcc-logo.png      # KCC official logo
    │   ├── pages/
    │   │   ├── user/
    │   │   │   └── ChatPage.jsx  # Main chat UI for students
    │   │   └── admin/
    │   │       ├── AdminLogin.jsx
    │   │       ├── AdminDashboard.jsx
    │   │       ├── AdminKnowledge.jsx
    │   │       ├── AdminAnalytics.jsx
    │   │       ├── AdminAnnouncements.jsx
    │   │       └── AdminSubscribers.jsx
    │   ├── components/
    │   │   └── shared/
    │   │       └── AdminLayout.jsx  # Sidebar layout for admin pages
    │   ├── index.css             # Global styles (Tailwind + custom)
    │   └── App.jsx               # Routes
    ├── vite.config.js            # Vite config (API proxy to :8000)
    └── tailwind.config.js
```

---

## How to Run

### Requirements
- Python 3.11+
- Node.js 18+
- A valid Groq API key (set in `backend/.env`)

### Backend (FastAPI)

```bash
cd c:/KCCSmartInfoX/backend
source venv/Scripts/activate        # Windows Git Bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend (Vite)

```bash
cd c:/KCCSmartInfoX/frontend
npm run dev -- --host
```

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Chat UI (laptop) |
| http://localhost:5173/admin | Admin panel |
| http://192.168.x.x:5173 | Access from phone on same Wi-Fi |
| http://localhost:8000/docs | FastAPI auto-docs (Swagger UI) |

### Environment Variables (`backend/.env`)

```
GROQ_API_KEY=gsk_...            # Groq API key
DATABASE_URL=sqlite:///./kccsmartinfox.db
SECRET_KEY=your-secret-key
SENDGRID_API_KEY=...            # For email announcements
```

---

## Architecture

```
User Browser
    │
    ▼
React Frontend (Vite, port 5173)
    │  API calls via /api/* (proxied by Vite → port 8000)
    ▼
FastAPI Backend (Uvicorn, port 8000)
    ├── /api/chat          →  RAG Pipeline
    │       ├── 1. Is greeting? → Groq (friendly reply)
    │       ├── 2. Embed question (sentence-transformers)
    │       ├── 3. Query ChromaDB (top-4 similar chunks)
    │       ├── 4. Relevant? → Groq + context → answer
    │       └── 5. Not found? → fallback + log as unanswered
    │
    ├── /api/admin/*       →  Admin Routes (JWT protected)
    │       ├── knowledge/upload  → ingest PDF/DOCX/TXT → ChromaDB
    │       ├── knowledge/text    → ingest raw text → ChromaDB
    │       ├── analytics         → stats + unanswered questions
    │       └── subscribers       → email list
    │
    └── SQLite DB  (chats, docs, subscribers, announcements, admin)
```

---

## Features

### Chat (User Side)
- Ask questions in natural language (English or Filipino)
- AI responds using KCC knowledge base (RAG)
- Greetings / small talk answered naturally (no RAG needed)
- Typing indicator while AI is thinking
- Suggested questions on welcome screen
- Subscribe to announcements via email

### Admin Panel
- **Login** — JWT-protected at `/admin/login`
- **Dashboard** — Total chats, documents, subscribers (auto-refreshes 10s)
- **Knowledge Base** — Upload PDF/DOCX/TXT or paste raw text; delete documents
- **Analytics** — Chart of daily questions, full unanswered questions list, CSV export
- **Announcements** — Create and send email announcements to all subscribers via SendGrid
- **Subscribers** — Full list of emails with join date (auto-refreshes 10s)

### Admin Credentials
| Username | Password |
|----------|----------|
| admin    | admin123 |

---

## API Reference

### Public Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send a question, get AI answer |
| POST | `/api/subscribe` | Subscribe email to announcements |
| GET  | `/api/announcements` | List public announcements |

### Admin Endpoints (require `Authorization: Bearer <token>`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/login` | Get JWT token |
| GET  | `/api/admin/analytics` | Stats + unanswered questions |
| GET  | `/api/admin/analytics/unanswered/export` | Download unanswered questions CSV |
| GET  | `/api/admin/knowledge` | List uploaded documents |
| POST | `/api/admin/knowledge/upload` | Upload PDF/DOCX/TXT file |
| POST | `/api/admin/knowledge/text` | Add raw text to knowledge base |
| DELETE | `/api/admin/knowledge/{id}` | Delete a document |
| GET  | `/api/admin/subscribers` | List all subscribers |

---

## Database Schema

### `chat_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| question | TEXT | User's question |
| answer | TEXT | AI's response |
| is_answered | BOOLEAN | `false` if AI couldn't answer |
| created_at | DATETIME | When the question was asked |

### `knowledge_docs`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| filename | STRING | Original filename or source label |
| filepath | STRING | Disk path or `text://manual` for pasted text |
| uploaded_at | DATETIME | |

### `subscribers`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| email | STRING UNIQUE | |
| created_at | DATETIME | |

### `announcements`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| title | STRING | |
| content | TEXT | |
| created_at | DATETIME | |

### `admin_users`
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER PK | |
| username | STRING UNIQUE | |
| password_hash | STRING | bcrypt hash |

---

## AI / RAG Pipeline

### How it works (`backend/rag/pipeline.py`)

```
User Question
     │
     ▼
is_greeting(question)?
     │
   YES → Groq (GREETING_PROMPT, temp=0.7) → friendly reply
     │
    NO
     │
     ▼
Embed question → sentence-transformers (all-MiniLM-L6-v2, 384-dim)
     │
     ▼
Query ChromaDB → top 4 nearest chunks (cosine distance)
     │
     ▼
distance[0] > 1.2?  (too far = no relevant info)
     │
   YES → fallback message → logged as is_answered=False
     │
    NO
     │
     ▼
Build context from chunks
     │
     ▼
Groq (llama-3.1-8b-instant, SYSTEM_PROMPT, temp=0.1) → answer
     │
     ▼
Answer contains "I don't have information"?
     │
   YES → logged as is_answered=False
    NO → logged as is_answered=True
```

### Greeting Detection

The system detects short/casual messages and routes them directly to Groq without RAG:

```python
GREETING_PATTERNS = re.compile(
    r"^\s*(hi+|hello+|hey+|good\s*(morning|afternoon|evening|day)|"
    r"kumusta|kamusta|magandang\s*(umaga|hapon|gabi)|"
    r"thank(s| you)|salamat|bye+|okay|ok|...)\s*$",
    re.IGNORECASE
)
```

### Document Ingestion (`backend/rag/ingestion.py`)

| File Type | Parser | Function |
|-----------|--------|----------|
| PDF | pdfplumber | `ingest_pdf()` |
| DOCX | python-docx | `ingest_docx()` |
| TXT | built-in open() | `ingest_txt()` |
| Raw text | — | `ingest_text()` |

Documents are chunked (~500 chars with 50-char overlap), embedded, and stored in ChromaDB
collection `kcc_knowledge`.

---

## Admin Panel

### Adding Knowledge

**Option 1 — Upload a file:**
1. Go to Admin → Knowledge Base
2. Click "Upload Document"
3. Select a PDF, DOCX, or TXT file
4. The file is saved to disk + DB, then indexed into ChromaDB

**Option 2 — Paste text:**
1. Go to Admin → Knowledge Base → "Add Text"
2. Enter a source label (e.g., `Enrollment 2025`)
3. Paste the content
4. Click Save — text is chunked and indexed immediately

### Checking What the AI Knows

Go to **Analytics** → scroll to "Unanswered Questions". Any question the AI couldn't answer
appears here. Use this list to decide what information to add to the knowledge base.

You can also **Export CSV** to download the full list of unanswered questions for review
by staff.

---

## Analytics & Unanswered Questions

The Analytics page shows:

| Metric | Description |
|--------|-------------|
| Total Questions | All questions asked since launch |
| Answered | Questions the AI answered from the knowledge base |
| Unanswered | Questions with no matching context (knowledge gaps) |
| Answer Rate | `answered / total * 100` — higher is better |
| Daily Chart | Bar chart of questions per day (last 7 days) |
| Unanswered List | Full scrollable list with search + pagination |
| Export CSV | Download all unanswered questions for offline review |

**Auto-refreshes every 30 seconds.**

### Improving the Answer Rate

1. Review the unanswered questions list
2. Group similar questions by topic (enrollment, fees, schedule, etc.)
3. Add the relevant info via **Knowledge Base → Add Text** or upload a document
4. Wait for the next question — the AI will now answer it

---

## Known Issues & Fixes

| # | Issue | Status | Fix Applied |
|---|-------|--------|-------------|
| 1 | `email/` folder shadowed Python's built-in `email` module | Fixed | Renamed to `notifications/` |
| 2 | bcrypt v4 incompatible with passlib | Fixed | Downgraded to `bcrypt==4.0.1` |
| 3 | File uploads didn't appear in knowledge base | Fixed | DB saved before ingestion; ingestion wrapped in try-except |
| 4 | Invisible text in admin forms | Fixed | `color: #1a1a1a` added to `index.css`; explicit text classes on inputs |
| 5 | WatchFiles triggers reload on bcrypt file changes | Harmless | Run without `--reload` flag in production |
| 6 | Windows ghost sockets block ports | Temporary | Use different port or reboot; root cause is multiple background uvicorn processes |

---

## Dependencies

### Backend (`requirements.txt` / installed in venv)

```
fastapi
uvicorn
sqlalchemy
python-dotenv
passlib
bcrypt==4.0.1
python-jose[cryptography]
pdfplumber
python-docx
chromadb
sentence-transformers
groq
sendgrid
slowapi
python-multipart
```

### Frontend (`package.json`)

```
react, react-dom, react-router-dom
vite, @vitejs/plugin-react
tailwindcss, autoprefixer, postcss
axios
recharts
lucide-react
react-hot-toast
```

---

*Last updated: 2026-03-14*
