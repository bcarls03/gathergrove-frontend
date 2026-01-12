// src/pages/OnboardingAccessSimple.tsx
/**
 * SIMPLIFIED V15 Step 1: OAuth Authentication
 * Minimal version for testing - no fancy animations
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  signInWithGoogle,
  signInWithApple,
} from "../lib/firebase";
import { signupUser, type UserSignupRequest } from "../lib/api";
import { setOnboardingState } from "../lib/onboarding";

export default function OnboardingAccessSimple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setLoading(true);
    setError(null);

    try {
      let result;
      
      if (provider === "google") {
        result = await signInWithGoogle();
      } else {
        result = await signInWithApple();
      }

      const user = result.user;
      console.log("✅ OAuth successful:", provider, user.uid);

      // Extract user info
      const displayName = user.displayName || "";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

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
        } else {
          // Other error - throw it to be caught by outer catch
          throw err;
        }
      }

      // Save to onboarding state
      setOnboardingState({
        firstName,
        lastName,
        email: user.email || "",
      });

      // Navigate to Step 2: Address
      navigate("/onboarding/address");
    } catch (err: any) {
      console.error("❌ OAuth error:", err);
      // Don't show 409 error to user
      const status = err?.response?.status || err?.status;
      if (status === 409) {
        // User already exists - just continue
        navigate("/onboarding/address");
      } else {
        setError(err?.message || err?.response?.data?.detail || "Authentication failed. Please try again.");
        setLoading(false);
      }
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f3f4f6",
      padding: 20,
    }}>
      <div style={{
        maxWidth: 400,
        width: "100%",
        background: "white",
        borderRadius: 16,
        padding: 40,
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
      }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, textAlign: "center" }}>
          Welcome to GatherGrove
        </h1>
        <p style={{ color: "#6b7280", textAlign: "center", marginBottom: 32 }}>
          Sign in to connect with your neighbors
        </p>

        {error && (
          <div style={{
            padding: 12,
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <button
          onClick={() => handleOAuthSignIn("google")}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "white",
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 12,
          }}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        <button
          onClick={() => handleOAuthSignIn("apple")}
          disabled={loading}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "black",
            color: "white",
            fontSize: 16,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Continue with Apple"}
        </button>

        <p style={{
          fontSize: 12,
          color: "#9ca3af",
          textAlign: "center",
          marginTop: 24,
        }}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
