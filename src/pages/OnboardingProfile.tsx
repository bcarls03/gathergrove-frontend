// src/pages/OnboardingProfile.tsx
import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { signupUser, type UserSignupRequest, type UserVisibility } from "../lib/api";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 24,
  borderRadius: 24,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#e5e7eb",
  background: "#ffffff",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#d1d5db",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  marginTop: 20,
  width: "100%",
  padding: "12px 16px",
  borderRadius: 999,
  border: "none",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};

export default function OnboardingProfile() {
  const navigate = useNavigate();

  // Load saved state
  const savedState = getOnboardingState();

  const [firstName, setFirstName] = useState(savedState.firstName || "");
  const [lastName, setLastName] = useState(savedState.lastName || "");
  // Don't use saved email - always start fresh for each signup attempt
  const [email, setEmail] = useState("");
  // Default to "neighbors" - no UI selector needed (can change in Settings later)
  const visibility: UserVisibility = "neighbors";
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save state when fields change
  useEffect(() => {
    setOnboardingState({
      firstName: firstName.trim() || null,
      lastName: lastName.trim() || null,
      email: email.trim() || null,
      visibility,
    });
  }, [firstName, lastName, email, visibility]);

  const firstNameValid = firstName.trim().length > 0;
  const lastNameValid = lastName.trim().length > 0;
  const emailValid = email.includes("@");

  const isValid = firstNameValid && lastNameValid && emailValid;

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      // Generate a unique UID for this signup
      const newUid = `dev-${window.crypto.randomUUID()}`;
      
      console.log("🔧 Attempting signup with UID:", newUid);
      console.log("📧 Email:", email.trim());
      
      const payload: UserSignupRequest = {
        uid: newUid,
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        visibility,
      };

      const result = await signupUser(payload);
      console.log("✅ Signup successful!", result);

      // Navigate to address entry (Step 2)
      navigate("/onboarding/address");
    } catch (err: any) {
      console.error("❌ Signup error:", err);
      console.error("Error details:", err.response?.data || err.message);
      setError(err?.message || "Failed to create profile");
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout currentStep="access">
      {/* Header Section - Premium Typography */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ marginBottom: 48, textAlign: "center" }}
      >
        <h1 style={{ 
          fontSize: 36, 
          fontWeight: 700, 
          color: "#111827", 
          marginBottom: 16,
          lineHeight: 1.2,
          letterSpacing: "-0.02em"
        }}>
          Discover families near you
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{ 
            fontSize: 17, 
            color: "#6b7280", 
            margin: 0,
            lineHeight: 1.5,
            fontWeight: 500
          }}
        >
          Get started in seconds
        </motion.p>
      </motion.div>

      {/* Value Proposition - Honest, No False Promises */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        style={{
          marginBottom: 32,
          padding: "20px 24px",
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
          border: "2px solid #86efac",
          borderRadius: 16,
          textAlign: "center",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Subtle background pattern */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: "radial-gradient(circle at 20% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 50%, #10b981 0%, transparent 50%)"
        }} />
        
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏘️</div>
          <p style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            color: "#065f46", 
            marginBottom: 6,
            lineHeight: 1.3
          }}>
            Discover who's nearby
          </p>
          <p style={{ 
            fontSize: 14, 
            color: "#047857", 
            margin: 0,
            fontWeight: 500
          }}>
            Connect with families, couples, and neighbors in your area
          </p>
        </div>
      </motion.div>

      {/* Social Login Buttons - Enhanced with Motion & Shadows */}
      <div style={{ marginBottom: 28 }}>
        {/* Google Sign-In - White with subtle shadow */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => alert("Google Sign-In would launch here (production feature)")}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </motion.button>

        {/* Apple Sign-In - Black with refined styling */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => alert("Apple Sign-In would launch here (production feature)")}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "none",
            background: "#000000",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </motion.button>

        {/* Facebook Sign-In - Facebook blue with refined styling */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(24, 119, 242, 0.25)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => alert("Facebook Sign-In would launch here (production feature)")}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "none",
            background: "#1877F2",
            color: "#ffffff",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 2px 4px rgba(24, 119, 242, 0.15)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continue with Facebook
        </motion.button>

        {/* Microsoft Sign-In - White with Microsoft colors */}
        <motion.button
          whileHover={{ scale: 1.01, boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)" }}
          whileTap={{ scale: 0.99 }}
          onClick={() => alert("Microsoft Sign-In would launch here (production feature)")}
          style={{
            width: "100%",
            padding: "16px 20px",
            borderRadius: 12,
            border: "2px solid #e5e7eb",
            background: "#ffffff",
            color: "#5E5E5E",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 23 23">
            <path fill="#f25022" d="M1 1h10v10H1z"/>
            <path fill="#00a4ef" d="M12 1h10v10H12z"/>
            <path fill="#7fba00" d="M1 12h10v10H1z"/>
            <path fill="#ffb900" d="M12 12h10v10H12z"/>
          </svg>
          Continue with Microsoft
        </motion.button>
      </div>

      {/* Privacy Notice - Refined Design */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ 
          marginBottom: 28, 
          padding: "14px 18px", 
          background: "#f0fdf4", 
          border: "1.5px solid #86efac", 
          borderRadius: 10,
          textAlign: "center"
        }}
      >
        <p style={{ fontSize: 13, color: "#166534", margin: 0, lineHeight: 1.5 }}>
          <span style={{ fontSize: 14 }}>🔒</span> <strong>Secure authentication only.</strong> We won't import contacts or social data.
        </p>
      </motion.div>

      {/* Visibility & Inclusivity - Single Clear Message */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        style={{ 
          textAlign: "center",
          marginBottom: 40
        }}
      >
        <p style={{ 
          fontSize: 14, 
          color: "#374151", 
          margin: 0,
          marginBottom: 6,
          fontWeight: 500,
          lineHeight: 1.5
        }}>
          Nearby families can discover and reach out to you
        </p>
        <p style={{ 
          fontSize: 12, 
          color: "#9ca3af", 
          margin: 0,
          marginBottom: 16
        }}>
          You control visibility in Settings
        </p>
        
        {/* Inclusivity Signal */}
        <p style={{ 
          fontSize: 12, 
          color: "#6b7280", 
          margin: 0,
          fontStyle: "italic"
        }}>
          For families, couples, singles, and empty nesters
        </p>
      </motion.div>

      {/* Dev Mode - Only Visible in Development */}
      {import.meta.env.DEV && (
        <>
          {/* Divider */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            marginBottom: 20,
            gap: 12 
          }}>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
            <p style={{ fontSize: 12, color: "#9ca3af" }}>⚠️ Dev Mode: Manual Entry</p>
            <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
          </div>

          <div style={cardStyle}>
        {/* First Name */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="firstName" style={labelStyle}>
            <User size={14} style={{ display: "inline", marginRight: 4 }} />
            First Name *
          </label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Sarah"
            style={{
              ...inputStyle,
              borderColor: touched && !firstNameValid ? "#ef4444" : "#d1d5db",
            }}
          />
          {touched && !firstNameValid && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#ef4444" }}>
              First name is required
            </p>
          )}
        </div>

        {/* Last Name */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="lastName" style={labelStyle}>
            Last Name *
          </label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Smith"
            style={{
              ...inputStyle,
              borderColor: touched && !lastNameValid ? "#ef4444" : "#d1d5db",
            }}
          />
          {touched && !lastNameValid && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#ef4444" }}>
              Last name is required
            </p>
          )}
        </div>

        {/* Email */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="email" style={labelStyle}>
            <Mail size={14} style={{ display: "inline", marginRight: 4 }} />
            Email *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              ...inputStyle,
              borderColor: touched && !emailValid ? "#ef4444" : "#d1d5db",
            }}
          />
          {touched && !emailValid && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#ef4444" }}>
              Valid email is required
            </p>
          )}
        </div>

        {/* Simplified Privacy Notice - No selector needed */}
        <div style={{ 
          padding: 14, 
          background: "#f0fdf4", 
          borderRadius: 12,
          border: "1px solid #86efac",
          marginBottom: 24 
        }}>
          <p style={{ fontSize: 13, color: "#166534", margin: 0, marginBottom: 6 }}>
            🏘️ <strong>You'll appear in neighborhood discovery</strong>
          </p>
          <p style={{ fontSize: 12, color: "#047857", margin: 0 }}>
            So families nearby can find you—change anytime in Settings
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: "#fee2e2",
              color: "#991b1b",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* Continue Button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={saving}
          style={{
            ...buttonStyle,
            background: isValid && !saving ? "#10b981" : "#d1d5db",
            color: isValid && !saving ? "#ffffff" : "#9ca3af",
            cursor: isValid && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Creating profile..." : "Continue"}
        </motion.button>

        {/* Progress & Next Step Info */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#10b981" }} />
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
            <div style={{ width: 40, height: 4, borderRadius: 2, background: "#e5e7eb" }} />
          </div>
          <p style={{ fontSize: 14, color: "#374151", marginBottom: 6 }}>
            <strong>Next:</strong> Where do you live?
          </p>
          <p style={{ fontSize: 12, color: "#9ca3af" }}>
            ⏱️ 3 quick steps • About 30 seconds total
          </p>
        </div>
      </div>
        </>
      )}
    </OnboardingLayout>
  );
}
