#!/bin/sh
# ============================================================================
# ActionCash - Cron Job Runner
# ============================================================================
# Runs alongside Next.js inside the Docker container.
# Calls the cron API endpoints on schedule using curl.
# ============================================================================

# Wait for the Next.js server to be ready
echo "[cron-runner] Waiting for Next.js server to be ready..."
MAX_WAIT=120
WAITED=0
until curl -sf http://localhost:3000/api/landing > /dev/null 2>&1; do
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "[cron-runner] WARNING: Server not ready after ${MAX_WAIT}s. Starting anyway..."
    break
  fi
  sleep 5
  WAITED=$((WAITED + 5))
done
echo "[cron-runner] Server is ready. Starting cron scheduler..."

# Cron secret from environment
CRON_SECRET="${CRON_SECRET:-}"
AUTH_HEADER="Authorization: Bearer ${CRON_SECRET}"
BASE_URL="http://localhost:3000"

# Track last run times (in seconds since epoch)
LAST_DAILY=0
LAST_WEEKLY=0
LAST_MONTHLY=0

# Interval constants (in seconds)
DAILY_INTERVAL=86400      # 24 hours
WEEKLY_INTERVAL=604800    # 7 days
MONTHLY_INTERVAL=2592000  # 30 days

# Get current day of week (0=Sunday)
get_dow() {
  date -u +%w
}

# Get current day of month
get_dom() {
  date -u +%d
}

# Get current hour (UTC)
get_hour() {
  date -u +%H
}

call_cron() {
  local endpoint="$1"
  local name="$2"
  echo "[cron-runner] [$(date -u '+%Y-%m-%d %H:%M:%S UTC')] Running ${name}..."
  local http_code
  http_code=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}${endpoint}" \
    -H "${AUTH_HEADER}" \
    -H "Content-Type: application/json" \
    --max-time 300 2>/dev/null) || http_code="000"
  
  if [ "$http_code" = "200" ]; then
    echo "[cron-runner] [$(date -u '+%Y-%m-%d %H:%M:%S UTC')] ${name} completed successfully (HTTP ${http_code})"
  else
    echo "[cron-runner] [$(date -u '+%Y-%m-%d %H:%M:%S UTC')] ${name} FAILED (HTTP ${http_code})"
  fi
}

# Run daily ROI distribution on startup (catch up on missed runs)
echo "[cron-runner] Running startup daily ROI distribution (catch-up)..."
call_cron "/api/cron/distribute" "Startup Daily ROI Distribution"

# Main loop — check every 60 seconds
while true; do
  NOW=$(date -u +%s)
  DOW=$(get_dow)
  DOM=$(get_dom)
  HOUR=$(get_hour)
  
  # ── DAILY ROI DISTRIBUTION ──
  # Run every day at 00:05 UTC (or first check after midnight)
  if [ "$HOUR" = "00" ] && [ $((NOW - LAST_DAILY)) -ge $DAILY_INTERVAL ]; then
    call_cron "/api/cron/distribute" "Daily ROI Distribution"
    LAST_DAILY=$NOW
  fi
  
  # ── WEEKLY BONUSES (Sunday at 00:10 UTC) ──
  # DOW=0 means Sunday
  if [ "$DOW" = "0" ] && [ "$HOUR" = "00" ] && [ $((NOW - LAST_WEEKLY)) -ge $WEEKLY_INTERVAL ]; then
    call_cron "/api/cron/weekly-bonuses" "Weekly Bonuses (Salary + Gold)"
    LAST_WEEKLY=$NOW
  fi
  
  # ── MONTHLY DAYMOND (1st of month at 00:15 UTC) ──
  if [ "$DOM" = "01" ] && [ "$HOUR" = "00" ] && [ $((NOW - LAST_MONTHLY)) -ge $MONTHLY_INTERVAL ]; then
    call_cron "/api/cron/monthly-daymond" "Monthly Daymond Package"
    LAST_MONTHLY=$NOW
  fi
  
  # Check every 60 seconds
  sleep 60
done
