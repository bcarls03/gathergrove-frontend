// src/lib/api.ts
import axios, { AxiosError } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// Always send dev headers locally (use sane fallbacks if .env missing)
const defaultHeaders: Record<string, string> = {
  Authorization: `Bearer ${import.meta.env.VITE_DEV_BEARER || "dev"}`,
  "X-Uid": import.meta.env.VITE_DEV_UID || "demo-uid-123",
  "X-Email": import.meta.env.VITE_DEV_EMAIL || "brian@example.com",
  "X-Admin": (import.meta.env.VITE_DEV_ADMIN || "true") as string,
};

export const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: defaultHeaders,
});

/* -------------------------------- Types ---------------------------------- */

export type GGEvent = {
  id: string;
  title: string;
  details: string;
  type: "now" | "future" | string | null;
  category: string | null;
  startAt: string | null; // ISO 8601 with timezone
  endAt: string | null;   // ISO 8601 with timezone or null
};

export type GGUser = {
  id: string;
  email?: string;
  last_name?: string;
};

/* ---------------------------- Health / Utilities -------------------------- */

export async function pingBackend(): Promise<{
  ok: boolean;
  endpoint: string;
  status: number;
  baseURL: string;
  error?: string;
}> {
  try {
    const r = await api.get("/openapi.json");
    return { ok: true, endpoint: "/openapi.json", status: r.status, baseURL };
  } catch {
    try {
      const r = await api.get("/");
      return { ok: true, endpoint: "/", status: r.status, baseURL };
    } catch (err) {
      const ae = err as AxiosError;
      return {
        ok: false,
        endpoint: "/openapi.json|/",
        status: ae.response?.status ?? 0,
        baseURL,
        error: ae.message,
      };
    }
  }
}

/* ------------------------------- Normalizers ------------------------------ */

function normalizeEvent(e: any): GGEvent {
  return {
    id: e.id ?? e.event_id ?? crypto.randomUUID(),
    title: e.title ?? e.name ?? "(untitled)",
    details: e.details ?? e.description ?? "",
    type: e.type ?? null,
    category: e.category ?? null,
    startAt:
      e.startAt ??
      e.start_at ??
      e.start_time ??
      e.start ??
      e.startsAt ??
      e.startTime ??
      null,
    endAt:
      e.endAt ??
      e.end_at ??
      e.end_time ??
      e.end ??
      e.endsAt ??
      e.endTime ??
      null,
  };
}

/* --------------------------------- Events -------------------------------- */

export async function fetchEvents(
  params?: Record<string, string | number | boolean>
): Promise<GGEvent[]> {
  const { data } = await api.get("/events", { params });
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items.map(normalizeEvent);
}

export async function createEvent(body: {
  type: "future" | "now";
  title: string;
  details?: string;
  startAt?: string; // required when type === "future"
  endAt?: string;
  category?: string;
}): Promise<GGEvent> {
  const { data } = await api.post("/events", body);
  return normalizeEvent(data);
}

/* --------------------------------- Users --------------------------------- */

export async function fetchUsers(): Promise<GGUser[]> {
  const { data } = await api.get("/users");
  const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
  return items as GGUser[];
}
