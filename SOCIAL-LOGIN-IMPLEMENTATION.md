# Social Login Implementation Guide

## Overview
GatherGrove minimizes friction by supporting familiar, trusted sign-in methods where appropriate. This aligns with our core UX principle of making onboarding effortless.

### Supported Providers
1. **Apple** - Required for iOS apps, widely trusted, privacy-focused
2. **Google** - Most popular (90%+ of Android users)
3. **Facebook** - Great for community/neighborhood apps, 2.9B+ users
4. **Microsoft** - Enterprise/work accounts, 1.2B+ users

## Current State (Dev Mode)
- **Location**: `src/pages/OnboardingProfile.tsx`
- **Status**: 4 placeholder buttons with alerts (Apple, Google, Facebook, Microsoft)
- **Testing**: Manual form below social buttons for dev testing

## Why These Four Providers?

### Apple Sign-In ✅
- **Required**: Apple mandates it for iOS apps that use social login
- **Trust**: Known for privacy (minimal data sharing)
- **Coverage**: All iOS/macOS users
- **Use case**: Mobile-first users, privacy-conscious neighbors

### Google Sign-In ✅
- **Coverage**: ~90% of internet users have a Google account
- **Universal**: Works across all platforms
- **Data**: Can access profile photo, name, email easily
- **Use case**: Default choice for most users

### Facebook Sign-In ✅
- **Community fit**: 2.9B+ users, already used for local groups
- **Social graph**: Can leverage friends/connections (with permission)
- **Events integration**: Facebook Events API useful for event features
- **Use case**: Neighborhood apps, social community platforms
- **Demographics**: Especially popular with parents/families (your target!)

### Microsoft Sign-In ✅
- **Enterprise**: Dominant in corporate environments (1.2B+ users)
- **SSO**: Work email addresses, Azure AD integration
- **Professional**: HOAs, managed properties, corporate housing
- **Use case**: Professional communities, work-sponsored housing

## Production Implementation

### 1. Firebase Authentication Setup

#### Install Dependencies
```bash
npm install firebase
```

#### Configure Firebase Auth (src/lib/firebase.ts)
```typescript
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider,
  FacebookAuthProvider 
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  // ... other config
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const facebookProvider = new FacebookAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

// Optional: Request additional scopes
googleProvider.addScope('profile');
googleProvider.addScope('email');

appleProvider.addScope('email');
appleProvider.addScope('name');

facebookProvider.addScope('email');
facebookProvider.addScope('public_profile');
// Future: facebookProvider.addScope('user_friends'); // For social graph

microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.setCustomParameters({
  tenant: 'common' // Allow work, school, or personal Microsoft accounts
});
```

### 2. Update OnboardingProfile.tsx

Replace placeholder buttons with real Firebase Auth calls:

```typescript
import { signInWithPopup } from 'firebase/auth';
import { 
  auth, 
  googleProvider, 
  appleProvider,
  facebookProvider,
  microsoftProvider 
} from '../lib/firebase';

// Helper function to extract user info from OAuth result
const extractUserInfo = (result: any) => {
  const user = result.user;
  const names = user.displayName?.split(' ') || [];
  const firstName = names[0] || '';
  const lastName = names.slice(1).join(' ') || '';
  const email = user.email || '';
  
  return { user, firstName, lastName, email };
};

// Helper function to signup user with extracted info
const signupWithOAuth = async (result: any, navigate: any) => {
  const { user, firstName, lastName, email } = extractUserInfo(result);
  const idToken = await user.getIdToken();
  
  await signupUser({
    uid: user.uid,
    email,
    first_name: firstName,
    last_name: lastName,
    visibility: 'neighbors' // default
  }, idToken);
  
  navigate('/onboarding/household');
};

// In component:
const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await signupWithOAuth(result, navigate);
  } catch (error) {
    console.error('Google sign-in failed:', error);
    setError('Sign-in failed. Please try again.');
  }
};

const handleAppleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    await signupWithOAuth(result, navigate);
  } catch (error) {
    console.error('Apple sign-in failed:', error);
    setError('Sign-in failed. Please try again.');
  }
};

const handleFacebookSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    await signupWithOAuth(result, navigate);
  } catch (error) {
    console.error('Facebook sign-in failed:', error);
    setError('Sign-in failed. Please try again.');
  }
};

const handleMicrosoftSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, microsoftProvider);
    await signupWithOAuth(result, navigate);
  } catch (error) {
    console.error('Microsoft sign-in failed:', error);
    setError('Sign-in failed. Please try again.');
  }
};
```

### 3. Update API Client (src/lib/api.ts)

Modify to use real Firebase ID tokens instead of dev headers:

