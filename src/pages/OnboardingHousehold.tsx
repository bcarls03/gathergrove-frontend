// src/pages/OnboardingHousehold.tsx
// V15 Step 3: Simple household type selection (required for discovery quality)
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Home, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { setOnboardingState, getOnboardingState } from "../lib/onboarding";

type HouseholdType = "family_with_kids" | "empty_nesters" | "singles_couples";

type KidForm = {
  id: string;
  birthMonth: string; // "1".."12"
  birthYear: string; // "2018"
  gender: string; // "Male" | "Female" | "Prefer not to say"
  awayAtCollege: boolean; // lives away from home
  canBabysit: boolean; // can help with babysitting / parent helper
};

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

const helperStyle: React.CSSProperties = {
  marginTop: 10,
  fontSize: 12,
  color: "#6b7280",
  lineHeight: 1.5,
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
    title: "Family w/ Kids",
    subtitle: "Household with children at home.",
    Icon: Users,
    iconBg: "#DBEAFE",
  },
  {
    value: "empty_nesters",
    title: "Empty Nesters",
    subtitle: "Children have moved out.",
    Icon: Home,
    iconBg: "#FEF3C7",
  },
  {
    value: "singles_couples",
    title: "Singles/Couples",
    subtitle: "Household without children.",
    Icon: Heart,
    iconBg: "#EDE9FE",
  },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const currentYear = new Date().getFullYear();
// kids 0–25
const YEARS = Array.from({ length: 26 }, (_, i) => String(currentYear - i));

/* ---------- animation, helpers ---------- */

const chipMotionProps = {
  whileTap: { scale: 0.98 },
  whileHover: { scale: 1.01 },
  transition: { duration: 0.1, ease: "easeOut" as const },
};

function computeAgeFromKid(kid: KidForm): number | null {
  if (!kid.birthYear) return null;
  const yearNum = Number(kid.birthYear);
  if (Number.isNaN(yearNum)) return null;

  const today = new Date();
  let age = today.getFullYear() - yearNum;

  if (kid.birthMonth) {
    const monthNum = Number(kid.birthMonth);
    if (!Number.isNaN(monthNum)) {
      const hasHadBirthdayThisYear =
        today.getMonth() + 1 > monthNum ||
        (today.getMonth() + 1 === monthNum && today.getDate() >= 1);
      if (!hasHadBirthdayThisYear) {
        age -= 1;
      }
    }
  }

  if (age < 0) age = 0;
  return age;
}

function buildChildPreview(kid: KidForm): string {
  if (!kid.birthMonth || !kid.birthYear) return "";

  const month = Number(kid.birthMonth);
  const year = Number(kid.birthYear);
  if (!month || !year) return "";

  const today = new Date();
  let age = today.getFullYear() - year;
  const hasHadBirthdayThisYear =
    today.getMonth() + 1 > month ||
    (today.getMonth() + 1 === month && today.getDate() >= 1);
  if (!hasHadBirthdayThisYear) age -= 1;
  if (age < 0) age = 0;

  const parts: string[] = [`Age ${age}`];

  if (kid.gender === "Male" || kid.gender === "Female") {
    parts.push(kid.gender);
  } else if (kid.gender === "Prefer not to say") {
    parts.push("(gender hidden)");
  }

  if (kid.awayAtCollege) parts.push("Lives away from home");
  if (kid.canBabysit) parts.push("Babysitting helper");

  return parts.join(" · ");
}

// Base select style for kid fields (we'll layer guidance/error styles on top)
// IMPORTANT: don't use `border: "..."` shorthand if we also set `borderColor` later.
// Use borderWidth/borderStyle/borderColor to avoid the React warning.
const kidSelectBaseStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#d1d5db",
  fontSize: 13,
  boxSizing: "border-box",
  background: "#ffffff",
};

