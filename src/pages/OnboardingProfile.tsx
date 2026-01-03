// src/pages/OnboardingProfile.tsx
import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { signupUser, CURRENT_UID, type UserSignupRequest, type UserVisibility } from "../lib/api";
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
  const [email, setEmail] = useState(savedState.email || `${CURRENT_UID}@dev.local`);
  const [visibility, setVisibility] = useState<UserVisibility>(
    (savedState.visibility as UserVisibility) || "neighbors"
  );
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
      const payload: UserSignupRequest = {
        uid: CURRENT_UID,
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        visibility,
      };

      await signupUser(payload);

      // Navigate to household setup (optional)
      navigate("/onboarding/household");
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "Failed to create profile");
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout currentStep="access">
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Welcome to GatherGrove
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280" }}>
          Let's create your profile
        </p>
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

        {/* Visibility */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="visibility" style={labelStyle}>
            Profile Visibility
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as UserVisibility)}
            style={inputStyle}
          >
            <option value="private">Private (only me)</option>
            <option value="neighbors">Neighbors (default)</option>
            <option value="public">Public (everyone)</option>
          </select>
          <p style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
            Who can see your profile in the directory
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

        <p style={{ marginTop: 16, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
          Next: Set up your household (optional)
        </p>
      </div>
    </OnboardingLayout>
  );
}
