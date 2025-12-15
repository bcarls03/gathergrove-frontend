// src/lib/api.ts
import axios, { AxiosError } from "axios";

/* ------------------------------- Dev UID helper ------------------------------ */
/**
 * In dev, give each browser its own stable UID using localStorage.
 * - Chrome and Safari will behave like two separate users.
 */
function getDevUid(): string {
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_DEV_UID as string | undefined) || "demo-uid-123";
  }

  const KEY = "gg_dev_uid_v1";
  let uid = window.localStorage.getItem(KEY);

  if (!uid) {
    if ("crypto" in window && "randomUUID" in window.crypto) {
      uid = window.crypto.randomUUID();
    } else {
      uid = "dev-" + Math.random().toString(16).slice(2);
    }
    window.localStorage.setItem(KEY, uid);
  }

  return uid;
}

export const CURRENT_UID = getDevUid();

/* -------------------------------- Base URL --------------------------------- */

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000";

/* --------------------------------- Axios ----------------------------------- */

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

/**
 * Headers your FastAPI dev auth expects.
 * IMPORTANT: attach these to *every* request.
 */
function devHeaders(extra?: Record<string, string>) {
  return {
    Authorization: "Bearer dev",
    "X-Uid": CURRENT_UID,
    "X-Email": `${CURRENT_UID}@dev.local`,
    "X-Admin": "true",
    ...(extra || {}),
  };
}

api.interceptors.request.use(
  (config) => {
    const existing = (config.headers ?? {}) as Record<string, any>;
    config.headers = { ...devHeaders(), ...existing };
    return config;
  },
  (error) => Promise.reject(error)
);

function unwrapAxiosError(err: unknown) {
  const ax = err as AxiosError<any>;
  const msg =
    ax?.response?.data?.detail?.[0]?.msg ||
    ax?.response?.data?.detail ||
    ax?.response?.data?.message ||
    ax?.message ||
    "Request failed";
  return new Error(msg);
}

/* --------------------------------- Types ----------------------------------- */