export default function OnboardingHousehold() {
  const navigate = useNavigate();

  const [lastName, setLastName] = useState("");
  const [householdType, setHouseholdType] = useState<HouseholdType | "">("");
  const [kids, setKids] = useState<KidForm[]>([]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load saved onboarding state
  useEffect(() => {
    const state = getOnboardingState();
    
    // Auto-fill household last name from OAuth if not already set
    if (state.householdName) {
      setLastName(state.householdName);
    } else if (state.lastName) {
      // Use OAuth lastName as default household name
      setLastName(state.lastName);
    }
    
    if (state.householdType && typeof state.householdType === "string") {
      setHouseholdType(state.householdType as HouseholdType);
    }
    if (state.kids && state.kids.length > 0) {
      setKids(
        state.kids.map((k, idx) => ({
          id: `${idx}-${Date.now()}`,
          birthMonth: k.birthMonth ? String(k.birthMonth) : "",
          birthYear: k.birthYear ? String(k.birthYear) : "",
          gender: (k as any).sex ?? "",
          awayAtCollege: Boolean((k as any).awayAtCollege),
          canBabysit: Boolean((k as any).canBabysit),
        }))
      );
    }
  }, []);

  const isFamily = householdType === "family_with_kids";

  const lastNameValid = lastName.trim().length > 0;
  const householdTypeValid = !!householdType;

  // Validation:
  //  - require at least one fully-filled child
  //  - do not allow partially-filled rows
  const filledKids = kids.filter((k) => k.birthMonth && k.birthYear && k.gender);

  const hasPartialKid = kids.some((k) => {
    const hasAny = k.birthMonth !== "" || k.birthYear !== "" || k.gender !== "";
    const isFull = k.birthMonth && k.birthYear && k.gender;
    return hasAny && !isFull;
  });

  const kidsValid = !isFamily || (filledKids.length > 0 && !hasPartialKid);

  const isValid = lastNameValid && householdTypeValid && kidsValid;

  function addChild() {
    setKids((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${prev.length}`,
        birthMonth: "",
        birthYear: "",
        gender: "",
        awayAtCollege: false,
        canBabysit: false,
      },
    ]);
  }

  function removeChild(id: string) {
    setKids((prev) => prev.filter((k) => k.id !== id));
  }

  function updateKid(
    id: string,
    field: keyof Omit<KidForm, "id">,
    value: string | boolean
  ) {
    setKids((prev) =>
      prev.map((k) => (k.id === id ? { ...k, [field]: value } : k))
    );
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || saving) return;

    setSaving(true);

    // Helper function to calculate age range from birth year
    const calculateAgeRange = (birthYear: number): "0-2" | "3-5" | "6-8" | "9-12" | "13-17" | "18+" => {
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      if (age <= 2) return "0-2";
      if (age <= 5) return "3-5";
      if (age <= 8) return "6-8";
      if (age <= 12) return "9-12";
      if (age <= 17) return "13-17";
      return "18+";
    };

    // Only persist fully-filled kids
    const normalizedKids =
      householdType === "family_with_kids"
        ? kids
            .filter((k) => k.birthMonth && k.birthYear && k.gender)
            .map((k) => {
              let gender = (k.gender || "").toLowerCase().replace(/ /g, "_");
              if (gender === "male" || gender === "m") gender = "male";
              else if (gender === "female" || gender === "f") gender = "female";
              else if (!gender) gender = null;
              return {
                age_range: calculateAgeRange(Number(k.birthYear)),
                birthMonth: k.birthMonth ? Number(k.birthMonth) : undefined,
                birthYear: k.birthYear ? Number(k.birthYear) : undefined,
                sex: gender as "male" | "female" | "prefer_not_to_say" | null,
                available_for_babysitting: k.canBabysit || false,
              };
            })
        : [];

    // Persist onboarding state for preview
    // V15 Strategy: Individual profiles are source of truth
    // Only collect household last name, not other adults' info
    setOnboardingState({
      householdName: lastName.trim(),
      householdType: householdType || undefined,
      kids: normalizedKids,
    });

    // IMPORTANT: no /users or /households call here.
    // We'll persist to backend from the Save step (or Settings) to avoid schema mismatches.
    navigate("/onboarding/preview");
  }

  return (
    <OnboardingLayout currentStep="household">
      <form onSubmit={handleContinue}>
        <div style={cardStyle}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              marginBottom: 6,
              color: "#111827",
            }}
          >
            Household Setup
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#4b5563",
              marginBottom: 18,
            }}
          >
            Set up your household so neighbors know who’s in your home.
          </p>

          {/* Last name */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle} htmlFor="lastName">
              Household Last Name *
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Smith"
              style={{
                ...inputStyle,
                borderColor: !lastNameValid && touched ? "#f97373" : inputStyle.borderColor,
              }}
            />
            <p style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Your household last name. Your individual name comes from your profile.
            </p>
          </div>

          {/* Household type cards */}
          <div style={{ marginBottom: 14 }}>
            <span style={labelStyle}>Household Type</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {householdOptions.map((opt) => {
                const active = householdType === opt.value;
                const Icon = opt.Icon;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => setHouseholdType(opt.value)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: active
                        ? "1px solid rgba(16,185,129,.7)"
                        : "1px solid #e5e7eb",
                      background: active ? "#ecfdf5" : "#f9fafb",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      boxShadow: active
                        ? "0 8px 18px rgba(16,185,129,0.20)"
                        : "none",
                    }}
                    {...chipMotionProps}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 12,
                          background: opt.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                          {opt.subtitle}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Kids section (only for Family w/ Kids) */}
          {isFamily && (
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  marginBottom: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#111827",
                }}
              >
                Children in your home
              </div>

              {kids.map((kid, index) => {
                const preview = buildChildPreview(kid);
                const age = computeAgeFromKid(kid);

                // Guidance states for this child
                const hasAnyField =
                  kid.birthMonth !== "" || kid.birthYear !== "" || kid.gender !== "";
                const needsMonth = !kid.birthMonth && hasAnyField;
                const needsYear = !!kid.birthMonth && !kid.birthYear;
                const needsGender = !!kid.birthMonth && !!kid.birthYear && !kid.gender;

                const showFieldError = touched && !kidsValid;

                const buildKidSelectStyle = (opts: {
                  guide?: boolean;
                  error?: boolean;
                }): React.CSSProperties => {
                  const { guide, error } = opts;
                  let borderColor = "#d1d5db";
                  let boxShadow: string | undefined;

                  if (error) {
                    borderColor = "#f97373";
                    boxShadow = "0 0 0 2px rgba(248,113,113,0.28)";
                  } else if (guide) {
                    borderColor = "#10b981";
                    boxShadow = "0 0 0 2px rgba(16,185,129,0.26)";
                  }

                  return {
                    ...kidSelectBaseStyle,
                    borderColor,
                    boxShadow,
                  };
                };

                const monthStyle = buildKidSelectStyle({
                  guide: !kid.birthMonth && !showFieldError,
                  error: showFieldError && needsMonth,
                });

                const yearStyle = buildKidSelectStyle({
                  guide: needsYear && !showFieldError,
                  error: showFieldError && needsYear,
                });

                const genderStyle = buildKidSelectStyle({
                  guide: needsGender && !showFieldError,
                  error: showFieldError && needsGender,
                });

                return (
                  <div
                    key={kid.id}
                    style={{
                      borderRadius: 14,
                      border: "1px solid #e5e7eb",
                      padding: 12,
                      marginBottom: 8,
                      background: "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                        fontSize: 12,
                        color: "#4b5563",
                      }}
                    >
                      <span>Child {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeChild(kid.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          fontSize: 12,
                          color: "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 1.2fr",
                        gap: 8,
                      }}
                    >
                      <select
                        value={kid.birthMonth}
                        onChange={(e) => updateKid(kid.id, "birthMonth", e.target.value)}
                        style={monthStyle}
                      >
                        <option value="">Month</option>
                        {MONTHS.map((m, idx) => (
                          <option key={m} value={idx + 1}>
                            {m}
                          </option>
                        ))}
                      </select>

                      <select
                        value={kid.birthYear}
                        onChange={(e) => updateKid(kid.id, "birthYear", e.target.value)}
                        style={yearStyle}
                      >
                        <option value="">Year</option>
                        {YEARS.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>

                      <select
                        value={kid.gender}
                        onChange={(e) => updateKid(kid.id, "gender", e.target.value)}
                        style={genderStyle}
                      >
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    {preview && (
                      <div
                        style={{
                          marginTop: 8,
                          marginBottom: 4,
                          padding: "6px 12px",
                          background: "#ECFDF5",
                          borderRadius: 8,
                          fontSize: 15,
                          fontWeight: 600,
                          color: "#059669",
                          display: "inline-block",
                        }}
                      >
                        {preview}
                      </div>
                    )}
                    {/* Removed 'Lives away from home' and 'babysitting' checkboxes for onboarding */}
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addChild}
                style={{
                  marginTop: 4,
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  border: "1px dashed #cbd5f5",
                  background: "#f9fafb",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#16a34a",
                  cursor: "pointer",
                }}
              >
                + Add Child
              </button>

              {!kidsValid && touched && (
                <div style={{ ...helperStyle, color: "#b91c1c", marginTop: 6 }}>
                  Please add at least one child and make sure each listed child has
                  a month, year, and gender — or leave the extra rows blank.
                </div>
              )}
            </div>
          )}

          <p style={{ ...helperStyle, marginTop: 16 }}>
            Neighbors will only see adult first names and child ages/gender — never
            birthdays or full personal details.
          </p>

          <button
            type="submit"
            style={{
              ...buttonStyle,
              background: isValid && !saving ? "#059669" : "#d1d5db",
              color: isValid && !saving ? "#ffffff" : "#6b7280",
              cursor: isValid && !saving ? "pointer" : "default",
            }}
            disabled={!isValid || saving}
          >
            {saving ? "Saving…" : "Continue"}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}
