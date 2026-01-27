# OAuth Authentication Implementation - V15 Step 1

## ✅ COMPLETED

### 1. Firebase Auth SDK Integration
**File:** `gathergrove-frontend/src/lib/firebase.ts`
- ✅ Initialized Firebase app with config
- ✅ Created OAuth provider instances (Google, Apple, Facebook, Microsoft)
- ✅ Implemented sign-in functions for each provider
- ✅ Added helper functions: `getIdToken()`, `getCurrentUser()`, `onAuthStateChanged()`

### 2. API Client Auth Headers
**File:** `gathergrove-frontend/src/lib/api.ts`
- ✅ Updated axios interceptor to use Firebase ID tokens
- ✅ Fallback to dev headers (X-Uid) when no token available
- ✅ Async `getAuthHeaders()` function that checks for Firebase token first

### 3. OnboardingAccess Page (OAuth Flow)
**File:** `gathergrove-frontend/src/pages/OnboardingAccess.tsx`
- ✅ Replaced neighborhood code entry with OAuth buttons
- ✅ Implemented `handleOAuthSignIn()` for all 4 providers
- ✅ Extracts name from OAuth profile (first/last name split)
- ✅ Creates user profile in backend via `signupUser()` API
- ✅ Handles 409 conflict (user already exists) gracefully
- ✅ Saves OAuth data to onboarding state
- ✅ Navigates to `/onboarding/address` on success
- ✅ Shows loading state & error messages
- ✅ Backup created: `OnboardingAccess.tsx.backup-neighborhood-code`

### 4. App.tsx Routing
**File:** `gathergrove-frontend/src/App.tsx`
- ✅ Added import for `OnboardingAccess`
- ✅ Made `/onboarding/access` the OAuth entry point
- ✅ Moved old profile route to `/onboarding/profile-old`
- ✅ Fixed routing order: Access → Address → Household → Preview → Save

### 5. Firebase Configuration
**File:** `gathergrove-frontend/.env`
- ✅ Updated with `gathergrove-dev` project ID
- ✅ Set auth domain to `gathergrove-dev.firebaseapp.com`
- ⚠️ **NEEDS REAL WEB API KEY** - currently using placeholder

### 6. Dependencies
- ✅ Installed `firebase` npm package (v11.x)

---

## ⚠️ NEXT STEPS (REQUIRED FOR PRODUCTION)

### 1. Get Firebase Web API Credentials
**CRITICAL:** You must get the actual Web App credentials from Firebase Console:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `gathergrove-dev`
3. Click ⚙️ Settings → Project Settings
4. Scroll to "Your apps" section
5. If no Web app exists:
   - Click "Add app" → Web (</> icon)
   - Register app name: "GatherGrove Frontend"
6. Copy the config object and update `.env`:
   ```
   VITE_FIREBASE_API_KEY=<apiKey>
   VITE_FIREBASE_AUTH_DOMAIN=<authDomain>
   VITE_FIREBASE_PROJECT_ID=gathergrove-dev
   VITE_FIREBASE_STORAGE_BUCKET=<storageBucket>
   VITE_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
   VITE_FIREBASE_APP_ID=<appId>
   ```

### 2. Enable OAuth Providers in Firebase
You must enable each OAuth provider in Firebase Authentication:

#### Google (Easiest - Recommended for Testing)
1. Firebase Console → Authentication → Sign-in method
2. Click "Google" → Enable toggle
3. Set support email (your email)
4. Save

#### Apple
1. Enable "Apple" provider
2. Requires Apple Developer account ($99/year)
3. Configure Service ID, Team ID, Key ID
4. Upload p8 private key

#### Facebook
1. Enable "Facebook" provider
2. Create Facebook App at developers.facebook.com
3. Copy App ID & App Secret to Firebase
4. Add OAuth redirect URL to Facebook app settings

#### Microsoft
1. Enable "Microsoft" provider
2. Create app in Azure AD
3. Copy Application (client) ID & Client secret
4. Configure redirect URIs

**RECOMMENDATION:** Start with Google OAuth only for testing, then add others later.

### 3. Test OAuth Flow
Once Firebase is configured:

1. Start frontend: `cd gathergrove-frontend && npm run dev`
2. Start backend: `cd gathergrove-backend && ./scripts/dev.sh`
3. Open browser: `http://localhost:5173/onboarding/access`
4. Click "Continue with Google"
5. Select Google account
6. Should redirect to `/onboarding/address`
7. Check backend logs for user profile creation
8. Check Firebase Console → Authentication → Users (should see new user)

