@echo off
start "Backend ENSAJ" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate.bat && uvicorn main:app --port 8000"
start "Frontend ENSAJ" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 >nul
start http://localhost:5173
