#!/bin/sh
echo "============================================"
echo "FlashMining - Starting Production Server"
echo "============================================"

# Show environment (without sensitive values)
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo "DATABASE_URL is set: $([ -n \"$DATABASE_URL\" ] && echo 'yes' || echo 'no')"

# Run Prisma migrations
echo "[1/2] Running database migrations..."
cd /app
npx prisma db push --skip-generate --accept-data-loss || echo "WARNING: Database migration failed, continuing..."

echo "[2/2] Starting Next.js server..."
exec node server.js
