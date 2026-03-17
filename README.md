# KCCSmartInfoX

An Integrated Administration Information Application for Kabankalan Catholic College, Inc.

An AI-powered chatbot that answers questions strictly from KCC's own uploaded documents (RAG system). No hallucination — it only uses information the admin has provided.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Recharts, Lucide |
| Backend | FastAPI, Python 3.11+ |
| AI Model | Llama 3 (llama3-8b-8192) via Groq API |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 (local) |
| Vector DB | ChromaDB (local persistent) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Email | SendGrid |
| Auth | JWT + bcrypt |

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- Groq API key — https://console.groq.com
- SendGrid API key (optional, for email announcements)

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
SENDGRID_API_KEY=your_sendgrid_key_here
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

### Frontend (Vite)

```bash
cd C:\KCCSmartInfoX\frontend
npm run dev -- --host
```

- **Local**: http://localhost:5173
- **Network (phone/tablet)**: http://YOUR_LOCAL_IP:5173

---

## First-Time Admin Setup

After running the backend for the first time, create the admin account:

```bash
curl -X POST http://localhost:8000/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

Or using Python:
```python
import requests
requests.post('http://localhost:8000/api/admin/setup',
    json={'username': 'admin', 'password': 'yourpassword'})
```

Then log in at: http://localhost:5173/admin/login

---

## How It Works

1. Admin uploads KCC documents (PDF, DOCX, TXT) or pastes text via the Knowledge Base page
2. Documents are chunked and embedded into ChromaDB (vector database)
3. When a user asks a question, the system:
   - Converts the question to an embedding (local, no API cost)
   - Finds the most relevant document chunks in ChromaDB
   - Sends those chunks + the question to Llama 3 via Groq
   - Returns an answer based ONLY on the provided documents
4. If no relevant document is found, the question is logged as "unanswered" for admin review

---

## Key URLs

| URL | Description |
|---|---|
| http://localhost:5173 | User chat interface |
| http://localhost:5173/admin/login | Admin login |
| http://localhost:8000/docs | FastAPI Swagger docs |
| http://localhost:8000/api/admin/setup | One-time admin creation |

---

## Project Structure

```
KCCSmartInfoX/
├── backend/
│   ├── main.py              ← FastAPI entry point
│   ├── requirements.txt
│   ├── .env                 ← API keys (never commit this)
│   ├── models/database.py   ← SQLAlchemy models
│   ├── routes/
│   │   ├── chat.py          ← POST /api/chat (rate limited: 20/min)
│   │   ├── admin.py         ← Admin API routes
│   │   ├── announcements.py
│   │   └── subscribers.py
│   ├── rag/
│   │   ├── pipeline.py      ← RAG query (ChromaDB + Groq Llama 3)
│   │   └── ingestion.py     ← PDF/DOCX/TXT ingestion
│   ├── utils/auth.py        ← JWT + bcrypt
│   ├── notifications/       ← SendGrid email service
│   └── knowledge_base/
│       ├── documents/       ← Uploaded files stored here
│       └── vectorstore/     ← ChromaDB data
└── frontend/
    └── src/
        ├── pages/user/      ← Chat UI (public)
        └── pages/admin/     ← Admin panel (protected)
```

---

## Rate Limits

| Endpoint | Limit |
|---|---|
| POST /api/chat | 20 requests/minute per IP |
| POST /api/admin/knowledge/upload | 10 requests/minute per IP |

---

## Supported File Types

| Format | Status |
|---|---|
| PDF (.pdf) | Supported |
| Word (.docx) | Supported |
| Plain text (.txt) | Supported |
| Manual text paste | Supported |
