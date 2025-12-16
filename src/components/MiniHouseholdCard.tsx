// src/components/MiniHouseholdCard.tsx

type MiniHouseholdCardProps = {
  lastName: string;
  householdType?: string | null;
  neighborhood?: string | null;
  childAges?: number[];
  childSexes?: (string | null)[];
  statusLabel?: string;
  statusEmoji?: string;
};

// --- match OnboardingPreview.tsx exactly ---
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

export function MiniHouseholdCard({
  lastName,
  householdType,
  neighborhood,
  childAges = [],
  childSexes = [],
  statusLabel,
  statusEmoji,
}: MiniHouseholdCardProps) {
  const childrenCount = Array.isArray(childAges) ? childAges.length : 0;

  return (
    <div
      style={{
        border: "1px solid rgba(15,23,42,.10)",
        borderRadius: 14,
        padding: 12,
        background: "#fff",
        boxShadow: "0 4px 12px rgba(15,23,42,.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 10,
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{lastName}</div>

          {householdType ? (
            <span
              style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,.6)",
                color: "#334155",
                background: "#f8fafc",
              }}
            >
              {householdType}
            </span>
          ) : null}
        </div>

        {/* Meta line: neighborhood + Children count */}
        {(neighborhood || childrenCount > 0) && (
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            {neighborhood ? neighborhood : " "}
            {neighborhood && childrenCount > 0 ? " · " : ""}
            {childrenCount > 0 ? `Children: ${childrenCount}` : ""}
          </div>
        )}

        {/* Child chips: match preview style */}
        {childrenCount > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {childAges.map((age, i) => {
              const sex = childSexes?.[i] ?? null;
              const icon = sexIcon(sex);
              const { bg, fg } = chipColors(sex);

              return (
                <span
                  key={`${age}-${i}`}
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
                  {`${age} yr`}
                  {icon && ` ${icon}`}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Status pill (Going/Maybe/Can't go) */}
      {(statusLabel || statusEmoji) && (
        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            color: "#111827",
            whiteSpace: "nowrap",
            alignSelf: "flex-start",
          }}
        >
          {statusEmoji ? `${statusEmoji} ` : ""}
          {statusLabel ?? ""}
        </div>
      )}
    </div>
  );
}

// ✅ Provide a default export too, so BOTH import styles work:
//   import MiniHouseholdCard from "..."
//   import { MiniHouseholdCard } from "..."
export default MiniHouseholdCard;
