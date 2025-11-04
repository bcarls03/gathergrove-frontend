// src/pages/People.tsx
import { useEffect, useMemo, useState } from "react";
import { fetchUsers } from "../lib/api";

type User = { id: string; uid: string; name: string; email?: string; isAdmin?: boolean; householdType?: string };

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

export default function People() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { favs, toggle } = useFavorites();

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setItems(Array.isArray(data?.items) ? data.items : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = items;
    if (needle) {
      list = list.filter(u =>
        [u.name, u.email, u.householdType].filter(Boolean).join(" ").toLowerCase().includes(needle)
      );
    }
    if (onlyFavs) list = list.filter(u => favs.has(u.id));
    return list;
  }, [items, q, onlyFavs, favs]);

  return (
    <div style={{ padding: 16 }}>
      <h2>People</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh /users"}</button>
        <input
          placeholder="Search households…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 220 }}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} />
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
          return (
            <div
              key={u.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                position: "relative",
              }}
            >
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

              <h3 style={{ margin: "0 0 4px" }}>{u.name} Household</h3>
              <p style={{ margin: "0 0 6px", color: "#555" }}>{u.email ?? "no email"}</p>
              {u.householdType && (
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
                  {u.householdType}
                </span>
              )}
              {u.isAdmin ? (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: 12,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#e0f2fe",
                    color: "#075985",
                    marginLeft: 8,
                  }}
                >
                  Admin
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
