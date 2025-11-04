// src/pages/Home.tsx
import { useEffect, useState } from "react";
import { fetchEvents, createEvent, type GGEvent } from "../lib/api";
import { toDate, fmt, toMs } from "../lib/dates";

export default function Home() {
  const [items, setItems] = useState<GGEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [form, setForm] = useState({ title: "", details: "" });
  const [filter, setFilter] = useState<"all" | "now" | "upcoming" | "past">("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents(); // returns GGEvent[]
      data.sort((a, b) => toMs(a.startAt) - toMs(b.startAt)); // soonest first
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || submitting) return;
    setSubmitting(true);
    setFlash(null);
    try {
      const now = new Date();
      const start = new Date(now.getTime() + 60 * 60 * 1000); // +1h
      const end = new Date(start.getTime() + 60 * 60 * 1000); // +2h

      await createEvent({
        type: "future",
        title: form.title,
        details: form.details || "—",
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        category: "neighborhood",
      });

      setForm({ title: "", details: "" });
      setFlash({ type: "ok", msg: "Event created ✅" });
      load();
    } catch (err: any) {
      setFlash({ type: "err", msg: err?.message ?? "Failed to create event" });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFlash(null), 3000);
    }
  };

  // ----- filter helpers -----
  const isNow = (startAt?: string | null, endAt?: string | null) => {
    const nowMs = Date.now();
    const s = toMs(startAt);
    const e = toMs(endAt);
    return s <= nowMs && nowMs <= e;
  };
  const isUpcoming = (startAt?: string | null) => toMs(startAt) > Date.now();
  const isPast = (endAt?: string | null, startAt?: string | null) => {
    const e = toMs(endAt);
    const s = toMs(startAt);
    const boundary = Number.isFinite(e) ? e : s; // if no end, use start
    return boundary < Date.now();
  };

  const visible = items.filter((ev) => {
    if (filter === "all") return true;
    if (filter === "now") return isNow(ev.startAt, ev.endAt);
    if (filter === "upcoming") return isUpcoming(ev.startAt);
    return isPast(ev.endAt, ev.startAt); // "past"
  });

  return (
    <div style={{ padding: 16 }}>
      <h2>Home</h2>

      {flash && (
        <div
          style={{
            margin: "8px 0",
            padding: "8px 12px",
            borderRadius: 8,
            border: `1px solid ${flash.type === "ok" ? "#22c55e" : "#ef4444"}`,
            color: flash.type === "ok" ? "#166534" : "#991b1b",
            background: flash.type === "ok" ? "#dcfce7" : "#fee2e2",
            display: "inline-block",
          }}
        >
          {flash.msg}
        </div>
      )}

      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={load}
          disabled={loading}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        >
          {loading ? "Loading…" : "Refresh /events"}
        </button>

        {/* filter buttons */}
        <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
          {(["all", "now", "upcoming", "past"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: filter === k ? "#eef2ff" : "#fff",
                color: filter === k ? "#4338ca" : "#111827",
              }}
            >
              {k.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={onCreate}
        style={{ marginTop: 16, display: "grid", gap: 8, maxWidth: 420 }}
      >
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
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            opacity: submitting ? 0.7 : 1,
            cursor: submitting ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Creating…" : "+ Create Event (1 hr from now)"}
        </button>
      </form>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        }}
      >
        {visible.length === 0 && !loading && <p>No events for this view.</p>}

        {visible.map((ev) => {
          const start = toDate(ev.startAt);
          const end = toDate(ev.endAt);
          return (
            <div
              key={ev.id}
              style={{
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: 16,
                boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                background: "#fff",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 6px 14px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = "none";
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  "0 4px 10px rgba(0,0,0,0.08)";
              }}
            >
              <h3 style={{ margin: "0 0 6px" }}>{ev.title}</h3>
              <p style={{ margin: "0 0 6px", color: "#555" }}>{ev.details || "—"}</p>
              <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                {fmt(start)}
                {end ? ` → ${fmt(end)}` : ""}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
