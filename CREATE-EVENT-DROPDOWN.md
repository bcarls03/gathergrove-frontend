# Create Event Dropdown - Discovery Tab

**Date**: January 21, 2026  
**Status**: ✅ **Implemented**

---

## What Was Added

Added a **"+ New Event"** dropdown button to the Discovery tab header that gives users two clear options:
- ⚡ **Happening Now** - Post something spontaneous (right now!)
- 📅 **Plan Event** - Schedule for a specific date/time

---

## Implementation Details

### New State
```typescript
const [showCreateDropdown, setShowCreateDropdown] = useState(false);
```

### UI Components

**1. Dropdown Button**
- Location: Discovery tab header (next to count badge)
- Style: Green button with calendar icon
- Interaction: Click to toggle dropdown, animated arrow rotation

**2. Dropdown Menu**
- Position: Absolute, below button
- Animation: Fade in/out with Framer Motion
- Click outside to close: useEffect with event listener

**3. Menu Options**

#### Option 1: ⚡ Happening Now
- Icon: Lightning bolt emoji in orange gradient circle
- Action: Navigate to `/compose/happening`
- Description: "Post something spontaneous - right now!"
- Hover: Light green background

#### Option 2: 📅 Plan Event
- Icon: Calendar emoji in blue gradient circle
- Action: Navigate to `/compose/event`
- Description: "Schedule something for a specific date/time"
- Hover: Light blue background

---

## User Flow

```
1. User clicks "New Event" button
   ↓
2. Dropdown menu appears with 2 options
   ↓
3. User selects:
   
   A) ⚡ Happening Now
      → Navigate to /compose/happening
      → Create "type: now" event
      → Post immediately
      → Shows in Discovery "Happening Now" section
   
   B) 📅 Plan Event
      → Navigate to /compose/event
      → Create "type: future" event with date/time
      → Schedule for later
      → Shows in Calendar tab
```

---

## Visual Design

### Button Styling
```css
- Background: #10b981 (green)
- Border: 2px solid #10b981
- Text: White, bold (700 weight)
- Shadow: 0 2px 8px rgba(16, 185, 129, 0.2)
- Hover: Lift up (-1px) with stronger shadow
```

### Dropdown Menu
```css
- Background: White
- Border: 2px solid #e5e7eb
- Shadow: 0 10px 30px rgba(0, 0, 0, 0.15)
- Border radius: 12px
- Min width: 240px
```

### Menu Items
```css
- Padding: 14px 16px
- Icon size: 36x36px in gradient circle
- Title: 15px, bold (700)
- Description: 12px, gray (#6b7280)
- Hover: Background color change (green/blue tint)
```

---

## Code Locations

**File**: `gathergrove-frontend/src/pages/Discovery.tsx`

**Lines Added**:
- State: Line ~28 (`showCreateDropdown`)
- Click-outside handler: Lines ~44-58
- Button & dropdown UI: Lines ~289-424

---

## Features

### ✅ Responsive Design
- Button scales on hover (translateY animation)
- Dropdown fades in smoothly (Framer Motion)
- Click outside closes dropdown
- Arrow rotates 180° when open

### ✅ Clear Communication
- Icons distinguish the two types (⚡ vs 📅)
- Descriptive subtitles explain each option
- Gradient backgrounds match action type (orange = now, blue = future)

### ✅ Accessibility
- Semantic button elements
- Hover states for feedback
- Clear visual hierarchy

---

## Testing Instructions

1. **Navigate to Discovery tab**
   - Go to http://localhost:5173/discovery

2. **Click "New Event" button**
   - Should see dropdown menu appear
   - Arrow should rotate down

3. **Hover over menu items**
   - "Happening Now" should get green tint background
   - "Plan Event" should get blue tint background

4. **Click "Happening Now"**
   - Should navigate to `/compose/happening`
   - Should see "What's happening now?" form

5. **Go back, click "Plan Event"**
   - Should navigate to `/compose/event`
   - Should see "Plan an event" form with date/time pickers

6. **Test click-outside**
   - Open dropdown
   - Click anywhere outside
   - Dropdown should close

7. **Test navigation**
   - Create a "Happening Now" event
   - Should appear in Discovery tab "Happening Now" section
   - Create a "Future Event"
   - Should appear in Calendar tab

---

## Known Limitations

1. **Desktop-optimized**: Dropdown might need adjustment for mobile (could use modal instead)
2. **Single dropdown**: Only one dropdown can be open at a time (by design)
3. **No keyboard navigation**: Arrow keys don't navigate menu items (could add)

---

## Future Enhancements

### Short-term
- [ ] Add keyboard navigation (up/down arrows, enter to select)
- [ ] Add keyboard shortcut hints ("⌘N" for new)
- [ ] Mobile-optimized modal version for small screens
- [ ] Add recent event type indicator ("You usually create 'Happening Now'")

### Medium-term
- [ ] Quick templates: "Pool party", "Playdate", "Dog walk"
- [ ] Show draft events count in dropdown
- [ ] "Create from template" option
- [ ] Show upcoming events count

### Long-term
- [ ] AI suggestions: "Based on the time, suggest 'Happening Now'"
- [ ] Smart defaults: Pre-fill based on user patterns
- [ ] Calendar integration: "Create recurring event"
- [ ] Share to social: "Cross-post to Facebook Events"

---

## Related Files

- **Routes**: `src/App.tsx` (lines 121-122)
  - `/compose/happening` → ComposePost (kind="happening")
  - `/compose/event` → ComposePost (kind="event")

- **Compose Form**: `src/pages/ComposePost.tsx`
  - Handles both event types based on route
  - Line 155: `kind: "happening" | "event"`

- **Event Types Guide**: `EVENT-TYPES-GUIDE.md`
  - Comprehensive explanation of "now" vs "future"

---

## Comparison: Before vs After

### Before ❌
```
┌─────────────────────────────────┐
│ Discover              9 nearby  │  ← No way to create events!
│                                 │
│ [Nearby] [Connected]            │
└─────────────────────────────────┘
```

### After ✅
```
┌──────────────────────────────────────────┐
│ Discover     9 nearby  [+ New Event] ▼   │  ← Click opens menu
│                                          │
│ Dropdown (when open):                    │
│ ┌────────────────────────────────────┐   │
│ │ ⚡ Happening Now                   │   │
│ │   Post something spontaneous...    │   │
│ │                                    │   │
│ │ 📅 Plan Event                      │   │
│ │   Schedule for specific date...    │   │
│ └────────────────────────────────────┘   │
│                                          │
│ [Nearby] [Connected]                     │
└──────────────────────────────────────────┘
```

---

## Success Metrics

### ✅ Implementation Complete
- Button added to Discovery tab ✅
- Dropdown menu with 2 options ✅
- Navigation to compose routes ✅
- Click-outside handler ✅
- Hover animations ✅
- No TypeScript errors ✅

### 📊 Expected Impact
- **Discoverability**: Users can now find event creation
- **Clarity**: Clear distinction between "now" vs "future"
- **Conversion**: Lower friction to create events
- **Engagement**: More spontaneous "Happening Now" posts

---

## Deployment Notes

- No breaking changes
- No database migrations needed
- No API changes required
- Frontend-only update
- Safe to deploy immediately

---

**Status**: ✅ Ready for user testing!

Try it out: Open Discovery tab → Click "New Event" → Select an option!
