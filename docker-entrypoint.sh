#!/bin/sh
# Docker entrypoint script
# Initializes demo on first run, starts the server

set -e

echo "🚀 Timeline Server Starting..."

# Check if this is first run (no demo user exists)
if ! node -e "const {getAccountsDb} = require('./src/db/connection'); const accountsDb = getAccountsDb(); const user = accountsDb.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get('demo'); process.exit(user ? 0 : 1)"; then
  echo "📅 First run detected - seeding demo account..."
  node scripts/seed-demo.js 5000
  echo "✅ Demo account ready!"
else
  echo "✓ Demo account exists"
fi

echo "🌐 Starting server on port 3000..."
exec "$@"
