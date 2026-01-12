# 🚀 GatherGrove Quick Start Guide

## ⚡️ FASTEST WAY TO START (Choose One)

### Option 1: One-Command Start (Recommended)
```bash
cd /Users/briancarlberg/dev/gathergrove-frontend
./start-dev.sh
```

### Option 2: Use Aliases (After Setup)
```bash
gg-start
```

### Option 3: VS Code Task
1. Press `Cmd+Shift+P`
2. Type "Run Task"
3. Select "🚀 Start All Dev Servers"

---

## 📦 First-Time Setup (Do This Once)

### 1. Install Aliases
```bash
# Add aliases to your shell
cat /Users/briancarlberg/dev/gathergrove-frontend/.aliases.sh >> ~/.zshrc
source ~/.zshrc

# Now you can use shortcuts like:
gg-start    # Start everything
gg-stop     # Stop everything
gg-status   # Check if running
```

### 2. Test Setup
```bash
gg-start
gg-status

# You should see:
# ✅ Frontend: http://localhost:5173
# ✅ Backend: http://localhost:8000
```

---

## 🎯 Daily Workflow

### Morning (Start Work)
```bash
gg-start
gg-open  # Opens browser
```

### During Work
```bash
# Check if servers are running
gg-status

# View logs if something breaks
gg-logs-fe  # Frontend logs
gg-logs-be  # Backend logs

# Restart if needed
gg-restart

# Reset database for testing
gg-reset
```

### Evening (End Work)
```bash
gg-stop
```

---

## 🆘 Troubleshooting

### Problem: Blank Screen / Connection Refused

**Quick Fix:**
```bash
gg-start
```

**Check Status:**
```bash
gg-status
```

**If ports are blocked:**
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:8000 | xargs kill -9  # Backend

# Then restart
gg-start
```

### Problem: Server Crashed

**View logs:**
```bash
gg-logs-fe  # Frontend
gg-logs-be  # Backend
```

**Restart:**
```bash
gg-restart
```

### Problem: Database Issues

**Reset database:**
```bash
gg-reset
```

**In browser console:**
```javascript
localStorage.clear();
location.reload();
```

---

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `gg-start` | Start both frontend and backend |
| `gg-stop` | Stop both servers |
| `gg-restart` | Stop and restart everything |
| `gg-status` | Check if servers are running |
| `gg-open` | Open app in browser |
| `gg-reset` | Reset database |
| `gg-logs-fe` | View frontend logs |
| `gg-logs-be` | View backend logs |
| `gg` | Go to frontend directory |
| `ggb` | Go to backend directory |
| `gg-fe` | Start frontend only |
| `gg-be` | Start backend only |

---

## 🌐 Access Points

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Onboarding**: http://localhost:5173/onboarding/access

---

## 🔄 Common Tasks

### Start Fresh Onboarding Flow
```bash
gg-reset
gg-open
# In browser console: localStorage.clear(); location.reload();
```

### Check Everything is Working
```bash
gg-status

# Should show:
# ✅ Frontend: http://localhost:5173
# ✅ Backend: http://localhost:8000
```

### Restart After Code Changes
```bash
# Usually auto-reloads, but if not:
gg-restart
```

---

## 💡 Tips

1. **Always check status first**: `gg-status`
2. **Use aliases**: Much faster than typing full commands
3. **Keep terminals open**: You can see logs in real-time
4. **Bookmark URLs**: Frontend and backend docs
5. **VS Code Tasks**: Press `Cmd+Shift+P` → Run Task

---

## 🐛 Debug Mode

If something is really broken:

```bash
# Stop everything
gg-stop

# Kill all processes (nuclear option)
lsof -ti:5173 | xargs kill -9
lsof -ti:8000 | xargs kill -9

# Check nothing is running
gg-status

# Start fresh
gg-start

# Reset database
gg-reset

# Clear browser
# In browser console: localStorage.clear(); location.reload();
```

---

## 📝 Notes

- Servers auto-reload on file changes
- Logs are in `/Users/briancarlberg/dev/logs/`
- PIDs are in `/Users/briancarlberg/dev/logs/*.pid`
- Press `Ctrl+C` in terminal to stop manually

---

## ✅ Success Checklist

- [ ] Aliases installed (`source ~/.zshrc`)
- [ ] Can run `gg-start` successfully
- [ ] Can access http://localhost:5173
- [ ] Can access http://localhost:8000/docs
- [ ] Know how to check status (`gg-status`)
- [ ] Know how to restart (`gg-restart`)
- [ ] Know how to stop (`gg-stop`)

---

**Need help?** Run `gg-status` first, then check logs with `gg-logs-fe` or `gg-logs-be`
