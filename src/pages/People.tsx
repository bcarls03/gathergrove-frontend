// src/pages/People.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers, type GGUser } from "../lib/api";
import { loadOverrides, loadNeighbors } from "../lib/profile";

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
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return { favs, toggle };
}

type AnyUser = GGUser & { householdType?: string };

export default function People() {
  const [items, setItems] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { favs, toggle } = useFavorites();

  const load = async () => {
    setLoading(true);
    try {
      // backend users
      const data = await fetchUsers();
      const base = Array.isArray(data) ? data : [];

      // merge profile overrides
      const overrides = loadOverrides();
      const mergedBackend = base.map((u) =>
        overrides[u.id] ? ({ ...u, ...overrides[u.id] } as AnyUser) : (u as AnyUser)
      );

      // add local demo neighbors
      const locals = loadNeighbors().map((n) => ({
        id: n.id,
        last_name: n.last_name,
        email: n.email,
        householdType: n.householdType,
      })) as AnyUser[];

      const merged = [...mergedBackend, ...locals];

      // sort by last name
      merged.sort((a, b) => (a.last_name || "").localeCompare(b.last_name || ""));
      setItems(merged);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (needle) {
      list = list.filter((u) =>
        [u.last_name, u.email, u.householdType]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }
    if (onlyFavs) list = list.filter((u) => favs.has(u.id));
    return list;
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

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        }}
      >
        {filtered.length === 0 && !loading && <p>No matching households.</p>}

        {filtered.map((u) => {
          const isFav = favs.has(u.id);
          const name = u.last_name ? `${u.last_name} Household` : "Household";
          const type = u.householdType;
          const initial = (u.last_name?.[0] || "H").toUpperCase();

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
                <h3 style={{ margin: "0 0 4px" }}>{name}</h3>
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
                onClick={() => toggle(u.id)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  border: "none",
                  background: "transparent",
                  fontSize: 20,
                  cursor: "pointer",
                }}
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
