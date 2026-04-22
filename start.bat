@echo off
title KCCSmartInfoX Launcher
color 0A

echo ================================================
echo   KCCSmartInfoX - Starting System...
echo ================================================
echo.

REM Start Backend (must run from backend folder so DB path is correct)
echo [1/2] Starting Backend...
start "KCCSmartInfoX Backend" cmd /k "cd /d C:\KCCSmartInfoX\backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

REM Start Frontend
echo [2/2] Starting Frontend...
start "KCCSmartInfoX Frontend" cmd /k "cd /d C:\KCCSmartInfoX\frontend && npm run dev -- --host"

echo.
echo ================================================
echo   IMPORTANT: Wait ~20 seconds for AI to load!
echo.
echo   Admin Panel  : http://localhost:5173/admin/login
echo   Chatbot      : http://localhost:5173/chat
echo   Phone access : http://192.168.0.106:5173
echo.
echo   Login: admin ^/ admin123
echo.
echo   NOTE: Internet required for AI answers (Groq API)
echo ================================================
echo.
pause
