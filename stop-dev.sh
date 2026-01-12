#!/bin/bash
# Stop both frontend and backend dev servers

echo "🛑 Stopping GatherGrove Development Servers..."

# Read PIDs
BACKEND_PID=$(cat ../logs/backend.pid 2>/dev/null)
FRONTEND_PID=$(cat ../logs/frontend.pid 2>/dev/null)

# Stop backend
if [ ! -z "$BACKEND_PID" ]; then
  if kill $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend stopped (PID: $BACKEND_PID)"
  else
    echo "ℹ️  Backend was not running"
  fi
  rm -f ../logs/backend.pid
fi

# Stop frontend
if [ ! -z "$FRONTEND_PID" ]; then
  if kill $FRONTEND_PID 2>/dev/null; then
    echo "✅ Frontend stopped (PID: $FRONTEND_PID)"
  else
    echo "ℹ️  Frontend was not running"
  fi
  rm -f ../logs/frontend.pid
fi

# Also try to kill by port (in case PIDs don't work)
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo "✅ Killed process on port 8000" || true
lsof -ti:5173 | xargs kill -9 2>/dev/null && echo "✅ Killed process on port 5173" || true

echo ""
echo "✅ All servers stopped!"
