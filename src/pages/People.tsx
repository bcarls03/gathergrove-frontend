// src/pages/People.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers, type GGUser } from "../lib/api";
import { loadOverrides, loadNeighbors } from "../lib/profile";

// ---- helpers: label + sort fallbacks for inconsistent data ----
const displayLabel = (u: AnyUser) => (u.lastName ?? u.name ?? "Household");
const displaySortKey = (u: AnyUser) => (u.lastName ?? u.name ?? "");

// ---- favorites (persisted to localStorage) ----
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
    localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
  }, [favs]);
  const toggle = (id: string) =>
    setFavs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return { favs, toggle };
}

// ---- local shape we render with (normalized) ----
type AnyUser = GGUser & {
  id: string;
  email?: string | null;
  lastName?: string | null; // normalized (camelCase)
  name?: string | null;     // optional alt label from backend
  householdType?: string | null;
};

// Normalize any incoming record into our AnyUser shape
function normalize(u: any): AnyUser {
  return {
    id: String(u.id ?? u.uid ?? crypto.randomUUID()),
    email: u.email ?? null,
    // prefer explicit last names, otherwise map snake_case or generic name field
    lastName: u.lastName ?? u.last_name ?? null,
    name: u.name ?? null,
    householdType: u.householdType ?? u.household_type ?? null,
    // spread the original in case caller expects other fields from GGUser
    ...u,
  } as AnyUser;
}

export default function People() {
  const [items, setItems] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { favs, toggle } = useFavorites();

  const load = async () => {
    setLoading(true);
    try {
      // Backend users
      const raw = await fetchUsers();
      const base = Array.isArray(raw) ? raw : [];

      // Apply any local overrides keyed by id
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
        })
      ) as AnyUser[];

      // Merge + sort with fallback
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

  // Search + favorites filtering (uses label/email/type)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;

    if (needle) {
      list = list.filter(u => {
        const hay = [
          displayLabel(u),
          u.email ?? "",
          u.householdType ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }
    if (onlyFavs) list = list.filter(u => favs.has(u.id));
    // keep consistent ordering after filters
    return list.slice().sort((a, b) => displaySortKey(a).localeCompare(displaySortKey(b)));
  }, [items, q, onlyFavs, favs]);

  return (
    <div style={{ padding: 16 }}>
      <h2>People</h2>

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
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                position: "relative",
                background: "#fff",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                aria-hidden
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "9999px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  background: "#eef2ff",
                  color: "#3730a3",
                  flex: "0 0 36px",
                  marginTop: 2,
                }}
              >
                {initial}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: "0 0 4px" }}>{label} Household</h3>
                <p style={{ margin: "0 0 6px", color: "#555" }}>{u.email ?? "no email"}</p>

                {type && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 12,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#eef2ff",
                      color: "#3730a3",
                      marginTop: 4,
                    }}
                  >
                    {type}
                  </span>
                )}
              </div>

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
