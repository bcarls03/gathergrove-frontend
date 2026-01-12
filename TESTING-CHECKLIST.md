# Phase 1 Week 3 - End-to-End Testing Checklist

## Testing Date: January 3, 2026

## Environment Setup
- ✅ Backend running: http://127.0.0.1:8000
- ✅ Frontend running: http://localhost:5173
- ✅ Using in-memory Firestore (dev mode)

---

## Test Suite 1: Individual-First Signup (No Household Required)

### Test 1.1: New User Signup Without Household
**Goal**: Verify users can create an account without being forced to create a household

**Steps**:
1. Navigate to http://localhost:5173
2. Go to onboarding flow (/onboarding/profile)
3. Fill in profile form:
   - First name: "Alex"
   - Last name: "Smith"
   - Email: "alex@example.com"
   - Visibility: "Public"
4. Submit profile form
5. On household step, click "Skip" button
6. Verify user is created and redirected to main app

**Expected Results**:
- ✅ User profile created successfully
- ✅ User can skip household creation
- ✅ User can access the app without a household
- ✅ Profile shows no household_id

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 1.2: Verify Profile Without Household
**Goal**: Confirm user profile exists independently of household

**Steps**:
1. Navigate to Settings page (/settings)
2. Check "User Profile" section
3. Verify profile data:
   - First name: "Alex"
   - Last name: "Smith"
   - Email: "alex@example.com"
   - Visibility: "Public"
4. Check "Household" section shows "Create a household" option

**Expected Results**:
- ✅ User profile section shows correct data
- ✅ User profile can be edited independently
- ✅ Household section shows "Not part of a household" state
- ✅ Option to create household is available

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 2: Household Creation After Signup

### Test 2.1: Create Household from Settings
**Goal**: Verify users can create a household after initial signup

**Steps**:
1. Stay logged in as Alex Smith (from Test 1)
2. Navigate to Settings page (/settings)
3. In "Household" section, click to create household
4. Fill in household form:
   - Household name: "The Smiths"
   - Household type: "Family"
5. Save household

**Expected Results**:
- ✅ Household created successfully via POST /api/users/me/household
- ✅ User is automatically linked to new household
- ✅ Settings page shows household edit form (not create form)
- ✅ Profile now shows household_id

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 2.2: Edit Household Details
**Goal**: Verify household can be updated after creation

**Steps**:
1. In Settings page, household section should now show edit form
2. Change household name to "Smith Family"
3. Change household type to "Parents with kids"
4. Save changes

**Expected Results**:
- ✅ Household updated successfully via PUT /api/users/me/household
- ✅ Changes reflected immediately in UI
- ✅ Backend data matches UI
- ✅ User still linked to same household

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 2.3: Leave Household
**Goal**: Verify user can leave household and return to individual-only state

**Steps**:
1. In Settings page, click "Leave Household" button
2. Confirm in dialog
3. Verify household section returns to "Create" state

**Expected Results**:
- ✅ User unlinked from household via POST /api/users/me/unlink-household
- ✅ User profile household_id set to null
- ✅ Settings page shows "Create household" option again
- ✅ User can still use the app without household

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 3: Event Creation with Visibility

### Test 3.1: Create Private Event
**Goal**: Verify event creation with "private" visibility

**Steps**:
1. Navigate to Home page (/)
2. Click to create a new "Future Event"
3. Choose category: "Neighborhood" 🏡
4. Fill in event details:
   - Title: "Block Party"
   - Date: Tomorrow's date
   - Start time: 6:00 PM
   - Details: "Bring your own drinks!"
5. Select visibility: "Private (neighbors only)"
6. Preview and create event

**Expected Results**:
- ✅ Event created with visibility="private"
- ✅ Event shows in home feed
- ✅ POST /api/events includes visibility field
- ✅ Event stored with correct visibility setting

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 3.2: Create Event with Shareable Link
**Goal**: Verify event creation with "link_only" visibility for viral growth

**Steps**:
1. Create another event
2. Choose category: "Food & Dining" 🍕 (new category!)
3. Fill in event details:
   - Title: "Pizza Night"
   - Date: This weekend
   - Start time: 7:00 PM
   - Details: "Everyone welcome, bring friends!"
4. Select visibility: "Shareable link (anyone with link)"
5. Preview and create event

**Expected Results**:
- ✅ Event created with visibility="link_only"
- ✅ Event has shareable_link field populated by backend
- ✅ Link can be shared with non-neighbors
- ✅ Anyone with link can view event

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 3.3: Create Public Event
**Goal**: Verify event creation with "public" visibility

**Steps**:
1. Create another event
2. Choose category: "Celebrations" 🎉 (new category!)
3. Fill in event details:
   - Title: "New Year's Celebration"
   - Date: December 31
   - Start time: 9:00 PM
   - Details: "All are welcome!"
