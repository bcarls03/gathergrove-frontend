// src/lib/api.ts
import axios, { AxiosError } from "axios";

/* ------------------------------- Base client ------------------------------ */

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
export const CURRENT_UID = (import.meta.env.VITE_DEV_UID ||
  "demo-uid-123") as string;

/* -------------------------------- Types ---------------------------------- */

/** Event categories must match backend Literal exactly:
 *  Literal["neighborhood", "playdate", "help", "pet", "other"]
 */
export const EVENT_CATEGORY_VALUES = [
  "neighborhood",
  "playdate",
  "help",
  "pet",
  "other",
] as const;

export type EventCategory = (typeof EVENT_CATEGORY_VALUES)[number];

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "neighborhood", label: "Neighborhood" },
  { value: "playdate", label: "Playdate" },
  { value: "help", label: "Help needed" },
  { value: "pet", label: "Pets" },
  { value: "other", label: "Other" },
];

/**
 * Normalized event shape used throughout the frontend.
 * Maps backend "now" → "happening" for UI, and includes RSVP info.
 */
export type GGEvent = {
  id: string;

  // Content
  title: string;
  details: string;

  // Type (UI uses "happening" for backend "now")
  type: "happening" | "future" | null;

  // Categorical label aligned with backend Category Literal
  category: EventCategory | null;

  // Timestamps (ISO 8601)
  startAt: string | null;
  endAt: string | null;
  expiresAt: string | null;

  // Capacity & visibility
  capacity: number | null;
  neighborhoods: string[];

  // RSVP info from backend
  attendeeCount: number; // going
  attendeeCounts: {
    going: number;
    cant: number;
  };
  isAttending: boolean;

  // Optional host UID (used by Home "Your Activity")
  hostUid?: string | null;
};

export type GGUser = {
  id: string;
  email?: string;
  last_name?: string;
};

/**
 * Summary of a household/person card in the People tab.
 * Matches what /people and /households return after normalization.
 */
