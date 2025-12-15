// src/components/OnboardingLayout.tsx
import type React from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/gathergrove-logo.png";

export type StepKey = "access" | "household" | "preview" | "save";

const STEPS: { key: StepKey; label: string }[] = [
  { key: "access", label: "Access" },
  { key: "household", label: "Household" },
  { key: "preview", label: "Preview" },
  { key: "save", label: "Save" },
];

const STEP_ROUTES: Record<StepKey, string> = {
  access: "/onboarding/access",
  household: "/onboarding/household",
  preview: "/onboarding/preview",
  save: "/onboarding/save",
};

export function OnboardingLayout({
  currentStep,
  children,
}: {
  currentStep: StepKey;
  children: React.ReactNode;
}) {
  const navigate = useNavigate();

  let backStep: StepKey | null = null;
  if (currentStep === "household") backStep = "access";
  if (currentStep === "preview") backStep = "household";
  if (currentStep === "save") backStep = "preview";

  const showBack = backStep !== null;
  const backLabel =
    backStep ? STEPS.find((s) => s.key === backStep)?.label ?? "Back" : "Back";
  const backHref = backStep ? STEP_ROUTES[backStep] : "#";

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
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 4,
              borderRadius: 28,
              background:
                "linear-gradient(135deg, rgba(34,197,94,0.18), rgba(59,130,246,0.16))",
              boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
              marginBottom: 6,
            }}
          >
            <div
              style={{
                borderRadius: 24,
                background: "#f9fafb",
                padding: 6,
              }}
            >
              <img
                src={Logo}
                alt="GatherGrove"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 20,
                  display: "block",
                }}
              />
            </div>
          </div>

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
            Where Neighbors Connect
          </div>
        </div>

        {/* Step pills */}
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginBottom: 16,
            fontSize: 13,
          }}
        >
          {STEPS.map((step, index) => (
            <StepPill
              key={step.key}
              label={step.label}
              index={index + 1}
              active={step.key === currentStep}
            />
          ))}
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

function StepPill({
  label,
  index,
  active,
}: {
  label: string;
  index: number;
  active?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderRadius: 999,
        border: active
          ? "1px solid rgba(16,185,129,.7)"
          : "1px solid rgba(148,163,184,.6)",
        background: active ? "#ecfdf5" : "#f9fafb",
        color: active ? "#047857" : "#4b5563",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          background: active ? "#16a34a" : "#e5e7eb",
          color: active ? "#ffffff" : "#374151",
        }}
      >
        {index}
      </span>
      {label}
    </span>
  );
}
