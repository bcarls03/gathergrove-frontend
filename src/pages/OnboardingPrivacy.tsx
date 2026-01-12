// src/pages/OnboardingPrivacy.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";
import { Eye, EyeOff, Lock, MapPin, Shield } from "lucide-react";

function OnboardingPrivacyInner() {
  const navigate = useNavigate();
  const state = getOnboardingState();
  
  // Default: visible to nearby neighbors (ON)
  const [isVisible, setIsVisible] = useState(state.visibleToNeighbors ?? true);

  const handleContinue = () => {
    // Save visibility preference
    setOnboardingState({
      visibleToNeighbors: isVisible,
    });
    // Navigate to Step 6: Magic Moment (discovery reveal)
    navigate("/onboarding/magic-moment");
  };

  const handleBack = () => {
    navigate("/onboarding/kids");
  };

  // Determine if user has kids based on household type
  const hasKids = state.householdType === "family_with_kids";

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 16px rgba(16, 185, 129, 0.3)",
          }}
        >
          <Shield size={32} color="#ffffff" strokeWidth={2.5} />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          Quick privacy check
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.5 }}>
          Here's what neighbors can and cannot see about you.
        </p>
      </div>

      {/* What Neighbors CAN See */}
      <div
        style={{
          marginBottom: 20,
          padding: 20,
          borderRadius: 16,
          background: "#f0fdf4",
          border: "2px solid #d1fae5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Eye size={20} color="#059669" />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#065f46", margin: 0 }}>
            Neighbors can see
          </h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#047857", fontSize: 14, lineHeight: 1.8 }}>
          <li>
            <strong>Your name</strong> (first + last)
          </li>
          <li>
            <strong>Approx distance</strong> (~X miles away)
          </li>
          <li>
            <strong>Household type</strong>
            {hasKids && " + kids ages"}
          </li>
        </ul>
      </div>

      {/* What's NEVER Shown */}
      <div
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 16,
          background: "#fef2f2",
          border: "2px solid #fecaca",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Lock size={20} color="#dc2626" />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#991b1b", margin: 0 }}>
            Never shown
          </h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, color: "#b91c1c", fontSize: 14, lineHeight: 1.8 }}>
          <li>
            <strong>Exact address</strong>
          </li>
          <li>
            <strong>Kids names, birthdays, schools, or photos</strong>
          </li>
          <li>
            <strong>Phone number or email</strong>
          </li>
        </ul>
      </div>

      {/* Visibility Toggle */}
      <div
        style={{
          marginBottom: 28,
          padding: 20,
          borderRadius: 16,
          background: "#ffffff",
          border: "2px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
          }}
          onClick={() => setIsVisible(!isVisible)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: isVisible ? "#f0fdf4" : "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {isVisible ? (
                <MapPin size={24} color="#10b981" />
              ) : (
                <EyeOff size={24} color="#6b7280" />
              )}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                {isVisible ? "Visible to nearby neighbors" : "Hidden from discovery"}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {isVisible
                  ? "You'll appear in neighbor discovery"
                  : "You won't appear in searches or discovery"}
              </div>
            </div>
          </div>

          {/* Toggle Switch */}
          <div
            style={{
              width: 52,
              height: 32,
              borderRadius: 16,
              background: isVisible ? "#10b981" : "#d1d5db",
              position: "relative",
              transition: "background 0.2s ease",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 4,
                left: isVisible ? 24 : 4,
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "#ffffff",
                transition: "left 0.2s ease",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Privacy Reassurance */}
      <div
        style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 12,
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "start",
          gap: 12,
        }}
      >
        <Shield size={20} color="#6b7280" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#4b5563", lineHeight: 1.6 }}>
          <strong style={{ color: "#111827" }}>Your privacy is protected.</strong> You control what
          you share, and you can change these settings anytime in your profile.
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          type="button"
          onClick={handleContinue}
          style={{
            width: "100%",
            padding: "14px 20px",
            borderRadius: 999,
            border: "none",
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
            boxShadow: "0 10px 18px rgba(5, 150, 105, 0.35)",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 10px 18px rgba(5, 150, 105, 0.35)";
          }}
        >
          Looks good → Continue
        </button>

        <button
          type="button"
          onClick={handleBack}
          style={{
            width: "100%",
            padding: "12px 20px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#6b7280",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "#d1d5db";
            e.currentTarget.style.background = "#f9fafb";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.background = "#ffffff";
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

// Named export used by App.tsx
export function OnboardingPrivacy() {
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        boxSizing: "border-box",
        overflowX: "hidden",
        background: "#f3f4f6",
        padding: 24,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          margin: "40px auto",
          background: "#ffffff",
          borderRadius: 32,
          padding: "40px 56px 48px",
          boxShadow: "0 24px 80px rgba(15,23,42,0.12)",
        }}
      >
        <OnboardingPrivacyInner />
      </div>
    </div>
  );
}

// Default export
export default OnboardingPrivacy;
