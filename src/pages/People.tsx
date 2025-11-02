import { useEffect, useState } from "react";
import { fetchUsers } from "../lib/api";

export default function People() {
  const [users, setUsers] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>People</h2>
      <button onClick={load} disabled={loading}>
        {loading ? "Loading…" : "Refresh /users"}
      </button>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {users ? JSON.stringify(users, null, 2) : "— no data yet —"}
      </pre>
    </div>
  );
}
