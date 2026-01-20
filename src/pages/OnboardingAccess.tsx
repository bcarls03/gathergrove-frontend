// src/pages/OnboardingAccess.tsx
/**
 * V15 Step 1: OAuth Authentication
 * 
 * Users sign in with Google, Apple, Facebook, or Microsoft.
 * This is the entry point for the V15 onboarding flow.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import {
  signInWithGoogle,
  signInWithApple,
  signInWithFacebook,
  signInWithMicrosoft,
} from "../lib/firebase";
import { signupUser, type UserSignupRequest } from "../lib/api";
import { setOnboardingState } from "../lib/onboarding";

export default function OnboardingAccess() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // 🔧 DEV MODE: Skip OAuth and go straight to address
  const handleDevModeSkip = () => {
    console.log("🔧 DEV MODE: Skipping OAuth authentication");
    // Set dummy onboarding state
    setOnboardingState({
      firstName: "Dev",
      lastName: "User",
      email: "dev@example.com",
    });
    // Set UID in localStorage (used by API)
    localStorage.setItem("gg:uid", "dev-user-123");
    // Go straight to address page
    navigate("/onboarding/address");
  };

  const handleOAuthSignIn = async (
    provider: "google" | "apple" | "facebook" | "microsoft"
  ) => {
    setLoading(true);
    setError(null);

    let result;
    let user;
    let firstName = "";
    let lastName = "";

    try {
      switch (provider) {
        case "google":
          result = await signInWithGoogle();
          break;
        case "apple":
          result = await signInWithApple();
          break;
        case "facebook":
          result = await signInWithFacebook();
          break;
        case "microsoft":
          result = await signInWithMicrosoft();
          break;
      }

      user = result.user;
      console.log("✅ OAuth successful:", provider, user.uid);

      // ✅ CRITICAL: Sync localStorage UID with Firebase Auth UID
      // This ensures all subsequent API calls use the same UID
      try {
        localStorage.setItem("gg:uid", user.uid);
        console.log("✅ Synced localStorage UID with Firebase UID:", user.uid);
      } catch (err) {
        console.warn("Failed to sync UID to localStorage:", err);
      }

      // Extract user info from OAuth provider
      const displayName = user.displayName || "";
      const nameParts = displayName.split(" ");
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(" ") || "";

      // Create user profile in backend
      const payload: UserSignupRequest = {
        uid: user.uid,
        email: user.email || "",
        first_name: firstName,
        last_name: lastName,
        profile_photo_url: user.photoURL || null,
        visibility: "neighbors",
      };

      try {
        await signupUser(payload);
        console.log("✅ User profile created");
      } catch (err: any) {
        // Check if user already exists (409 Conflict)
        const status = err?.response?.status || err?.status;
        if (status === 409) {
          console.log("ℹ️ User already exists, continuing to onboarding...");
          // This is OK - user is logging back in, continue to onboarding
          // Don't throw, just continue with the flow
        } else {
          // Other error - throw it to be caught by outer catch
          throw err;
        }
      }

      // Save to onboarding state (works for both new and existing users)
      setOnboardingState({
        firstName,
        lastName,
        email: user.email || "",
      });

      // Clear any previous errors before navigating
      setError(null);
      setLoading(false);

      // Navigate to Step 2: Location
      navigate("/onboarding/address");
    } catch (err: any) {
      console.error("❌ OAuth error:", err);
      
      // Check for network errors (Firebase emulator not running)
      const errorCode = err?.code || "";
      const errorMessage = err?.message || err?.response?.data?.detail || "";
      
      if (errorCode === "auth/network-request-failed" || errorMessage.includes("network-request-failed")) {
        // Firebase emulator not available - show dev mode hint
        setError("Firebase emulator not running. Use 'DEV MODE: Skip Auth' button below to continue.");
        setLoading(false);
        return;
      }
      
      // Check if this is a 409 error (user already exists)
      const status = err?.response?.status || err?.status;
      const errorDetail = err?.response?.data?.detail || "";
      
      // Multiple checks for 409/user exists errors
      const is409 = 
        status === 409 || 
        errorMessage.includes("409") || 
        errorMessage.includes("already exists") ||
        errorDetail.includes("already exists") ||
        errorDetail.includes("User profile already exists");
      
      if (is409 && user) {
        // User already exists - this is actually success, just continue silently
        console.log("ℹ️ User already exists, continuing to onboarding...");
        setError(null); // Clear error
        setLoading(false);
        setOnboardingState({
          firstName,
          lastName,
          email: user.email || "",
        });
        navigate("/onboarding/address");
      } else {
        // Real error - show it to the user
        setError(errorMessage || "Authentication failed. Please try again.");
        setLoading(false);
      }
    }
  };

  return (
    <OnboardingLayout currentStep="access">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 48, textAlign: "center", maxWidth: 520, margin: "0 auto 48px" }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 0,
            lineHeight: 1.3,
            letterSpacing: "-0.02em",
          }}
        >
          Discover families near you
        </h1>
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginTop: 8,
            marginBottom: 0,
            lineHeight: 1.2,
          }}
        >
          get started
        </h2>
      </motion.div>

      {/* OAuth Buttons */}
      <div style={{ marginBottom: 28 }}>
        {/* Google (Primary) */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleOAuthSignIn("google")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "1.5px solid #dadce0",
            background: "#ffffff",
            color: "#3c4043",
            fontSize: 16,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            boxShadow: "0 1px 3px rgba(60, 64, 67, 0.08)",
            transition: "all 0.15s ease",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </motion.button>

        {/* Apple (Primary) */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => handleOAuthSignIn("apple")}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "none",
            background: "#000000",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.15s ease",
            opacity: loading ? 0.6 : 1,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </motion.button>

        {/* More Options Toggle */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => setShowMoreOptions(!showMoreOptions)}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: "#6b7280",
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: showMoreOptions ? 12 : 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            transition: "all 0.2s ease",
            opacity: loading ? 0.6 : 1,
          }}
        >
          More options
          <span style={{ 
            display: "inline-block",
            transform: showMoreOptions ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }}>
            ▼
          </span>
        </motion.button>

        {/* Secondary Options (Collapsed) */}
        {showMoreOptions && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Facebook */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(24, 119, 242, 0.25)" }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOAuthSignIn("facebook")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 12,
                border: "none",
                background: "#1877F2",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 2px 4px rgba(24, 119, 242, 0.15)",
                transition: "all 0.2s ease",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </motion.button>

            {/* Microsoft */}
            <motion.button
              whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleOAuthSignIn("microsoft")}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 12,
                border: "2px solid #e5e7eb",
                background: "#ffffff",
                color: "#5E5E5E",
                fontSize: 15,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
                transition: "all 0.2s ease",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 23 23">
                <path fill="#f25022" d="M1 1h10v10H1z" />
                <path fill="#00a4ef" d="M12 1h10v10H12z" />
                <path fill="#7fba00" d="M1 12h10v10H1z" />
                <path fill="#ffb900" d="M12 12h10v10H12z" />
              </svg>
              Continue with Microsoft
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 12,
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
            color: "#991b1b",
            fontSize: 14,
            textAlign: "center",
          }}
        >
          {error}
        </motion.div>
      )}

      {/* 🔧 DEV MODE: Skip Auth Button */}
      {import.meta.env.DEV && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(251, 191, 36, 0.3)" }}
          whileTap={{ scale: 0.98 }}
          onClick={handleDevModeSkip}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 10,
            border: "2px solid #fbbf24",
            background: "#fef3c7",
            color: "#92400e",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: "0 2px 8px rgba(251, 191, 36, 0.2)",
          }}
        >
          <span style={{ fontSize: 18 }}>🔧</span>
          <span>DEV MODE: Skip Auth</span>
        </motion.button>
      )}

      {/* Loading Indicator */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginBottom: 20,
            textAlign: "center",
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          <div
            style={{
              display: "inline-block",
              width: 20,
              height: 20,
              border: "3px solid #e5e7eb",
              borderTopColor: "#10b981",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
          <p style={{ marginTop: 10 }}>Signing you in...</p>
        </motion.div>
      )}

      {/* Privacy Notice - NON-NEGOTIABLE */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{
          marginBottom: 28,
          padding: "16px 20px",
          background: "#f9fafb",
          border: "1.5px solid #e5e7eb",
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 14, color: "#374151", margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
          <span style={{ fontSize: 16, marginRight: 6 }}>🔒</span>
          Secure sign-in only. We don't import contacts, friends, or social data.
        </p>
      </motion.div>

      {/* Reassurance */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#9ca3af",
          lineHeight: 1.6,
        }}
      >
        <p style={{ margin: 0 }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </OnboardingLayout>
  );
}
