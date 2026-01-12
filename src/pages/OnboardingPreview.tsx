// src/pages/OnboardingPreview.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { getOnboardingState } from "../lib/onboarding";
import { upsertUser, upsertMyHousehold } from "../lib/api";

// ✅ Canonical neighborhood helpers (single source of truth)
import { normalizeNeighborhoodCode, neighborhoodLabelFromCode } from "../lib/neighborhood";

// --- helpers copied from People.tsx so chips look identical ---
type Kid = {
  birthMonth?: number | null;
  birthYear?: number | null;
  sex?: string | null;
  awayAtCollege?: boolean | null; // lives away from home
  canBabysit?: boolean | null; // can help with babysitting / parent helper
};

function ageFromMY(m?: number | null, y?: number | null): number | null {
  if (!y) return null;
  const now = new Date();
  const month = m && m >= 1 && m <= 12 ? m : 6;
  const d = new Date(y, month - 1, 15);
  let a = now.getFullYear() - d.getFullYear();
  const hadBday =
    now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBday) a -= 1;
  return a < 0 ? 0 : a;
}

// Updated: no symbol when gender is hidden or unspecified
function sexIcon(sex?: string | null) {
  const s = (sex || "").toLowerCase();
  if (s.startsWith("m")) return "♂";
  if (s.startsWith("f")) return "♀";
  return "";
}

function chipColors(sex?: string | null) {
  const s = (sex || "").toLowerCase();
  if (s.startsWith("m")) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (s.startsWith("f")) return { bg: "#ffe4e6", fg: "#be123c" };
  return { bg: "#f3f4f6", fg: "#374151" };
}

/** Oldest → youngest sort helper */
function sortKidsByAgeOldestFirst(a: Kid, b: Kid): number {
  const ay = a.birthYear ?? null;
  const by = b.birthYear ?? null;

  // push unknown years to the end
  if (!ay && !by) return 0;
  if (!ay) return 1;
  if (!by) return -1;

  if (ay !== by) return ay - by; // smaller year = older

  const am = a.birthMonth ?? null;
  const bm = b.birthMonth ?? null;

  // if year same, sort by month (earlier month = older)
  if (!am && !bm) return 0;
  if (!am) return 1;
  if (!bm) return -1;

  return am - bm;
}