export type GGHousehold = {
  id: string;
  lastName?: string | null;
  type?: string | null;
  neighborhood?: string | null;
  childAges?: number[];
  adultNames?: string[]; // 👈 supports 2-adult households
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
    return {
      ok: true,
      endpoint: "/openapi.json",
      status: r.status,
      baseURL: API_BASE_URL,
    };
  } catch {
    try {
      const r = await api.get("/");
      return {
        ok: true,
        endpoint: "/",
        status: r.status,
        baseURL: API_BASE_URL,
      };
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

function toIsoOrNull(v: any): string | null {
  const s =
    v?.startAt ??
    v?.start_at ??
    v?.start_time ??
    v?.start ??
    v?.startsAt ??
    v?.startTime ??
    null;
  return s ? String(s) : null;
}

function toIsoEndOrNull(v: any): string | null {
  const e =
    v?.endAt ??
    v?.end_at ??
    v?.end_time ??
    v?.end ??
    v?.endsAt ??
    v?.endTime ??
    null;
  return e ? String(e) : null;
}

function toIsoExpiresOrNull(v: any): string | null {
  const e =
    v?.expiresAt ?? v?.expireAt ?? v?.expires_at ?? v?.expire_at ?? null;
  return e ? String(e) : null;
}

function normalizeType(t: any): GGEvent["type"] {
  const s = String(t ?? "").toLowerCase();
  if (s === "future") return "future";
  if (s === "now" || s === "happening" || s === "now_post") return "happening";
  return null;
}

function toStringArray(x: any): string[] {
  if (!x) return [];
  if (Array.isArray(x)) return x.map(String);
  return [String(x)];
}

function normalizeCategory(cat: any): EventCategory | null {
  if (!cat) return null;
  const s = String(cat).toLowerCase();
  return EVENT_CATEGORY_VALUES.includes(s as EventCategory)
    ? (s as EventCategory)
    : null;
}

function normalizeEvent(e: any): GGEvent {
  // Try many common shapes for creator and recipients (legacy support)
  const creatorId =
    e.creatorId ??
    e.creator_id ??
    e.userId ??
    e.user_id ??
    e.uid ??
    CURRENT_UID;

  const recipientIds =
    e.recipientIds ??
    e.recipient_ids ??
    e.recipients ??
    e.targets ??
    e.households ??
    [];

  const startAt = toIsoOrNull(e);
  const endAt = toIsoEndOrNull(e);
  const expiresAt = toIsoExpiresOrNull(e);

  const capacity =
    typeof e.capacity === "number"
      ? e.capacity
      : e.capacity
      ? Number(e.capacity)
      : null;

  const neighborhoods = Array.isArray(e.neighborhoods)
    ? e.neighborhoods.map(String)
    : [];

  // RSVP stats: backend now returns attendeeCount, isAttending, attendeeCounts
  const rawCounts = e.attendeeCounts ?? {};
  const goingFromCounts =
    typeof rawCounts.going === "number"
      ? rawCounts.going
      : Number(rawCounts.going ?? 0);
  const cantFromCounts =
    typeof rawCounts.cant === "number"
      ? rawCounts.cant
      : Number(rawCounts.cant ?? 0);

  const attendeeCount =
    typeof e.attendeeCount === "number" ? e.attendeeCount : goingFromCounts || 0;

  const attendeeCounts = {
    going: goingFromCounts || attendeeCount || 0,
    cant: cantFromCounts || 0,
  };

  const isAttending = Boolean(e.isAttending);

  return {
    id: e.id ?? e.event_id ?? crypto.randomUUID(),
    title: e.title ?? e.name ?? "(untitled)",
    details: e.details ?? e.description ?? "",
    type: normalizeType(e.type),
    category: normalizeCategory(e.category),
    startAt,
    endAt,
    expiresAt,
    capacity,
    neighborhoods,
    attendeeCount,
    attendeeCounts,
    isAttending,
    hostUid: e.hostUid ?? e.host_uid ?? undefined,
  };
}

/* --------------------------------- Events -------------------------------- */

/**
 * Fetch events from backend.
 * Supports both: { items: GGEvent[] } and plain GGEvent[].
 */
export async function fetchEvents(
  params?: Record<string, string | number | boolean>
): Promise<GGEvent[]> {
  const { data } = await api.get("/events", { params });
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
  return items.map(normalizeEvent);
}

/**
 * Input used by the UI when composing an event.
 * Note: creatorId and recipientIds are *not* sent to the backend anymore;
 * backend infers hostUid from auth and we’ll later use neighborhoods
 * explicitly for targeting.
 */
export type CreateEventInput = {
  // UI-level type: "happening" maps to backend "now"
  type: "happening" | "future";

  title: string;
  details?: string;

  // Time (ISO strings)
  startAt?: string; // required when type === "future"
  endAt?: string;

  // Category aligned with backend Category Literal
  category?: EventCategory;

  // UI-only for now (not sent to backend, but kept to avoid breaking callers)
  creatorId: string;
  recipientIds: string[]; // include creatorId if you want them to see it too
};

// Helper to strip empty strings so we don't send "" to Pydantic datetime fields
function normalizeOptionalIso(v?: string): string | undefined {
  if (v == null) return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

export async function createEvent(body: CreateEventInput): Promise<GGEvent> {
  // Map UI "happening" → backend "now"
  const {
    creatorId: _creatorId,
    recipientIds: _recipientIds,
    type,
    title,
    details,
    startAt,
    endAt,
    category,
  } = body;

  const payload: any = {
    type: type === "happening" ? "now" : type,
    title: title.trim() || "Event",
    details: (details ?? "").trim(),
    // neighborhoods will be wired up later; for now the backend will treat
    // empty list as "visible to the neighborhood by default" or global.
  };

  const startIso = normalizeOptionalIso(startAt);
  const endIso = normalizeOptionalIso(endAt);

  if (startIso) payload.startAt = startIso;
  if (endIso) payload.endAt = endIso;

  if (category && EVENT_CATEGORY_VALUES.includes(category)) {
    payload.category = category;
  }

  try {
    const { data } = await api.post("/events", payload);
    return normalizeEvent(data);
  } catch (err) {
    const ae = err as AxiosError<any>;
    if (ae.response?.status === 422) {
      console.error("Validation error from /events:", ae.response.data);
    }
    throw err;
  }
}

/* --------------------------------- Users --------------------------------- */

export async function fetchUsers(): Promise<GGUser[]> {
  const { data } = await api.get("/users");
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
  return items as GGUser[];
}

/* -------------------------------- Profile -------------------------------- */

export async function getProfile(): Promise<GGProfile> {
  const { data } = await api.get("/profile");
  return data as GGProfile;
}

export async function patchProfile(
  payload: Partial<
    Pick<
      GGProfile,
      | "display_last_name"
      | "visibility"
      | "bio"
      | "favorites"
      | "neighbors_include"
      | "neighbors_exclude"
      | "notifications_enabled"
    >
  >
): Promise<GGProfile> {
  const { data } = await api.patch("/profile", payload);
  return data as GGProfile;
}

/* ------------------------------ Favorites -------------------------------- */

export async function addFavorite(householdId: string): Promise<string[]> {
  const { data } = await api.put(
    `/profile/favorites/${encodeURIComponent(householdId)}`
  );
  return data as string[];
}

export async function removeFavorite(householdId: string): Promise<string[]> {
  const { data } = await api.delete(
    `/profile/favorites/${encodeURIComponent(householdId)}`
  );
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
