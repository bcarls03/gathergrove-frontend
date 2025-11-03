import { useEffect, useState } from "react";
import { fetchUsers } from "../lib/api";

type User = { id: string; uid: string; name: string; email?: string; isAdmin?: boolean };

export default function People() {
  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setItems(Array.isArray(data.items) ? data.items : data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>People</h2>
      <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh /users"}</button>

      <div style={{
        marginTop: 16,
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      }}>
        {items.length === 0 && !loading && <p>No households yet.</p>}
        {items.map(u => (
          <div key={u.id}
               style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.05)"}}>
            <h3 style={{ margin: "0 0 6px" }}>{u.name} Household</h3>
            <p style={{ margin: "0 0 6px", color: "#555" }}>{u.email ?? "no email"}</p>
            {u.isAdmin ? <span style={{ fontSize: 12, color: "#155e75" }}>Admin</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
