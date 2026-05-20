#!/bin/bash
cd /home/z/my-project
while true; do
  echo "Starting Next.js server..."
  NODE_OPTIONS='--max-old-space-size=768' node node_modules/.bin/next dev -p 3000
  EXIT_CODE=$?
  echo "Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
