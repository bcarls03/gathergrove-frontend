// src/components/OnboardingLayout.tsx
import type React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/gathergrove-logo.png";
import { getOnboardingState } from "../lib/onboarding";

export type StepKey = "access" | "address" | "household" | "kids" | "privacy" | "magic";

const ALL_STEPS: { key: StepKey; label: string }[] = [
  { key: "access", label: "Access" },
  { key: "address", label: "Address" },
  { key: "household", label: "Household" },
  { key: "kids", label: "Kids" },
  { key: "privacy", label: "Privacy" },
  { key: "magic", label: "Magic" },
];

export function OnboardingLayout({
  currentStep,
  children,
  customBackRoute,
  customBackLabel,
}: {
  currentStep: StepKey;
  children: React.ReactNode;
  customBackRoute?: string;
  customBackLabel?: string;
}) {
  const navigate = useNavigate();
  
  // Get household type to determine if we show kids step
  const state = getOnboardingState();
  const hasKids = state.householdType === "family_with_kids";
  
  // Filter steps based on household type
  // If not family, remove "kids" step from progress
  const STEPS = hasKids 
    ? ALL_STEPS 
    : ALL_STEPS.filter(step => step.key !== "kids");
  
  let backStep: StepKey | null = null;
  if (currentStep === "address") backStep = "access";
  if (currentStep === "household") backStep = "address";
  if (currentStep === "kids") backStep = "household";
  if (currentStep === "privacy") backStep = hasKids ? "kids" : "household";
  if (currentStep === "magic") backStep = "privacy";

  const showBack = backStep !== null || customBackRoute !== undefined;
  const backLabel = customBackLabel || 
    (backStep ? STEPS.find((s) => s.key === backStep)?.label ?? "Back" : "Back");
  
  const getBackRoute = () => {
    if (customBackRoute) return customBackRoute;
    if (backStep === "access") return "/onboarding/access";
    if (backStep === "address") return "/onboarding/address";
    if (backStep === "household") return "/onboarding/household";
    if (backStep === "kids") return "/onboarding/kids";
    if (backStep === "privacy") return "/onboarding/privacy";
    return "#";
  };

  const backHref = getBackRoute();

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",          // lock to viewport width
        boxSizing: "border-box", // include padding in width
        overflowX: "hidden",     // hide any stray overflow
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
        {/* Logo + tagline */}
        <div
          style={{
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <img
            src={Logo}
            alt="GatherGrove"
            style={{
              width: 96,
              height: 96,
              borderRadius: 24,
              display: "block",
              margin: "0 auto 12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            }}
          />

          <div
            style={{
              fontWeight: 800,
              fontSize: 28,
              letterSpacing: -0.02,
              color: "#0f172a",
              marginBottom: 2,
            }}
          >
            GatherGrove
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#6b7280",
            }}
          >
            Where neighbors gather
          </div>
        </div>

        {/* Progress dots */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          {STEPS.map((step, index) => {
            const currentIndex = STEPS.findIndex((s) => s.key === currentStep);
            const isComplete = index <= currentIndex;
            
            return (
              <div
                key={step.key}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: isComplete ? "#10b981" : "#d1d5db",
                  transition: "background-color 0.3s ease",
                }}
              />
            );
          })}
        </div>

        {/* divider */}
        <div
          style={{
            height: 1,
            background: "rgba(148,163,184,0.25)",
            margin: "0 auto 20px",
            maxWidth: "72%",
          }}
        />

        {/* Shared inner column so all steps match */}
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {showBack && (
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                justifyContent: "flex-start",
              }}
            >
              <button
                type="button"
                onClick={() => navigate(backHref)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  color: "#374151",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <span aria-hidden>←</span>
                <span>Back to {backLabel}</span>
              </button>
            </div>
          )}

          <div style={{ width: "100%" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
