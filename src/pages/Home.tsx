import { useEffect, useState } from "react";
import { fetchEvents } from "../lib/api";

export default function Home() {
  const [events, setEvents] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEvents(); // you can pass params if needed
      setEvents(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2>Home</h2>
      <button onClick={load} disabled={loading}>
        {loading ? "Loading…" : "Refresh /events"}
      </button>
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {events ? JSON.stringify(events, null, 2) : "— no data yet —"}
      </pre>
    </div>
  );
}
