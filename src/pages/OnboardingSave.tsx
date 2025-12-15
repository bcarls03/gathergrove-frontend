// src/pages/OnboardingSave.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";

function OnboardingSaveInner() {
  const navigate = useNavigate();
  const initial = getOnboardingState();

  const [email, setEmail] = useState(initial.email ?? "");
  const [password, setPassword] = useState(initial.password ?? "");

  // If we somehow got here without basic info, send them back
  useEffect(() => {
    if (!initial.lastName) {
      navigate("/onboarding/household", { replace: true });
    }
  }, [initial.lastName, navigate]);

  const handleContinue = () => {
    // Persist into onboarding state (localStorage for now)
    setOnboardingState({
      ...initial,
      email: email.trim(),
      password: password.trim(),
    });

    // After signup, send them to Home so they see the welcome card
    navigate("/");
  };

  const canContinue = email.trim().length > 0 && password.trim().length >= 6;

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
        Save Household
      </h1>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
        One shared login for your household. Use it on each family member&apos;s
        device.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Email */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            htmlFor="email"
            style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
          >
            Household email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 4,
              lineHeight: 1.5,
            }}
          >
            Choose an email that you (and your partner) can both use to sign in.
          </div>
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label
            htmlFor="password"
            style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}
          >
            Password (shared household login)
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            minLength={6}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 999,
              border: "1px solid #d1d5db",
              fontSize: 14,
            }}
          />
          {/* Helper text block */}
          <div
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginTop: 6,
              lineHeight: 1.5,
            }}
          >
            At least 6 characters. Any characters allowed. Everyone in your
            household will sign in with this email and password on their own
            devices.
            <br />
            You can change these later in Settings. Your email is private and
            never visible to neighbors.
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleContinue}
        disabled={!canContinue}
        style={{
          marginTop: 20,
          width: "100%",
          padding: "10px 14px",
          borderRadius: 999,
          border: "none",
          background: canContinue ? "#10b981" : "#9ca3af",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 15,
          cursor: canContinue ? "pointer" : "default",
          boxShadow: canContinue
            ? "0 10px 18px rgba(5,150,105,.35)"
            : "none",
        }}
      >
        Continue
      </button>
    </div>
  );
}

// 👇 Named export used in App.tsx
export function OnboardingSave() {
  return (
    <OnboardingLayout currentStep="save">
      <OnboardingSaveInner />
    </OnboardingLayout>
  );
}

// 👇 Default export (in case anything imports default)
export default OnboardingSave;
