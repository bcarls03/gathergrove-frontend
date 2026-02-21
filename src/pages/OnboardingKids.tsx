// src/pages/OnboardingKids.tsx
// V15 Step 4: Kids Ages (only shown if Family with Kids selected)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";
import { updateMyHousehold, getMyHousehold, updateMyIntent, type Kid as APIKid, type HouseholdType } from "../lib/api";

type Kid = {
  id: string;
  birthYear: string;  // "2018", "2019", etc.
  birthMonth: string; // "1" to "12"
  gender: "male" | "female" | "prefer_not_to_say" | "";
  awayAtCollege?: boolean;
  canBabysit?: boolean;
};

// Generate year options (current year back 25 years for kids 0-25)
const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 26 }, (_, i) => currentYear - i);

// Month options
const monthOptions = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Helper: Calculate current age from birth year/month
function calculateAge(birthYear: number, birthMonth: number): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // JS months are 0-indexed
  
  let age = currentYear - birthYear;
  
  // If birthday hasn't happened yet this year, subtract 1
  if (currentMonth < birthMonth) {
    age -= 1;
  }
  
  return Math.max(0, age); // Ensure non-negative
}

// Helper: Convert age to age range for display
function getAgeRange(age: number): "0-2" | "3-5" | "6-8" | "9-12" | "13-17" | "18+" {
  if (age <= 2) return "0-2";
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  if (age <= 17) return "13-17";
  return "18+";
}

