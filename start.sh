#!/bin/sh
echo "============================================"
echo "FlashMining - Starting Production Server"
echo "============================================"

# Show environment (without sensitive values)
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "HOSTNAME: $HOSTNAME"
echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'no')"
echo "NEXT_PUBLIC_APP_URL: $NEXT_PUBLIC_APP_URL"
echo "PWD: $(pwd)"
echo "Files in /app: $(ls /app/ | head -20)"

cd /app

# Run Prisma migrations (non-blocking)
echo "[1/2] Running database migrations..."
npx prisma db push --accept-data-loss 2>&1 || {
  echo "WARNING: Database migration issue, continuing..."
}

echo "[2/2] Starting Next.js server..."
echo "node version: $(node --version)"
exec npx next start -p 3000 -H 0.0.0.0
