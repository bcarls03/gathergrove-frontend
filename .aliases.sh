# GatherGrove Development Aliases
# Add this to your ~/.zshrc or ~/.bashrc

# Quick navigation
alias gg="cd /Users/briancarlberg/dev/gathergrove-frontend"
alias ggb="cd /Users/briancarlberg/dev/gathergrove-backend"

# Server management
alias gg-start="cd /Users/briancarlberg/dev/gathergrove-frontend && ./start-dev.sh"
alias gg-stop="cd /Users/briancarlberg/dev/gathergrove-frontend && ./stop-dev.sh"
alias gg-status="curl -s http://localhost:5173 >/dev/null && echo '✅ Frontend: http://localhost:5173' || echo '❌ Frontend not running'; curl -s http://localhost:8000/health >/dev/null && echo '✅ Backend: http://localhost:8000' || echo '❌ Backend not running'"

# Quick restart
alias gg-restart="cd /Users/briancarlberg/dev/gathergrove-frontend && ./stop-dev.sh && sleep 2 && ./start-dev.sh"

# Frontend only
alias gg-fe="cd /Users/briancarlberg/dev/gathergrove-frontend && npm run dev"

# Backend only  
alias gg-be="cd /Users/briancarlberg/dev/gathergrove-backend && poetry run uvicorn app.main:app --reload --port 8000"

# Logs
alias gg-logs-fe="tail -f /Users/briancarlberg/dev/logs/frontend.log"
alias gg-logs-be="tail -f /Users/briancarlberg/dev/logs/backend.log"

# Database reset
alias gg-reset="cd /Users/briancarlberg/dev/gathergrove-backend && curl -X POST http://localhost:8000/dev/reset-db -s | python3 -m json.tool"

# Open in browser
alias gg-open="open http://localhost:5173/onboarding/access"

echo "✅ GatherGrove aliases loaded! Type 'gg-start' to begin"
