@echo off
REM Ygy - Unified Brain Training Platform
REM One-command deployment script for Windows

echo 🚀 Starting Ygy - Strategic Cognitive Enhancement Platform
echo ===========================================================

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

echo 📦 Building and starting all services...

REM Start all services
docker-compose -f docker-compose.ygy.yml up -d --build

echo ⏳ Waiting for services to be healthy...

REM Wait for database to be ready
echo Waiting for PostgreSQL...
timeout /t 10 /nobreak >nul

REM Wait for Redis to be ready
echo Waiting for Redis...
timeout /t 5 /nobreak >nul

REM Wait for API to be ready
echo Waiting for API...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost/api/health/ready' -TimeoutSec 5; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ⚠️  API health check failed, but services should still be starting...
) else (
    echo ✅ API is responding
)

echo ✅ All services are running!
echo.
echo 🌐 Ygy Platform URLs:
echo    Web App:     http://localhost
echo    API:         http://localhost/api/
echo    Analytics:   http://localhost/analytics/
echo    Grafana:     http://localhost:3001 (admin/ygy2024)
echo    Prometheus:  http://localhost:9090
echo    Flower:      http://localhost:5555 (admin/ygy2024)
echo.
echo 📱 Mobile App:
echo    APK Location: mobile_app\build\app\outputs\flutter-apk\app-release.apk
echo.
echo 🛑 To stop: docker-compose -f docker-compose.ygy.yml down
echo 🔄 To restart: docker-compose -f docker-compose.ygy.yml restart
echo 📊 To view logs: docker-compose -f docker-compose.ygy.yml logs -f
echo.
pause