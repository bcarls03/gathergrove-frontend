# Quick Start - Testing Guide

## 🚀 Environment Ready!

Both servers are running and ready for testing:

- **Frontend**: http://localhost:5173 (OPEN IN BROWSER NOW)
- **Backend**: http://localhost:8000 (API running with fake Firestore)
- **API Docs**: http://localhost:8000/docs (Swagger UI)

---

## 🧪 Quick Test Sequence (15 minutes)

**These tests verify our Progressive, Trust-First onboarding philosophy**:
- ✅ Collect only what's needed, when it's needed
- ✅ Social login for authentication only (no data import)
- ✅ Individual-first identity (independent of household/platform)

### Test 1: Individual-First Signup (No Household) ✨ NEW!
**This is the key feature - users can skip household creation!**

1. Open http://localhost:5173 in your browser
2. Navigate to `/onboarding/profile`
3. You'll see **4 social login buttons** (this demonstrates our UX principle):
   - **"Continue with Google"** (white with color logo) - shows alert in dev
   - **"Continue with Apple"** (black) - shows alert in dev
   - **"Continue with Facebook"** (Facebook blue) - shows alert in dev
   - **"Continue with Microsoft"** (white with MS logo) - shows alert in dev
   - Divider: "or continue manually (dev mode)"
   - Manual form below
4. **Click each social button** to see the alert confirming production readiness
5. For actual testing, use the **manual form** and fill in:
   - First name: "Alex"
   - Last name: "Smith"  
   - Email: "alex@test.com"
   - Visibility: "Public"
6. Click **Continue**
7. On household page, you should see:
   - Title: "Create Your Household **(Optional)**"
   - Subtitle: "You can skip this step—we collect only what's needed, when it's needed"
   - Sub-subtitle: *"Add household info later from Settings, or connect events to just your individual profile"*
   - Prominent **"Skip for now—start with just me"** button
8. Click the **Skip** button ⭐
9. **Expected**: You should be redirected to the main app without creating a household!

**Success Criteria**: 
- ✅ **4 social login buttons visible** in order: Google, Apple, Facebook, Microsoft
- ✅ All buttons show proper branding and colors
- ✅ **Privacy notice visible**: "no importing your contacts, friend lists, or other data from Google, Apple, Facebook, or Microsoft"
- ✅ Clicking shows alert: "production feature"
- ✅ Household page clearly labeled "Optional"
- ✅ **Progressive messaging**: "collect only what's needed, when it's needed"
- ✅ **Individual-first messaging**: "start with just me", "identity is independent of household"
- ✅ Skip button prominent and clear
- ✅ Manual form creates user without household
- ✅ App loads and works normally
- ✅ No errors in console

**Philosophy Verified**:
- ✅ **Trust-first**: Familiar sign-in methods offered (Google first - most popular)
- ✅ **Privacy-transparent**: Clear messaging about auth-only use
- ✅ **No data import**: Explicit notice about no contact/friend list import from any provider
- ✅ **Progressive disclosure**: Step 2 is truly optional, can be skipped
- ✅ **Individual-first**: Clear messaging that you don't need a household

**Key UX principle demonstrated**: 
> "GatherGrove minimizes friction by supporting familiar, trusted sign-in methods (Apple, Google, Facebook, Microsoft) where appropriate."

In production:
- Apple/Google/Facebook/Microsoft sign-in would auto-fill name/email
- User just clicks, authenticates, and profile is created instantly
- Manual form is fallback for dev/testing/users without social accounts

---

### Test 2: Create Household from Settings ✨ NEW!
**Users can add household later from Settings page**

1. Navigate to `/settings`
2. You should see TWO sections:
   - **User Profile** (top) - shows Alex Smith's info
   - **Household** (bottom) - shows "Create a household" form
3. In Household section, fill in:
   - Household name: "The Smiths"
   - Household type: "Family"
4. Click **"Create Household"**
5. **Expected**: Household section should change to "Edit" mode with a "Leave Household" button

**Success Criteria**:
- ✅ Household created successfully
- ✅ Settings page shows household edit form
- ✅ User is automatically linked to household
- ✅ Profile section remains unchanged (independent)

---

### Test 3: Edit Profile Independently ✨ NEW!
**Profile can be edited without affecting household**

1. Still in `/settings`, in the **User Profile** section (top):
2. Change first name to "Alexander"
3. Change visibility to "Private"
4. Click **"Save Profile"**
5. **Expected**: Profile saves, household section is unaffected

**Success Criteria**:
- ✅ Profile updated successfully
- ✅ Household remains linked
- ✅ Changes saved to backend
- ✅ Success message displays

---

### Test 4: Create Event with New Categories ✨ NEW!
**3 new categories added: Food, Celebrations, Sports**

