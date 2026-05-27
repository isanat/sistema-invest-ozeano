#!/bin/sh
set -eu

echo "============================================"
echo "ActionCash - PLATAFORMA ROI Starting"
echo "============================================"

echo "NODE_ENV: ${NODE_ENV:-}"
echo "PORT: ${PORT:-}"
echo "HOSTNAME: ${HOSTNAME:-}"
echo "DATABASE_URL is set: $([ -n "${DATABASE_URL:-}" ] && echo 'yes' || echo 'no')"
echo "PWD: $(pwd)"

cd /app

if [ -z "${DATABASE_URL:-}" ]; then
  echo "WARNING: DATABASE_URL is not set. Some features may not work."
fi

if [ -n "${DATABASE_URL:-}" ]; then
  MAX_ATTEMPTS=5
  ATTEMPT=1

  echo "[1/2] Applying database schema with prisma db push..."
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
fi

echo "[2/2] Starting Next.js server..."
echo "node version: $(node --version)"
exec npx next start -p 3000 -H 0.0.0.0
