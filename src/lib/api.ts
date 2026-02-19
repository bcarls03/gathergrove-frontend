// src/lib/api.ts
import axios, { AxiosError } from "axios";
import { getIdToken } from "./firebase";

/* ------------------------------- Dev UID helper ------------------------------ */
/**
 * In dev, give each browser its own stable UID using localStorage.
 * - Chrome and Safari will behave like two separate users.
 */
function getDevUid(): string {
  // SSR / non-window fallback
  if (typeof window === "undefined") {
    return (import.meta.env.VITE_DEV_UID as string | undefined) || "dev-ssr";
  }

  const KEY = "gg:uid"; // ✅ canonical per-browser identity key
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing && existing.trim()) return existing.trim();

    const uid =
      "crypto" in window && "randomUUID" in window.crypto
        ? `dev-${window.crypto.randomUUID()}`
        : `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;

    window.localStorage.setItem(KEY, uid);
    return uid;
  } catch {
    // If storage is blocked, fall back to a non-persisted uid
    return `dev-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
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
 * Headers for API requests.
 * 
 * V15 OAuth Flow:
 * - In dev mode: ALWAYS send X-Uid (backend is in ALLOW_DEV_AUTH=1 mode)
 * - In production: Use Authorization: Bearer <token>
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // DEV MODE: Always use dev headers (backend is running with ALLOW_DEV_AUTH=1)
  // The backend will use X-Uid/X-Email and ignore any Bearer token
  const isDev = !import.meta.env.PROD;
  
  if (isDev) {
    const headers = {
      "X-Uid": CURRENT_UID,
      "X-Email": `${CURRENT_UID}@example.com`,
      "X-Admin": "true",
    };
    
    return headers;
  }
  
  // PRODUCTION MODE: Use Firebase OAuth token (optional for public endpoints)
  try {
    const token = await getIdToken();
    if (token) {
      return {
        "Authorization": `Bearer ${token}`,
      };
    }
  } catch (error) {
    console.debug('No Firebase token available (user not signed in):', error);
  }
  
  // Return empty headers for unauthenticated requests (public endpoints like /households work without auth)
  return {};
}

