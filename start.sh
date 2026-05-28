#!/bin/sh
set -eu

echo "============================================"
echo "ActionCash - PLATAFORMA ROI Starting"
echo "============================================"

echo "NODE_ENV: ${NODE_ENV:-}"
echo "PORT: ${PORT:-}"
echo "HOSTNAME: ${HOSTNAME:-}"
echo "DATABASE_URL is set: $([ -n "${DATABASE_URL:-}" ] && echo 'yes' || echo 'no')"
echo "JWT_SECRET is set: $([ -n "${JWT_SECRET:-}" ] && echo 'yes' || echo 'no')"
echo "CRON_SECRET is set: $([ -n "${CRON_SECRET:-}" ] && echo 'yes' || echo 'no')"
echo "PWD: $(pwd)"

cd /app

# SAFETY CHECK: Verify schema.prisma uses PostgreSQL, NOT SQLite
if grep -q 'provider = "sqlite"' prisma/schema.prisma 2>/dev/null; then
  echo "FATAL: prisma/schema.prisma has provider=sqlite! This project requires PostgreSQL."
  echo "The prisma-provider.js script may have incorrectly switched the provider."
  echo "Fix: set provider = \"postgresql\" in prisma/schema.prisma and rebuild."
  exit 1
fi
echo "Verified: schema.prisma uses PostgreSQL provider."

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. The application requires a PostgreSQL database."
  echo "Please set DATABASE_URL in your Coolify environment variables."
  exit 1
fi

if [ -z "${JWT_SECRET:-}" ]; then
  echo "WARNING: JWT_SECRET is not set. Using insecure fallback."
  echo "Please set JWT_SECRET in your Coolify environment variables for production."
fi

# Verify DATABASE_URL is a PostgreSQL URL
case "${DATABASE_URL}" in
  postgresql://*|postgres://*) echo "DATABASE_URL protocol: PostgreSQL ✓" ;;
  file://*) echo "FATAL: DATABASE_URL uses file:// protocol (SQLite). This project requires PostgreSQL!"; exit 1 ;;
  *) echo "WARNING: DATABASE_URL doesn't look like a PostgreSQL URL: ${DATABASE_URL%%\?*}" ;;
esac

# Apply database schema
MAX_ATTEMPTS=5
ATTEMPT=1

echo "[1/3] Applying database schema with prisma db push..."
until npx prisma db push --skip-generate --accept-data-loss 2>&1; do
  if [ "$ATTEMPT" -ge "$MAX_ATTEMPTS" ]; then
    echo "WARNING: Prisma db push failed after ${MAX_ATTEMPTS} attempts. Continuing anyway..."
    break
  fi
  echo "Prisma db push failed (attempt ${ATTEMPT}/${MAX_ATTEMPTS}). Retrying in 5s..."
  ATTEMPT=$((ATTEMPT + 1))
  sleep 5
done

echo "Database schema applied."

# Start cron runner in the background
echo "[2/3] Starting cron scheduler in background..."
/app/cron-runner.sh &
CRON_PID=$!
echo "Cron runner started (PID: ${CRON_PID})"

# Start Next.js server in the foreground
echo "[3/3] Starting Next.js server..."
echo "node version: $(node --version)"

# Handle shutdown gracefully
cleanup() {
  echo "Shutting down..."
  kill ${CRON_PID} 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

exec npx next start -p 3000 -H 0.0.0.0
