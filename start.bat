@echo off
echo Starting KCCSmartInfoX...
echo.

start "Backend" cmd /k "cd /d C:\KCCSmartInfoX\backend && call venv\Scripts\activate.bat && uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

start "Frontend" cmd /k "cd /d C:\KCCSmartInfoX\frontend && npm run dev -- --host"

echo.
echo Servers starting...
echo.
echo   Chat (Local):    http://localhost:5173
echo   Chat (Phone):    http://192.168.0.109:5173
echo.
echo   Admin (Local):   http://localhost:5173/admin/login
echo   Admin (Phone):   http://192.168.0.109:5173/admin/login
echo.
echo   Admin credentials: admin / admin123
echo.
echo Wait ~20 seconds for the AI model to load.
pause