api.interceptors.request.use(
  async (config) => {
    // Get auth headers (OAuth token or dev headers)
    const authHeaders = await getAuthHeaders();
    
    config.headers = {
      ...authHeaders,
      ...(config.headers as any),
    } as any;
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

// ============================================================================
// USER PROFILE - Individual-first architecture
// ============================================================================

export type UserVisibility = "private" | "neighbors" | "public";

export type UserProfile = {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  location_precision?: "street" | "zipcode" | null;
  discovery_opt_in?: boolean;
  visibility?: UserVisibility;
  household_id?: string | null;
  interests?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

export type UserProfileUpdate = {
  email?: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  location_precision?: "street" | "zipcode" | null;
  discovery_opt_in?: boolean;
  visibility?: UserVisibility;
  interests?: string[] | null;
};

export type UserSignupRequest = {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_photo_url?: string | null;
  bio?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  visibility?: UserVisibility;
  interests?: string[] | null;
};

// ============================================================================
// HOUSEHOLD - Optional grouping for multiple users
// ============================================================================

export type HouseholdType = "family_with_kids" | "empty_nesters" | "singles_couples";

export type Kid = {
  age_range: "0-2" | "3-5" | "6-8" | "9-12" | "13-17" | "18+";
  age_years?: number; // Exact age in years (preferred over age_range for new data)
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  interests?: string[] | null;
  available_for_babysitting?: boolean;
};

export type Household = {
  id: string;
  name: string;
  member_uids?: string[];
  household_type?: HouseholdType | null;
  kids?: Kid[] | null;
  created_at?: string;
  updated_at?: string;
};

export type HouseholdCreate = {
  name: string;
  household_type?: HouseholdType | null;
  kids?: Kid[] | null;
};

export type HouseholdUpdate = {
  name?: string;
  household_type?: HouseholdType | null;
  kids?: Kid[] | null;
};

// ============================================================================
// LEGACY TYPES (for backward compatibility during migration)
// ============================================================================

export type GGUser = {
  id?: string;
  uid: string;
  email?: string;
  name?: string;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type GGHousehold = {
  id?: string;
  uid?: string;
  name?: string;
  email?: string;
  lastName?: string;
  adultNames?: string[];
  neighborhood?: string;
  householdType?: string;
  kids?: {
    birthMonth?: number | null;
    birthYear?: number | null;
    sex?: string | null;
    awayAtCollege?: boolean | null;
    canBabysit?: boolean | null;
  }[];
  location_precision?: "street" | "zipcode" | null;
  createdAt?: string;
  updatedAt?: string;
};

// ============================================================================
// EVENTS
// ============================================================================

/** Event categories matching backend */
export type EventCategory = 
  | "neighborhood" 
  | "playdate" 
  | "babysitting"
  | "pet" 
  | "celebrations" 
  | "other";

export type EventVisibility = "private" | "link_only" | "public";

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

  // NEW: Individual host (not household)
  host_user_id?: string | null;
  hostUid?: string | null; // Legacy field for backward compatibility
  
  // NEW: Visibility and shareable link
  visibility?: EventVisibility;
  shareable_link?: string | null;

  createdBy?: { id: string; label: string };

  attendeeCount?: number;
  attendeeCounts?: { going?: number; cant?: number };
  isAttending?: boolean;

  goingCount?: number;
  maybeCount?: number;
  cantCount?: number;

  status?: string | null; // e.g. "active" | "canceled"
  
  // Calendar integration fields
  location?: string;
  hostLabel?: string;

  // Event Memory - photos from past events (attendees only)
  photos?: Array<{
    id: string;
    url: string;
    uploadedByUserId: string;
    uploadedByName?: string;
    createdAt: string;
  }>;
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

// ============================================================================
// INVITATIONS - Off-platform event invitations
// ============================================================================

export type InviteeType = "household" | "phone_number";

export type InvitationCreate = {
  household_ids?: string[];
  phone_numbers?: string[];
};

export type InvitationResponse = {
  id: string;
  event_id: string;
  invitee_type: InviteeType;
  household_id?: string | null;
  phone_number?: string | null;
  rsvp_token: string;
  guest_name?: string | null;
  guest_email?: string | null;
  status: RSVPStatus | "invited";
  sms_sent?: boolean;
  sms_sent_at?: string | null;
  sms_message_sid?: string | null;
  created_at: string;
  updated_at: string;
};

export type RSVPSubmit = {
  status: RSVPStatus;
  guest_name?: string;
  guest_email?: string;
};

export type PublicEventView = {
  id: string;
  title: string;
  details?: string;
  category?: EventCategory;
  start_at?: string | null;
  end_at?: string | null;
  host_name: string;
  visibility: EventVisibility;
};

/* ------------------------------ Users endpoints ----------------------------- */

// ============================================================================
// USER PROFILE API - Individual-first architecture
// ============================================================================

/**
 * Sign up a new user (create UserProfile).
 * This is the entry point - creates a user WITHOUT requiring a household.
 */
export async function signupUser(payload: UserSignupRequest): Promise<UserProfile> {
  try {
    // Override the default X-Uid header with the UID from the payload
    const res = await api.post("/users/signup", payload, {
      headers: { 
        "Content-Type": "application/json",
        "X-Uid": payload.uid,
        "X-Email": payload.email,
      },
    });
    return res.data as UserProfile;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get current user's profile.
 */
export async function getMyProfile(): Promise<UserProfile> {
  try {
    const res = await api.get("/users/me");
    return res.data as UserProfile;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get multiple user profiles by UIDs.
 */
export async function getUserProfiles(uids: string[]): Promise<UserProfile[]> {
  try {
    const res = await api.get("/users/profiles", {
      params: { uids: uids.join(",") }
    });
    return res.data as UserProfile[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Update current user's profile.
 */
export async function updateMyProfile(payload: UserProfileUpdate): Promise<UserProfile> {
  try {
    const res = await api.patch("/users/me", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data as UserProfile;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Delete current user's profile.
 */
export async function deleteMyProfile(): Promise<{ message: string }> {
  try {
    const res = await api.delete("/users/me");
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

// ============================================================================
// HOUSEHOLD API - Optional grouping
// ============================================================================

/**
 * Create a new household and link current user to it.
 */
export async function createHousehold(payload: HouseholdCreate): Promise<Household> {
  try {
    const res = await api.post("/users/me/household/create", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data as Household;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get current user's household (if they have one).
 */
export async function getMyHousehold(): Promise<Household | null> {
  try {
    const res = await api.get("/users/me/household");
    return res.data as Household;
  } catch (e) {
    const ax = e as AxiosError;
    if (ax?.response?.status === 404) {
      return null; // User doesn't have a household
    }
    throw unwrapAxiosError(e);
  }
}

/**
 * Update current user's household.
 */
export async function updateMyHousehold(payload: HouseholdUpdate): Promise<Household> {
  try {
    const res = await api.post("/households", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data as Household;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Link current user to an existing household.
 */
export async function linkToHousehold(householdId: string): Promise<UserProfile> {
  try {
    const res = await api.post("/users/me/household/link", 
      { household_id: householdId },
      { headers: { "Content-Type": "application/json" } }
    );
    return res.data as UserProfile;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Unlink current user from their household.
 */
export async function unlinkFromHousehold(): Promise<UserProfile> {
  try {
    const res = await api.delete("/users/me/household");
    return res.data as UserProfile;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

// ============================================================================
// LEGACY USER/HOUSEHOLD FUNCTIONS (for backward compatibility)
// ============================================================================

export async function upsertUser(payload?: Partial<GGUser>): Promise<GGUser> {
  console.warn("upsertUser is deprecated - use signupUser instead");
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

    const res = await api.post("/users", body, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data as GGUser;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

export async function fetchHouseholds(params?: {
  neighborhood?: string;
  household_type?: string;
}): Promise<GGHousehold[]> {
  console.warn("fetchHouseholds is deprecated - use people discovery instead");
  try {
    const res = await api.get("/households", { params: params || {} });
    const data = res.data;
    return (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : []) as GGHousehold[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

export async function upsertMyHousehold(payload: Partial<GGHousehold>): Promise<GGHousehold> {
  console.warn("upsertMyHousehold is deprecated - use createHousehold/updateMyHousehold instead");
  try {
    const res = await api.post("/households", payload, {
      headers: { "Content-Type": "application/json" },
    });
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
 * Create a new event with individual host and visibility.
 * Returns AxiosResponse for backward compatibility.
 */
export async function createEvent(input: {
  type: "now" | "future";
  title: string;
  details: string;
  category?: EventCategory;
  visibility?: EventVisibility;
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
      visibility: input.visibility ?? "public", // Default to public for viral loop
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      expiresAt: input.expiresAt ?? null,
      neighborhoods: input.neighborhoods ?? [],
    },
    { headers: { "Content-Type": "application/json" } }
  );
}

/* ------------------------ Cancel / Delete event endpoints -------------------- */
/**
 * Soft cancel (host-only): PATCH /api/events/{event_id}/cancel
 */
export async function cancelEvent(eventId: string): Promise<GGEvent> {
  try {
    const res = await api.patch(`/events/${eventId}/cancel`);
    return res.data as GGEvent;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Hard delete (host or admin): DELETE /api/events/{event_id}
 */
export async function deleteEvent(eventId: string): Promise<any> {
  try {
    const res = await api.delete(`/events/${eventId}`);
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Convenience: try cancel first, if backend says method/route not supported, fall back to delete.
 */
export async function cancelOrDeleteEvent(eventId: string): Promise<any> {
  try {
    return await cancelEvent(eventId);
  } catch (e: any) {
    const ax = e as AxiosError<any>;
    const status = ax?.response?.status;
    if (status === 404 || status === 405) {
      return await deleteEvent(eventId);
    }
    throw unwrapAxiosError(e);
  }
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

    // ✅ Tolerate backend naming differences
    // Some backends use "declined" instead of "cant"
    // Others might use yes/no/attending/interested
    const going = d.going ?? d.yes ?? d.attending ?? [];
    const maybe = d.maybe ?? d.interested ?? [];
    const cant = d.cant ?? d.declined ?? d.no ?? [];

    return {
      going: Array.isArray(going) ? going : [],
      maybe: Array.isArray(maybe) ? maybe : [],
      cant: Array.isArray(cant) ? cant : [],
    };
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get a single event by ID (public endpoint - works for shareable links)
 */
export async function getEvent(eventId: string): Promise<GGEvent> {
  try {
    const res = await api.get(`/events/${eventId}`);
    return res.data as GGEvent;
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

// ============================================================================
// INVITATIONS API - Off-platform event invitations
// ============================================================================

/**
 * Create invitations for an event.
 * Can invite both households (in-app notifications) and phone numbers (SMS).
 */
export async function createEventInvitations(
  eventId: string,
  invitations: InvitationCreate
): Promise<InvitationResponse[]> {
  try {
    const res = await api.post(`/events/${eventId}/invitations`, invitations, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data as InvitationResponse[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get all invitations for an event (host only).
 */
export async function getEventInvitations(eventId: string): Promise<InvitationResponse[]> {
  try {
    const res = await api.get(`/events/${eventId}/invitations`);
    return res.data as InvitationResponse[];
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Get public event details via RSVP token (no authentication required).
 */
export async function getPublicEvent(token: string): Promise<PublicEventView> {
  try {
    const res = await api.get(`/events/rsvp/${token}`);
    return res.data as PublicEventView;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Submit RSVP for a public event (no authentication required).
 */
export async function submitPublicRSVP(token: string, rsvp: RSVPSubmit): Promise<{ message: string }> {
  try {
    const res = await api.post(`/events/rsvp/${token}`, rsvp, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

// ============================================================================
// EVENT MEMORY API - Photos for past events (attendees only)
// ============================================================================

/**
 * Upload a photo to a past event (attendees only).
 * Backend enforces: event is past, user attended (RSVP'd "going").
 */
export async function uploadEventPhoto(eventId: string, file: File): Promise<{
  id: string;
  url: string;
  uploadedByUserId: string;
  uploadedByName?: string;
  createdAt: string;
}> {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    
    const res = await api.post(`/events/${eventId}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

/**
 * Delete a photo from an event (photo owner only).
 */
export async function deleteEventPhoto(eventId: string, photoId: string): Promise<{ message: string }> {
  try {
    const res = await api.delete(`/events/${eventId}/photos/${photoId}`);
    return res.data;
  } catch (e) {
    throw unwrapAxiosError(e);
  }
}

// Export axios instance if any file imports it directly
export { api };
