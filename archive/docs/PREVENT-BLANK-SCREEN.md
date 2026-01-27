# 🚨 PERMANENT FIX: Blank Screen / Connection Refused

## Problem
You frequently get a blank screen with "localhost refused to connect" when accessing the app.

**Root Cause:** The Vite dev server stops running (crashes, terminal closed, computer sleep, etc.)

## ✅ PERMANENT SOLUTION

### **Option 1: Use Startup Scripts (RECOMMENDED)**

I've created scripts to start/stop both servers easily:

```bash
# Start everything
cd /Users/briancarlberg/dev/gathergrove-frontend
./start-dev.sh

# Stop everything
./stop-dev.sh
```

### **Option 2: Manual Startup**

```bash
# Terminal 1: Start Backend
cd /Users/briancarlberg/dev/gathergrove-backend
poetry run uvicorn app.main:app --reload --port 8000

# Terminal 2: Start Frontend
cd /Users/briancarlberg/dev/gathergrove-frontend
npm run dev
```

### **Option 3: Use Process Manager (BEST for long-term)**

Install PM2 to keep servers running:

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 config
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'gathergrove-backend',
      cwd: '../gathergrove-backend',
      script: 'poetry',
      args: 'run uvicorn app.main:app --reload --port 8000',
      watch: false,
      env: {
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'gathergrove-frontend',
      cwd: '.',
      script: 'npm',
      args: 'run dev',
      watch: false
    }
  ]
};
EOF

# Start both servers
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs
pm2 logs

# Stop servers
pm2 stop all

# Restart servers
pm2 restart all

# Auto-start on system boot
pm2 startup
pm2 save
```

## 🔍 Quick Diagnostic Commands

### **Check if servers are running:**

```bash
# Check frontend (Vite)
curl -s http://localhost:5173 >/dev/null && echo "✅ Frontend running" || echo "❌ Frontend not running"

# Check backend (FastAPI)
curl -s http://localhost:8000/health >/dev/null && echo "✅ Backend running" || echo "❌ Backend not running"

# Check what's using port 5173
lsof -i:5173

# Check what's using port 8000
lsof -i:8000
```

### **Start servers if not running:**

```bash
# Quick start frontend only
cd /Users/briancarlberg/dev/gathergrove-frontend && npm run dev

# Quick start backend only
cd /Users/briancarlberg/dev/gathergrove-backend && poetry run uvicorn app.main:app --reload --port 8000
```

## 📝 Common Scenarios

### **Scenario 1: Computer woke from sleep**
```bash
# Servers often crash after sleep
./start-dev.sh
```

### **Scenario 2: Accidentally closed terminal**
```bash
# Just restart
./start-dev.sh
```

### **Scenario 3: Server crashed**
```bash
# Check logs
tail -f ../logs/frontend.log
tail -f ../logs/backend.log

# Restart
./stop-dev.sh
./start-dev.sh
```

### **Scenario 4: Port already in use**
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Then start
./start-dev.sh
```

## 🎯 Prevention Tips

### **1. Add to .zshrc (auto-start reminder):**

```bash
echo 'alias gg="cd /Users/briancarlberg/dev/gathergrove-frontend"' >> ~/.zshrc
echo 'alias gg-start="cd /Users/briancarlberg/dev/gathergrove-frontend && ./start-dev.sh"' >> ~/.zshrc
echo 'alias gg-stop="cd /Users/briancarlberg/dev/gathergrove-frontend && ./stop-dev.sh"' >> ~/.zshrc
source ~/.zshrc

# Now you can just type:
gg-start  # Starts everything
gg-stop   # Stops everything
gg        # Go to frontend directory
```

### **2. Create VS Code Task (auto-start from VS Code):**

Add to `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Dev Servers",
      "type": "shell",
      "command": "./start-dev.sh",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "Stop Dev Servers",
      "type": "shell",
      "command": "./stop-dev.sh",
      "options": {
        "cwd": "${workspaceFolder}"
      },
      "problemMatcher": []
    }
  ]
}
```

Then press `Cmd+Shift+P` → "Tasks: Run Task" → "Start Dev Servers"

### **3. Browser Extension (auto-refresh):**

Install "Live Server" extension or similar to auto-detect when server is down

### **4. Health Check Script:**

```bash
# Save as check-servers.sh
#!/bin/bash
if ! curl -s http://localhost:5173 >/dev/null 2>&1; then
  echo "❌ Frontend not running - starting..."
  cd /Users/briancarlberg/dev/gathergrove-frontend
  npm run dev &
fi

if ! curl -s http://localhost:8000/health >/dev/null 2>&1; then
  echo "❌ Backend not running - starting..."
  cd /Users/briancarlberg/dev/gathergrove-backend
  poetry run uvicorn app.main:app --reload --port 8000 &
fi
```

## 🆘 Emergency Quick Fix

If you see blank screen right now:

```bash
cd /Users/briancarlberg/dev/gathergrove-frontend
npm run dev
```

Then refresh browser at `http://localhost:5173/onboarding/access`

## ✅ Current Status

**RIGHT NOW:**
- ✅ Frontend server is running on http://localhost:5173
- ✅ You can access the app

**NEXT TIME:**
Use `./start-dev.sh` to start everything automatically

## 📚 Additional Resources

- Frontend runs on: http://localhost:5173
- Backend runs on: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Logs: `../logs/frontend.log` and `../logs/backend.log`