1. Navigate to home `/`
2. Click to create a **"Future Event"**
3. Click **"Choose Category"**
4. **Expected**: You should see 8 categories:
   - 🏡 Neighborhood
   - 🤸 Playdate
   - 🤝 Help & favors
   - 🐶 Pets
   - 🍕 **Food & Dining** ⭐ NEW!
   - 🎉 **Celebrations** ⭐ NEW!
   - ⚽ **Sports & Fitness** ⭐ NEW!
   - ✨ Other
5. Select **"🍕 Food & Dining"**

**Success Criteria**:
- ✅ All 8 categories visible
- ✅ New categories have emojis and descriptions
- ✅ Can select new categories

---

### Test 5: Event Visibility (Viral Growth!) ✨ NEW!
**Shareable links enable viral growth**

1. Continue creating the event:
   - Title: "Pizza Night"
   - Date: Tomorrow
   - Start time: 7:00 PM
   - Details: "Everyone welcome!"
2. Scroll down to **"Who can see this event?"** dropdown ⭐ NEW!
3. **Expected**: You should see 3 options:
   - **Private** (neighbors only)
   - **Shareable link** (anyone with link) ⭐ VIRAL GROWTH!
   - **Public** (discoverable by all)
4. Select **"Shareable link"**
5. Click **"Preview"** then **"Create event"**

**Success Criteria**:
- ✅ Visibility selector appears
- ✅ All 3 visibility options present
- ✅ Event created with visibility="link_only"
- ✅ Backend returns shareable_link field

---

### Test 6: Leave Household ✨ NEW!
**Users can return to individual-only state**

1. Navigate back to `/settings`
2. Scroll to **Household** section
3. Click **"Leave Household"** button
4. Confirm in dialog
5. **Expected**: Household section should return to "Create household" form

**Success Criteria**:
- ✅ User unlinked from household
- ✅ Settings shows "Create household" option again
- ✅ Profile section unchanged
- ✅ User can still use app without household

---

## 🎯 What to Look For

### ✅ Success Indicators:
- App loads without console errors
- All new pages (OnboardingProfile, OnboardingHouseholdNew, SettingsNew) render correctly
- "Skip" button works in onboarding
- Profile and household are independently editable in Settings
- 8 event categories appear in event creation
- Visibility selector shows all 3 options
- Users can create/edit/leave households freely

### ❌ Failure Indicators:
- Console errors related to missing components
- Forced household creation during signup
- Cannot skip household step
- Settings page doesn't have separate sections
- Only 5 event categories (missing new ones)
- No visibility selector in event creation
- Cannot leave household once created

---

## 🐛 If You Find Issues

1. **Check Console**: Open browser DevTools (F12) and look for errors
2. **Check Network**: Look at Network tab for failed API calls
3. **Check Backend Logs**: Look at the terminal running the backend
4. **Document It**: Note what you were doing when the error occurred

---

## 📊 Quick Backend API Tests

If you want to test the backend directly:

```bash
# Test user profile endpoints
curl http://localhost:8000/api/users/me/profile

# Test household endpoints  
curl http://localhost:8000/api/users/me/household

# Test events endpoint
curl http://localhost:8000/api/events

# View API documentation
open http://localhost:8000/docs
```

---

## 📝 Full Testing Checklist

For comprehensive testing of all 19 test cases, see:
**`TESTING-CHECKLIST.md`** in this directory

---

## 🎉 Expected Results

After these 6 quick tests, you should have:
1. ✅ Created a user without a household
2. ✅ Added a household from Settings
3. ✅ Edited profile independently
4. ✅ Seen all 8 event categories
5. ✅ Created an event with visibility control
6. ✅ Left the household successfully

**All of this is NEW functionality that enables individual-first architecture!**

---

## 🚨 Stop Testing If...

- The app won't load (white screen)
- Console shows critical errors
- Backend isn't responding (check terminal)
- You can't complete Test 1 (signup without household)

In these cases, check the terminals for error messages and restart the servers if needed.

---

## ✅ Final Verification Checklist

Before declaring Phase 1 Week 3 complete, verify:

- [ ] All social login buttons present in correct order (Google, Apple, Facebook, Microsoft)
- [ ] Privacy messaging clear and prominent (no importing contacts/friend lists from any provider)
- [ ] Household creation is **optional** and clearly labeled
- [ ] Users can skip household and use app normally
- [ ] Users can add household later from Settings
- [ ] Profile page shows individual identity (no household required)
- [ ] Events can be created with individual visibility
- [ ] Individual-first philosophy reflected throughout UI

**Progressive, Trust-First Onboarding Philosophy Verified** ✅

---

**Happy Testing!** 🎊

The future of neighborhood connection starts with individual empowerment!