4. Select visibility: "Public (discoverable by all)"
5. Preview and create event

**Expected Results**:
- ✅ Event created with visibility="public"
- ✅ Event discoverable by all users
- ✅ Event shows in public feed
- ✅ Non-neighbors can find and RSVP

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 3.4: Test New Event Categories
**Goal**: Verify all 8 event categories work

**Steps**:
1. Create events for each new category:
   - 🍕 Food & Dining: "BBQ Cookout"
   - 🎉 Celebrations: "Birthday Party"
   - ⚽ Sports & Fitness: "Morning Jog Group"
2. Verify each category displays correctly
3. Check category selector shows all 8 options

**Expected Results**:
- ✅ All 8 categories available in dropdown:
  - 🏡 Neighborhood
  - 🤸 Playdate
  - 🤝 Help & favors
  - 🐶 Pets
  - 🍕 Food & Dining
  - 🎉 Celebrations
  - ⚽ Sports & Fitness
  - ✨ Other
- ✅ Category emoji and label display correctly
- ✅ Events created with correct category value

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 4: Individual Host Display

### Test 4.1: Verify Event Host is Individual
**Goal**: Confirm events show individual user as host (not household)

**Steps**:
1. View events created in previous tests
2. Check event details/metadata
3. Verify host information

**Expected Results**:
- ✅ Events show host_user_id (individual UID)
- ✅ Host name shows as "Alex Smith" (not "Smith Family")
- ✅ Backend returns host_user_id in event data
- ✅ Frontend displays individual host correctly

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 5: Shareable Links (Viral Growth)

### Test 5.1: Access Event via Shareable Link
**Goal**: Verify shareable link allows non-neighbor access

**Steps**:
1. Get shareable link from "Pizza Night" event (link_only visibility)
2. Open link in incognito/private browser window (simulate non-neighbor)
3. Verify event is accessible
4. Check if non-neighbor can RSVP

**Expected Results**:
- ✅ Shareable link works for non-neighbors
- ✅ Event details visible via link
- ✅ RSVP functionality available (if user signs up)
- ✅ Viral growth mechanism functional

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 6: API Endpoint Validation

### Test 6.1: Profile Endpoints
**Goal**: Verify all new profile API endpoints work

**API Calls to Test**:
- ✅ POST /api/users/signup - Create user without household
- ✅ GET /api/users/me/profile - Get user profile
- ✅ PUT /api/users/me/profile - Update user profile
- ✅ GET /api/users/me/household - Get user's household (404 if none)

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 6.2: Household Endpoints
**Goal**: Verify all household management endpoints work

**API Calls to Test**:
- ✅ POST /api/users/me/household - Create household and link user
- ✅ PUT /api/users/me/household - Update household details
- ✅ POST /api/users/me/unlink-household - Unlink user from household

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 6.3: Event Endpoints
**Goal**: Verify event endpoints support new visibility field

**API Calls to Test**:
- ✅ POST /api/events - Create event with visibility
- ✅ GET /api/events/{id} - Get event with visibility field
- ✅ GET /api/events - List events (respects visibility)
- ✅ Shareable links work for link_only events

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Test Suite 7: Regression Testing

### Test 7.1: Onboarding with Household
**Goal**: Verify traditional flow (with household) still works

**Steps**:
1. Create new user "Taylor Jones"
2. Complete profile step
3. DO NOT skip household step
4. Create household "The Jones"
5. Verify user is linked to household immediately

**Expected Results**:
- ✅ Traditional onboarding flow still works
- ✅ Users can create household during signup
- ✅ User immediately linked to new household
- ✅ No breaking changes to existing flow

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

### Test 7.2: Settings Page Functionality
**Goal**: Verify SettingsNew.tsx works correctly

**Steps**:
1. Test all Settings page features:
   - Edit first name, last name, email
   - Change visibility setting
   - Create household
   - Edit household
   - Leave household
2. Verify all save operations work
3. Check error handling

**Expected Results**:
- ✅ All profile edits save correctly
- ✅ All household operations work
- ✅ Loading states display correctly
- ✅ Error messages show when appropriate
- ✅ Success messages display after saves

**Status**: [ ] Pass / [ ] Fail
**Notes**: 

---

## Summary

### Tests Passed: ___ / 19

### Critical Issues Found:
- 

### Minor Issues Found:
- 

### Overall Assessment:
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes

### Next Steps:
- 

---

## Sign-off

**Tested by**: _______________
**Date**: January 3, 2026
**Version**: Phase 1, Week 3 (Individual-First Architecture)
**Git Commits**: bf58406, 7aebd51, d143372, c866971