function OnboardingPreviewInner() {
  const navigate = useNavigate();
  const state = getOnboardingState();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ canonical neighborhood code (stored)
  const neighborhoodCode = useMemo(
    () => normalizeNeighborhoodCode(state.neighborhoodCode ?? null),
    [state.neighborhoodCode]
  );

  // ✅ full label (displayed)
  const neighborhoodLabel = useMemo(() => {
    const label = neighborhoodLabelFromCode(state.neighborhoodCode ?? null);
    return label || "Your neighborhood";
  }, [state.neighborhoodCode]);

  // If we somehow got here without basic info, send them back
  useEffect(() => {
    if (!state.lastName && !state.householdName) {
      navigate("/onboarding/household", { replace: true });
    }
    
    // Debug: Log the state to see what we have
    console.log("🔍 OnboardingPreview state:", {
      firstName: state.firstName,
      lastName: state.lastName,
      householdName: state.householdName,
      adults: state.adults,
      householdType: state.householdType,
      kids: state.kids,
    });
  }, [state, navigate]);

  const adultsLabel = useMemo(() => {
    const adults: string[] = Array.isArray(state.adults) ? state.adults : [];
    const cleaned = adults.map((a) => (a || "").trim()).filter(Boolean);
    
    // If no adults listed, fall back to firstName from OAuth
    if (cleaned.length === 0 && state.firstName) {
      return state.firstName;
    }
    
    if (cleaned.length === 0) return "";
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} & ${cleaned[1]}`;
    return `${cleaned[0]} + ${cleaned.length - 1} more`;
  }, [state.adults, state.firstName]);

  /* ---------- Kids: always oldest → youngest ---------- */
  const kidsRaw = (state.kids ?? []) as Kid[];
  const kids = useMemo(() => [...kidsRaw].sort(sortKidsByAgeOldestFirst), [kidsRaw]);

  const kidsLabel = useMemo(() => {
    if (!kids || kids.length === 0) return "None listed yet";
    return `${kids.length} kid${kids.length > 1 ? "s" : ""}`;
  }, [kids]);

  // Use Boolean() so undefined/null are treated as "false"
  const kidsAtHome = kids.filter((k) => !Boolean(k.awayAtCollege));
  const kidsAway = kids.filter((k) => Boolean(k.awayAtCollege));

  // Babysitting helper badge – any kid 13–25 with canBabysit = true
  const hasBabysitter = useMemo(
    () =>
      kids.some((k) => {
        if (!Boolean(k.canBabysit)) return false;
        const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
        return age !== null && age >= 13 && age <= 25;
      }),
    [kids]
  );

  const householdType = state.householdType ?? "";
  const isFamily = 
    householdType === "family_with_kids" || 
    householdType.toLowerCase().includes("family") || 
    householdType.toLowerCase().includes("kids");

  // Map household type to display label (matching your prototype)
  const householdTypeLabel = useMemo(() => {
    const type = (state.householdType ?? "").toLowerCase();
    if (type.includes("family") || type.includes("kids")) return "Family w/ Kids";
    if (type.includes("empty") || type.includes("nester")) return "Empty Nesters";
    if (type.includes("single") || type.includes("couple")) return "Singles/Couples";
    return "Household";
  }, [state.householdType]);
  
  // Build the household name display
  // Priority: householdName > "firstName lastName" (from OAuth) > lastName alone
  let householdDisplayName = "";
  
  if (state.householdName?.trim()) {
    // User entered a specific household name in the form
    householdDisplayName = state.householdName.trim();
  } else if (state.firstName?.trim() && state.lastName?.trim()) {
    // Use OAuth full name (e.g., "Test Google User" → show as "Google User" household)
    // Just use lastName for cleaner display
    householdDisplayName = state.lastName.trim();
  } else if (state.lastName?.trim()) {
    // Just the last name
    householdDisplayName = state.lastName.trim();
  } else {
    householdDisplayName = "Household";
  }
  
  const label = householdDisplayName;
  const initial = label.charAt(0).toUpperCase();

  const handleEdit = () => navigate("/onboarding/household");

  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);

    try {
      // ---------- 1) Upsert USER (ONLY user fields) ----------
      const adults: string[] = Array.isArray(state.adults) ? state.adults : [];
      const userName = adults[0]?.trim() || "Neighbor";
      await upsertUser({ name: userName });

      // ---------- 2) Upsert HOUSEHOLD (household fields only) ----------
      const adultNames = adults.map((a) => (a || "").trim()).filter(Boolean);

      const normalizedKids: Kid[] = isFamily
        ? (kidsRaw || []).map((k) => ({
            birthMonth: k.birthMonth ?? null,
            birthYear: k.birthYear ?? null,
            sex: k.sex ?? null,
            awayAtCollege: Boolean(k.awayAtCollege),
            canBabysit: Boolean(k.canBabysit),
          }))
        : [];

      await upsertMyHousehold({
        lastName: (state.lastName || "").trim(),
        adultNames,
        householdType: householdType || undefined,
        kids: normalizedKids,
        // ✅ canonical: store the CODE (BH26-GK4 / EP26-QM7)
        neighborhood: neighborhoodCode || undefined,
      });

      navigate("/onboarding/save");
    } catch (e: any) {
      console.error("[OnboardingPreview] save failed:", e);
      setError(e?.message || "Save failed. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Scoped styles copied from People.tsx so the card looks identical */}
      <style>{`
        .gg-card {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: start;
          gap: 12px;
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: saturate(1.1);
          box-shadow: 0 8px 24px rgba(16,24,40,.06);
        }
        .gg-select-pad { width: 28px; height: 28px; margin-top: 4px; }
        .gg-avatar {
          width: 42px; height: 42px; border-radius: 9999px;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; background: #eef2ff; color: #3730a3; margin-top: 2px;
        }
        .gg-main { min-width: 0; }
        .gg-name {
          margin: 0;
          font-size: 22px;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 420px;
        }
        .gg-pill {
          display: inline-block;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
        }
        .gg-pill.neighborhood {
          background: rgba(15,23,42,.04);
          color: #334155;
          border: 1px solid rgba(15,23,42,.06);
        }
        .gg-pill.type {
          background: #eef2ff;
          color: #3730a3;
        }
        .adults {
          line-height: 1.3;
          margin-top: 6px;
          color: #374151;
          font-size: 14px;
        }
        .kids-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .kids-section { margin-top: 4px; }
        .kids-subheading {
          font-size: 12px;
          font-weight: 600;
          color: #4b5563;
          margin-bottom: 2px;
        }
        .gg-actions {
          display: grid;
          gap: 8px;
          align-content: space-between;
          justify-items: end;
          min-width: 144px;
        }
        .gg-star {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: rgba(0,0,0,.02);
          border: 1px solid rgba(2,6,23,.06);
          font-size: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .gg-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          background: linear-gradient(180deg,#3b82f6,#2563eb);
          color: #fff;
          border: 0;
          font-weight: 600;
          box-shadow: 0 8px 16px rgba(37,99,235,.25);
        }
      `}</style>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Household Preview</h1>
      <p style={{ fontSize: 14, color: "#4b5563", marginBottom: 16 }}>
        This is how your household will appear to others in GatherGrove.
      </p>

      <div
        className="gg-card"
        style={{
          marginBottom: 16,
          background: "linear-gradient(135deg, #ffffff, #f9fafb)",
        }}
      >
        <div className="gg-select-pad" aria-hidden />

        <div className="gg-avatar" aria-hidden>
          {initial}
        </div>

        <div className="gg-main">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <h3 className="gg-name">{label}</h3>
            <span className="gg-pill neighborhood">{neighborhoodLabel}</span>
          </div>

          {adultsLabel && (
            <div className="adults">
              <span style={{ color: "#6b7280" }}>Adults: </span>
              <span style={{ fontWeight: 600 }}>{adultsLabel}</span>
            </div>
          )}

          {isFamily && (
            <>
              <div
                style={{
                  fontSize: 13,
                  color: "#374151",
                  marginTop: adultsLabel ? 6 : 2,
                  marginBottom: kidsAtHome.length || kidsAway.length ? 4 : 8,
                }}
              >
                <span style={{ fontWeight: 600 }}>Children:&nbsp;</span>
                {kidsLabel}
              </div>

              {kids.length > 0 && kidsAway.length === 0 && (
                <div className="kids-row">
                  {kids.map((k, i) => {
                    const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                    const icon = sexIcon(k.sex);
                    const { bg, fg } = chipColors(k.sex);
                    return (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: 12,
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: bg,
                          color: fg,
                          fontWeight: 600,
                          lineHeight: 1,
                        }}
                      >
                        {age != null ? `${age} yr` : "?"}
                        {icon && ` ${icon}`}
                      </span>
                    );
                  })}
                </div>
              )}

              {kidsAway.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 12 }}>
                  {kidsAtHome.length > 0 && (
                    <div className="kids-section">
                      <div className="kids-subheading">At home</div>
                      <div className="kids-row">
                        {kidsAtHome.map((k, i) => {
                          const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                          const icon = sexIcon(k.sex);
                          const { bg, fg } = chipColors(k.sex);
                          return (
                            <span
                              key={`home-${i}`}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: bg,
                                color: fg,
                                fontWeight: 600,
                                lineHeight: 1,
                              }}
                            >
                              {age != null ? `${age} yr` : "?"}
                              {icon && ` ${icon}`}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="kids-section">
                    <div className="kids-subheading">Lives away from home</div>
                    <div className="kids-row">
                      {kidsAway.map((k, i) => {
                        const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                        const icon = sexIcon(k.sex);
                        const { bg, fg } = chipColors(k.sex);
                        return (
                          <span
                            key={`away-${i}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 12,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: bg,
                              color: fg,
                              fontWeight: 600,
                              lineHeight: 1,
                            }}
                          >
                            {age != null ? `${age} yr` : "?"}
                            {icon && ` ${icon}`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {hasBabysitter && (
                <div style={{ marginTop: 8 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#ecfdf3",
                      color: "#166534",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span role="img" aria-label="babysitting">
                      🧑‍🍼
                    </span>
                    <span>Babysitting help available</span>
                  </span>
                </div>
              )}
            </>
          )}

          <span className="gg-pill type" style={{ marginTop: 10, display: "inline-block" }}>
            {householdTypeLabel}
          </span>
        </div>

        <div className="gg-actions">
          <div className="gg-star" aria-hidden>
            ★
          </div>
          <button
            type="button"
            className="gg-btn"
            style={{ cursor: "default", pointerEvents: "none" }}
            aria-hidden="true"
            tabIndex={-1}
          >
            <span role="img" aria-label="message">
              💬
            </span>
            Message
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 12,
            background: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
        You can always update your household details later from Settings.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          onClick={handleEdit}
          disabled={saving}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            fontWeight: 600,
            fontSize: 14,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={saving}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 999,
            border: "none",
            background: saving ? "#d1d5db" : "#10b981",
            color: saving ? "#6b7280" : "#ffffff",
            fontWeight: 700,
            fontSize: 15,
            cursor: saving ? "default" : "pointer",
            boxShadow: saving ? "none" : "0 10px 18px rgba(5,150,105,.35)",
          }}
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}

// Named export used by App.tsx
export function OnboardingPreview() {
  return (
    <OnboardingLayout currentStep="preview">
      <OnboardingPreviewInner />
    </OnboardingLayout>
  );
}

// Default export (safety if imported as default somewhere)
export default OnboardingPreview;
