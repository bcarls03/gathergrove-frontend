// src/pages/OnboardingAccess.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";

/* -------- Neighborhood codes -------- */

type NeighborhoodInfo = {
  id: string; // internal id if you ever want it later
  label: string; // human label
};

const NEIGHBORHOOD_CODES: Record<string, NeighborhoodInfo> = {
  "BH26-GK4": { id: "bayhill", label: "Bayhill at the Oasis" },
  "EP26-QM7": { id: "eagles-pointe", label: "Eagles Pointe" },
};

const NEIGHBORHOOD_PLACEHOLDER = "Enter your neighborhood code…";

/* -------- Styles -------- */

const cardStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "20px 24px 24px",
  borderRadius: 24,
  border: "1px solid #e5e7eb",
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
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const helperStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.5,
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
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

const successBoxStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  fontSize: 13,
  color: "#166534",
  display: "flex",
  alignItems: "flex-start",
  gap: 8,
};

const successTitleStyle: React.CSSProperties = {
  fontWeight: 600,
};

/* -------- Helpers -------- */

function normalizeCode(input: string) {
  return input.toUpperCase().replace(/\s+/g, "").trim();
}

/* -------- Component -------- */

export default function OnboardingAccess() {
  const navigate = useNavigate();

  const existing = getOnboardingState();
  const [neighborhoodCode, setNeighborhoodCode] = useState(
    existing.neighborhoodCode ? String(existing.neighborhoodCode) : ""
  );

  const [touched, setTouched] = useState(false);
  const [validated, setValidated] = useState(false);
  const [hasValidatedSuccess, setHasValidatedSuccess] = useState(false);

  const normalized = normalizeCode(neighborhoodCode);
  const match = NEIGHBORHOOD_CODES[normalized] ?? null;
  const isValidCode = !!match;

  // Allow continue as long as there is *some* input
  const canContinue = normalized.length > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = normalizeCode(e.target.value);
    setNeighborhoodCode(value);
    setValidated(false);
    setHasValidatedSuccess(false);
  }

  function handleBlur() {
    setTouched(true);
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setValidated(true);

    const code = normalizeCode(neighborhoodCode);
    const currentMatch = NEIGHBORHOOD_CODES[code] ?? null;

    // Empty → show required error
    if (code.length === 0) {
      setHasValidatedSuccess(false);
      return;
    }

    // Invalid → show error
    if (!currentMatch) {
      setHasValidatedSuccess(false);
      return;
    }

    // Valid → save ONLY what OnboardingState supports
    const prev = getOnboardingState();
    setOnboardingState({
      ...prev,
      neighborhoodCode: code,
    });

    // First successful submit: show "Welcome" state and wait for a second click
    if (!hasValidatedSuccess) {
      setHasValidatedSuccess(true);
      return;
    }

    // Second successful submit: move on
    navigate("/onboarding/household");
  }

  const showRequiredError = validated && normalized.length === 0;
  const showCodeError = validated && normalized.length > 0 && !isValidCode;
  const showSuccess = validated && isValidCode && !!match;

  return (
    <OnboardingLayout currentStep="access">
      <form onSubmit={handleContinue}>
        <div style={cardStyle}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginTop: 4,
              marginBottom: 8,
              color: "#111827",
            }}
          >
            Welcome to GatherGrove
          </h1>

          <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 18 }}>
            Enter your neighborhood code to join your community.
          </p>

          <label style={labelStyle} htmlFor="neighborhoodCode">
            Neighborhood code
          </label>

          <input
            id="neighborhoodCode"
            type="text"
            autoComplete="off"
            placeholder={NEIGHBORHOOD_PLACEHOLDER}
            value={neighborhoodCode}
            onChange={handleChange}
            onBlur={handleBlur}
            style={{
              ...inputStyle,
              borderColor:
                (touched && (showRequiredError || showCodeError)) ? "#f97373" : "#d1d5db",
            }}
          />

          {showRequiredError && (
            <div style={{ ...helperStyle, color: "#b91c1c", marginTop: 6 }}>
              Please enter your neighborhood code to continue.
            </div>
          )}

          {showCodeError && (
            <div style={{ ...helperStyle, color: "#b91c1c", marginTop: 6 }}>
              That code doesn’t match any neighborhood. Double-check the code or
              reach out to the person who shared it with you.
            </div>
          )}

          {showSuccess && match && (
            <div style={successBoxStyle}>
              <span aria-hidden="true">🌿</span>
              <div>
                <div style={successTitleStyle}>Welcome to {match.label}!</div>
                <div>
                  You’re joining the <strong>{match.label}</strong> neighborhood
                  community.
                </div>
              </div>
            </div>
          )}

          <p style={helperStyle}>
            <span aria-hidden="true">🔒</span>
            <span>
              Private and secure. Only households in your neighborhood can join
              with this code. No addresses or child names are ever shown.
            </span>
          </p>

          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: canContinue ? "#059669" : "#d1d5db",
              color: canContinue ? "#ffffff" : "#6b7280",
              cursor: canContinue ? "pointer" : "default",
            }}
            disabled={!canContinue}
          >
            Continue
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
