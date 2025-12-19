// src/pages/Settings.tsx
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type CSSProperties,
  type ComponentType,
} from "react";
import { Users, Home, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { CURRENT_UID, upsertMyHousehold } from "../lib/api";
import { loadNeighbors, addNeighbor, removeNeighbor } from "../lib/profile";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";
import {
  NEIGHBORHOOD_CODES,
  normalizeNeighborhoodCode,
  neighborhoodLabelFromCode,
} from "../lib/neighborhood";
import Logo from "../assets/gathergrove-logo.png";

const SHOW_DEV_TOOLS = true;

type HouseholdType = "Family w/ Kids" | "Empty Nesters" | "Singles/Couples";

type KidForm = {
  id: string;
  birthMonth: string; // "1".."12"
  birthYear: string; // "2018"
  gender: string; // "Male" | "Female" | "Prefer not to say"
  awayAtCollege: boolean;
  canBabysit: boolean;
};

type HouseholdOption = {
  value: HouseholdType;
  title: string;
  subtitle: string;
  Icon: ComponentType<{ size?: number }>;
  iconBg: string;
};

const householdOptions: HouseholdOption[] = [
  {
    value: "Family w/ Kids",
    title: "Family w/ Kids",
    subtitle: "Household with children at home.",
    Icon: Users,
    iconBg: "#DBEAFE",
  },
  {
    value: "Empty Nesters",
    title: "Empty Nesters",
    subtitle: "Children have moved out.",
    Icon: Home,
    iconBg: "#FEF3C7",
  },
  {
    value: "Singles/Couples",
    title: "Singles/Couples",
    subtitle: "Household without children.",
    Icon: Heart,
    iconBg: "#EDE9FE",
  },
];

const chipMotionProps = {
  whileTap: { scale: 0.98 },
  whileHover: { scale: 1.01 },
  transition: { duration: 0.1, ease: "easeOut" as const },
};

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
const YEARS = Array.from({ length: 26 }, (_, i) => String(currentYear - i));

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
      if (!hasHadBirthdayThisYear) age -= 1;
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

/* ---------- Preview helpers ---------- */

type PreviewKid = {
  birthMonth?: number | null;
  birthYear?: number | null;
  sex?: string | null;
  awayAtCollege?: boolean | null;
  canBabysit?: boolean | null;
};

function ageFromMY(m?: number | null, y?: number | null): number | null {
  if (!y) return null;
  const now = new Date();
  const month = m && m >= 1 && m <= 12 ? m : 6;
  const d = new Date(y, month - 1, 15);
  let a = now.getFullYear() - d.getFullYear();
  const hadBday =
    now.getMonth() > d.getMonth() ||
    (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBday) a -= 1;
  return a < 0 ? 0 : a;
}

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

function sortKidsByAgeOldestFirst(a: PreviewKid, b: PreviewKid): number {
  const ay = a.birthYear ?? null;
  const by = b.birthYear ?? null;

  if (!ay && !by) return 0;
  if (!ay) return 1;
  if (!by) return -1;

  if (ay !== by) return ay - by;

  const am = a.birthMonth ?? null;
  const bm = b.birthMonth ?? null;

  if (!am && !bm) return 0;
  if (!am) return 1;
  if (!bm) return -1;

  return am - bm;
}

type HouseholdPreviewProps = {
  lastName: string;
  adults: string[];
  householdType: HouseholdType | "";
  kids: KidForm[];
  neighborhoodCode?: string;
};

function HouseholdPreviewCard({
  lastName,
  adults,
  householdType,
  kids,
  neighborhoodCode,
}: HouseholdPreviewProps) {
  const label = lastName || "Household";
  const initial = label.charAt(0).toUpperCase();

  const neighborhood = (neighborhoodLabelFromCode(neighborhoodCode ?? null) ?? "").trim();
  const typeChip = householdType || "Household";

  const adultsClean = adults.map((a) => a.trim()).filter(Boolean);
  let adultsLabel = "";
  if (adultsClean.length === 1) adultsLabel = adultsClean[0];
  else if (adultsClean.length === 2) adultsLabel = `${adultsClean[0]} & ${adultsClean[1]}`;
  else if (adultsClean.length > 2)
    adultsLabel = `${adultsClean[0]} + ${adultsClean.length - 1} more`;

  const previewKids: PreviewKid[] = kids.map((k) => ({
    birthMonth: k.birthMonth ? Number(k.birthMonth) : null,
    birthYear: k.birthYear ? Number(k.birthYear) : null,
    sex: k.gender || null,
    awayAtCollege: k.awayAtCollege,
    canBabysit: k.canBabysit,
  }));

  const sortedKids = [...previewKids].sort(sortKidsByAgeOldestFirst);

  const kidsLabel =
    sortedKids.length === 0
      ? "None listed yet"
      : `${sortedKids.length} kid${sortedKids.length > 1 ? "s" : ""}`;

  const kidsAtHome = sortedKids.filter((k) => !Boolean(k.awayAtCollege));
  const kidsAway = sortedKids.filter((k) => Boolean(k.awayAtCollege));

  const hasBabysitter = sortedKids.some((k) => {
    if (!Boolean(k.canBabysit)) return false;
    const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
    return age !== null && age >= 13 && age <= 25;
  });

  const isFamily = householdType === "Family w/ Kids";

  return (
    <div style={{ marginTop: 10 }}>
      <style>{`
        .settings-preview-card {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: start;
          gap: 12px;
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 16px;
          padding: 16px;
          background: linear-gradient(135deg,#ffffff,#f9fafb);
          box-shadow: 0 8px 24px rgba(16,24,40,.06);
        }
        .settings-preview-select-pad { width: 28px; height: 28px; margin-top: 4px; }
        .settings-preview-avatar {
          width: 42px; height: 42px; border-radius: 9999px;
          display: inline-flex; align-items: center; justify-content: center;
          font-weight: 700; background: #eef2ff; color: #3730a3; margin-top: 2px;
        }
        .settings-preview-main { min-width: 0; }
        .settings-preview-name {
          margin: 0; font-size: 20px; line-height: 1.2;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          max-width: 420px;
        }
        .settings-preview-pill { display: inline-block; font-size: 12px; padding: 6px 10px; border-radius: 999px; }
        .settings-preview-pill.neighborhood {
          background: rgba(15,23,42,.04); color: #334155; border: 1px solid rgba(15,23,42,.06);
        }
        .settings-preview-pill.type { background: #eef2ff; color: #3730a3; }
        .settings-preview-adults { line-height: 1.3; margin-top: 6px; color: #374151; font-size: 14px; }
        .settings-preview-kids-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .settings-preview-kids-section { margin-top: 4px; }
        .settings-preview-kids-subheading { font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 2px; }
        .settings-preview-actions {
          display: grid; gap: 8px; align-content: space-between; justify-items: end; min-width: 144px;
        }
        .settings-preview-star {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(0,0,0,.02); border: 1px solid rgba(2,6,23,.06);
          font-size: 20px; display: inline-flex; align-items: center; justify-content: center;
        }
        .settings-preview-btn {
          display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px;
          border-radius: 12px; background: linear-gradient(180deg,#3b82f6,#2563eb);
          color: #fff; border: 0; font-weight: 600; box-shadow: 0 8px 16px rgba(37,99,235,.25);
        }
      `}</style>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>
          Household preview
        </div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>
          How you&apos;ll appear in the People tab
        </div>
      </div>

      <div className="settings-preview-card">
        <div className="settings-preview-select-pad" aria-hidden />
        <div className="settings-preview-avatar" aria-hidden>
          {initial}
        </div>

        <div className="settings-preview-main">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <h3 className="settings-preview-name">{label}</h3>
            {neighborhood && (
              <span className="settings-preview-pill neighborhood">{neighborhood}</span>
            )}
          </div>

          {adultsLabel && (
            <div className="settings-preview-adults">
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

              {sortedKids.length > 0 && kidsAway.length === 0 && (
                <div className="settings-preview-kids-row">
                  {sortedKids.map((k, i) => {
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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginLeft: 12,
                  }}
                >
                  {kidsAtHome.length > 0 && (
                    <div className="settings-preview-kids-section">
                      <div className="settings-preview-kids-subheading">At home</div>
                      <div className="settings-preview-kids-row">
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

                  <div className="settings-preview-kids-section">
                    <div className="settings-preview-kids-subheading">
                      Lives away from home
                    </div>
                    <div className="settings-preview-kids-row">
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

          <span
            className="settings-preview-pill type"
            style={{ marginTop: 10, display: "inline-block" }}
          >
            {typeChip}
          </span>
        </div>

        <div className="settings-preview-actions">
          <div className="settings-preview-star" aria-hidden>
            ★
          </div>
          <button
            type="button"
            className="settings-preview-btn"
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
    </div>
  );
}

/* ---------- Settings page ---------- */

export default function Settings() {
  const [lastName, setLastName] = useState("");
  const [adult1, setAdult1] = useState("");
  const [adult2, setAdult2] = useState("");
  const [type, setType] = useState<HouseholdType | "">("");
  const [kids, setKids] = useState<KidForm[]>([]);
  const [savingHousehold, setSavingHousehold] = useState(false);

  // Neighborhood access (settings-style, onboarding-like)
  const [neighborhoodCode, setNeighborhoodCode] = useState("");
  const [hoodTouched, setHoodTouched] = useState(false);
  const [hoodValidated, setHoodValidated] = useState(false);

  const [flash, setFlash] = useState<string | null>(null);

  // Dev neighbor tools
  const [nLast, setNLast] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nType, setNType] = useState<"" | HouseholdType>("");
  const [neighbors, setNeighbors] = useState(loadNeighbors());

  useEffect(() => {
    const ob = getOnboardingState();

    if (ob.lastName) setLastName(ob.lastName);

    if (Array.isArray(ob.adults) && ob.adults.length > 0) {
      setAdult1(ob.adults[0] || "");
      setAdult2(ob.adults[1] || "");
    }

    if (ob.householdType && typeof ob.householdType === "string") {
      setType(ob.householdType as HouseholdType);
    }

    if (ob.kids && ob.kids.length > 0) {
      setKids(
        ob.kids.map((k: any, idx: number) => ({
          id: `${idx}-${Date.now()}`,
          birthMonth: k.birthMonth ? String(k.birthMonth) : "",
          birthYear: k.birthYear ? String(k.birthYear) : "",
          gender: k.sex ?? "",
          awayAtCollege: Boolean(k.awayAtCollege),
          canBabysit: Boolean(k.canBabysit),
        }))
      );
    }

    if (ob.neighborhoodCode) {
      setNeighborhoodCode(normalizeNeighborhoodCode(ob.neighborhoodCode));
    }
  }, []);

  const isFamily = type === "Family w/ Kids";

  const highlight = useMemo(() => {
    if (!isFamily || kids.length === 0) return null;
    for (const k of kids) {
      if (!k.birthMonth) return { kidId: k.id, field: "birthMonth" as const };
      if (!k.birthYear) return { kidId: k.id, field: "birthYear" as const };
      if (!k.gender) return { kidId: k.id, field: "gender" as const };
    }
    return null;
  }, [isFamily, kids]);

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
    setKids((prev) => prev.map((k) => (k.id === id ? { ...k, [field]: value } : k)));
  }

  // Neighborhood validation (same source of truth as onboarding)
  const normalizedHood = normalizeNeighborhoodCode(neighborhoodCode);
  const match = NEIGHBORHOOD_CODES[normalizedHood] ?? null;
  const isValidCode = !!match;

  const showRequiredError = hoodValidated && normalizedHood.length === 0;
  const showCodeError = hoodValidated && normalizedHood.length > 0 && !isValidCode;

  const displayLabel = neighborhoodLabelFromCode(normalizedHood) || "";
  const showSuccess = hoodValidated && isValidCode && !!displayLabel;

  function handleHoodChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = normalizeNeighborhoodCode(e.target.value);
    setNeighborhoodCode(value);
    setHoodValidated(false);
  }

  function handleHoodBlur() {
    setHoodTouched(true);
  }

  // MAIN SAVE HANDLER – backend is the source of truth
  const handleSaveHousehold = async () => {
    if (savingHousehold) return;

    const trimmedLast = lastName.trim();
    const adults = [adult1.trim(), adult2.trim()].filter(Boolean);
    const householdType = type || undefined;

    const normalizedKids =
      type === "Family w/ Kids"
        ? kids
            .filter((k) => k.birthMonth && k.birthYear && k.gender)
            .map((k) => ({
              birthMonth: k.birthMonth ? Number(k.birthMonth) : null,
              birthYear: k.birthYear ? Number(k.birthYear) : null,
              sex: k.gender || null,
              awayAtCollege: k.awayAtCollege || false,
              canBabysit: k.canBabysit || false,
            }))
        : [];

    // Validate basics
    if (!trimmedLast || !householdType) {
      setFlash("Please add a last name and household type.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 2200);
      return;
    }

    if (type === "Family w/ Kids" && normalizedKids.length === 0) {
      setFlash("Please add at least one child for a Family w/ Kids household.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 2500);
      return;
    }

    // Validate neighborhood code like onboarding (private)
    setHoodTouched(true);
    setHoodValidated(true);

    // Allow empty? For MVP, we REQUIRE a code to be in a neighborhood.
    if (normalizedHood.length === 0) {
      setFlash("Please enter your neighborhood code.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 2200);
      return;
    }

    if (!NEIGHBORHOOD_CODES[normalizedHood]) {
      setFlash("That neighborhood code doesn’t match any neighborhood.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 2600);
      return;
    }

    setSavingHousehold(true);

    // Keep onboarding state in sync
    const prev = getOnboardingState();
    setOnboardingState({
      ...prev,
      lastName: trimmedLast,
      adults,
      householdType,
      kids: normalizedKids,
      neighborhoodCode: normalizedHood,
    });

    try {
      await upsertMyHousehold({
        uid: CURRENT_UID,
        lastName: trimmedLast,
        householdType,
        adultNames: adults,
        kids: normalizedKids,
        neighborhood: normalizedHood, // ✅ store code, not label
      });

      setFlash("Household updated ✅");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 2200);
    } catch (err) {
      console.error("Failed to upsert household from Settings:", err);
      setFlash("Save failed — backend didn’t update. Check backend + console.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFlash(null), 3000);
      setSavingHousehold(false);
      return;
    }

    setSavingHousehold(false);
  };

  const addDemo = (e: FormEvent) => {
    e.preventDefault();
    addNeighbor({
      last_name: nLast.trim() || undefined,
      email: nEmail.trim() || undefined,
      householdType: nType || undefined,
    });
    setNeighbors(loadNeighbors());
    setNLast("");
    setNEmail("");
    setNType("");
  };

  const removeDemo = (id: string) => {
    removeNeighbor(id);
    setNeighbors(loadNeighbors());
  };

  const kidSelectStyle: CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    width: "100%",
    fontSize: 13,
    boxSizing: "border-box",
    background: "#ffffff",
  };

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        .settings-title { font-size: 30px; font-weight: 800; letter-spacing: .02em; color: #0f172a; margin: 0; }
        .settings-sub { font-size: 14px; color: #6b7280; margin: 2px 0 10px; }
        .settings-card {
          border-radius: 16px; border: 1px solid rgba(148,163,184,.35);
          background: rgba(255,255,255,0.96);
          padding: 14px 16px 16px;
          box-shadow: 0 6px 16px rgba(15,23,42,0.05);
          margin-bottom: 16px;
        }
        .settings-card-header { display:flex; align-items:flex-start; gap:10px; margin-bottom:10px; }
        .settings-card-icon {
          width:30px; height:30px; border-radius:12px; border:1px solid #e5e7eb;
          display:flex; align-items:center; justify-content:center; font-size:16px; background:#ffffff;
        }
        .settings-card-title { font-size:16px; font-weight:700; margin:0; }
        .settings-card-helper { font-size:13px; color:#6b7280; margin-top:2px; }
        .settings-section-sub { font-size: 12px; color: #6b7280; margin: 4px 0 8px; }
        .settings-field-label { margin-bottom: 6px; font-weight: 600; font-size: 13px; }
        .settings-input {
          padding: 11px 14px; border-radius: 12px; border: 1px solid #d1d5db;
          width: 100%; font-size: 14px; box-sizing: border-box;
          outline: none;
        }
        .settings-pill-note {
          font-size:11px; padding:4px 8px; border-radius:999px; border:1px solid #e5e7eb;
          background:#f9fafb; color:#6b7280; display:inline-block;
        }
        .settings-save-row { display:flex; justify-content:flex-end; margin-top:18px; gap:8px; }
        .settings-btn {
          padding: 10px 16px; border-radius: 999px; border: 1px solid #cbd5e1;
          background:#0f172a; color:white; font-size:14px; font-weight:600; cursor:pointer;
        }
        .settings-btn-secondary { background:#f8fafc; color:#0f172a; }
        .settings-bullet-list { font-size:13px; color:#374151; padding-left:18px; margin:6px 0 0; }
        .settings-bullet-list li { margin-bottom:4px; }
        .settings-meta-row { display:flex; align-items:center; gap:6px; font-size:11px; color:#6b7280; margin-top:8px; }
        .settings-badge-outline { font-size:11px; border-radius:999px; padding:2px 8px; border:1px solid #cbd5e1; background:#f8fafc; }
        .settings-dev-avatar {
          width: 28px; height: 28px; border-radius: 9999px; background: #eef2ff; color: #3730a3;
          display: inline-flex; align-items: center; justify-content: center; font-weight: 700;
        }
        .settings-dev-remove-btn {
          border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 8px;
          font-size:12px; cursor:pointer; background:#ffffff;
        }
        .settings-dev-label {
          font-size:11px; color:#9ca3af; text-transform:uppercase; letter-spacing:.14em;
          margin: 4px 4px 2px; font-weight:600;
        }
        .settings-dev-label-sub { font-size:12px; color:#6b7280; margin: 0 4px 6px; }
        .household-tiles { display:flex; flex-direction:column; gap:8px; margin-top:4px; }

        .hood-helper {
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .hood-success {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #bbf7d0;
          background: #f0fdf4;
          font-size: 13px;
          color: #166534;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <img src={Logo} alt="GatherGrove logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <h2 className="settings-title">Settings</h2>
      </div>
      <p className="settings-sub">Manage your account, household profile, and privacy.</p>

      {flash && (
        <div
          style={{
            margin: "8px 0 12px",
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #22c55e",
            background: "#dcfce7",
            color: "#166534",
            display: "inline-block",
            fontSize: 13,
          }}
        >
          {flash}
        </div>
      )}

      {/* Account */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🔒</div>
          <div>
            <h3 className="settings-card-title">Account</h3>
            <p className="settings-card-helper">
              In a later version you&apos;ll manage your email, password, and notifications here.
            </p>
          </div>
        </div>
        <p className="settings-section-sub">
          For this MVP, settings are local to this device only. We&apos;ll wire this to your real GatherGrove login soon.
        </p>
        <span className="settings-pill-note">Coming soon · email &amp; password management</span>
      </section>

      {/* Household profile */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🏡</div>
          <div>
            <h3 className="settings-card-title">Household profile</h3>
            <p className="settings-card-helper">Edit how your household appears in the People tab.</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveHousehold();
          }}
          style={{ display: "grid", gap: 14, marginTop: 6 }}
        >
          <div>
            <div className="settings-field-label">
              Last Name{" "}
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>(required)</span>
            </div>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g., Carlberg"
              className="settings-input"
            />
          </div>

          <div>
            <div className="settings-field-label">Adult 1 (optional)</div>
            <input
              value={adult1}
              onChange={(e) => setAdult1(e.target.value)}
              placeholder="e.g., Brian"
              className="settings-input"
            />
          </div>

          <div>
            <div className="settings-field-label">Adult 2 (optional)</div>
            <input
              value={adult2}
              onChange={(e) => setAdult2(e.target.value)}
              placeholder="e.g., Katelyn"
              className="settings-input"
            />
          </div>

          {/* Neighborhood code (private, onboarding-like) */}
          <div>
            <div className="settings-field-label">
              Neighborhood code{" "}
              <span style={{ fontWeight: 400, color: "#9ca3af", fontSize: 11 }}>(required)</span>
            </div>

            <input
              value={neighborhoodCode}
              onChange={handleHoodChange}
              onBlur={handleHoodBlur}
              placeholder="Enter your neighborhood code…"
              className="settings-input"
              spellCheck={false}
              autoComplete="off"
              style={{
                borderColor:
                  hoodTouched && (showRequiredError || showCodeError) ? "#f97373" : "#d1d5db",
              }}
            />

            {showRequiredError && (
              <div className="hood-helper" style={{ color: "#b91c1c", marginTop: 6 }}>
                Please enter your neighborhood code.
              </div>
            )}

            {showCodeError && (
              <div className="hood-helper" style={{ color: "#b91c1c", marginTop: 6 }}>
                That code doesn’t match any neighborhood. Double-check the code or reach out to the
                person who shared it with you.
              </div>
            )}

            {showSuccess && (
              <div className="hood-success">
                <span aria-hidden="true">🌿</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Welcome to {displayLabel}!</div>
                  <div>
                    You’re joining the <strong>{displayLabel}</strong> neighborhood community.
                  </div>
                </div>
              </div>
            )}

            <p className="hood-helper">
              <span aria-hidden="true">🔒</span>
              <span>
                Private and secure. Only households in your neighborhood can join with this code.
                No addresses or child names are ever shown.
              </span>
            </p>
          </div>

          <div>
            <div className="settings-field-label">Household Type</div>
            <div className="household-tiles">
              {householdOptions.map((opt) => {
                const active = type === opt.value;
                const Icon = opt.Icon;
                return (
                  <motion.button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: active ? "1px solid rgba(37,99,235,.9)" : "1px solid #e5e7eb",
                      background: active ? "#ecfdf5" : "#f9fafb",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      boxShadow: active ? "0 8px 18px rgba(37,99,235,0.25)" : "none",
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

          {/* Kids */}
          {isFamily && (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 600, color: "#111827" }}>
                Children in your home
              </div>

              {kids.map((kid, index) => {
                const preview = buildChildPreview(kid);
                const age = computeAgeFromKid(kid);

                const isMonthActive = highlight?.kidId === kid.id && highlight.field === "birthMonth";
                const isYearActive = highlight?.kidId === kid.id && highlight.field === "birthYear";
                const isGenderActive = highlight?.kidId === kid.id && highlight.field === "gender";

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

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: 8 }}>
                      <select
                        value={kid.birthMonth}
                        onChange={(e) => updateKid(kid.id, "birthMonth", e.target.value)}
                        style={{
                          ...kidSelectStyle,
                          ...(isMonthActive
                            ? {
                                borderColor: "#22c55e",
                                boxShadow: "0 0 0 1px rgba(34,197,94,0.55)",
                                background: "#f0fdf4",
                              }
                            : {}),
                        }}
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
                        style={{
                          ...kidSelectStyle,
                          ...(isYearActive
                            ? {
                                borderColor: "#22c55e",
                                boxShadow: "0 0 0 1px rgba(34,197,94,0.55)",
                                background: "#f0fdf4",
                              }
                            : {}),
                        }}
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
                        style={{
                          ...kidSelectStyle,
                          ...(isGenderActive
                            ? {
                                borderColor: "#22c55e",
                                boxShadow: "0 0 0 1px rgba(34,197,94,0.55)",
                                background: "#f0fdf4",
                              }
                            : {}),
                        }}
                      >
                        <option value="">Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    {preview && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "#6b7280" }}>
                        Preview: {preview}
                      </div>
                    )}

                    {age !== null && age >= 18 && (
                      <>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 8,
                            fontSize: 12,
                            color: "#374151",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={kid.awayAtCollege}
                            onChange={(e) => updateKid(kid.id, "awayAtCollege", e.target.checked)}
                          />
                          <span>Lives away from home (college, work, etc.)</span>
                        </label>
                        <div style={{ marginTop: 2, fontSize: 11, color: "#6b7280" }}>
                          Use this if they&apos;re usually away for school or work, not just visiting.
                        </div>
                      </>
                    )}

                    {age !== null && age >= 13 && age <= 25 && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 8,
                          fontSize: 12,
                          color: "#374151",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={kid.canBabysit}
                          onChange={(e) => updateKid(kid.id, "canBabysit", e.target.checked)}
                        />
                        <span>Can help with babysitting / parent helper</span>
                      </label>
                    )}
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
            </div>
          )}

          {/* Preview */}
          <HouseholdPreviewCard
            lastName={lastName}
            adults={[adult1, adult2]}
            householdType={type}
            kids={kids}
            neighborhoodCode={normalizedHood}
          />

          <p className="settings-section-sub">
            Neighbors will only see adult first names and child ages/gender — never birthdays or full
            personal details.
          </p>

          <div className="settings-save-row">
            <button
              type="button"
              className={"settings-btn settings-btn-secondary"}
              onClick={() => {
                setLastName("");
                setAdult1("");
                setAdult2("");
                setType("");
                setKids([]);
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="settings-btn"
              disabled={savingHousehold}
              onClick={(e) => {
                e.preventDefault();
                handleSaveHousehold();
              }}
            >
              {savingHousehold ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      {/* Privacy */}
      <section className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-icon">🛡️</div>
          <div>
            <h3 className="settings-card-title">Privacy &amp; Safety</h3>
            <p className="settings-card-helper">A quick reminder of what your neighbors can see.</p>
          </div>
        </div>

        <ul className="settings-bullet-list">
          <li>Household last name</li>
          <li>Optional adult first names (you can leave these blank if you prefer)</li>
          <li>
            Kids are shown only as <span style={{ fontWeight: 600 }}>Age • Gender</span> — never
            names or birthdays
          </li>
        </ul>

        <div className="settings-meta-row">
          <span role="img" aria-label="info">
            ℹ️
          </span>
          <span>Neighborhood access requires a private code. Exact street addresses are not shown.</span>
        </div>
      </section>

      {/* Dev tools */}
      {SHOW_DEV_TOOLS && (
        <>
          <div className="settings-dev-label">Developer tools · beta only</div>
          <div className="settings-dev-label-sub">
            Only visible in this beta build to help you test neighbors locally.
          </div>

          {/* Reset onboarding */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">🔁</div>
              <div>
                <h3 className="settings-card-title">Reset onboarding (this device only)</h3>
                <p className="settings-card-helper">
                  Clears your GatherGrove onboarding state so you can re-enter your neighborhood code.
                </p>
              </div>
            </div>
            <div className="settings-save-row">
              <button
                type="button"
                className="settings-btn settings-btn-secondary"
                onClick={() => {
                  try {
                    localStorage.removeItem("gg:onboarding");
                    setFlash("Onboarding reset for this device. Refresh to start over.");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => setFlash(null), 2200);
                  } catch (err) {
                    console.error("Failed to clear onboarding state:", err);
                  }
                }}
              >
                Reset onboarding (dev)
              </button>
            </div>
          </section>

          {/* Demo neighbors */}
          <section className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">🧪</div>
              <div>
                <h3 className="settings-card-title">Developer tools — demo neighbors (local)</h3>
                <p className="settings-card-helper">
                  These demo neighbors live only in your browser&apos;s localStorage. Use them to test
                  the People and Home tabs.
                </p>
              </div>
            </div>

            <form onSubmit={addDemo} style={{ display: "grid", gap: 8, maxWidth: 520, marginTop: 4 }}>
              <input
                value={nLast}
                onChange={(e) => setNLast(e.target.value)}
                placeholder="Last name (e.g., Johnson)"
                className="settings-input"
              />
              <input
                value={nEmail}
                onChange={(e) => setNEmail(e.target.value)}
                placeholder="Email (optional)"
                className="settings-input"
              />
              <select
                value={nType}
                onChange={(e) => setNType(e.target.value as any)}
                className="settings-input"
              >
                <option value="">(type optional)</option>
                <option value="Family w/ Kids">Family w/ Kids</option>
                <option value="Empty Nesters">Empty Nesters</option>
                <option value="Singles/Couples">Singles/Couples</option>
              </select>
              <div className="settings-save-row">
                <button type="submit" className="settings-btn settings-btn-secondary">
                  + Add neighbor
                </button>
              </div>
            </form>

            {neighbors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {neighbors.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 0",
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <div className="settings-dev-avatar">
                      {(n.last_name?.[0] || "H").toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{n.last_name ?? "Household"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{n.email ?? "no email"}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDemo(n.id)}
                      className="settings-dev-remove-btn"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="settings-meta-row">
              <span className="settings-badge-outline">Local-only data</span>
              <span>Safe to clear anytime via browser storage.</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
