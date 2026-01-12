# Troubleshooting Blank Screen on /onboarding/access

## Issue
Getting blank screen when navigating to `/onboarding/access`

## Diagnostic Steps

1. **Check browser console for errors**
   - Open browser DevTools (F12 or Cmd+Option+I on Mac)
   - Go to Console tab
   - Look for red error messages

2. **Check React DevTools**
   - Install React DevTools extension if not already installed
   - Check if OnboardingAccess component is rendering
   - Check component tree for errors

3. **Common Causes**:
   - Firebase initialization error (check console)
   - Missing environment variables
   - Import/export mismatch
   - Runtime error in component
   - CSS issue causing content to be hidden

## Quick Fix: Create Minimal Test Component

Let's create a minimal version of OnboardingAccess to isolate the issue:

```typescript
// Minimal test version
export default function OnboardingAccess() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Test: Onboarding Access</h1>
      <button onClick={() => console.log('Button clicked')}>
        Test Button
      </button>
    </div>
  );
}
```

If this renders, gradually add back features until you find what breaks.

## Check These Files

1. `/src/lib/firebase.ts` - Firebase init might be throwing
2. `/src/lib/api.ts` - API calls might be failing
3. `/src/components/OnboardingLayout.tsx` - Layout component might have issues
4. Browser console - Look for errors

## Temporary Workaround

If you need to proceed with testing, you can:

1. Navigate directly to `/onboarding/address` to skip OAuth
2. Or create a simple test version of OnboardingAccess without OAuth
