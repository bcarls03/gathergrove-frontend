// src/pages/People.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers, type GGUser } from "../lib/api";
import { loadOverrides, loadNeighbors } from "../lib/profile";

// ---------- types ----------
type Kid = {
  birthMonth?: number | null;   // 1..12
  birthYear?: number | null;    // e.g., 2016
  sex?: string | null;          // "Male" | "Female" | "Prefer not to say" | ...
};

type AnyUser = GGUser & {
  id: string;
  email?: string | null;        // kept in data, but not rendered or searched
  lastName?: string | null;     // normalized (camelCase)
  name?: string | null;         // optional alt label
  householdType?: string | null;

  // optional extras if present in backend/local seeds
  kids?: Kid[];
  adultNames?: string[];        // ["Erik","Megan"]
  neighborhood?: string;        // "Eagles Pointe"
};

// ---------- helpers: label + sort ----------
const displayLabel = (u: AnyUser) => (u.lastName ?? u.name ?? "Household");
const displaySortKey = (u: AnyUser) =>
  (u.lastName ?? u.name ?? "").toString().trim().toLowerCase();

// ---------- favorites (persisted to localStorage) ----------
const FAV_KEY = "gg:favorites";

function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch { /* ignore */ }
  }, [favs]);
  const toggle = (id: string) =>
    setFavs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return { favs, toggle };
}

// ---------- small utilities ----------
function useDebounce<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ageFromMY(m?: number | null, y?: number | null): number | null {
  if (!m || !y) return null;
  const today = new Date();
  let age = today.getFullYear() - y;
  if ((today.getMonth() + 1) < (m || 0)) age -= 1;
  return age < 0 ? 0 : age;
}

function sexIcon(sex?: string | null) {
  if (!sex) return "•";
  const s = sex.toLowerCase();
  if (s.startsWith("m")) return "♂";
  if (s.startsWith("f")) return "♀";
  return "•";
}

function chipColors(sex?: string | null) {
  const s = (sex || "").toLowerCase();
  if (s.startsWith("m")) return { bg: "#dbeafe", fg: "#1d4ed8" }; // blue-100 / blue-700
  if (s.startsWith("f")) return { bg: "#ffe4e6", fg: "#be123c" }; // rose-100 / rose-700
  return { bg: "#f3f4f6", fg: "#374151" };                        // gray-100 / gray-700
}

// ---------- normalize any incoming record ----------
function normalize(u: any): AnyUser {
  return {
    id: String(u.id ?? u.uid ?? crypto.randomUUID()),
    email: u.email ?? null,
    lastName: u.lastName ?? u.last_name ?? null,
    name: u.name ?? null,
    householdType: u.householdType ?? u.household_type ?? null,
    kids: u.kids ?? u.children ?? undefined,
    adultNames: u.adultNames ?? u.adults ?? undefined,
    neighborhood: u.neighborhood ?? u.hood ?? undefined,
    ...u,
  } as AnyUser;
}

export default function People() {
  const [items, setItems] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = useDebounce(q, 200);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { favs, toggle } = useFavorites();

  const load = async () => {
    setLoading(true);
    try {
      // Backend users
      const raw = await fetchUsers();
      const base = Array.isArray(raw) ? raw : [];

      // Apply local overrides keyed by id
      const overrides = loadOverrides();
      const mergedBackend = base.map((u: any) => {
        const nu = normalize(u);
        return overrides[nu.id] ? ({ ...nu, ...overrides[nu.id] } as AnyUser) : nu;
      });

      // Local seed neighbors (from profile.ts)
      const locals = loadNeighbors().map(n =>
        normalize({
          id: n.id,
          lastName: n.last_name ?? n.lastName ?? n.name ?? null,
          email: n.email,
          householdType: n.householdType,
          kids: (n as any).kids,              // allow seeds to include kids
          adultNames: (n as any).adultNames,  // allow seeds to include adult names
          neighborhood: (n as any).neighborhood,
        })
      ) as AnyUser[];

      // Merge + sort
      const merged = [...mergedBackend, ...locals].sort((a, b) =>
        displaySortKey(a).localeCompare(displaySortKey(b))
      );

      setItems(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---------- filter (search + favorites) ----------
  const filtered = useMemo(() => {
    const needle = qDebounced.trim().toLowerCase();
    let list = items;

    if (needle) {
      list = list.filter(u => {
        const hay = [
          displayLabel(u),
          // (email intentionally removed from search)
          u.householdType ?? "",
          (u.adultNames ?? []).join(" "),
          u.neighborhood ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    if (onlyFavs) list = list.filter(u => favs.has(u.id));

    return list.slice().sort((a, b) => displaySortKey(a).localeCompare(displaySortKey(b)));
  }, [items, qDebounced, onlyFavs, favs]);

  // ---------- render ----------
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>People</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh /users"}
        </button>

        <input
          placeholder="Search households…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 220 }}
        />

        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={onlyFavs}
            onChange={(e) => setOnlyFavs(e.target.checked)}
          />
          Show favorites only
        </label>
      </div>

      {/* ---- vertical list ---- */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "1fr",
          maxWidth: 760,
          marginInline: "auto",
        }}
      >
        {filtered.length === 0 && !loading && <p>No matching households.</p>}

        {filtered.map((u) => {
          const isFav = favs.has(u.id);
          const label = displayLabel(u);
          const initial = label.charAt(0).toUpperCase();
          const type = u.householdType ?? undefined;

          return (
            <div
              key={u.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 18,
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                position: "relative",
                background: "#fff",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {/* Avatar circle */}
              <div
                aria-hidden
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  background: "#eef2ff",
                  color: "#3730a3",
                  flex: "0 0 40px",
                  marginTop: 2,
                }}
              >
                {initial}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row: Name + optional neighborhood chip */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2 }}>
                    {label}
                  </h3>
                  {u.neighborhood && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 12,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#f3f4f6",
                        color: "#4b5563",
                      }}
                    >
                      {u.neighborhood}
                    </span>
                  )}
                </div>

                {/* Adults line (if provided) */}
                {Array.isArray(u.adultNames) && u.adultNames.length > 0 && (
                  <div style={{ marginTop: 8, color: "#374151" }}>
                    <span style={{ color: "#6b7280" }}>Adults: </span>
                    <span style={{ fontWeight: 600 }}>
                      {u.adultNames.join(" & ")}
                    </span>
                  </div>
                )}

                {/* Children chips */}
                {Array.isArray(u.kids) && u.kids.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 14, color: "#4b5563", marginBottom: 6 }}>Children:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {u.kids.map((k, i) => {
                        const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                        const icon = sexIcon(k.sex);
                        const { bg, fg } = chipColors(k.sex);
                        return (
                          <span
                            key={i}
                            aria-label={`Child${age != null ? ` age ${age}` : ""}${k.sex ? ` ${k.sex}` : ""}`}
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
                            {age != null ? `${age} yr` : "?"} {icon}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Household type pill */}
                {type && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#3730a3",
                      marginTop: 12,
                    }}
                  >
                    {type}
                  </span>
                )}
              </div>

              {/* Star */}
              <button
                aria-label={isFav ? "Remove favorite" : "Add favorite"}
                aria-pressed={isFav}
                onClick={() => toggle(u.id)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                  lineHeight: 1,
                  transformOrigin: "50% 50%",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 22,
                  transition: "transform 0.15s ease",
                  outline: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                onFocus={(e) => (e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,.45)")}
                onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
                title={isFav ? "Unstar" : "Star"}
              >
                {isFav ? "⭐" : "☆"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
