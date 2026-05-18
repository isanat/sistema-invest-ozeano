#!/bin/sh
set -e

echo "============================================"
echo "FlashMining - Starting Production Server"
echo "============================================"

# Run Prisma migrations (push schema to database)
echo "[1/2] Running database migrations..."
cd /app
npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
    echo "WARNING: Database migration failed. Retrying in 5 seconds..."
    sleep 5
    npx prisma db push --skip-generate --accept-data-loss 2>&1 || {
        echo "ERROR: Database migration failed after retry. Continuing anyway..."
    }
}

echo "[2/2] Starting Next.js server..."
exec node server.js
