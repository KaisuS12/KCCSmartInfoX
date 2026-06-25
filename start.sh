#!/bin/bash
# KCCSmartInfoX Linux Launcher

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo "================================================"
echo "  KCCSmartInfoX - Starting System..."
echo "================================================"
echo ""

# Recreate venv if it's the old Windows one or missing
if [ ! -f "$BACKEND_DIR/venv/bin/python3" ]; then
    echo "[Setup] Creating Python virtual environment..."
    rm -rf "$BACKEND_DIR/venv"
    python3 -m venv "$BACKEND_DIR/venv"
fi

# Install dependencies if uvicorn or spellchecker is missing
if [ ! -f "$BACKEND_DIR/venv/bin/uvicorn" ] || ! "$BACKEND_DIR/venv/bin/python3" -c "import spellchecker" 2>/dev/null; then
    echo "[Setup] Installing CPU-only PyTorch first (avoids 532MB GPU download)..."
    "$BACKEND_DIR/venv/bin/pip" install torch --index-url https://download.pytorch.org/whl/cpu
    echo "[Setup] Installing remaining backend dependencies..."
    "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

# Fix frontend node_modules if installed on Windows (missing Linux native rollup)
if [ ! -f "$FRONTEND_DIR/node_modules/@rollup/rollup-linux-x64-gnu/rollup.linux-x64-gnu.node" ]; then
    echo "[Setup] Reinstalling frontend dependencies for Linux..."
    rm -rf "$FRONTEND_DIR/node_modules" "$FRONTEND_DIR/package-lock.json"
    cd "$FRONTEND_DIR"
    npm install --legacy-peer-deps
fi

# Start Backend
echo "[1/2] Starting Backend..."
cd "$BACKEND_DIR"
"$BACKEND_DIR/venv/bin/uvicorn" main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

sleep 3

# Start Frontend
echo "[2/2] Starting Frontend..."
cd "$FRONTEND_DIR"
npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "================================================"
echo "  IMPORTANT: Wait ~20 seconds for AI to load!"
echo ""
echo "  Admin Panel  : http://localhost:5173/admin/login"
echo "  Chatbot      : http://localhost:5173/chat"
echo ""
echo "  Login: admin / admin123"
echo "  NOTE: Internet required for AI answers (Groq API)"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "================================================"
echo ""

trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait $BACKEND_PID $FRONTEND_PID
