#!/bin/bash
# Start both frontend and backend dev servers

set -e

echo "🚀 Starting GatherGrove Development Servers..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Not in gathergrove-frontend directory"
  echo "Please run this script from the frontend directory"
  exit 1
fi

# Start backend in background
echo "📦 Starting backend server..."
cd ../gathergrove-backend
if [ ! -f "main.py" ]; then
  echo "❌ Error: Backend directory not found"
  exit 1
fi

# Start FastAPI backend
poetry run uvicorn app.main:app --reload --port 8000 > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

# Go back to frontend
cd ../gathergrove-frontend

# Start frontend
echo "🎨 Starting frontend server..."
npm run dev > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

# Save PIDs
mkdir -p ../logs
echo $BACKEND_PID > ../logs/backend.pid
echo $FRONTEND_PID > ../logs/frontend.pid

echo ""
echo "✅ All servers started!"
echo ""
echo "📝 Access points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📋 Logs:"
echo "   Frontend: tail -f ../logs/frontend.log"
echo "   Backend:  tail -f ../logs/backend.log"
echo ""
echo "🛑 To stop servers: ./stop-dev.sh"
