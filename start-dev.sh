#!/bin/bash
# Start Next.js dev server with warmup for sandbox environment
# The warmup pre-compiles API routes one at a time to prevent memory spikes

cd /home/z/my-project

# Kill any existing server
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 2

# Start server
node node_modules/.bin/next dev -p 3000 >> /home/z/my-project/dev.log 2>&1 &
NPID=$!
disown -a

# Wait for server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 30); do
  if ss -tlnp | grep -q ":3000 "; then
    echo "Server is listening on port 3000"
    break
  fi
  sleep 1
done

# Warmup API routes one at a time to prevent memory spike from parallel compilation
echo "Warming up API routes..."
sleep 2

WARMUP_ROUTES=(
  "GET /api/auth/me"
  "GET /api/landing"
  "POST /api/auth/login"
  "POST /api/auth/register"
  "GET /api/exchange-rate"
  "GET /api/copy-traders"
  "GET /api/plans"
  "GET /api/investments"
  "GET /api/transactions"
  "GET /api/nowpayments/currencies"
)

for route in "${WARMUP_ROUTES[@]}"; do
  METHOD=$(echo "$route" | cut -d' ' -f1)
  PATH_=$(echo "$route" | cut -d' ' -f2)
  
  node -e "
    const http = require('http');
    const opts = {hostname:'127.0.0.1', port:3000, path:'$PATH_', method:'$METHOD', timeout:10000};
    if ('$METHOD' === 'POST') {
      opts.headers = {'Content-Type':'application/json'};
    }
    const data = '$METHOD' === 'POST' ? JSON.stringify({email:'warmup@test.com',password:'warmup',name:'warmup',confirmPassword:'warmup'}) : '';
    if (data) opts.headers['Content-Length'] = data.length;
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => console.log('$METHOD $PATH_:', res.statusCode));
    });
    req.on('error', e => console.error('$METHOD $PATH_ Error:', e.message));
    if (data) req.write(data);
    req.end();
  " 2>/dev/null
  
  sleep 1
done

echo "Warmup complete! Server is ready."
echo "PID: $NPID"
