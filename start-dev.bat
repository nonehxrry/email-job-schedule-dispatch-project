@echo off
title ReachInbox Email Job Scheduler Launcher
echo ============================================================
echo 🚀 Launching ReachInbox Email Scheduler & Dashboard...
echo ============================================================

set "ROOT=%~dp0"

echo.
echo 📦 [1/2] Starting Backend Server (Port 5000)...
start "ReachInbox Backend API & BullMQ" cmd /k "cd /d %ROOT%backend && npm run dev"

echo 🌐 [2/2] Starting Frontend Dashboard (Port 5173)...
start "ReachInbox Frontend React" cmd /k "cd /d %ROOT%frontend && npm run dev"

timeout /t 3 >nul

echo.
echo ============================================================
echo ✅ Servers are running in dedicated windows!
echo 💻 Dashboard URL:             http://localhost:5173
echo 📊 BullMQ Live Queue Monitor: http://localhost:5000/admin/queues
echo ============================================================
pause
