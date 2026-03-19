# Demo Site Setup Guide

## 🐳 Docker (Recommended for Self-Hosting)

Simplest way to self-host with automatic weekly resets:

```bash
# Local development
docker-compose up -d

# Production server
ssh user@your-server.com
cd /path/to/Timeline
docker-compose up -d

# Add to crontab for weekly reset (Sundays at midnight)
0 0 * * 0 cd /path/to/Timeline && bash scripts/docker-reset-demo.sh
```

**Full guide:** See [DOCKER-DEPLOY.md](DOCKER-DEPLOY.md)

---

## Quick Start - Local Demo

### 1. Create and Seed Demo Account

```bash
# Initial setup: creates demo account and seeds 5000 random events
npm run seed-demo

# Or with custom number of events (e.g., 20,000 for a heavier demo)
npm run seed-demo:heavy

# Or specify custom count
node scripts/seed-demo.js 10000
```

**Demo Login:**
- Username: `demo`
- Password: `demo`

## Automatic Weekly Reset

The GitHub Actions workflow automatically resets the demo account every Monday at 00:00 UTC.

**How it works:**
- `.github/workflows/reset-demo.yml` runs on schedule
- Clears existing timeline data
- Seeds fresh 5000 random events
- Commits changes to git

**To trigger manually:**
```bash
# Manual trigger via GitHub Actions UI
# or via GitHub CLI:
gh workflow run reset-demo.yml
```

## Hosting Options

This is a **Node.js + SQLite** application. GitHub Pages **cannot** host this (it's static-site only).

### Option 1: Docker (Self-Hosted - Recommended)
Deploy anywhere with Docker Compose. Includes automatic weekly reset via cron job.
- Full control over your data
- Easy to deploy on any VPS
- Includes reset script and cron setup
- See [DOCKER-DEPLOY.md](DOCKER-DEPLOY.md) for complete guide

### Option 2: Railway (Managed - Simplest)
- Free tier includes database support
- Deploy via git push
- SQLite databases persist automatically
- https://railway.app

- Managed hosting (no server to manage)
- SQLite databases persist automatically
- https://railway.app

```bash
# After pushing to GitHub:
1. Go to railway.app
2. Create new project
3. Connect GitHub repo
4. Deploy instantly
```

### Option 3: Render
- Free tier with auto-pause
- SQLite support with persistent volumes
- https://render.com

```bash
1. Create new Web Service
2. Connect GitHub repo
3. Configure build: npm install
4. Configure start: npm start (or: node index.js)
5. Set up persistent volume for /data
```

### Option 4: Fly.io
- Global deployment
- Free tier available
- https://fly.io

```bash
npm install -g flyctl
flyctl launch
flyctl deploy
```

### Option 5: Heroku (Legacy - No Free Tier)
- Paid option starting at $7/month
- Used to be popular choice

### Option 6: Self-Hosted (VPS)
- DigitalOcean, Linode, AWS EC2, etc.
- Use Docker for easiest deployment (see Option 1)
- Or setup Node.js server directly
- Use cron job for weekly reset

**Recommended:** Use Docker Compose for easiest VPS setup. See [DOCKER-DEPLOY.md](DOCKER-DEPLOY.md).

## Database Files

Demo account database is at: `data/users/{user-id}/timeline.db`

All user databases are in `data/users/` directory.

## Customization

### Adjust demo data density:
```bash
# Light demo (1000 events)
npm run seed-demo -- 1000

# Heavy demo (20000 events)
npm run seed-demo:heavy
```

### Adjust reset frequency:
Edit `.github/workflows/reset-demo.yml` and change the cron schedule:

```yaml
# Current: Every Monday at midnight UTC
- cron: '0 0 * * 1'

# Change to: Every day at 6 AM UTC
- cron: '0 6 * * *'

# Change to: Every Sunday and Thursday
- cron: '0 0 * * 0,4'
```

See [cron syntax guide](https://crontab.guru/).

## Self-Hosted Weekly Reset (Alternative)

If not using GitHub Actions, you can use a cron job on your server:

```bash
# Add to crontab (runs weekly on Sundays at 3 AM)
0 3 * * 0 cd /path/to/Timeline && npm run seed-demo

# Or with cron job manager
# crontab -e
```

## Troubleshooting

### GitHub Actions failing to commit?
Make sure `GITHUB_TOKEN` is available (it is by default).

### Database locked error?
This happens when multiple processes access SQLite simultaneously.
- Ensure only one instance runs at a time
- Check no development server is running on hosting platform

### Want to keep demo data between resets?
Remove the GitHub Actions workflow or disable it.

---

**Questions?** See the main README.md for the full application guide.
