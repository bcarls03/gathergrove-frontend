// src/lib/api.ts
import axios, { AxiosError } from "axios";

// TEMP hard-override so we stop hitting :8000 during local dev
export const API_BASE_URL = "http://localhost:8002" as const;
console.log("API baseURL in api.ts =", API_BASE_URL);

// Always send dev headers locally (use sane fallbacks if .env missing)
const defaultHeaders: Record<string, string> = {
  Authorization: `Bearer ${import.meta.env.VITE_DEV_BEARER || "dev"}`,
  "X-Uid": import.meta.env.VITE_DEV_UID || "demo-uid-123",
  "X-Email": import.meta.env.VITE_DEV_EMAIL || "brian@example.com",
  "X-Admin": (import.meta.env.VITE_DEV_ADMIN || "true") as string,
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: defaultHeaders,
});

// Expose the current UID for local profile overrides (used in Settings)
export const CURRENT_UID = (import.meta.env.VITE_DEV_UID || "demo-uid-123") as string;

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

export type GGProfile = {
  uid: string;
  email: string;
  display_last_name?: string | null;
  visibility: "neighbors" | "private" | "public";
  bio?: string | null;
  favorites: string[];
  neighbors_include: string[];
  neighbors_exclude: string[];
  notifications_enabled: boolean;
  created_at: string; // ISO
  updated_at: string; // ISO
};

export type GGOverrides = {
  neighbors_include: string[];
  neighbors_exclude: string[];
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
    return { ok: true, endpoint: "/openapi.json", status: r.status, baseURL: API_BASE_URL };
  } catch {
    try {
      const r = await api.get("/");
      return { ok: true, endpoint: "/", status: r.status, baseURL: API_BASE_URL };
    } catch (err) {
      const ae = err as AxiosError;
      return {
        ok: false,
        endpoint: "/openapi.json|/",
        status: ae.response?.status ?? 0,
        baseURL: API_BASE_URL,
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

/* -------------------------------- Profile -------------------------------- */

export async function getProfile(): Promise<GGProfile> {
  const { data } = await api.get("/profile");
  return data as GGProfile;
}

export async function patchProfile(payload: Partial<Pick<
  GGProfile,
  "display_last_name" | "visibility" | "bio" | "favorites" | "neighbors_include" | "neighbors_exclude" | "notifications_enabled"
>>): Promise<GGProfile> {
  const { data } = await api.patch("/profile", payload);
  return data as GGProfile;
}

/* ------------------------------ Favorites -------------------------------- */

export async function addFavorite(householdId: string): Promise<string[]> {
  const { data } = await api.put(`/profile/favorites/${encodeURIComponent(householdId)}`);
  return data as string[];
}

export async function removeFavorite(householdId: string): Promise<string[]> {
  const { data } = await api.delete(`/profile/favorites/${encodeURIComponent(householdId)}`);
  return data as string[];
}

export async function listFavorites(): Promise<string[]> {
  const { data } = await api.get("/profile/favorites");
  return data as string[];
}

/* ------------------------------ Overrides -------------------------------- */

export async function getOverrides(): Promise<GGOverrides> {
  const { data } = await api.get("/profile/overrides");
  return data as GGOverrides;
}

export async function putOverrides(body: GGOverrides): Promise<GGOverrides> {
  const { data } = await api.put("/profile/overrides", body);
  return data as GGOverrides;
}
