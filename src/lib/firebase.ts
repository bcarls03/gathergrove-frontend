/**
 * Firebase Authentication Configuration
 * 
 * Sets up Firebase Auth with OAuth providers for V15 onboarding.
 * Supports: Google, Apple, Facebook, Microsoft
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  type UserCredential,
  signOut as firebaseSignOut,
  connectAuthEmulator,
} from 'firebase/auth';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // 🔧 Connect to Firebase Auth Emulator in development
  // This allows local testing without real OAuth providers
  if (import.meta.env.DEV) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('🔧 Connected to Firebase Auth Emulator (http://localhost:9099)');
    } catch (error) {
      // Emulator already connected or not available - that's okay
      console.log('ℹ️ Firebase Auth Emulator not available or already connected');
    }
  }
  
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

// OAuth Provider instances
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account', // Always show account picker
});

const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');

const facebookProvider = new FacebookAuthProvider();
facebookProvider.setCustomParameters({
  display: 'popup',
});

const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Helper: Create or sign in with test user in emulator
 * This is used when Firebase Auth Emulator is active to bypass OAuth popup issues
 */
async function signInWithEmulatorTestUser(provider: string): Promise<UserCredential> {
  const testEmails: Record<string, string> = {
    google: 'test-google@gathergrove.dev',
    apple: 'test-apple@gathergrove.dev',
    facebook: 'test-facebook@gathergrove.dev',
    microsoft: 'test-microsoft@gathergrove.dev',
  };

  const testDisplayNames: Record<string, string> = {
    google: 'Test Google User',
    apple: 'Test Apple User',
    facebook: 'Test Facebook User',
    microsoft: 'Test Microsoft User',
  };

  const email = testEmails[provider] || 'test@gathergrove.dev';
  const displayName = testDisplayNames[provider] || 'Test User';
  const password = 'emulator-test-password-123';

  try {
    // Try to sign in with existing test user
    const credential = await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Signed in with existing emulator test user: ${email}`);
    return credential;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      // Create new test user if doesn't exist
      console.log(`🔧 Creating new emulator test user: ${email}`);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(credential.user, {
        displayName,
        photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=10b981&color=fff`,
      });
      
      console.log(`✅ Created and signed in with emulator test user: ${email}`);
      return credential;
    }
    throw error;
  }
}

/**
 * Sign in with Google OAuth
 * In emulator: automatically creates/signs in with test user
 * In production: uses real Google OAuth popup
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  // Use test user in emulator, real OAuth in production
  if (import.meta.env.DEV) {
    return signInWithEmulatorTestUser('google');
  }
  return signInWithPopup(auth, googleProvider);
}

/**
 * Sign in with Apple OAuth
 * In emulator: automatically creates/signs in with test user
 * In production: uses real Apple OAuth popup
 */
export async function signInWithApple(): Promise<UserCredential> {
  if (import.meta.env.DEV) {
    return signInWithEmulatorTestUser('apple');
  }
  return signInWithPopup(auth, appleProvider);
}

/**
 * Sign in with Facebook OAuth
 * In emulator: automatically creates/signs in with test user
 * In production: uses real Facebook OAuth popup
 */
export async function signInWithFacebook(): Promise<UserCredential> {
  if (import.meta.env.DEV) {
    return signInWithEmulatorTestUser('facebook');
  }
  return signInWithPopup(auth, facebookProvider);
}

/**
 * Sign in with Microsoft OAuth
 * In emulator: automatically creates/signs in with test user
 * In production: uses real Microsoft OAuth popup
 */
export async function signInWithMicrosoft(): Promise<UserCredential> {
  if (import.meta.env.DEV) {
    return signInWithEmulatorTestUser('microsoft');
  }
  return signInWithPopup(auth, microsoftProvider);
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

/**
 * Get current user's ID token for API authentication
 */
export async function getIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken();
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChanged(callback: (user: any) => void) {
  return auth.onAuthStateChanged(callback);
}

export { auth };
