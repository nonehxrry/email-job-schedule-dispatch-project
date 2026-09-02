# ReachInbox Full-Stack Email Job Scheduler - 1-Click Launch Script
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching ReachInbox Email Scheduler & Dashboard..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$RootPath = $PSScriptRoot

# 1. Start Backend in a new background window
Write-Host "`n📦 [1/2] Starting Backend API & BullMQ Engine on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\backend'; npm run dev"

# 2. Start Frontend in a new background window
Write-Host "🌐 [2/2] Starting Frontend React Dashboard on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$RootPath\frontend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host "✅ Both Backend & Frontend servers have launched!" -ForegroundColor Green
Write-Host "💻 Dashboard URL:             http://localhost:5173" -ForegroundColor Green
Write-Host "📊 BullMQ Live Queue Monitor: http://localhost:5000/admin/queues" -ForegroundColor Green
Write-Host "⚙️ Backend API:               http://localhost:5000/api" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
