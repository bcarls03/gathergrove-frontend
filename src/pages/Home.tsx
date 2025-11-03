import { useEffect, useState } from "react";
import { fetchEvents, createEvent } from "../lib/api";

type EventItem = { id: string; title: string; details?: string; startsAt: string; endsAt: string; category?: string };

export default function Home() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: "", details: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setItems(data.items ?? data ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    const now = new Date();
    const starts = new Date(now.getTime() + 60 * 60 * 1000); // +1h
    const ends = new Date(starts.getTime() + 60 * 60 * 1000); // +2h
    await createEvent({
      title: form.title,
      details: form.details || "—",
      startsAt: starts.toISOString(),
      endsAt: ends.toISOString(),
      category: "neighborhood",
    });
    setForm({ title: "", details: "" });
    load();
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Home</h2>
      <button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh /events"}</button>

      <form onSubmit={onCreate} style={{ marginTop: 16, display: "grid", gap: 8, maxWidth: 420 }}>
        <input
          placeholder="Event title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <textarea
          placeholder="Details (optional)"
          value={form.details}
          onChange={(e) => setForm({ ...form, details: e.target.value })}
          style={{ padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <button type="submit" style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #cbd5e1" }}>
          + Create Event (1 hr from now)
        </button>
      </form>

      <div style={{
        marginTop: 16,
        display: "grid",
        gap: 16,
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      }}>
        {items.length === 0 && !loading && <p>No events yet.</p>}
        {items.map(ev => (
          <div key={ev.id}
               style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, boxShadow: "0 2px 6px rgba(0,0,0,0.05)"}}>
            <h3 style={{ margin: "0 0 6px" }}>{ev.title}</h3>
            <p style={{ margin: "0 0 6px", color: "#555" }}>{ev.details}</p>
            <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
              {new Date(ev.startsAt).toLocaleString()} → {new Date(ev.endsAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