export type GGUser = {
  id?: string;
  uid: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Kid = {
  birthMonth?: number | null;
  birthYear?: number | null;
  sex?: string | null;
  awayAtCollege?: boolean | null;
  canBabysit?: boolean | null;
};

export type GGHousehold = {
  id?: string;
  uid?: string;
  email?: string;
  lastName?: string;
  adultNames?: string[];
  neighborhood?: string;
  householdType?: string;
  kids?: Kid[];
  createdAt?: string;
  updatedAt?: string;
};

/** MUST match ComposePost CATEGORY_OPTIONS */
export type EventCategory = "neighborhood" | "playdate" | "help" | "pet" | "other";

export type RSVPStatus = "going" | "maybe" | "cant";

/**
 * Events coming back from backend may be "now/future"
 * but UI historically used "happening/event". Tolerate both.
 */
export type GGEvent = {
  id: string;
  type?: "now" | "future" | "happening" | "event";
  kind?: "happening" | "event";
  title?: string;
  details?: string;
  category?: EventCategory;

  startAt?: string | null;
  endAt?: string | null;
  expiresAt?: string | null;

  when?: string;

  neighborhoods?: string[];

  createdBy?: { id: string; label: string };

  attendeeCount?: number;
  attendeeCounts?: { going?: number; cant?: number };
  isAttending?: boolean;

  goingCount?: number;
  maybeCount?: number;
  cantCount?: number;
};

export type EventRsvpHousehold = {
  uid: string;

  household_id?: string;
  householdId?: string;

  last_name?: string | null;
  lastName?: string | null;
  householdLastName?: string | null;

  neighborhood?: string | null;

  household_type?: string | null;
  householdType?: string | null;

  child_ages?: number[];
  childAges?: number[];

  child_sexes?: (string | null)[];
  childSexes?: (string | null)[];
};

export type EventRsvpBuckets = {
  going: EventRsvpHousehold[];
  maybe: EventRsvpHousehold[];
  cant: EventRsvpHousehold[];
};

/* ------------------------------ Users endpoints ----------------------------- */

export async function upsertUser(payload?: Partial<GGUser>): Promise<GGUser> {
  try {
    const isSafari =
      typeof navigator !== "undefined" &&
      /safari/i.test(navigator.userAgent) &&
      !/chrome|crios|android/i.test(navigator.userAgent);

    const body: Partial<GGUser> = {
      uid: CURRENT_UID,
      email: `${CURRENT_UID}@dev.local`,
      name: isSafari ? "Safari User" : "Chrome User",
      isAdmin: true,
      ...(payload || {}),
    };

    if (!body.name || String(body.name).trim().length === 0) {
      body.name = isSafari ? "Safari User" : "Chrome User";
    }

    const res = await api.post("/users", body, { headers: { "Content-Type": "application/json" } });
    return res.data as GGUser;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/* ---------------------------- Households endpoints --------------------------- */

export async function fetchHouseholds(params?: {
  neighborhood?: string;
  household_type?: string;
}): Promise<GGHousehold[]> {
  try {
    const res = await api.get("/households", { params: params || {} });
    const data = res.data;
    return (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []) as GGHousehold[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

export async function upsertMyHousehold(payload: Partial<GGHousehold>): Promise<GGHousehold> {
  try {
    const res = await api.post("/households", payload, { headers: { "Content-Type": "application/json" } });
    return res.data as GGHousehold;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/* ------------------------------- Events endpoints ---------------------------- */

export async function fetchEvents(): Promise<GGEvent[]> {
  try {
    const res = await api.get("/events");
    const data = res.data;
    return (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []) as GGEvent[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * KEEP BACKWARD COMPATIBILITY:
 * return AxiosResponse like the original version (so other pages don't crash).
 */
export async function createEvent(input: {
  type: "now" | "future";
  title: string;
  details: string;
  category?: string;
  startAt?: string | null;
  endAt?: string | null;
  expiresAt?: string | null;
  neighborhoods?: string[];
}) {
  return api.post(
    "/events",
    {
      type: input.type,
      title: input.title,
      details: input.details,
      category: input.category ?? "neighborhood",
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      expiresAt: input.expiresAt ?? null,
      neighborhoods: input.neighborhoods ?? [],
    },
    { headers: { "Content-Type": "application/json" } }
  );
}

/* ------------------------------- RSVP endpoints ------------------------------ */

function toBackendStatus(s: RSVPStatus): "going" | "maybe" | "declined" {
  return s === "cant" ? "declined" : s;
}

/** Legacy names some pages may import */
export async function setEventRsvp(eventId: string, status: RSVPStatus): Promise<any> {
  try {
    const res = await api.post(`/events/${eventId}/rsvp`, { status: toBackendStatus(status) });
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}
export async function sendEventRsvp(eventId: string, status: RSVPStatus): Promise<any> {
  return setEventRsvp(eventId, status);
}

/** Newer names used by PreviewEvent */
export async function rsvpToEvent(eventId: string, status: RSVPStatus): Promise<any> {
  return setEventRsvp(eventId, status);
}

export async function leaveEventRsvp(eventId: string): Promise<any> {
  try {
    const res = await api.delete(`/events/${eventId}/rsvp`);
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

export async function fetchMyRsvp(
  eventId: string
): Promise<{ userStatus: "going" | "maybe" | "declined" | null; counts?: any }> {
  try {
    const res = await api.get(`/events/${eventId}/rsvp`);
    return res.data as any;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

export async function fetchEventRsvps(eventId: string): Promise<EventRsvpBuckets> {
  try {
    const res = await api.get(`/events/${eventId}/rsvps`);
    const d = res.data || {};
    return {
      going: Array.isArray(d.going) ? d.going : [],
      maybe: Array.isArray(d.maybe) ? d.maybe : [],
      cant: Array.isArray(d.cant) ? d.cant : [],
    };
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/** Another legacy helper some pages may import */
export async function getEventRsvps(eventId: string): Promise<any> {
  // Prefer buckets, fallback to summary
  try {
    return await fetchEventRsvps(eventId);
  } catch {
    return await fetchMyRsvp(eventId);
  }
}
