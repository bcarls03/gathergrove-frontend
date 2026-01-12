# 🚀 Quick Start: Testing OAuth Authentication

## Step 1: Get Firebase Web Credentials (5 minutes)

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select project: **gathergrove-dev**
3. Click ⚙️ Settings → **Project Settings**
4. Scroll to "Your apps" section
5. If you see a Web app icon (</>) → click it, copy config
6. If no Web app exists:
   - Click **"Add app"** button
   - Click Web icon (</>)
   - Register app: **"GatherGrove Frontend"**
   - Copy the config object shown

## Step 2: Update .env File

Open `gathergrove-frontend/.env` and replace these lines:

```bash
VITE_FIREBASE_API_KEY=<paste apiKey here>
VITE_FIREBASE_AUTH_DOMAIN=gathergrove-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=gathergrove-dev
VITE_FIREBASE_STORAGE_BUCKET=<paste storageBucket here>
VITE_FIREBASE_MESSAGING_SENDER_ID=<paste messagingSenderId here>
VITE_FIREBASE_APP_ID=<paste appId here>
```

## Step 3: Enable Google OAuth

1. Firebase Console → **Authentication** (left sidebar)
2. Click **"Sign-in method"** tab
3. Find **"Google"** in providers list
4. Click "Google" → **Enable** toggle
5. Set support email (your email)
6. Click **Save**
7. Copy the **OAuth redirect URI** (should include `localhost`)

## Step 4: Whitelist localhost

1. Still in Authentication → **Settings** tab
2. Scroll to "Authorized domains"
3. Make sure **localhost** is listed
4. If not, click **"Add domain"** → type `localhost`

## Step 5: Test OAuth Flow

```bash
# Terminal 1: Start backend
cd gathergrove-backend
./scripts/dev.sh

# Terminal 2: Start frontend
cd gathergrove-frontend
npm run dev
```

Open browser: **http://localhost:5173/onboarding/access**

### Expected Flow:
1. See 4 OAuth buttons (Google, Apple, Facebook, Microsoft)
2. Click **"Continue with Google"**
3. Google account picker popup appears
4. Select your Google account
5. Popup closes → redirects to `/onboarding/address`
6. Check terminal logs:
   - Frontend: "✅ OAuth successful: google uid123..."
   - Frontend: "✅ User profile created"
   - Backend: "POST /users/signup 201" (or 409 if user exists)

### If it works:
🎉 **OAuth authentication complete!** You can now:
- Sign up with real Google accounts
- Backend receives Firebase ID tokens
- User profiles stored in Firestore
- Ready for production launch

### If it fails:
Check `OAUTH-IMPLEMENTATION.md` → "🚨 COMMON ISSUES & FIXES" section

---

## Next Steps After OAuth Works

1. **Add other providers** (Apple, Facebook, Microsoft)
2. **Implement Home Zone backend** (0.5mi radius discovery)
3. **Add Magic Moment density check** ("We found X families near you")
4. **Implement event radius bands** (Band A: 3-5mi, Band B: 1-2mi)

---

## Quick Commands

```bash
# Restart frontend (if .env changed)
cd gathergrove-frontend
npm run dev

# Check Firebase logs
cd gathergrove-backend
tail -f logs/app.log

# Test OAuth token manually
curl -H "Authorization: Bearer <token>" http://localhost:8000/users/me
```

---

**Time to complete:** ~10 minutes
**Difficulty:** Easy (just copy/paste Firebase config)
**Payoff:** ⭐⭐⭐⭐⭐ (unlocks production launch)