```typescript
// Remove dev headers in production
const isProduction = import.meta.env.PROD;

api.interceptors.request.use((config) => {
  if (isProduction) {
    // In production, expect caller to set Authorization header
    // Don't add dev headers
  } else {
    // Dev mode: use X-Uid headers
    config.headers = {
      ...(config.headers as any),
      ...devHeaders(),
    } as any;
  }
  return config;
});

// Update signupUser to accept optional token
export async function signupUser(
  payload: UserSignupRequest, 
  idToken?: string
): Promise<UserProfile> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  
  if (idToken) {
    headers["Authorization"] = `Bearer ${idToken}`;
  }
  
  const res = await api.post("/users/signup", payload, { headers });
  return res.data as UserProfile;
}
```

### 4. Backend Verification

Backend already supports Firebase ID token verification (see `app/deps/auth.py`):

```python
# In production (ALLOW_DEV_AUTH != 1):
# - Requires Authorization: Bearer <idToken>
# - Verifies token with firebase_admin.auth.verify_id_token()
# - Extracts uid, email, admin from decoded token

# In dev (ALLOW_DEV_AUTH = 1):
# - Accepts X-Uid, X-Email, X-Admin headers
# - No Bearer token required
```

## Benefits

### User Experience
✅ **One-click signup** - no typing required  
✅ **Trusted providers** - familiar Apple/Google branding  
✅ **Auto-filled data** - name and email from OAuth  
✅ **Secure** - Firebase handles authentication  

### Security
✅ **No password management** - OAuth handles credentials  
✅ **Token-based auth** - Firebase ID tokens verified server-side  
✅ **Revocation support** - users can revoke access via Apple/Google  

### Development
✅ **Easy testing** - dev mode still has manual form  
✅ **Gradual rollout** - can add providers incrementally  
✅ **Standard implementation** - Firebase Auth is well-documented  

## Testing Production Implementation

1. **Enable Firebase Auth providers** in Firebase Console:
   - Go to Authentication > Sign-in method
   - Enable Google provider (easiest - just toggle on)
   - Enable Apple provider (requires Apple Developer account + setup)
   - Enable Facebook provider (requires Facebook App ID + App Secret)
   - Enable Microsoft provider (requires Azure AD app registration)

2. **Provider-specific setup**:

   **Google**: 
   - No extra setup needed beyond Firebase Console toggle
   
   **Apple**:
   - Requires Apple Developer Program membership ($99/year)
   - Create Service ID in Apple Developer portal
   - Configure domains and return URLs
   
   **Facebook**:
   - Create app at developers.facebook.com
   - Get App ID and App Secret
   - Add to Firebase Console
   - Configure OAuth redirect URIs
   - Request app review for public access
   
   **Microsoft**:
   - Register app in Azure Portal (portal.azure.com)
   - Get Application (client) ID
   - Configure redirect URIs
   - Add to Firebase Console

3. **Set environment variables**:
   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   ```

4. **Test flow for each provider**:
   - Click "Continue with [Provider]"
   - OAuth popup appears
   - Sign in with account
   - Grant permissions
   - Redirect back to app
   - User profile created automatically
   - Proceed to household step (or skip)

## Fallback Behavior

Manual form remains available for:
- **Dev/testing** - no OAuth setup needed
- **Troubleshooting** - if OAuth fails
- **Enterprise users** - custom SSO later
- **Privacy-conscious users** - prefer manual signup

## Future Enhancements

### Additional Providers (Lower Priority)
- **LinkedIn** - If adding professional networking features
- **GitHub** - If expanding to developer communities  
- **Twitter/X** - Declining usage for sign-in, focus on sharing instead

### Advanced Features
- **Email/Password** option for users without social accounts
- **Phone number** sign-in (SMS verification)
- **Passkeys** - WebAuthn/FIDO2 for passwordless auth
- **Remember device** to reduce re-auth friction
- **Biometric auth** on mobile (Face ID, Touch ID)
- **Account linking** - Connect multiple providers to one account
- **Provider priority** - Show most popular provider first based on user agent
- **Facebook social features**:
  - Import friends who are also on GatherGrove
  - Suggest households based on mutual friends
  - Auto-invite Facebook friends in same neighborhood

### Privacy Considerations
- **Minimal data collection** - Only request name, email, profile photo
- **No social graph by default** - Don't auto-connect friends without explicit consent
- **Clear permissions** - Explain what data we access and why
- **Account deletion** - Allow users to unlink social accounts
- **Data portability** - Export user data on request

## Provider Comparison

| Provider   | Setup Complexity | User Coverage | Best For                    | Special Benefits           |
|------------|------------------|---------------|----------------------------|----------------------------|
| Google     | Easy ✅          | Very High     | Everyone                   | Universal, reliable        |
| Apple      | Medium           | High (iOS)    | Mobile users, privacy      | Required for iOS apps      |
| Facebook   | Medium           | Very High     | Community apps, families   | Social graph, events API   |
| Microsoft  | Medium           | High (work)   | Enterprise, professionals  | Work SSO, Azure AD         |

## References

- [Firebase Auth - Google](https://firebase.google.com/docs/auth/web/google-signin)
- [Firebase Auth - Apple](https://firebase.google.com/docs/auth/web/apple)
- [Apple Sign-In Guidelines](https://developer.apple.com/design/human-interface-guidelines/sign-in-with-apple)
