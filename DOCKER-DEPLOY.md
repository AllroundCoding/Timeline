# Docker Deployment Guide

## Quick Start - Local

Build and run locally with Docker Compose:

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

App will be available at `http://localhost:3000`

**Demo Login:** `demo` / `demo`

## Production Deployment

### Server Setup Requirements
- Docker & Docker Compose installed
- Port 3000 accessible (or reverse proxy like nginx)
- Cron access for weekly resets

### 1. Deploy to Server

```bash
# SSH into server
ssh user@your-server.com

# Clone repo
git clone https://github.com/yourusername/Timeline.git
cd Timeline

# Start the app
docker-compose up -d

# Check it's running
docker-compose logs -f app
```

### 2. Setup Weekly Reset via Cron

Add this to server's crontab to reset every Sunday at midnight:

```bash
# Edit crontab
crontab -e

# Add this line (Sunday 00:00 UTC)
0 0 * * 0 cd /path/to/Timeline && bash scripts/docker-reset-demo.sh

# Verify it was added
crontab -l
```

The reset process:
1. Stops the running container
2. Removes the database volume
3. Starts fresh with entrypoint seeding 5000 events
4. Takes ~30 seconds to complete

### 3. Setup Reverse Proxy (Optional)

If running on port 3000 and want HTTPS/custom domain:

**Nginx example:**
```nginx
server {
    listen 80;
    server_name timeline.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Then use Let's Encrypt for HTTPS:
```bash
sudo certbot --nginx -d timeline.example.com
```

## Container Details

### Volumes
- `timeline-data` - Persists all databases (`/app/data`)
  - Survives container restart
  - Cleared weekly when reset script runs

### Environment
- `NODE_ENV=production` - Optimized for production
- Port `3000` - Exposed to host

### Healthcheck
Container has built-in healthcheck:
- Tests every 30 seconds
- Failure after 3 retries triggers restart
- Only starts checking after 40s startup period

## Monitoring

### Check logs
```bash
docker-compose logs app
docker-compose logs -f app  # follow
```

### View disk usage (database size)
```bash
docker volume ls
docker volume inspect timeline-data
```

### Manual reset (without cron)
```bash
bash scripts/docker-reset-demo.sh
```

## Advanced: Custom Reset Schedule

Edit `scripts/docker-reset-demo.sh` for different reset frequency:

```bash
# Different cron schedules:

# Daily reset at 2 AM
0 2 * * * cd /path/to/Timeline && bash scripts/docker-reset-demo.sh

# Every 12 hours
0 */12 * * * cd /path/to/Timeline && bash scripts/docker-reset-demo.sh

# Every Friday at 6 PM
0 18 * * 5 cd /path/to/Timeline && bash scripts/docker-reset-demo.sh

# Never reset (comment out the cron line)
# 0 0 * * 0 ...
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs app
# Check for errors, usually dependency issues
```

### Port 3000 already in use
```yaml
# In docker-compose.yml, change:
ports:
  - "8080:3000"  # Use 8080 instead
```

### Database locked
```bash
# Clean restart
docker-compose down
docker-compose up -d
```

### Reset script failing
```bash
# Check logs
cat logs/reset.log

# Run manually with debug
bash -x scripts/docker-reset-demo.sh
```

### Want to preserve data between resets
```bash
# Comment out the volume removal line in docker-reset-demo.sh:
# docker volume rm timeline-data 2>/dev/null || true
```

## Deployment Platforms

If you prefer managed container hosting:

### Railway
```bash
# Connect GitHub repo, auto-deploys on push
# Manage cron job via scheduled jobs feature
```

### Render
```bash
# Deploy from GitHub
# Use render.yaml for docker-compose settings
```

### AWS ECS / Docker Hub
Push image to registry and deploy from there.

---

See [DEMO-SETUP.md](DEMO-SETUP.md) for other hosting options.
