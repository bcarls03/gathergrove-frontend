# Testing Guide: Household Selector

## Quick Start

**Server:** The dev server is running on **http://localhost:5174/** (not 5173)

## What's Been Implemented

✅ **Discovery Page** (`/discovery`)
- "+ New Event" dropdown button (green, top-right)
- Two options: "Happening Now" and "Plan Event"
- "Invite to Event" button on each household card

✅ **ComposePost Page** (`/compose/event` or `/compose/happening`)
- HouseholdSelector component integrated
- Pre-selects household from Discovery
- Multi-select with checkboxes
- Shows count of selected households

## Testing Scenarios

### Scenario 1: Create Event with Pre-Selected Household (Main Flow)

**Steps:**
1. Navigate to http://localhost:5174/discovery
2. Browse the "Nearby" tab households
3. Click **"Invite to Event"** button on any household card
4. You'll be taken to `/compose/event` (Plan Event screen)
5. **Expected Result:**
   - Household selector shows at the bottom of the form
   - The household you clicked appears **checked** with green background
   - Count shows "(1 selected)"
   - You can select additional households

**What to Verify:**
- ✅ localStorage was set correctly (check DevTools → Application → localStorage)
- ✅ Pre-selected household appears checked
- ✅ localStorage is cleared after reading
- ✅ Can select/deselect additional households
- ✅ Count updates correctly

### Scenario 2: Create Event from Dropdown (No Pre-Selection)

**Steps:**
1. Navigate to http://localhost:5174/discovery
2. Click **"+ New Event"** green button (top-right)
3. Click **"⚡ Happening Now"** from dropdown
4. You'll be taken to `/compose/happening`
5. **Expected Result:**
   - Household selector shows
   - No households pre-selected
   - Count shows "(0 selected)"
   - Can select any households manually

**What to Verify:**
- ✅ Dropdown opens/closes correctly
- ✅ Click outside closes dropdown
- ✅ Navigation works
- ✅ No localStorage interference
- ✅ Household selector loads all households

### Scenario 3: Multi-Select Households

**Steps:**
1. Follow Scenario 1 or 2 to reach compose screen
2. Click checkboxes on 3-4 different households
3. Uncheck 1 household
4. Check another household

