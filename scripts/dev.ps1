# Start API + Vite dev (two terminals recommended). Requires Python 3.11+ and Node 18+.
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Backend:  uvicorn api:app --reload --port 8000  (from backend/)"
Write-Host "Frontend: npm run dev  (from Ygy-app/)"
Write-Host "Optional: docker compose up --build"

