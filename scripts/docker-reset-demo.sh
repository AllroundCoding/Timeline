#!/bin/bash
# Weekly demo reset script for Docker
# Restarts the container to trigger fresh demo seed
# 
# Usage: bash scripts/docker-reset-demo.sh
# Or add to crontab: 0 0 * * 0 cd /path/to/Timeline && bash scripts/docker-reset-demo.sh

echo "🔄 Docker Demo Reset Starting..."
timestamp=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$timestamp] Reset initiated" >> logs/reset.log

# Stop the container (triggers app exit)
echo "Stopping container..."
docker-compose down

# Verify it's stopped
sleep 2

# Remove data volume to start fresh
echo "Clearing database..."
docker volume rm timeline-data 2>/dev/null || true

# Start fresh - entrypoint will reseed automatically
echo "Starting with fresh demo data..."
docker-compose up -d

# Wait for app to be ready
echo "Waiting for app to be healthy..."
for i in {1..30}; do
  if docker-compose exec -T app curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Demo reset complete at [$timestamp]"
    echo "[$timestamp] Reset completed successfully" >> logs/reset.log
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo "❌ Reset failed - app didn't become healthy"
echo "[$timestamp] Reset FAILED - app timeout" >> logs/reset.log
exit 1
