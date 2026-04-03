#!/bin/bash

# Ygy - Unified Brain Training Platform
# One-command deployment script

set -e

echo "🚀 Starting Ygy - Strategic Cognitive Enhancement Platform"
echo "=========================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

echo "📦 Building and starting all services..."

# Start all services
docker-compose -f docker-compose.ygy.yml up -d --build

echo "⏳ Waiting for services to be healthy..."

# Wait for database to be ready
echo "Waiting for PostgreSQL..."
docker-compose -f docker-compose.ygy.yml exec -T db sh -c 'while ! pg_isready -U ygy -d ygy; do sleep 1; done'

# Wait for Redis to be ready
echo "Waiting for Redis..."
docker-compose -f docker-compose.ygy.yml exec -T redis sh -c 'while ! redis-cli ping | grep -q PONG; do sleep 1; done'

# Wait for API to be ready
echo "Waiting for API..."
timeout=60
counter=0
while ! curl -f http://localhost/api/health/ready > /dev/null 2>&1; do
    if [ $counter -ge $timeout ]; then
        echo "❌ API failed to start within ${timeout} seconds"
        exit 1
    fi
    sleep 2
    counter=$((counter + 2))
done

echo "✅ All services are running!"
echo ""
echo "🌐 Ygy Platform URLs:"
echo "   Web App:     http://localhost"
echo "   API:         http://localhost/api/"
echo "   Analytics:   http://localhost/analytics/"
echo "   Grafana:     http://localhost:3001 (admin/ygy2024)"
echo "   Prometheus:  http://localhost:9090"
echo "   Flower:      http://localhost:5555 (admin/ygy2024)"
echo ""
echo "📱 Mobile App:"
echo "   APK Location: mobile_app/build/app/outputs/flutter-apk/app-release.apk"
echo ""
echo "🛑 To stop: docker-compose -f docker-compose.ygy.yml down"
echo "🔄 To restart: docker-compose -f docker-compose.ygy.yml restart"
echo "📊 To view logs: docker-compose -f docker-compose.ygy.yml logs -f"