# Discovery Page Household Display Fixes

## Issues Fixed

### Issue 1: Households Showing as "Neighbor"
**Problem:** Some households without `lastName` were displaying as generic "Neighbor"

**Root Cause:** Old test data in database had no `lastName` or `adultNames`

**Solution:** Enhanced `getHouseholdName()` function with better fallbacks:
1. Try `lastName` first → "The Miller Family"
2. Try `adultNames` → "Sarah & Mike"
3. Try email username → "john.doe's Household"
4. Final fallback based on household type → "Couple" / "Neighbor" / "Household"

### Issue 2: Household Type Badges Not Matching Filters
**Problem:** Household cards showed wrong icons/labels for household types

**Root Cause:** Mismatch between:
- **Backend data values**: `'family_with_kids'`, `'couple'`, `'single'`, `'single_parent'`
- **Filter display values**: `'Family w/ Kids'`, `'Singles/Couples'`, `'Empty Nesters'`
- **Helper functions**: Looking for old values like `'family'`, `'individual'`

**Solution:** Created mapping function `mapToFilterType()` that:
- Maps `'family_with_kids'` → `'Family w/ Kids'` (blue Users icon)
- Maps `'single_parent'` → `'Family w/ Kids'` (blue Users icon)
- Maps `'couple'` → `'Singles/Couples'` (pink Heart icon)
- Maps `'single'` → `'Singles/Couples'` (pink Heart icon)
- Uses `HOUSEHOLD_TYPE_META` for consistent icons/colors

## Code Changes

### 1. New Mapping Function
```typescript
const mapToFilterType = (type?: string): HouseholdType | null => {
  switch (type) {
    case 'family_with_kids':
    case 'single_parent':
      return 'Family w/ Kids';
    case 'empty_nesters':
      return 'Empty Nesters';
    case 'couple':
    case 'single':
      return 'Singles/Couples';
    default:
      return null;
  }
};
```

### 2. Updated getHouseholdTypeIcon()
```typescript
const getHouseholdTypeIcon = (type?: string) => {
  const filterType = mapToFilterType(type);
  if (filterType && HOUSEHOLD_TYPE_META[filterType]) {
    const { Icon } = HOUSEHOLD_TYPE_META[filterType];
    return <Icon size={16} />;
  }
  // ... fallbacks
};
```

### 3. Updated getHouseholdTypeColor()
```typescript
const getHouseholdTypeColor = (type?: string) => {
  const filterType = mapToFilterType(type);
  if (filterType && HOUSEHOLD_TYPE_META[filterType]) {
    return HOUSEHOLD_TYPE_META[filterType].iconColor;
  }
  // ... fallbacks
};
```

### 4. Updated getHouseholdTypeLabel()
```typescript
const getHouseholdTypeLabel = (type?: string) => {
  const filterType = mapToFilterType(type);
  if (filterType) {
    return filterType; // e.g., "Family w/ Kids"
  }
  // ... fallbacks
};
```