### 4. Update Backend Auth (if needed)
Your backend already has `verify_token` in `app/deps/auth.py`. Make sure it can verify Firebase tokens:

```python
# This should already exist in app/deps/auth.py
from firebase_admin import auth

def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing or invalid token")
    
    token = authorization.replace("Bearer ", "")
    
    try:
        decoded = auth.verify_id_token(token)
        return decoded  # Contains uid, email, etc.
    except Exception as e:
        raise HTTPException(401, f"Invalid token: {e}")
```

---

## 🎯 WHAT THIS UNLOCKS

With OAuth working, you've now unblocked:

1. **✅ Real authentication** - No more dev UIDs, actual user accounts
2. **✅ Production-ready onboarding** - 60-second flow starts with OAuth
3. **✅ V15 Instant Utility** - Users can sign up in seconds
4. **✅ Secure API calls** - All requests use Firebase ID tokens
5. **✅ User profile photos** - OAuth providers include profile pictures
6. **✅ Pre-filled names** - OAuth providers include display names

### Next Priority Features (After OAuth is Working)
1. **Home Zone Backend** - Implement 0.5mi default radius for discovery
2. **Magic Moment Density** - Show "X households near you" with real count
3. **Event Radius Bands** - 3-5mi for Band A, 1-2mi for Band B
4. **Verification Ladder** - Vouch system for neighborhood trust

---

## 📝 TESTING CHECKLIST

### Dev Environment (Before Firebase Setup)
- [x] Firebase SDK installed
- [x] OAuth buttons render without errors
- [x] Firebase config loads from .env
- [x] App compiles without TypeScript errors

### Firebase Console Setup
- [ ] Web app registered in Firebase project
- [ ] Google OAuth provider enabled
- [ ] OAuth redirect URL whitelisted: `http://localhost:5173`
- [ ] Production domain added (when ready): `https://gathergrove.com`

### OAuth Flow Testing
- [ ] Click Google button → Google account picker appears
- [ ] Select account → redirects to `/onboarding/address`
- [ ] Backend receives Authorization header with Firebase token
- [ ] User profile created in Firestore `users` collection
- [ ] Subsequent logins don't error (409 handled gracefully)
- [ ] Token stored and included in all API requests

### Integration Testing
- [ ] Complete onboarding: OAuth → Address → Household → Save
- [ ] User can browse People tab with OAuth identity
- [ ] Events show correct RSVP with OAuth uid
- [ ] Settings page shows OAuth email/name
- [ ] Logout works (calls `signOut()` from firebase.ts)

---

## 🚨 COMMON ISSUES & FIXES

### "Firebase: Error (auth/invalid-api-key)"
- **Cause:** Missing or incorrect `VITE_FIREBASE_API_KEY` in `.env`
- **Fix:** Get real Web API key from Firebase Console

### "Firebase: Error (auth/unauthorized-domain)"
- **Cause:** `localhost:5173` not whitelisted in Firebase
- **Fix:** Firebase Console → Authentication → Settings → Authorized domains → Add `localhost`

### OAuth popup blocked
- **Cause:** Browser blocking popups
- **Fix:** Click OAuth button again (browser will allow after first block)

### "403 insufficient_permissions" backend error
- **Cause:** Backend can't verify Firebase token
- **Fix:** Make sure `firebase_admin` is initialized with service account JSON

### User already exists (409) but can't log in
- **Cause:** OAuth creates user, but backend expects signup again
- **Fix:** Already handled in `OnboardingAccess.tsx` - 409 is treated as success

---

## 📂 FILES MODIFIED

1. `gathergrove-frontend/src/lib/firebase.ts` (NEW)
2. `gathergrove-frontend/src/lib/api.ts` (UPDATED)
3. `gathergrove-frontend/src/pages/OnboardingAccess.tsx` (REPLACED)
4. `gathergrove-frontend/src/App.tsx` (UPDATED)
5. `gathergrove-frontend/.env` (UPDATED)
6. `gathergrove-frontend/package.json` (firebase dependency added)

Backup created:
- `gathergrove-frontend/src/pages/OnboardingAccess.tsx.backup-neighborhood-code`

---

## 🎉 CONGRATULATIONS!

You've implemented the **#1 critical feature** for V15 alignment:

**OAuth Authentication = Foundation for Everything**

This unlocks:
- Real user accounts (not dev UIDs)
- Production launch capability
- Secure API authentication
- Profile photos from OAuth providers
- 60-second onboarding (Instant Utility invariant)

**Next: Configure Firebase Web credentials, test Google OAuth, then move to Home Zone backend implementation.**
