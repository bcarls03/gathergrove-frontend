// src/pages/OnboardingHouseholdNew.tsx
import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Users, Heart, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { createHousehold, type HouseholdCreate, type HouseholdType } from "../lib/api";
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

type HouseholdOption = {
  value: HouseholdType;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number }>;
  iconBg: string;
};

const householdOptions: HouseholdOption[] = [
  {
    value: "family_with_kids",
    title: "Family with Kids",
    subtitle: "We have children at home",
    Icon: Users,
    iconBg: "#dbeafe",
  },
  {
    value: "empty_nesters",
    title: "Empty Nesters",
    subtitle: "Our kids are grown/away",
    Icon: Home,
    iconBg: "#fce7f3",
  },
  {
    value: "singles_couples",
    title: "Singles/Couples",
    subtitle: "No children",
    Icon: Heart,
    iconBg: "#fef3c7",
  },
];

const AGE_RANGES = ["0-2", "3-5", "6-8", "9-12", "13-17", "18+"] as const;

type KidForm = {
  id: string;
  age_range: typeof AGE_RANGES[number] | "";
  gender: "male" | "female" | "prefer_not_to_say" | "";
  available_for_babysitting: boolean;
};

export default function OnboardingHouseholdNew() {
  const navigate = useNavigate();
  
  // Load saved state
  const savedState = getOnboardingState();

  const [householdName, setHouseholdName] = useState(savedState.householdName || "");
  const [householdType, setHouseholdType] = useState<HouseholdType | "">(
    savedState.householdType || ""
  );
  const [kids, setKids] = useState<KidForm[]>(
    savedState.kids?.map((k, i) => ({
      id: `kid-${i}`,
      age_range: k.age_range,
      gender: k.gender || "",
      available_for_babysitting: k.available_for_babysitting || false,
    })) || []
  );
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save state when fields change
  useEffect(() => {
    setOnboardingState({
      householdName: householdName.trim() || null,
      householdType: householdType || null,
      kids: kids
        .filter((k) => k.age_range && k.gender)
        .map((k) => ({
          age_range: k.age_range as typeof AGE_RANGES[number],
          gender: k.gender || null,
          available_for_babysitting: k.available_for_babysitting,
        })),
    });
  }, [householdName, householdType, kids]);

  const isFamily = householdType === "family_with_kids";
  const householdNameValid = householdName.trim().length > 0;
  const householdTypeValid = !!householdType;

  // Validation: require at least one fully-filled child for families
  const filledKids = kids.filter((k) => k.age_range && k.gender);
  const hasPartialKid = kids.some((k) => {
    const hasAny = k.age_range || k.gender;
    const isFull = k.age_range && k.gender;
    return hasAny && !isFull;
  });
  const kidsValid = !isFamily || (filledKids.length > 0 && !hasPartialKid);

  const isValid = householdNameValid && householdTypeValid && kidsValid;

  const addKid = () => {
    setKids([
      ...kids,
      {
        id: `kid-${Date.now()}`,
        age_range: "",
        gender: "",
        available_for_babysitting: false,
      },
    ]);
  };

  const removeKid = (id: string) => {
    setKids(kids.filter((k) => k.id !== id));
  };

  const updateKid = (id: string, field: keyof KidForm, value: any) => {
    setKids(kids.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  };

  const handleSkip = () => {
    setOnboardingState({ skipHousehold: true });
    navigate("/");
  };

  const handleSubmit = async () => {
    setTouched(true);
    if (!isValid) return;

    setSaving(true);
    setError(null);

    try {
      const payload: HouseholdCreate = {
        name: householdName.trim(),
        household_type: householdType as HouseholdType,
        kids: filledKids.map((k) => ({
          age_range: k.age_range as typeof AGE_RANGES[number],
          gender: k.gender === "" ? null : (k.gender as "male" | "female" | "prefer_not_to_say"),
          available_for_babysitting: k.available_for_babysitting,
        })),
      };

      await createHousehold(payload);

      // Success! Navigate to home
      navigate("/");
    } catch (err: any) {
      console.error("Household creation error:", err);
      setError(err?.message || "Failed to create household");
      setSaving(false);
    }
  };

  return (
    <OnboardingLayout currentStep="household">
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#111827", marginBottom: 8 }}>
          Create Your Household
        </h1>
        <p style={{ fontSize: 15, color: "#6b7280" }}>
          Optional - you can skip this and add it later
        </p>
      </div>

      <div style={cardStyle}>
        {/* Household Name */}
        <div style={{ marginBottom: 20 }}>
          <label htmlFor="householdName" style={labelStyle}>
            <Home size={14} style={{ display: "inline", marginRight: 4 }} />
            Household Name *
          </label>
          <input
            id="householdName"
            type="text"
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="The Smith Family"
            style={{
              ...inputStyle,
              borderColor: touched && !householdNameValid ? "#ef4444" : "#d1d5db",
            }}
          />
          {touched && !householdNameValid && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#ef4444" }}>
              Household name is required
            </p>
          )}
        </div>

        {/* Household Type */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Household Type *</label>
          <div style={{ display: "grid", gap: 12 }}>
            {householdOptions.map((opt) => {
              const isSelected = householdType === opt.value;
              const Icon = opt.Icon;
              return (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setHouseholdType(opt.value);
                    if (opt.value !== "family_with_kids") {
                      setKids([]); // Clear kids if not family
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 16,
                    borderRadius: 16,
                    border: `2px solid ${isSelected ? "#10b981" : "#e5e7eb"}`,
                    background: isSelected ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: opt.iconBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                      {opt.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        background: "#10b981",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ffffff",
                        fontSize: 12,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Kids Section (only for Family w/ Kids) */}
        {isFamily && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <label style={labelStyle}>Children *</label>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={addKid}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #10b981",
                  background: "#f0fdf4",
                  color: "#10b981",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Plus size={14} />
                Add Child
              </motion.button>
            </div>

            {kids.length === 0 && (
              <p style={{ fontSize: 13, color: "#6b7280", fontStyle: "italic" }}>
                No children added yet. Click "Add Child" to get started.
              </p>
            )}

            {kids.map((kid, idx) => (
              <div
                key={kid.id}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  marginBottom: 12,
                  background: "#f9fafb",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
                    Child {idx + 1}
                  </span>
                  <button
                    onClick={() => removeKid(kid.id)}
                    style={{
                      padding: 4,
                      borderRadius: 6,
                      border: "none",
                      background: "#fee2e2",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Age Range *</label>
                    <select
                      value={kid.age_range}
                      onChange={(e) => updateKid(kid.id, "age_range", e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor:
                          touched && !kid.age_range ? "#ef4444" : "#d1d5db",
                      }}
                    >
                      <option value="">Select age range</option>
                      {AGE_RANGES.map((range) => (
                        <option key={range} value={range}>
                          {range} years
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ ...labelStyle, fontSize: 12 }}>Gender *</label>
                    <select
                      value={kid.gender}
                      onChange={(e) => updateKid(kid.id, "gender", e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: touched && !kid.gender ? "#ef4444" : "#d1d5db",
                      }}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={kid.available_for_babysitting}
                      onChange={(e) =>
                        updateKid(kid.id, "available_for_babysitting", e.target.checked)
                      }
                      style={{ width: 16, height: 16 }}
                    />
                    Available for babysitting
                  </label>
                </div>
              </div>
            ))}

            {touched && !kidsValid && (
              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>
                {hasPartialKid
                  ? "Please complete all kid information"
                  : "Please add at least one child"}
              </p>
            )}
          </div>
        )}

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

        {/* Buttons */}
        <div style={{ display: "grid", gap: 12 }}>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSubmit}
            disabled={saving}
            style={{
              ...buttonStyle,
              marginTop: 0,
              background: isValid && !saving ? "#10b981" : "#d1d5db",
              color: isValid && !saving ? "#ffffff" : "#9ca3af",
              cursor: isValid && !saving ? "pointer" : "not-allowed",
            }}
          >
            {saving ? "Creating household..." : "Create Household"}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSkip}
            disabled={saving}
            style={{
              ...buttonStyle,
              marginTop: 0,
              background: "#ffffff",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Skip for now
          </motion.button>
        </div>

        <p style={{ marginTop: 16, fontSize: 12, color: "#6b7280", textAlign: "center" }}>
          You can always add or edit your household later in settings
        </p>
      </div>
    </OnboardingLayout>
  );
}