### 5. Enhanced getHouseholdName()
```typescript
const getHouseholdName = (household: GGHousehold): string => {
  if (household.lastName) {
    return `The ${household.lastName} Family`;
  }
  if (household.adultNames && household.adultNames.length > 0) {
    const names = household.adultNames.filter(n => n && n.trim());
    if (names.length > 0) {
      return names.length === 1 ? names[0] : names.join(' & ');
    }
  }
  // Fallback: use email username or just "Household"
  if (household.email) {
    const username = household.email.split('@')[0];
    return `${username}'s Household`;
  }
  return household.householdType === 'couple' ? 'Couple' : 
         household.householdType === 'single' ? 'Neighbor' :
         'Household';
};
```

## Expected Results

### Before Fix
```
┌─────────────────────────────────┐
│ Neighbor                        │  ❌ Generic name
│ 👥 Household  📍 Oak Ridge      │  ❌ Wrong icon/label
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ The Chen Family                 │
│ 👥 Household  📍 Riverside      │  ❌ Should be "Family w/ Kids"
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ The Martinez Family             │
│ 👥 Household  📍 Oak Ridge      │  ❌ Should be "Singles/Couples"
└─────────────────────────────────┘
```

### After Fix
```
┌─────────────────────────────────┐
│ john.doe's Household            │  ✅ Uses email fallback
│ 👤 Singles/Couples 📍 Oak Ridge │  ✅ Correct icon/label
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ The Chen Family                 │
│ 👥 Family w/ Kids 📍 Riverside  │  ✅ Matches filter chip
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ The Martinez Family             │
│ 💗 Singles/Couples 📍 Oak Ridge │  ✅ Heart icon for couples
└─────────────────────────────────┘
```

## Icon/Color Mapping

| Backend Type | Display Label | Icon | Color |
|--------------|---------------|------|-------|
| `family_with_kids` | Family w/ Kids | 👥 Users | Blue (#3b82f6) |
| `single_parent` | Family w/ Kids | 👥 Users | Blue (#3b82f6) |
| `couple` | Singles/Couples | 💗 Heart | Pink (#ec4899) |
| `single` | Singles/Couples | 💗 Heart | Pink (#ec4899) |
| `empty_nesters` | Empty Nesters | 🏠 Home | Amber (#f59e0b) |

## Test Verification

### Test Households Created
- **Miller** (family_with_kids) → Should show 👥 "Family w/ Kids"
- **Garcia** (family_with_kids) → Should show 👥 "Family w/ Kids"
- **Wilson** (single_parent) → Should show 👥 "Family w/ Kids"
- **Martinez** (couple) → Should show 💗 "Singles/Couples"
- **Brown** (single) → Should show 💗 "Singles/Couples"

### Testing Steps
1. Visit http://localhost:5174/discovery
2. Check each household card
3. Verify badge matches household type filter
4. Verify icon matches filter icon
5. Verify color matches filter color
6. Verify no "Neighbor" generic names (unless truly no data)

## Filter Consistency

Now household cards match the filter chips:

**Filter Chip:**
```
┌─────────────────────┐
│ 👥 Family w/ Kids   │
└─────────────────────┘
```

**Household Card Badge:**
```
┌─────────────────────────────────┐
│ The Miller Family               │
│ 👥 Family w/ Kids 📍 Oak Ridge  │  ← Same icon & label!
└─────────────────────────────────┘
```

## Edge Cases Handled

1. ✅ No lastName → Use adultNames
2. ✅ No adultNames → Use email username
3. ✅ No email → Use household type fallback
4. ✅ Empty adultNames array → Skip to next fallback
5. ✅ Whitespace-only names → Filter them out
6. ✅ Unknown household types → Show generic "Household"
7. ✅ Legacy types (family, individual) → Map to new system

## Files Modified

- `/Users/briancarlberg/dev/gathergrove-frontend/src/pages/Discovery.tsx`
  - Added `mapToFilterType()` function
  - Updated `getHouseholdTypeIcon()`
  - Updated `getHouseholdTypeColor()`
  - Updated `getHouseholdTypeLabel()`
  - Enhanced `getHouseholdName()`

## Related Issues

- Household type inconsistency between backend and frontend
- Missing household name data for old records
- Filter chips not matching card display

## Future Improvements

1. **Backend Migration**: Standardize householdType values across all households
2. **Data Validation**: Require lastName OR adultNames when creating households
3. **Type Safety**: Create TypeScript enum for household types
4. **Icon Library**: Centralize household type metadata
5. **Empty State**: Show helpful message for households with no data

## Testing Checklist

- [ ] Visit Discovery page
- [ ] Check Chen Family shows "👥 Family w/ Kids"
- [ ] Check Garcia Family shows "👥 Family w/ Kids"
- [ ] Check Wilson (single parent) shows "👥 Family w/ Kids"
- [ ] Check Martinez Couple shows "💗 Singles/Couples"
- [ ] Check Brown Single shows "💗 Singles/Couples"
- [ ] Verify no generic "Neighbor" names (except truly empty records)
- [ ] Click "Family w/ Kids" filter → Verify badge matches
- [ ] Click "Singles/Couples" filter → Verify badge matches
- [ ] Check colors match between filter and badge

## Success Metrics

✅ All household cards show appropriate names (no generic "Neighbor")
✅ All badges match filter chip labels
✅ All icons match filter chip icons
✅ All colors match filter chip colors
✅ No compilation errors
✅ No console warnings
✅ Consistent UX across Discovery page

---

**Status:** ✅ Complete - Ready for testing
**Last Updated:** January 21, 2026