export function OnboardingKids() {
  const navigate = useNavigate();
  
  // Load existing kids data from onboarding state, or start with one empty kid
  const state = getOnboardingState();
  const initialKids: Kid[] = state.kids && state.kids.length > 0
    ? state.kids.map((k, index) => ({
        id: `${index + 1}`,
        birthYear: k.birthYear?.toString() || "",
        birthMonth: k.birthMonth?.toString() || "",
        gender: k.gender || "",
        awayAtCollege: k.awayAtCollege || false,
        canBabysit: k.canBabysit || false,
      }))
    : [{ id: "1", birthYear: "", birthMonth: "", gender: "", awayAtCollege: false, canBabysit: false }];
  
  const [kids, setKids] = useState<Kid[]>(initialKids);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addKid = () => {
    setKids([...kids, { id: Date.now().toString(), birthYear: "", birthMonth: "", gender: "", awayAtCollege: false, canBabysit: false }]);
  };

  const removeKid = (id: string) => {
    if (kids.length > 1) {
      setKids(kids.filter((k) => k.id !== id));
    }
  };

  const updateKid = (id: string, field: "birthYear" | "birthMonth" | "gender", value: string) => {
    setKids(kids.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  };

  const updateKidBoolean = (id: string, field: "awayAtCollege" | "canBabysit", value: boolean) => {
    setKids(kids.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  };

  const handleContinue = async () => {
    // At least one kid with birth year, month, and gender required
    const validKids = kids.filter((k) => k.birthYear && k.birthMonth && k.gender);
    if (validKids.length === 0 || saving) return;

    setSaving(true);
    setError(null);

    try {
      // Get onboarding state for household info
      const state = getOnboardingState();
      
      // Convert kids to intent format (birthYear/birthMonth as ints)
      const intentKids = validKids.map((k) => {
        const age = calculateAge(Number(k.birthYear), Number(k.birthMonth));
        const normalizedAwayAtCollege = age >= 18 ? Boolean(k.awayAtCollege) : false;
        
        return {
          birthYear: Number(k.birthYear),
          birthMonth: Number(k.birthMonth),
          gender: k.gender === "" ? null : (k.gender as "male" | "female" | "prefer_not_to_say"),
          awayAtCollege: normalizedAwayAtCollege,
          canBabysit: Boolean(k.canBabysit),
        };
      });

      // Save intent kids to person record (works even if no household yet)
      await updateMyIntent({
        household_type: state.intendedHouseholdType as HouseholdType || null,
        kids: intentKids,
      });

      // Save kids to onboarding state for OnboardingPrivacy to use
      setOnboardingState({
        kids: validKids.map((k) => {
          const age = calculateAge(Number(k.birthYear), Number(k.birthMonth));
          const normalizedAwayAtCollege = age >= 18 ? Boolean(k.awayAtCollege) : false;
          return {
            age_range: getAgeRange(age),
            age_years: age,
            gender: k.gender === "" ? null : k.gender,
            birthYear: Number(k.birthYear),
            birthMonth: Number(k.birthMonth),
            awayAtCollege: normalizedAwayAtCollege,
            canBabysit: k.canBabysit || false,
          };
        }),
      });

      // Go to Step 5: Privacy Review
      navigate("/onboarding/privacy");
    } catch (err: any) {
      setError(err?.message || "Failed to save. Please try again.");
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Allow skip but warn about reduced matching
    if (confirm("You'll still be discoverable, but playdate matching will be less accurate. Continue without adding kids?")) {
      setOnboardingState({ kids: [] });
      navigate("/onboarding/privacy");
    }
  };

  const isValid = kids.some((k) => k.birthYear && k.birthMonth && k.gender);

  return (
    <OnboardingLayout 
      currentStep="kids" 
      customBackRoute="/onboarding/household"
      customBackLabel="Household"
    >
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
            Add kids' ages
          </h1>
          <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.5, whiteSpace: "nowrap" }}>
            No names or photos needed. Just ages to help find playmates.
          </p>
        </motion.div>

        {/* Kids List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ marginBottom: 24 }}
        >
          {kids.map((kid, index) => (
            <div
              key={kid.id}
              style={{
                marginBottom: 16,
                padding: 20,
                borderRadius: 16,
                border: "2px solid #e5e7eb",
                background: "#ffffff",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>
                  Child {index + 1}
                </span>
                {kids.length > 1 && (
                  <button
                    onClick={() => removeKid(kid.id)}
                    style={{
                      padding: 4,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#ef4444",
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Birth Year */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Birth Year *
                </label>
                <select
                  value={kid.birthYear}
                  onChange={(e) => updateKid(kid.id, "birthYear", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select year</option>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Birth Month */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Birth Month *
                </label>
                <select
                  value={kid.birthMonth}
                  onChange={(e) => updateKid(kid.id, "birthMonth", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select month</option>
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: 6,
                  }}
                >
                  Gender (optional)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateKid(kid.id, "gender", option.value)}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: kid.gender === option.value ? "2px solid #10b981" : "2px solid #e5e7eb",
                        background: kid.gender === option.value ? "#f0fdf4" : "#ffffff",
                        fontSize: 13,
                        fontWeight: kid.gender === option.value ? 600 : 500,
                        color: kid.gender === option.value ? "#10b981" : "#6b7280",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Checkboxes - shown based on age */}
              {kid.birthYear && kid.birthMonth && (() => {
                const currentAge = calculateAge(Number(kid.birthYear), Number(kid.birthMonth));
                
                return (
                  <>
                    {/* Lives away from home - only show if age >= 18 */}
                    {currentAge >= 18 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ 
                          display: "flex", 
                          alignItems: "flex-start", 
                          gap: 10, 
                          cursor: "pointer",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: kid.awayAtCollege ? "1px solid #10b981" : "1px solid #e5e7eb",
                          background: kid.awayAtCollege ? "rgba(16, 185, 129, 0.10)" : "#ffffff",
                          transition: "all 0.2s ease",
                        }}>
                          <input
                            type="checkbox"
                            checked={kid.awayAtCollege || false}
                            onChange={(e) => updateKidBoolean(kid.id, "awayAtCollege", e.target.checked)}
                            style={{
                              marginTop: 2,
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                              accentColor: "#059669",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                              Lives away from home (college, work, etc.)
                            </span>
                            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                              Use this if they're usually away for school or work, not just visiting.
                            </div>
                          </div>
                        </label>
                      </div>
                    )}

                    {/* Can help with babysitting - only show if age >= 13 AND age <= 25 */}
                    {currentAge >= 13 && currentAge <= 25 && (
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 10, 
                          cursor: "pointer",
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: kid.canBabysit ? "1px solid #10b981" : "1px solid #e5e7eb",
                          background: kid.canBabysit ? "rgba(16, 185, 129, 0.10)" : "#ffffff",
                          transition: "all 0.2s ease",
                        }}>
                          <input
                            type="checkbox"
                            checked={kid.canBabysit || false}
                            onChange={(e) => updateKidBoolean(kid.id, "canBabysit", e.target.checked)}
                            style={{
                              width: 16,
                              height: 16,
                              cursor: "pointer",
                              accentColor: "#059669",
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                            Can help with babysitting / parent helper
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Summary Preview - shows after all fields filled */}
              {kid.birthYear && kid.birthMonth && (() => {
                const currentAge = calculateAge(Number(kid.birthYear), Number(kid.birthMonth));
                const genderLabel = kid.gender === "male" ? "Male" : 
                                   kid.gender === "female" ? "Female" : 
                                   kid.gender === "prefer_not_to_say" ? "Prefer not to say" : null;
                
                return (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "#f0fdf4",
                      border: "1px solid #d1fae5",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#065f46", fontWeight: 500 }}>
                      Currently {currentAge} year{currentAge === 1 ? '' : 's'} old
                      {genderLabel && ` • ${genderLabel}`}
                    </span>
                  </div>
                );
              })()}
            </div>
          ))}

          {/* Add Another Kid */}
          <button
            onClick={addKid}
            style={{
              width: "100%",
              padding: "14px 20px",
              borderRadius: 12,
              border: "2px dashed #d1d5db",
              background: "#f9fafb",
              fontSize: 14,
              fontWeight: 500,
              color: "#6b7280",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.2s ease",
              marginBottom: 16,
            }}
          >
            <Plus size={18} />
            Add another child
          </button>

          {/* Privacy Reminder */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #86efac',
              borderRadius: 16,
              padding: 16,
              marginBottom: 0,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>ℹ️</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6, marginTop: 0 }}>
                  Why ages and gender?
                </p>
                <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, margin: 0, marginBottom: 6 }}>
                  Used to help families find playmate matches. When parents filter for specific ages and genders, your household will appear in those results.
                </p>
                <p style={{ fontSize: 13, color: '#059669', lineHeight: 1.5, margin: 0, fontWeight: 500 }}>
                  Gender is shown alongside age to help families find compatible playmates.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Error Message */}
        {error && (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              borderRadius: 12,
              background: "#fef2f2",
              border: "1px solid #fecaca",
            }}
          >
            <p style={{ fontSize: 13, color: "#dc2626", margin: 0 }}>
              {error}
            </p>
          </div>
        )}

        {/* Continue Button */}
        <motion.button
          onClick={handleContinue}
          disabled={!isValid || saving}
          whileHover={{ scale: !isValid || saving ? 1 : 1.02 }}
          whileTap={{ scale: !isValid || saving ? 1 : 0.98 }}
          style={{
            width: "100%",
            padding: "16px 24px",
            borderRadius: 16,
            border: "none",
            fontSize: 16,
            fontWeight: 600,
            cursor: !isValid || saving ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            background:
              !isValid || saving
                ? "#e5e7eb"
                : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: !isValid || saving ? "#9ca3af" : "#ffffff",
            boxShadow:
              !isValid || saving
                ? "0 1px 3px rgba(0, 0, 0, 0.1)"
                : "0 8px 16px rgba(16, 185, 129, 0.3)",
            marginBottom: 12,
          }}
        >
          {saving ? "Saving..." : "Continue"}
        </motion.button>

        {/* Skip Option */}
        <button
          onClick={handleSkip}
          style={{
            width: "100%",
            padding: "12px",
            border: "none",
            background: "transparent",
            fontSize: 14,
            fontWeight: 400,
            color: "#6b7280",
            cursor: "pointer",
            textDecoration: "none",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#111827";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6b7280";
          }}
        >
          Add later
        </button>
      </div>
    </OnboardingLayout>
  );
}
