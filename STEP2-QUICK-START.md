# Quick Start: Testing Step 2 (Address Entry)

## Setup (5 minutes)

### 1. Get Google Maps API Key
1. Go to https://console.cloud.google.com/google/maps-apis
2. Create a new project or select existing
3. Enable these APIs:
   - **Places API** (required for autocomplete)
   - **Maps JavaScript API** (required for autocomplete)
4. Create credentials → API Key
5. Copy your API key

### 2. Configure Environment
```bash
cd gathergrove-frontend

# Create .env file from example
cp .env.example .env

# Edit .env and add your Google Maps API key
# VITE_GOOGLE_MAPS_API_KEY=your_actual_key_here
```

### 3. Start Servers
```bash
# Terminal 1 - Backend
cd gathergrove-backend
./scripts/dev.sh

# Terminal 2 - Frontend  
cd gathergrove-frontend
npm run dev
```

---

## Testing Flow (< 1 minute)

### Test 1: Complete Onboarding
1. Open http://localhost:5173
2. Navigate to `/onboarding/profile`
3. In **dev mode** (bottom of page):
   - First Name: `John`
   - Last Name: `Doe`
   - Email: `john@test.com`
   - Visibility: Select any option
   - Click "Continue"
4. You should see **Address Entry** page
5. Start typing an address (e.g., "1600 Amphitheatre")
6. Select an address from Google Places dropdown
7. You should see "Saving your location..." overlay
8. You should see **Magical Moment** page with:
   - Animated emoji 🎉
   - Welcome message with your city/state
   - "Start Exploring" button
9. After 3 seconds, auto-redirects to home

**Total Time**: Should be ~25 seconds

### Test 2: Skip Address
1. Repeat steps 1-3 above
2. On Address Entry page, click **"I'll add this later"**
3. Should redirect to home immediately
4. Note: User won't appear in discovery without address

---

## Expected Results

✅ **Success Indicators**:
- Google Places autocomplete dropdown appears when typing
- Address saves successfully (check browser console for "✅ Profile updated")
- Magical moment shows city/state from address
- Auto-redirect works after 3 seconds
- No TypeScript errors in console

❌ **Common Issues**:

**Issue**: "Google Places autocomplete not appearing"
- **Fix**: Check that `VITE_GOOGLE_MAPS_API_KEY` is set in `.env`
- **Fix**: Verify Places API is enabled in Google Cloud Console
- **Fix**: Check browser console for Google Maps API errors

**Issue**: "Cannot find name 'google'"
- **Fix**: This is normal during TypeScript checking, runtime will work
- **Fix**: Google Maps script loads dynamically at runtime

**Issue**: "Failed to save your location"
- **Fix**: Check backend is running on port 8000
- **Fix**: Check browser console for API errors
- **Fix**: Verify you're logged in (dev mode signup works)

---

## What's Next?

After Step 2 is working, we can implement:

### Phase 2 (Optional Steps)
- **Step 3**: Household context (Family/Singles/Empty Nesters)
- **Step 4**: Child information (conditional on "Family" selection)  
- **Step 5**: Interests (multi-select chips)

### Backend Work
**Priority**: Implement neighborhood count endpoint

```python
# In gathergrove-backend/app/routes/people.py

@router.get("/people/count")
def count_people(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(2.0, ge=0.1, le=10.0, description="Radius in miles"),
    claims=Depends(verify_token),
):
    # TODO: Implement geospatial query
    # Use Firestore geohashing or geoqueries
    # Return count of households within radius
    pass
```

Once this endpoint exists, update `OnboardingMagicalMoment.tsx` to:
1. Call `GET /api/people/count?lat={lat}&lng={lng}&radius=2`
2. Show density-adaptive message based on count
3. Remove the `// TODO` comment

---

## Time Investment

- **Step 2 Implementation**: ✅ Complete (1 hour)
- **Google Maps Setup**: ~5 minutes
- **Testing**: ~5 minutes
- **Backend Endpoint**: ~30 minutes (future work)

**Total**: ~1 hour 40 minutes for fully functional Step 2 ✅