**Expected Results:**
- Each checked household shows **green background** (#f0fdf4)
- Unchecked households show white background
- Count updates immediately: "(0 selected)", "(1 selected)", "(3 selected)", etc.
- Hover effect: unchecked households show light gray on hover

**What to Verify:**
- ✅ Checkboxes toggle correctly
- ✅ Background color changes
- ✅ Count is accurate
- ✅ Can deselect all households
- ✅ Can select all households

### Scenario 4: Household Card Information

**What to Check:**
Each household card should display:
- ✅ Checkbox (18px × 18px)
- ✅ Household name (lastName field)
- ✅ Kid count (e.g., "2 kids", "1 kid", "No kids listed")
- ✅ Neighborhood (if available, shows as "• Neighborhood Name")

### Scenario 5: Loading States

**Steps:**
1. Open browser DevTools → Network tab
2. Set throttling to "Slow 3G"
3. Navigate to compose screen
4. **Expected Result:**
   - "Loading households..." message appears
   - After load completes, households appear

**What to Verify:**
- ✅ Loading message shows while fetching
- ✅ Households appear after API call
- ✅ No console errors

### Scenario 6: Empty State

**Steps:**
1. Mock the API to return empty array (if possible)
2. Navigate to compose screen
3. **Expected Result:**
   - "No households available" message

### Scenario 7: Event Type Difference

**Compare Happening Now vs Plan Event:**

**Happening Now** (`/compose/happening`):
- Has "Details" textarea
- No date/time pickers
- Household selector appears

**Plan Event** (`/compose/event`):
- Has "Event details" section with title, date, time
- Has category selection
- Household selector appears

**What to Verify:**
- ✅ Household selector works the same in both modes
- ✅ Position is consistent
- ✅ Styling matches the form

## Browser DevTools Checks

### localStorage Check

**Before clicking "Invite to Event":**
```javascript
localStorage.getItem('invite_household_id') // null
```

**After clicking "Invite to Event":**
```javascript
localStorage.getItem('invite_household_id') // "some-household-id-123"
localStorage.getItem('invite_household_name') // "Smith"
```

**After HouseholdSelector loads:**
```javascript
localStorage.getItem('invite_household_id') // null (cleared)
localStorage.getItem('invite_household_name') // null (cleared)
```

### React DevTools Check

**State in ComposePost:**
```javascript
selectedHouseholdIds: Set(3) {"id1", "id2", "id3"}
```

### Console Errors

**Should be ZERO console errors**
- No TypeScript compilation errors
- No React warnings
- No API errors (unless network issue)

## Visual Inspection Checklist

### Discovery Page
- [ ] "+ New Event" button is green with calendar icon
- [ ] Dropdown arrow rotates when clicked (0° → 180°)
- [ ] Dropdown menu has rounded corners and shadow
- [ ] Two options have emoji icons (⚡ and 📅)
- [ ] Hover effect on menu items (light green background)
- [ ] Click outside closes dropdown
- [ ] "Invite to Event" button visible on household cards

### Compose Page
- [ ] Household selector section has header "Who to invite (X selected)"
- [ ] Count updates dynamically
- [ ] Checkboxes are 18px square
- [ ] Household cards have 1px border (#e2e8f0)
- [ ] Selected cards have green background (#f0fdf4)
- [ ] Hover changes background to light gray (#f8fafc)
- [ ] Text is readable (good contrast)
- [ ] Layout is clean and organized

## Common Issues & Solutions

### Issue: Port 5173 vs 5174

**Problem:** Documentation says 5173, but server runs on 5174

**Solution:** Port 5173 was in use, Vite automatically picked 5174. This is normal. Use 5174.

### Issue: Household Not Pre-Selected

**Debugging Steps:**
1. Open DevTools → Console
2. Click "Invite to Event"
3. Check localStorage is set: `localStorage.getItem('invite_household_id')`
4. Navigate to compose
5. Check HouseholdSelector useEffect runs
6. Check API returns household with that ID

### Issue: Checkboxes Don't Toggle

**Debugging Steps:**
1. Check console for errors
2. Verify `onSelectionChange` prop is passed
3. Check parent state updates in React DevTools
4. Verify `householdId` is not undefined

### Issue: Count Shows Wrong Number

**Debugging Steps:**
1. Check Set size: `selectedHouseholdIds.size`
2. Verify toggleHousehold logic (add/remove)
3. Check for duplicate IDs
4. Verify state updates correctly

## Performance Checks

### Expected Performance:
- Household selector should load in < 500ms
- Checkbox toggle should be instant (< 50ms)
- Hover effects should be smooth (no jank)
- No memory leaks (check DevTools → Memory)

### API Calls:
- fetchHouseholds() called **once** on mount
- Should **not** re-fetch on every render
- Should **not** re-fetch when toggling checkboxes

## Accessibility Checks (Future)

These are not implemented yet, but should be tested later:
- [ ] Tab to focus checkboxes
- [ ] Space/Enter to toggle
- [ ] Screen reader announces changes
- [ ] ARIA labels present
- [ ] Keyboard navigation works

## Mobile Testing (Future)

Test on mobile viewport:
- [ ] Cards stack vertically
- [ ] Touch targets are large enough (44px minimum)
- [ ] Scrolling works smoothly
- [ ] No horizontal scroll
- [ ] Text is readable (font size appropriate)

## Success Criteria

**All these should pass:**
1. ✅ No console errors
2. ✅ No TypeScript errors
3. ✅ Pre-selection works from Discovery
4. ✅ Multi-select works with checkboxes
5. ✅ Count is accurate
6. ✅ Visual feedback is clear (colors, hover)
7. ✅ localStorage is cleared after use
8. ✅ Loading and empty states work
9. ✅ Both event types (happening/event) work
10. ✅ Can deselect all or select all

## Next Steps After Testing

**If all tests pass:**
1. Integrate with event submission API (pass selected household IDs)
2. Add validation (warn if 0 households selected)
3. Add "Clear All" / "Select All" buttons
4. Add search/filter for households

**If tests fail:**
1. Note which scenario fails
2. Check console for errors
3. Check React DevTools for state issues
4. Check Network tab for API issues
5. Report issues for debugging

## Quick Test Commands

**Start server:**
```bash
cd /Users/briancarlberg/dev/gathergrove-frontend
npm run dev
```

**Open browser:**
```
http://localhost:5174/discovery
```

**Clear localStorage (if needed):**
```javascript
localStorage.clear()
```

**Check state in console:**
```javascript
// Get React instance
$r.state  // or props
```

## Current Status

✅ **Implementation Complete**
✅ **No Compilation Errors**
✅ **Dev Server Running**
⏳ **Manual Testing Needed**

**Ready to test at:** http://localhost:5174/discovery
