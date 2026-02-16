// src/pages/OnboardingHouseholdType.tsx
// V15 Step 3: Simple household type selection (required for discovery quality)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UsersRound, Home, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { setOnboardingState } from "../lib/onboarding";

type HouseholdType = "family_with_kids" | "empty_nesters" | "singles_couples";

const householdOptions = [
  {
    type: "family_with_kids" as HouseholdType,
    icon: UsersRound,
    iconBg: "#f1f5f9",
    iconColor: "#334155",
    title: "Family with Kids",
    subtitle: "Household with children at home",
  },
  {
    type: "empty_nesters" as HouseholdType,
    icon: Home,
    iconBg: "#f1f5f9",
    iconColor: "#334155",
    title: "Empty Nesters",
    subtitle: "Children have moved out",
  },
  {
    type: "singles_couples" as HouseholdType,
    icon: UserRound,
    iconBg: "#f1f5f9",
    iconColor: "#334155",
    title: "Singles/Couples",
    subtitle: "Household without children",
  },
];

export function OnboardingHouseholdType() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<HouseholdType | "">("");
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedType || saving) return;

    setSaving(true);

    // V16: Save INTENDED household type (what user wants, not what they have)
    setOnboardingState({ intendedHouseholdType: selectedType });

    // Route based on selection
    if (selectedType === "family_with_kids") {
      // Go to Step 4: Kids Ages
      navigate("/onboarding/kids");
    } else {
      // Skip kids step, go to Step 5: Privacy Review
      navigate("/onboarding/privacy");
    }
  };

  return (
    <OnboardingLayout currentStep="household">
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 24px 48px" }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 40, textAlign: "center" }}
        >
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#111827",
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            Which best describes your home right now?
          </h1>
          <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.5, whiteSpace: "nowrap" }}>
            This helps us suggest the most relevant neighbors for you.
          </p>
        </motion.div>

        {/* Household Type Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}
        >
          {householdOptions.map((option) => {
            const isSelected = selectedType === option.type;
            const Icon = option.icon;

            return (
              <motion.button
                key={option.type}
                onClick={() => setSelectedType(option.type)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: 20,
                  borderRadius: 16,
                  border: isSelected ? "2px solid #10b981" : "2px solid #e5e7eb",
                  background: isSelected ? "#f0fdf4" : "#ffffff",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isSelected
                    ? "0 4px 8px rgba(16, 185, 129, 0.10)"
                    : "0 1px 2px rgba(0, 0, 0, 0.05)",
                  textAlign: "left",
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: option.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={24} strokeWidth={2} style={{ color: option.iconColor }} />
                </div>

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#111827",
                      marginBottom: 4,
                    }}
                  >
                    {option.title}
                  </div>
                  <div style={{ fontSize: 14, color: "#6b7280" }}>
                    {option.subtitle}
                  </div>
                </div>

                {/* Checkmark */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "#10b981",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.6666 3.5L5.24992 9.91667L2.33325 7"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Continue Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!selectedType || saving}
          whileHover={{ scale: !selectedType || saving ? 1 : 1.02 }}
          whileTap={{ scale: !selectedType || saving ? 1 : 0.98 }}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 16,
            border: "none",
            fontSize: 16,
            fontWeight: 600,
            cursor: !selectedType || saving ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            background:
              !selectedType || saving
                ? "#e5e7eb"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: !selectedType || saving ? "#9ca3af" : "#ffffff",
            boxShadow:
              !selectedType || saving
                ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                : "0 8px 16px rgba(16, 185, 129, 0.3)",
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </motion.button>
      </div>
    </OnboardingLayout>
  );
}
