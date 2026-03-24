# KCCSmartInfoX — System Documentation

> **KCCSmartInfoX** is an AI-powered information assistant chatbot for **Kabankalan Catholic College (KCC)**.
> Students can ask questions about enrollment, tuition fees, courses, scholarships, and school policies.
> Admins manage knowledge, post announcements, and view analytics through a separate panel.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [How to Run](#3-how-to-run)
4. [Database Schema](#4-database-schema)
5. [Backend — API Routes](#5-backend--api-routes)
6. [AI Pipeline — How the Chatbot Works](#6-ai-pipeline--how-the-chatbot-works)
7. [Frontend Pages](#7-frontend-pages)
8. [Features Overview](#8-features-overview)
9. [Admin Panel Guide](#9-admin-panel-guide)
10. [Known Issues & Fixes](#10-known-issues--fixes)
11. [Environment Variables](#11-environment-variables)
12. [GitHub Backup](#12-github-backup)

---

## 1. Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| **FastAPI** | Web framework for the API |
| **SQLAlchemy** | ORM for database models |
| **SQLite** | Local database (`kccsmartinfox.db`) |
| **ChromaDB** | Vector store for RAG (semantic search) |
| **SentenceTransformers** | Embedding model (`all-MiniLM-L6-v2`) |
| **Groq API** | LLM inference (`llama-3.1-8b-instant`) |
| **pdfplumber** | PDF text extraction |
| **python-docx** | DOCX text extraction |
| **pyspellchecker** | Fast word-level spell correction |
| **passlib + bcrypt** | Password hashing for admin login |
| **python-jose** | JWT token generation/validation |
| **SendGrid** | Sending email notifications to subscribers |
| **slowapi** | Rate limiting (20 chat requests/minute) |

### Frontend
| Tool | Purpose |
|------|---------|
| **React 18** | UI framework |
| **Vite 5** | Dev server & build tool |
| **TailwindCSS 3** | Utility-first styling |
| **react-router-dom** | Client-side routing |
| **axios** | HTTP requests to the API |
| **react-hot-toast** | Toast notifications |
| **react-markdown** | Renders AI responses with bullet points & bold |
| **recharts** | Charts on Analytics page |
| **lucide-react** | Icons throughout the UI |

---

## 2. Project Structure

```
KCCSmartInfoX/
├── backend/
│   ├── main.py                        # FastAPI app entry point
│   ├── models/
│   │   └── database.py                # All DB models & SQLAlchemy setup
│   ├── routes/
│   │   ├── chat.py                    # POST /api/chat, POST /api/chat/feedback
│   │   ├── announcements.py           # Announcement CRUD + image upload
│   │   ├── subscribers.py             # Subscribe endpoint
│   │   ├── admin.py                   # All admin endpoints (auth, knowledge, analytics)
│   │   └── admin_ai.py                # Admin AI Assistant (chat commands + history)
│   ├── rag/
│   │   ├── pipeline.py                # Main RAG logic (query rewrite → embed → search → generate)
│   │   └── ingestion.py               # PDF/DOCX/TXT/text ingestion into ChromaDB
│   ├── notifications/
│   │   └── service.py                 # SendGrid email sending
│   ├── utils/
│   │   └── auth.py                    # JWT creation, password hashing, get_current_admin
│   ├── knowledge_base/
│   │   ├── documents/                 # Uploaded source files (PDF, DOCX, TXT)
│   │   ├── vectorstore/               # ChromaDB persistent storage
│   │   └── announcement_images/       # Uploaded images for announcements
│   └── kccsmartinfox.db               # SQLite database file
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Route definitions
│   │   ├── index.css                  # Global styles + .admin-dark overrides
│   │   ├── assets/
│   │   │   └── kcc-logo.png           # KCC logo
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx        # Public landing page (/)
│   │   │   ├── user/
│   │   │   │   └── ChatPage.jsx       # Main chat interface (/chat)
│   │   │   └── admin/
│   │   │       ├── AdminLogin.jsx     # Admin login (/admin/login)
│   │   │       ├── AdminDashboard.jsx # Overview stats (/admin)
│   │   │       ├── AdminKnowledge.jsx # Upload & manage documents
│   │   │       ├── AdminAnnouncements.jsx # Post/schedule announcements
│   │   │       ├── AdminAnalytics.jsx # Analytics tabs
│   │   │       └── AdminSubscribers.jsx # View email subscribers
│   │   └── components/
│   │       ├── shared/
│   │       │   └── AdminLayout.jsx    # Admin sidebar with dark mode toggle + AI Assistant
│   │       ├── admin/
│   │       │   └── AdminAIAssistant.jsx # Floating AI bot (bottom-right, all admin pages)
│   │       └── user/
│   │           └── AnnouncementsPanel.jsx # Slide-up panel for users
│   ├── tailwind.config.js             # darkMode: 'class' enabled
│   └── vite.config.js                 # Proxy: /api → http://localhost:8000
│
├── .gitignore
└── SYSTEM_DOCS.md                     # This file
```

---

## 3. How to Run

### Backend (FastAPI)
```bash
cd c:/KCCSmartInfoX/backend
source venv/Scripts/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (React + Vite)
```bash
cd c:/KCCSmartInfoX/frontend
npm run dev -- --host
```

### Access URLs
| URL | Description |
|-----|-------------|
| `http://localhost:5173` | User-facing app (landing page) |
| `http://localhost:5173/chat` | Chatbot page |
| `http://localhost:5173/admin/login` | Admin login |
| `http://localhost:8000/docs` | FastAPI Swagger docs |
| `http://192.168.0.110:5173` | Access from phone on same network |

### Admin Credentials
- **Username:** `admin`
- **Password:** `admin123`

> If you need to create a new admin, POST to `/api/admin/setup` with `{ "username": "...", "password": "..." }`.
> This only works if no admin exists yet.

---

## 4. Database Schema

All tables are in `kccsmartinfox.db` (SQLite). Managed by SQLAlchemy — tables auto-create on startup via `init_db()`.

### `announcements`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | Auto-increment |
| `title` | VARCHAR(255) | Required |
| `content` | TEXT | Required |
| `publish_at` | DATETIME | NULL = publish immediately |
| `expires_at` | DATETIME | NULL = never expires |
| `image_path` | VARCHAR(500) | Path like `/api/announcement-images/filename.jpg` |
| `created_at` | DATETIME | Defaults to `datetime.now` |

### `subscribers`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `email` | VARCHAR(255) UNIQUE | |
| `created_at` | DATETIME | |

### `chat_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `question` | TEXT | What the student asked |
| `answer` | TEXT | AI's response |
| `is_answered` | BOOLEAN | `False` if AI said "I don't have info" |
| `created_at` | DATETIME | |

### `feedback`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `chat_log_id` | INTEGER FK → chat_logs | |
| `question` | TEXT | |
| `answer` | TEXT | |
| `rating` | VARCHAR(10) | `"up"` or `"down"` |
| `created_at` | DATETIME | |

### `knowledge_docs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `filename` | VARCHAR(255) | e.g., `enrollment_guide.pdf` |
| `filepath` | VARCHAR(500) | Disk path or `text://manual` |
| `uploaded_at` | DATETIME | |

### `admin_users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `username` | VARCHAR(100) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt hash |

### `admin_ai_logs`
| Column | Type | Notes |
|--------|------|-------|
| `id` | INTEGER PK | |
| `action` | VARCHAR(100) | e.g. `add_knowledge`, `post_announcement`, `delete_announcement` |
| `details` | TEXT | Human-readable description of what was done |
| `status` | VARCHAR(20) | `"success"` or `"error"` |
| `created_at` | DATETIME | UTC timestamp |

> **Note:** If you add columns to existing tables, SQLAlchemy's `create_all` does NOT run `ALTER TABLE`.
> You must run it manually in Python:
> ```python
> import sqlite3
> conn = sqlite3.connect("kccsmartinfox.db")
> conn.execute("ALTER TABLE announcements ADD COLUMN image_path VARCHAR(500)")
> conn.commit()
> ```

---

## 5. Backend — API Routes

### Public Routes (no auth needed)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send a question, get AI answer. Returns `answer`, `is_answered`, `chat_log_id`. Rate limited: 20/min. |
| `POST` | `/api/chat/feedback` | Submit 👍/👎 feedback. Body: `{ chat_log_id, question, answer, rating }` |
| `GET` | `/api/announcements` | Get live announcements (filters by publish_at ≤ now and expires_at ≥ now) |
| `POST` | `/api/subscribe` | Subscribe email. Body: `{ email }` |
| `GET` | `/api/subscribers` | Get total subscriber count (public) |

### Admin Routes (JWT required — `Authorization: Bearer <token>`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Login. Returns JWT token. |
| `POST` | `/api/admin/setup` | Create first admin account (one-time use). |
| `GET` | `/api/admin/analytics` | Full analytics data (stats, charts, top questions, unanswered, bad answers) |
| `GET` | `/api/admin/analytics/unanswered/export` | Download unanswered questions as CSV |
| `POST` | `/api/admin/knowledge/upload` | Upload single PDF/DOCX/TXT. Auto-ingests into ChromaDB. |
| `POST` | `/api/admin/knowledge/upload-bulk` | Upload multiple files at once. |
| `POST` | `/api/admin/knowledge/text` | Add raw text directly into ChromaDB. |
| `GET` | `/api/admin/knowledge` | List all uploaded documents. |
| `DELETE` | `/api/admin/knowledge/{id}` | Delete document from DB + ChromaDB + disk. |
| `GET` | `/api/announcements/all` | Get all announcements including scheduled/expired (admin view). |
| `POST` | `/api/announcements` | Create announcement (multipart form). Supports `title`, `content`, `publish_at`, `expires_at`, `image` file. |
| `DELETE` | `/api/announcements/{id}` | Delete announcement + its image file. |

### Admin AI Assistant Routes (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/ai/chat` | Send a natural language command. AI detects intent and executes it. Returns `{ reply, intent }`. |
| `GET` | `/api/admin/ai/history` | Get the last 50 logged AI actions with status and timestamps. |

**Supported intents:**
| Intent | Example command |
|--------|----------------|
| `add_knowledge` | `"add to knowledge base: library hours are 8am-5pm"` |
| `post_announcement` | `"post announcement: no classes on Friday"` |
| `delete_announcement` | `"delete announcement #3"` |
| `get_stats` | `"show me the dashboard stats"` |
| `get_unanswered` | `"show unanswered questions"` |
| `get_top_questions` | `"what are the most asked questions?"` |
| `get_subscribers` | `"how many subscribers do we have?"` |
| `get_documents` | `"show knowledge base documents"` |
| `general` | Any other question — AI answers directly |

### Static Files
| URL | Source |
|-----|--------|
| `/api/announcement-images/{filename}` | Served from `./knowledge_base/announcement_images/` |

---

## 6. AI Pipeline — How the Chatbot Works

Every chat message goes through this pipeline in `backend/rag/pipeline.py`:

```
Student types question
        │
        ▼
1. Greeting Detection
   - Regex checks for "hi", "hello", "kumusta", "thank you", etc.
   - If YES → reply with warm greeting via LLM (no RAG needed)
   - If NO  → continue to step 2
        │
        ▼
2. Quick Spell Fix (pyspellchecker)
   - Corrects common English typos word-by-word
   - Preserves Filipino/KCC words: "kumusta", "bsba", "registrar", etc.
        │
        ▼
3. Query Rewrite (LLM — llama-3.1-8b-instant)
   - Sends the spell-fixed text to an LLM with a REWRITE_PROMPT
   - LLM converts Taglish/typos/abbreviations into clean English
   - e.g. "magkano ang tution fe sa bsit" → "How much is the tuition fee for BSIT?"
        │
        ▼
4. Embedding (SentenceTransformers — all-MiniLM-L6-v2)
   - Converts clean question into a 384-dimensional vector
        │
        ▼
5. Semantic Search (ChromaDB)
   - Finds top 5 most similar document chunks from the knowledge base
   - If best match distance > 1.3 → treated as unanswered
        │
        ▼
6. Answer Generation (LLM — llama-3.1-8b-instant)
   - Sends retrieved context + original question to LLM
   - SYSTEM_PROMPT enforces: bullet points, no fabrication, KCC-specific answers
   - If AI says "I don't have information" → is_answered = False
        │
        ▼
7. Response saved to chat_logs table
   Returns: { answer, is_answered, chat_log_id }
```

### Key Constants in `pipeline.py`
- `UNANSWERED_PHRASE = "I don't have information about that yet"` — used to detect unanswered questions
- Distance threshold `> 1.3` = no relevant documents found
- `n_results=5` — retrieves top 5 chunks for context
- `max_tokens=600` for answers, `max_tokens=80` for query rewrite, `max_tokens=150` for greetings

---

## 7. Frontend Pages

### `/` — Landing Page (`LandingPage.jsx`)
- Hero section with KCC logo and tagline
- Quick links grid (e.g., Enrollment Info, Courses, Tuition)
- Latest announcements preview
- "Ask KCCSmartInfoX" button → navigates to `/chat`

### `/chat` — Chat Page (`ChatPage.jsx`)
- Chat UI with message bubbles
- **AI responses rendered with `react-markdown`** — supports bullet points, bold, numbered lists
- **Suggested questions** at start (FAQ quick replies)
- **Follow-up suggestions** after each AI answer
- **👍/👎 feedback buttons** on each AI message
- **Copy button** on AI messages
- **Announcements panel** (slide-up modal, bell icon)
- **Dark/Light mode toggle** (☀/🌙) — stored in `localStorage`
- Home button → back to `/`
- Mobile bottom navigation bar

### `/admin/login` — Admin Login (`AdminLogin.jsx`)
- Username + password form
- Calls `POST /api/admin/login`
- Saves JWT token to `localStorage` as `admin_token`

### `/admin` — Dashboard (`AdminDashboard.jsx`)
- Stat cards: Total Questions, Answer Rate, Thumbs Up, Thumbs Down, Subscribers, Documents
- Line chart: Questions per day (last 7 days)
- Quick actions: Add Knowledge, View Analytics, Post Announcement
- Unanswered questions list with pagination + "Fix gaps" link
- Auto-refreshes every 10 seconds

### `/admin/knowledge` — Knowledge Base (`AdminKnowledge.jsx`)
- Upload single file (PDF, DOCX, TXT)
- **Bulk upload** (multiple files at once) with per-file result status
- Add raw text directly
- List all documents with delete button

### `/admin/announcements` — Announcements (`AdminAnnouncements.jsx`)
- **Tab 1: Post Now** — publishes immediately + emails all subscribers
- **Tab 2: Schedule** — set `publish_at` and optional `expires_at`
- Optional image attachment with preview + remove button
- All announcements list with **StatusBadge** (Live / Scheduled / Expired)

### `/admin/analytics` — Analytics (`AdminAnalytics.jsx`)
- **Tab 1: Unanswered** — list of questions AI couldn't answer + CSV export
- **Tab 2: Top Questions** — horizontal bar chart of most-asked questions
- **Tab 3: Needs Improvement** — list of 👎 thumbs-down answers from users

### `/admin/subscribers` — Subscribers (`AdminSubscribers.jsx`)
- List all email subscribers with join date
- Auto-refreshes every 10 seconds + manual refresh button

---

## 8. Features Overview

| Feature | Status | Notes |
|---------|--------|-------|
| AI Chat (RAG) | ✅ Done | ChromaDB + Groq |
| Typo tolerance | ✅ Done | Spell fix + LLM rewrite |
| Taglish/Filipino support | ✅ Done | Query rewrite via LLM |
| Bullet point formatting | ✅ Done | SYSTEM_PROMPT rules + react-markdown |
| Feedback (👍/👎) | ✅ Done | Stored in `feedback` table |
| FAQ quick replies | ✅ Done | Shown at start + after answers |
| Landing page | ✅ Done | `/` route |
| Announcements (user) | ✅ Done | Slide-up panel with image support |
| Announcements (instant) | ✅ Done | Posts + emails subscribers immediately |
| Announcements (scheduled) | ✅ Done | `publish_at` / `expires_at` with UTC handling |
| Announcement images | ✅ Done | Upload image, stored as static file |
| Email notifications | ✅ Done | SendGrid on instant post |
| Email subscribe | ✅ Done | User can subscribe from announcements panel |
| Admin dark mode | ✅ Done | `.admin-dark` CSS class, Moon/Sun toggle |
| User dark/light mode | ✅ Done | ☀/🌙 toggle in chat page |
| Admin analytics | ✅ Done | Unanswered, top questions, bad answers |
| CSV export | ✅ Done | Export unanswered questions |
| Bulk file upload | ✅ Done | Multiple files at once |
| Single file upload | ✅ Done | PDF ✅, TXT ✅, DOCX ⚠️ (may fail) |
| Add text manually | ✅ Done | Paste content directly |
| Delete knowledge docs | ✅ Done | Removes from DB + ChromaDB + disk |
| JWT admin auth | ✅ Done | Token stored in localStorage |
| Rate limiting | ✅ Done | 20 chat req/min via slowapi |
| Mobile bottom nav | ✅ Done | Shows on small screens |
| Admin AI Assistant | ✅ Done | Floating bot button — chat commands + history log |
| Animations | 🔜 Next | Framer Motion — planned after finalization |

---

## 9. Admin Panel Guide

### How to Add Knowledge
1. Go to `/admin/knowledge`
2. Use **Upload File** (PDF/DOCX/TXT) — single or bulk
3. Or use **Add Text** to paste content directly
4. The content is split into chunks and indexed in ChromaDB
5. The AI will immediately start using this knowledge in answers

### How to Post an Announcement
1. Go to `/admin/announcements`
2. **Post Now tab** → fills title + content + optional image → clicks "Post & Send Email Now"
   - Goes live immediately
   - Sends email to all subscribers
3. **Schedule tab** → fills title + content + `publish_at` datetime + optional `expires_at` + optional image → "Schedule Announcement"
   - Appears to users only after `publish_at` time (UTC)
   - Disappears after `expires_at` if set

### How to Use the Admin AI Assistant
1. Look for the **purple 🤖 button** at the bottom-right of any admin page
2. Click it to open the chat panel
3. **Chat tab** — type natural language commands:
   - `"add to knowledge base: enrollment fee for BSIT is ₱15,000"`
   - `"post announcement: No classes on Friday due to holiday"`
   - `"show me today's stats"`
   - `"what questions were not answered?"`
   - Or click the **quick chips** for common actions
4. **History tab** — see every action taken (add, post, delete) with status (success/error) and timestamp

### How to Read Analytics
- **Answer Rate** = percentage of questions the AI could answer
- **Thumbs Up/Down** = user feedback on AI answers
- **Unanswered tab** = questions the AI said it doesn't have info on → add these to the knowledge base
- **Needs Improvement tab** = 👎 answers → review these and improve your documents

---

## 10. Known Issues & Fixes

### Issue 1: `email/` folder shadows Python built-in
- **Problem:** `backend/email/` shadowed Python's built-in `email` module → uvicorn crashed
- **Fix:** Renamed to `backend/email_module/` ✅

### Issue 2: bcrypt version conflict
- **Problem:** passlib + newer bcrypt → `ValueError: password cannot be longer than 72 bytes`
- **Fix:** Downgraded to `bcrypt==4.0.1` ✅
- **Note:** Uvicorn shows a watchfiles reload on startup due to bcrypt files — harmless, just wait

### Issue 3: DOCX file upload may fail indexing
- **Problem:** `.docx` ingestion can raise an exception before committing to DB
- **Fix Applied:** File is saved to DB first, then ingestion runs in try-except — failure shows error message but file is recorded ✅
- **Note:** If DOCX fails, delete it and try converting to PDF

### Issue 4: Scheduled announcements timezone mismatch
- **Problem:** `datetime-local` input gives local time (UTC+8 Philippines), server compares with UTC
- **Fix:** Frontend converts with `new Date(val).toISOString()` before sending — always UTC ✅
- **Rule:** Server always uses `datetime.utcnow()`. Frontend appends `'Z'` when parsing display dates.

### Issue 5: ALTER TABLE needed for new columns
- **Problem:** SQLAlchemy `create_all` doesn't modify existing tables
- **Fix:** Run manually via Python sqlite3 when adding columns to existing tables ✅

### Issue 6: Windows port conflicts
- **Problem:** Multiple ghost uvicorn processes on same port
- **Fix:** Kill all Python processes, restart on a fresh port

---

## 11. Environment Variables

File: `backend/.env`

```env
GROQ_API_KEY=your_groq_api_key_here
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=your_verified_sender@email.com
SECRET_KEY=your_jwt_secret_key_here
DATABASE_URL=sqlite:///./kccsmartinfox.db
```

> **Never commit `.env` to GitHub.** It is listed in `.gitignore`.

---

## 12. GitHub Backup

Repository: [https://github.com/KaisuS12/KCCSmartInfoX](https://github.com/KaisuS12/KCCSmartInfoX)

### Push changes
```bash
cd c:/KCCSmartInfoX
git add .
git commit -m "your message here"
git push
```

### Re-download on a new PC
```bash
git clone https://github.com/KaisuS12/KCCSmartInfoX.git
cd KCCSmartInfoX

# Set up backend
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows
pip install -r requirements.txt

# Set up frontend
cd ../frontend
npm install
```

> Then create `.env` in the backend folder with your API keys.

---

*Last updated: March 24, 2026*
