// src/pages/Home.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
import { getViewer } from "../lib/viewer";
import { neighborhoodDisplayLabel } from "../lib/neighborhood";
import {
  fetchEvents,
  type GGEvent,
  type EventCategory,
  sendEventRsvp,
  leaveEventRsvp,
  getEventRsvps,
  type EventRsvpBuckets,
} from "../lib/api";
import Logo from "../assets/gathergrove-logo.png";

// ✅ IMPORTANT: this path/case must match the actual file name on disk
import MiniHouseholdCard from "../components/MiniHouseholdCard";

/* ---------- Posts (Happening / Event) ---------- */

type Post = {
  // ✅ CANONICAL event id (the one used for RSVP endpoints)
  id: string;

  // optional raw row id (invite row, etc.) if backend returns separate rows
  rowId?: string;

  // underlying true event id if backend includes it
  eventId?: string;

  kind: "happening" | "event";
  title?: string;
  when?: string;
  details: string;
  recipients?: string[];
  recipientIds?: string[];
  createdBy?: { id: string; label: string };
  ts: number;
  _hostUid?: string | null;
  category?: EventCategory;
};

/* ---------- Compact DM threads for Home feed ---------- */

type Recipient = { id: string; label: string };

type DMThread = {
  id: string;
  participants: Recipient[];
  lastMessage?: {
    body: string;
    ts: number;
    from?: { id: string; label: string };
  };
  ts: number;
};

/* ---------- RSVP for Future Events & Happening Now ---------- */

type RSVPChoice = "going" | "maybe" | "cant";

type EventRsvpCounts = {
  going: number;
  maybe: number;
  cant: number;
};

type EventRsvpState = {
  choice: RSVPChoice | null;
  counts: EventRsvpCounts;
};

type EventRsvpMap = Record<string, EventRsvpState>;

const RSVP_KEY = "gg:eventRsvps";

/* ---------- Storage keys ---------- */

const DM_KEY = "gg:dmThreads";
const POSTS_KEY = "gg:posts";
const COLLAPSE_KEY = "gg:homeCollapse";

type HomeCollapseState = {
  dm: boolean;
  happening: boolean;
  events: boolean;
  newNeighbors?: boolean;
  activity?: boolean;
  // ✅ new keys (we keep old ones too for backward compatibility)
  invited?: boolean;
  hosted?: boolean;
};

const HIDE_WELCOME_KEY = "gg:homeHideWelcome";

/* shared time helpers */
const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- Happening Now replies (local-only, 24h TTL) ---------- */

type HappeningReply = {
  id: string;
  postId: string;
  authorLabel: string;
  body: string;
  ts: number;
};

const HAPPENING_REPLIES_KEY = "gg:happeningReplies";
const HAPPENING_REPLY_TTL_MS = 24 * 60 * 60 * 1000;

function loadHappeningRepliesFromStorage(): HappeningReply[] {
  try {
    const raw = localStorage.getItem(HAPPENING_REPLIES_KEY);
    const all = raw ? (JSON.parse(raw) as HappeningReply[]) : [];
    const now = Date.now();
    const fresh = all.filter((r) => now - r.ts < HAPPENING_REPLY_TTL_MS);
    if (fresh.length !== all.length) {
      localStorage.setItem(HAPPENING_REPLIES_KEY, JSON.stringify(fresh));
    }
    return fresh;
  } catch {
    return [];
  }
}

function saveHappeningRepliesToStorage(replies: HappeningReply[]) {
  try {
    localStorage.setItem(HAPPENING_REPLIES_KEY, JSON.stringify(replies));
  } catch {
    // ignore
  }
}

/* ---------- Category metadata for events (for display) ---------- */

type CategoryMeta = {
  emoji: string;
  label: string;
};

const CATEGORY_META: Record<EventCategory, CategoryMeta> = {
  neighborhood: { emoji: "🏡", label: "Neighborhood" },
  playdate: { emoji: "🤸", label: "Playdate" },
  babysitting: { emoji: "👶", label: "Babysitting" },
  pet: { emoji: "🐶", label: "Pets" },
  celebrations: { emoji: "🎉", label: "Celebrations" },
  other: { emoji: "✨", label: "Other" },
};

/* Category filter for Future Events */
type EventFilter = "all" | EventCategory;

/* ---------- RSVP Verification Flag (DEV only) ---------- */
const RSVP_VERIFY = import.meta.env.DEV;

/* ---------- Loaders ---------- */

const loadDMThreads = (): DMThread[] => {
  try {
    return JSON.parse(localStorage.getItem(DM_KEY) || "[]");
  } catch {
    return [];
  }
};

const loadRsvps = (): EventRsvpMap => {
  try {
    const raw = localStorage.getItem(RSVP_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as EventRsvpMap;
  } catch {
    return {};
  }
};

const saveRsvps = (map: EventRsvpMap) => {
  try {
    localStorage.setItem(RSVP_KEY, JSON.stringify(map));
  } catch {}
};

const loadCollapse = (): HomeCollapseState | null => {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY);
    return raw ? (JSON.parse(raw) as HomeCollapseState) : null;
  } catch {
    return null;
  }
};

const saveCollapse = (state: HomeCollapseState) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, JSON.stringify(state));
  } catch {}
};

const loadLocalPosts = (): Post[] => {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
  } catch {
    return [];
  }
};

function viewerLabelOrDefault() {
  const viewer = getViewer() as any;
  return viewer?.label ?? viewer?.name ?? viewer?.lastName ?? viewer?.email ?? "You";
}

/* ---------- Helpers ---------- */

// Helper functions for Happening Now event display
function getEventTimeDisplay(event: Post): string {
  if (event.when) return event.when;
  if (event.ts) {
    const start = new Date(event.ts);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
    
    if (diffMinutes < 5) return 'Just started';
    if (diffMinutes < 60) return `Started ${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `Started ${diffHours}h ago`;
  }
  return 'Happening now';
}

function getEventCategoryColor(category?: string) {
  switch (category) {
    case 'playdate': return '#ec4899';
    case 'neighborhood': return '#3b82f6';
    case 'celebrations': return '#a855f7';
    case 'sports': return '#f59e0b';
    case 'food': return '#10b981';
    case 'pet': return '#8b5cf6';
    default: return '#6b7280';
  }
}

function getEventCategoryLabel(category?: string) {
  switch (category) {
    case 'playdate': return '🎪 Playdate';
    case 'neighborhood': return '🏡 Neighborhood';
    case 'celebrations': return '🎉 Celebrations';
    case 'sports': return '⚽ Sports';
    case 'food': return '🍕 Food';
    case 'pet': return '🐶 Pets';
    default: return '✨ Other';
  }
}

function isPostRelevantToViewer(post: Post, viewer: any | null): boolean {
  if (!viewer) return true;

  const vid = viewer.id ?? viewer.uid ?? viewer.email ?? null;
  const vLabel = viewer.label ?? viewer.name ?? viewer.lastName ?? null;

  const ids = post.recipientIds || [];
  const labels = post.recipients || [];

  const isBroadcast = ids.length === 0 && labels.length === 0;

  if (isBroadcast) return true;
  if (post.createdBy && (post.createdBy.id === vid || post.createdBy.label === vLabel)) return true;
  if (vid && ids.includes(vid)) return true;
  if (vLabel && labels.includes(vLabel)) return true;

  return false;
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const diffDays = Math.floor((now.getTime() - d.getTime()) / DAY_MS);
  if (diffDays < 6) {
    return d.toLocaleDateString([], { weekday: "short" });
  }

  return d.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

function formatEventWhen(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(text: string, max = 120) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function formatJoinedRelative(joinedAt?: number, nowMs?: number): string | null {
  if (!joinedAt) return null;
  const now = nowMs ?? Date.now();
  const diffMs = now - joinedAt;
  if (diffMs < 0) return null;

  const diffDays = Math.floor(diffMs / DAY_MS);
  const d = new Date(joinedAt);

  if (diffDays === 0) return "Joined today";
  if (diffDays === 1) return "Joined yesterday";
  if (diffDays < 7) return "Joined " + d.toLocaleDateString([], { weekday: "short" });
  if (diffDays < 365) return "Joined " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  return "Joined " + d.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

/* ---------- Map backend events → Home posts (RSVP-safe) ---------- */

function getCanonicalEventId(ev: GGEvent): string {
  const anyEv = ev as any;

  // ✅ Accept multiple naming conventions from backend
  const raw =
    anyEv.eventId ??
    anyEv.event_id ??
    anyEv.eventID ??
    anyEv.eventid ??
    anyEv.parentEventId ??
    anyEv.parent_event_id ??
    null;

  return (raw ?? ev.id) as string;
}

function mapEventToPost(ev: GGEvent): Post {
  const anyEv = ev as any;

  const canonicalEventId = getCanonicalEventId(ev);
  const rowId = ev.id;

  const kind: "happening" | "event" = ev.type === "future" ? "event" : "happening";

  const startIso = ev.startAt ?? null;
  const expiresIso = anyEv.expiresAt ?? anyEv.expires_at ?? null;
  const endIso = ev.endAt ?? anyEv.endAt ?? anyEv.end_at ?? null;
  const primaryIso = startIso ?? expiresIso ?? endIso ?? null;

  const ts = primaryIso && !Number.isNaN(Date.parse(primaryIso)) ? Date.parse(primaryIso) : Date.now();

  return {
    // ✅ IMPORTANT: id is the canonicalEventId so RSVP calls are stable
    id: canonicalEventId,
    eventId: canonicalEventId,
    rowId: rowId !== canonicalEventId ? rowId : undefined,

    kind,
    title: ev.title,
    when: startIso || undefined,
    details: ev.details || "",
    recipients: [],
    recipientIds: [],
    createdBy: anyEv.createdBy,
    ts,
    _hostUid: anyEv.hostUid ?? anyEv.host_uid ?? null,
    category: (anyEv.category ?? anyEv.eventCategory ?? anyEv.event_category) as EventCategory | undefined,
  };
}

/* ---------- Dedupe helpers for Future Events ---------- */

function isSameEvent(a: Post, b: Post): boolean {
  if (a.eventId && b.eventId && a.eventId === b.eventId) return true;

  const titleA = (a.title ?? "").trim().toLowerCase();
  const titleB = (b.title ?? "").trim().toLowerCase();
  if (!titleA || !titleB || titleA !== titleB) return false;

  if (!a.when || !b.when) return false;
  const tA = new Date(a.when).getTime();
  const tB = new Date(b.when).getTime();
  if (Number.isNaN(tA) || Number.isNaN(tB)) return false;

  const diff = Math.abs(tA - tB);
  const FIVE_MIN = 5 * 60 * 1000;
  return diff <= FIVE_MIN;
}

function pickPreferredEvent(a: Post, b: Post, viewerId: string | null): Post {
  function score(p: Post): number {
    let s = 0;
    if (p.eventId) s += 2;
    if (p.id && !p.id.startsWith("local-")) s += 1;

    const fromYou =
      (!!viewerId && (p.createdBy?.id === viewerId || p._hostUid === viewerId)) ||
      p.createdBy?.label === "from You" ||
      p.createdBy?.label === "You";

    if (fromYou) s += 4;

    return s;
  }

  return score(b) > score(a) ? b : a;
}

/* ---------- Small animation helpers ---------- */

const cardMotionProps = {
  initial: { opacity: 0, y: 8, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.18, ease: "easeOut" as const },
  whileTap: { scale: 0.985 },
};

const rsvpMotionProps = {
  whileTap: { scale: 0.94 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

const chipMotionProps = {
  whileTap: { scale: 0.96 },
  whileHover: { scale: 1.02 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

/* ---------- RSVP state transition helper (optimistic UI) ---------- */

function computeNextRsvpState(prev: EventRsvpState | undefined, choice: RSVPChoice): EventRsvpState {
  const prevState: EventRsvpState =
    prev ?? {
      choice: null,
      counts: { going: 0, maybe: 0, cant: 0 },
    };

  const nextCounts: EventRsvpCounts = { ...prevState.counts };
  let nextChoice: RSVPChoice | null = prevState.choice;

  if (prevState.choice === choice) {
    if (choice === "going" && nextCounts.going > 0) nextCounts.going--;
    if (choice === "maybe" && nextCounts.maybe > 0) nextCounts.maybe--;
    if (choice === "cant" && nextCounts.cant > 0) nextCounts.cant--;
    nextChoice = null;
  } else {
    if (prevState.choice === "going" && nextCounts.going > 0) nextCounts.going--;
    if (prevState.choice === "maybe" && nextCounts.maybe > 0) nextCounts.maybe--;
    if (prevState.choice === "cant" && nextCounts.cant > 0) nextCounts.cant--;

    if (choice === "going") nextCounts.going++;
    if (choice === "maybe") nextCounts.maybe++;
    if (choice === "cant") nextCounts.cant++;

    nextChoice = choice;
  }

  return { choice: nextChoice, counts: nextCounts };
}

/* ---------- RSVP helpers (keying + backend conversions) ---------- */

function getRsvpStateKey(post: Post): string {
  return post.eventId ?? post.id;
}

function isBackendRsvpEligible(post: Post): boolean {
  const key = getRsvpStateKey(post);
  // local-only posts should NOT call backend
  if (!key) return false;
  if (String(key).startsWith("local-")) return false;
  return true;
}

function bucketsToCounts(buckets: any): EventRsvpCounts {
  const going = (buckets?.going ?? []) as any[];
  const maybe = (buckets?.maybe ?? []) as any[];
  const cant = (buckets?.cant ?? buckets?.declined ?? buckets?.["can't"] ?? []) as any[];
  return { going: going.length || 0, maybe: maybe.length || 0, cant: cant.length || 0 };
}

/* ---------- small concurrency helper ---------- */

async function runWithLimit<T>(limit: number, tasks: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  const workers = new Array(Math.min(limit, tasks.length)).fill(0).map(async () => {
    while (idx < tasks.length) {
      const my = idx++;
      results[my] = await tasks[my]();
    }
  });

  await Promise.all(workers);
  return results;
}

/* ---------- Page ---------- */

export default function Home() {
  const navigate = useNavigate();
  const viewer = getViewer() as any | null;
  const viewerId = viewer?.id ?? viewer?.uid ?? viewer?.email ?? null;

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_WELCOME_KEY) !== "true";
    } catch {
      return true;
    }
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [threads, setThreads] = useState<DMThread[]>([]);
  const [eventRsvps, setEventRsvps] = useState<EventRsvpMap>({});
  const [now, setNow] = useState(() => Date.now());

  // ✅ new section collapse states (default open)
  const [showInvited, setShowInvited] = useState(true);
  const [showHosted, setShowHosted] = useState(true);
  const [showDM, setShowDM] = useState(true);

  const [eventCategoryFilter, setEventCategoryFilter] = useState<EventFilter>("all");

  const [replies, setReplies] = useState<HappeningReply[]>(() => loadHappeningRepliesFromStorage());
  const [activeHappening, setActiveHappening] = useState<Post | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  // RSVP detail drawer state
  const [rsvpDetailEvent, setRsvpDetailEvent] = useState<Post | null>(null);
  const [rsvpDetailBuckets, setRsvpDetailBuckets] = useState<EventRsvpBuckets | null>(null);
  const [rsvpDetailLoading, setRsvpDetailLoading] = useState(false);
  const [rsvpDetailError, setRsvpDetailError] = useState<string | null>(null);

  // prevent stale RSVP hydration overwriting newer local state
  const rsvpHydrateEpoch = useRef(0);

  const refreshHomeEvents = async (): Promise<Post[]> => {
    const events = await fetchEvents();

    // ✅ hide canceled events if backend returns them
    const activeOnly = events.filter((ev) => {
      const s = String((ev as any)?.status ?? "").toLowerCase();
      if (!s) return true;
      return !(s === "canceled" || s === "cancelled");
    });

    const backendPosts = activeOnly.map(mapEventToPost);
    const localPosts = loadLocalPosts();

    // ✅ Build set of backend event IDs for validation
    const backendEventIds = new Set(backendPosts.map((p) => p.id));

    // ✅ merge by canonical event id (Post.id)
    // Only include local posts that still exist in backend (avoid 404 spam on stale IDs)
    const merged = new Map<string, Post>();
    for (const p of backendPosts) merged.set(p.id, p);
    for (const p of localPosts) {
      // Only merge if backend knows about this event OR it's a local-only post
      if (backendEventIds.has(p.id) || String(p.id).startsWith("local-")) {
        merged.set(p.id, p);
      }
    }

    const mergedArr = Array.from(merged.values());
    setPosts(mergedArr);
    return mergedArr;
  };

  const hydrateRsvpCountsFromBackend = async (postsToHydrate: Post[]) => {
    const epoch = ++rsvpHydrateEpoch.current;

    const candidates = postsToHydrate
      .filter((p) => isBackendRsvpEligible(p))
      .map((p) => getRsvpStateKey(p))
      .filter(Boolean);

    // de-dupe keys
    const unique = Array.from(new Set(candidates));

    // don’t spam backend for tons of events
    const keys = unique.slice(0, 20);

    const tasks = keys.map((key) => async () => {
      try {
        const buckets = await getEventRsvps(key);
        return { key, counts: bucketsToCounts(buckets as any) };
      } catch {
        return { key, counts: null as EventRsvpCounts | null };
      }
    });

    const results = await runWithLimit(6, tasks);

    // if a newer hydration started, drop this one
    if (epoch !== rsvpHydrateEpoch.current) return;

    setEventRsvps((prev) => {
      const next: EventRsvpMap = { ...prev };
      for (const r of results) {
        if (!r.counts) continue;
        const prior = next[r.key] ?? { choice: null, counts: { going: 0, maybe: 0, cant: 0 } };
        next[r.key] = { ...prior, counts: r.counts };
        
        // DEV-only verification logging
        if (RSVP_VERIFY) {
          const responded = r.counts.going + r.counts.maybe + r.counts.cant;
          console.info('[RSVP Verification] Home count hydrated', {
            eventId: r.key,
            respondedCount: responded,
            going: r.counts.going,
            maybe: r.counts.maybe,
            cant: r.counts.cant,
          });
        }
      }
      saveRsvps(next);
      return next;
    });
  };

  const replyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of replies) {
      map[r.postId] = (map[r.postId] || 0) + 1;
    }
    return map;
  }, [replies]);

  const activeReplies = useMemo(() => {
    return activeHappening
      ? replies.filter((r) => r.postId === activeHappening.id).sort((a, b) => a.ts - b.ts)
      : [];
  }, [activeHappening, replies]);

  const openReplies = (post: Post) => {
    setActiveHappening(post);
    setReplyDraft("");
  };

  const closeReplies = () => {
    setActiveHappening(null);
    setReplyDraft("");
  };

  const sendReply = (body?: string) => {
    const trimmed = (body ?? replyDraft).trim();
    if (!activeHappening || !trimmed) return;

    const nowMs = Date.now();
    const newReply: HappeningReply = {
      id: `${activeHappening.id}:${nowMs}:${Math.random().toString(36).slice(2)}`,
      postId: activeHappening.id,
      authorLabel: viewerLabelOrDefault(),
      body: trimmed,
      ts: nowMs,
    };

    setReplies((prev) => {
      const next = [...prev, newReply];
      saveHappeningRepliesToStorage(next);
      return next;
    });

    if (!body) setReplyDraft("");
  };

  const handleSendReply = () => sendReply();

  const QUICK_HAPPENING_REPLIES = ["On our way 🧍‍♂️", "Here now 👋", "Be there in 5–10 mins ⏱", "Still going on?"];

  const handleQuickReply = (text: string) => {
    setReplyDraft(text);
  };

  // ✅ IMPORTANT: edit route should use the real backend eventId (canonical) if present
  const handleEditPost = (post: Post) => {
    navigate(`/compose/${post.kind}/${post.eventId ?? post.id}`);
  };

  const openRsvpDetails = (post: Post) => {
    setRsvpDetailEvent(post);
    setRsvpDetailBuckets(null);
    setRsvpDetailError(null);
    setRsvpDetailLoading(true);

    const key = getRsvpStateKey(post);

    // local-only events: just show local counts and empty buckets
    if (!isBackendRsvpEligible(post)) {
      setRsvpDetailBuckets({ going: [], maybe: [], cant: [] } as any);
      setRsvpDetailLoading(false);
      return;
    }

    void (async () => {
      try {
        const buckets = await getEventRsvps(key);
        setRsvpDetailBuckets(buckets as any);

        // also update counts locally from backend truth
        const counts = bucketsToCounts(buckets as any);
        
        // DEV-only verification logging
        if (RSVP_VERIFY) {
          const responded = counts.going + counts.maybe + counts.cant;
          console.info('[RSVP Verification] Modal opened', {
            eventId: key,
            respondedCount: responded,
            going: counts.going,
            maybe: counts.maybe,
            cant: counts.cant,
            goingList: (buckets as any).going?.length || 0,
            maybeList: (buckets as any).maybe?.length || 0,
            cantList: (buckets as any).cant?.length || 0,
          });
        }
        
        setEventRsvps((prev) => {
          const next: EventRsvpMap = { ...prev };
          const prior = next[key] ?? { choice: null, counts: { going: 0, maybe: 0, cant: 0 } };
          next[key] = { ...prior, counts };
          saveRsvps(next);
          return next;
        });
      } catch (err) {
        console.error("Failed to load RSVPs", err);
        setRsvpDetailError("Unable to load RSVPs right now.");
      } finally {
        setRsvpDetailLoading(false);
      }
    })();
  };

  const closeRsvpDetails = () => {
    setRsvpDetailEvent(null);
    setRsvpDetailBuckets(null);
    setRsvpDetailError(null);
    setRsvpDetailLoading(false);
  };

  useEffect(() => {
    void (async () => {
      try {
        const existing = loadRsvps();
        setEventRsvps(existing);
        saveRsvps(existing);

        const mergedArr = await refreshHomeEvents();

        // ✅ hydrate counts from backend truth (so chrome/safari match)
        void hydrateRsvpCountsFromBackend(mergedArr);
      } catch (err) {
        console.error("Failed to fetch events for Home", err);
        setPosts(loadLocalPosts());
        setEventRsvps(loadRsvps());
      }
    })();

    setThreads(loadDMThreads());

    const stored = loadCollapse();
    if (stored) {
      const invitedFallback = (stored.happening ?? true) || (stored.events ?? true);
      const hostedFallback = stored.activity ?? true;

      setShowInvited(stored.invited ?? invitedFallback ?? true);
      setShowHosted(stored.hosted ?? hostedFallback ?? true);
      setShowDM(stored.dm ?? true);
    }

    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    // ✅ Persist both old + new keys (safe migration)
    saveCollapse({
      dm: showDM,
      happening: showInvited, // legacy mapping
      events: showInvited, // legacy mapping
      activity: showHosted, // legacy mapping
      invited: showInvited,
      hosted: showHosted,
    });
  }, [showDM, showInvited, showHosted]);

  const { happeningNow, upcomingEvents } = useMemo(() => {
    const relevant = posts.filter((p) => isPostRelevantToViewer(p, viewer));
    const nowMs = now;

    const happening: Post[] = [];
    const upcomingRaw: Post[] = [];

    for (const p of relevant) {
      if (p.kind === "happening") {
        if (p.when) {
          const startMs = new Date(p.when).getTime();
          const ageMs = nowMs - startMs;
          if (!Number.isNaN(startMs) && ageMs >= 0 && ageMs <= DAY_MS) {
            happening.push(p);
          }
        } else {
          const age = nowMs - p.ts;
          if (age <= DAY_MS) happening.push(p);
        }
      } else if (p.kind === "event") {
        if (!p.when) {
          upcomingRaw.push(p);
        } else {
          const startMs = new Date(p.when).getTime();
          if (!Number.isNaN(startMs) && startMs >= nowMs - 60 * 60 * 1000) {
            upcomingRaw.push(p);
          }
        }
      }
    }

    const deduped: Post[] = [];
    for (const p of upcomingRaw) {
      let merged = false;
      for (let i = 0; i < deduped.length; i++) {
        const existing = deduped[i];
        if (isSameEvent(existing, p)) {
          deduped[i] = pickPreferredEvent(existing, p, viewerId ?? null);
          merged = true;
          break;
        }
      }
      if (!merged) deduped.push(p);
    }

    happening.sort((a, b) => b.ts - a.ts);

    deduped.sort((a, b) => {
      if (a.when && b.when) return a.when.localeCompare(b.when);
      if (a.when) return -1;
      if (b.when) return 1;
      return a.ts - b.ts;
    });

    return { happeningNow: happening, upcomingEvents: deduped };
  }, [posts, viewer, viewerId, now]);

  const filteredUpcomingEvents = useMemo(() => {
    if (eventCategoryFilter === "all") return upcomingEvents;
    return upcomingEvents.filter((p) => p.category === eventCategoryFilter);
  }, [upcomingEvents, eventCategoryFilter]);

  // ✅ one canonical "is host" helper
  const isHostPost = (p: Post) => {
    const viewerLabel = viewer?.label ?? viewer?.name ?? viewer?.lastName ?? viewer?.email ?? null;

    const hostUid = p._hostUid;
    if (hostUid && viewerId && hostUid === viewerId) return true;

    if (!p.createdBy) return false;
    if (p.createdBy.id && viewerId && p.createdBy.id === viewerId) return true;
    if (viewerLabel && p.createdBy.label === viewerLabel) return true;

    return false;
  };

  // ✅ Invited events (exclude hosted)
  const invitedHappeningNow = useMemo(() => happeningNow.filter((p) => !isHostPost(p)), [happeningNow, viewerId, viewer]);

  const invitedFutureEvents = useMemo(
    () => filteredUpcomingEvents.filter((p) => !isHostPost(p)),
    [filteredUpcomingEvents, viewerId, viewer],
  );

  // ✅ Hosted events (only host)
  const { myHappeningNow, myFutureEvents } = useMemo(() => {
    if (!viewer || !viewerId) {
      return { myHappeningNow: [] as Post[], myFutureEvents: [] as Post[] };
    }
    return {
      myHappeningNow: happeningNow.filter(isHostPost),
      myFutureEvents: upcomingEvents.filter(isHostPost),
    };
  }, [happeningNow, upcomingEvents, viewer, viewerId]);

  const sortedThreads = useMemo(() => {
    if (!viewerId) return [];

    const mine = threads.filter((t) => t.participants.some((p) => p.id === viewerId));

    return [...mine].sort((a, b) => {
      const at = a.lastMessage?.ts ?? a.ts ?? 0;
      const bt = b.lastMessage?.ts ?? b.ts ?? 0;
      return bt - at;
    });
  }, [threads, viewerId]);

  const invitedCount = invitedHappeningNow.length + invitedFutureEvents.length;
  const hostedCount = myHappeningNow.length + myFutureEvents.length;
  const dmCount = sortedThreads.length;

  const hasMessages = dmCount > 0;

  const currentFilterLabel =
    eventCategoryFilter === "all" ? "future events" : `${CATEGORY_META[eventCategoryFilter].label.toLowerCase()} events`;

  const otherParticipantsLabel = (t: DMThread): string => {
    if (!viewerId) return t.participants.map((p) => p.label).join(", ");
    const others = t.participants.filter((p) => p.id !== viewerId);
    if (others.length === 0) return "You";
    return others.map((p) => p.label).join(", ");
  };

  const handleDismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(HIDE_WELCOME_KEY, "true");
    } catch {}
  };

  const handleRsvp = (post: Post, choice: RSVPChoice) => {
    const key = getRsvpStateKey(post);

    const prevState = eventRsvps[key];
    const nextState = computeNextRsvpState(prevState, choice);

    const nextMap: EventRsvpMap = { ...eventRsvps, [key]: nextState };
    setEventRsvps(nextMap);
    saveRsvps(nextMap);

    // local-only posts: no backend calls
    if (!isBackendRsvpEligible(post)) return;

    void (async () => {
      try {
        if (!nextState.choice) {
          await leaveEventRsvp(key);
        } else {
          await sendEventRsvp(key, nextState.choice);
        }

        // refresh counts from backend truth
        try {
          const buckets = await getEventRsvps(key);
          const counts = bucketsToCounts(buckets as any);

          setEventRsvps((prev) => {
            const updated: EventRsvpMap = { ...prev };
            const prior = updated[key] ?? { choice: null, counts: { going: 0, maybe: 0, cant: 0 } };
            updated[key] = { ...prior, counts };
            saveRsvps(updated);
            return updated;
          });
        } catch {
          // ignore
        }
      } catch (err) {
        console.error("Failed to submit RSVP", err);
      }
    })();
  };

  const formatRsvpSummary = (counts: EventRsvpCounts): string | null => {
    const parts: string[] = [];
    if (counts.going > 0) parts.push(`${counts.going} going`);
    if (counts.maybe > 0) parts.push(`${counts.maybe} maybe`);
    if (counts.cant > 0) parts.push(`${counts.cant} can't go`);
    if (parts.length === 0) return null;
    return parts.join(" · ");
  };

  const formatHappeningSummary = (counts: EventRsvpCounts): string | null => {
    const responded = counts.going + counts.maybe + counts.cant;
    if (responded <= 0) return null;
    return `${responded} household${responded === 1 ? "" : "s"} responded`;
  };

  // ✅ 10/10 polish helpers (microcopy + hierarchy)
  const isTruthy = (v: any) => !!v && String(v).trim().length > 0;

  const getHappeningPrimaryTitle = (p: Post) => {
    // Prefer a real title if present, else fall back to the detail (truncated)
    if (isTruthy(p.title)) return String(p.title).trim();
    return truncate(p.details || "Happening Now", 72);
  };

  const getHappeningSubtitle = (p: Post) => {
    // Show a short timestamp line, optionally “from X”
    const from = p.createdBy?.label ? ` · from ${p.createdBy.label}` : "";
    return `${formatTimeShort(p.ts)}${from}`;
  };

  const getHappeningBody = (p: Post) => {
    // If title is missing, don’t duplicate body with same content
    if (!isTruthy(p.title)) return "";
    return p.details || "";
  };

  return (
    <div className="gg-page" style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        @keyframes gg-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .gg-page { animation: gg-page-in .28s ease-out; }

        .home-title { font-size: 30px; font-weight: 800; letter-spacing: .01em; color: #0f172a; margin: 0; }
        .home-sub { font-size: 14px; color: #64748b; margin: 2px 0 10px; }

        .helper-link {
          font-size: 12px;
          color: #4f46e5;
          border: none;
          background: transparent;
          padding: 0;
          cursor: pointer;
          font-weight: 600;
          opacity: .9;
        }
        .helper-link:hover { opacity: 1; text-decoration: underline; }

        .welcome-card {
          border-radius: 16px;
          border: 1px solid rgba(16,185,129,.35);
          background: linear-gradient(180deg, rgba(236,253,245,0.65), #ffffff);
          padding: 14px 16px;
          margin-bottom: 16px;
          box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
          display:flex; justify-content:space-between; align-items:flex-start; gap:10px;
        }
        .welcome-main { flex:1; min-width:0; }
        .welcome-title { font-weight: 800; margin-bottom: 4px; font-size: 15px; display:flex; align-items:center; gap:6px; color:#065F46; }
        .welcome-body { font-size: 14px; color:#334155; line-height: 1.35; }
        .welcome-pill {
          font-size: 11px; padding: 6px 10px; border-radius: 999px;
          border: 1px solid rgba(16,185,129,.28);
          background: rgba(240,253,244,.8);
          color:#047857;
          white-space:nowrap;
          cursor:pointer;
          font-weight: 700;
        }

        .home-section { margin-bottom: 18px; }

        .section-header-row { display:flex; justify-content:space-between; align-items:center; gap:10px; margin: 16px 0 10px; }
        .section-toggle { display:inline-flex; align-items:center; gap:10px; border:0; padding:0; background:transparent; cursor:pointer; text-align:left; }

        .home-section-title { font-size: 18px; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 10px; color: #0f172a; }

        /* ✅ 10/10: soften header icon emphasis slightly */
        .section-icon {
          width: 28px; height: 28px; border-radius: 10px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 14px;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,.06);
          opacity: .92;
        }
        .section-icon.invited { background: #f5f3ff; color: #7c3aed; }
        .section-icon.hosted { background: #ecfdf5; color: #047857; }
        .section-icon.neighbors { background: #fefce8; color: #a16207; }
        .section-icon.messages { background: #eff6ff; color: #1d4ed8; }

        .section-count {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          background: #f1f5f9;
          color: #334155;
          border: 1px solid rgba(15,23,42,.06);
        }

        .chevron {
          font-size: 12px;
          color:#64748b;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          display:flex; align-items:center; justify-content:center;
          border: 1px solid rgba(15,23,42,.08);
          background: #ffffff;
          transition: transform .15s ease;
        }
        .chevron.closed { transform: rotate(180deg); }

        /* grouping panels for subsections */
        .subpanel {
          border-radius: 16px;
          border: 1px solid rgba(15,23,42,.06);
          background: #f8fafc;
          padding: 12px;
          box-shadow: 0 10px 22px rgba(15,23,42,.04);
          margin-bottom: 10px;
        }

        .subpanel-head {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
          margin-bottom: 10px;
        }

        .subpanel-left {
          display:flex;
          align-items:center;
          gap:10px;
          min-width: 0;
        }

        .subpill {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.55);
          background: rgba(255,255,255,0.75);
          color: #0f172a;
          display:inline-flex;
          align-items:center;
          gap:8px;
          font-weight: 800;
          line-height: 1;
          white-space: nowrap;
        }

        .subpill .muted { font-weight: 700; color: #64748b; }

        /* ✅ 10/10: “now” should visually win; “future” slightly calmer */
        .subpill.now { border-color: rgba(56,189,248,.55); }
        .subpill.future { border-color: rgba(250,204,21,.50); opacity: .94; }

        /* ✅ 10/10: helper text a touch lighter */
        .subhint {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.2;
        }

        .home-card {
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,.08);
          background: rgba(255,255,255,0.98);
          padding: 12px 14px;
          margin-bottom: 8px;
          box-shadow: 0 8px 18px rgba(15,23,42,.05);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          transition: box-shadow .14s ease, transform .14s ease, border-color .14s ease;
        }
        .home-card:hover { box-shadow: 0 14px 26px rgba(15,23,42,.09); border-color: rgba(15,23,42,.10); transform: translateY(-1px); }

        .home-card-main { flex: 1; min-width: 0; }
        .home-card-title { font-weight: 800; margin-bottom: 2px; font-size: 15px; color:#0f172a; }
        .home-card-meta { font-size: 12px; color: #64748b; margin-bottom: 5px; }
        .home-card-body { font-size: 14px; color: #0f172a; line-height: 1.35; }
        .home-card-body--neighbor { font-size: 13px; color: #475569; }

        .pill { font-size: 11px; padding: 5px 9px; border-radius: 999px; border: 1px solid rgba(148,163,184,.55); color: #0f172a; white-space: nowrap; background:#fff; }
        .pill.happening { background: rgba(236,254,255,.9); border-color: rgba(165,243,252,.9); }
        .pill.event { background: rgba(254,252,232,.9); border-color: rgba(250,204,21,.9); }
        .pill.host {
          background: rgba(236,253,245,.92);
          border-color: rgba(110,231,183,.9);
          color: #047857;
          font-size: 11px; padding: 4px 9px;
          display:inline-flex; align-items:center; gap:6px; font-weight: 800;
        }

        .empty { font-size: 14px; color: #64748b; padding: 6px 2px; }

        .view-all {
          font-size: 12px; color: #4338ca; cursor: pointer; font-weight: 800;
          background: #eef2ff; border-radius: 999px;
          border: 1px solid rgba(129,140,248,0.75);
          padding: 6px 10px;
          display: inline-flex; align-items: center; gap: 6px;
          transition: box-shadow .12s ease, transform .12s ease, opacity .12s ease;
          white-space: nowrap;
        }
        .view-all:hover { box-shadow: 0 10px 18px rgba(79,70,229,0.18); transform: translateY(-1px); }
        .view-all.is-disabled { opacity: 0.4; cursor: default; box-shadow: none; transform: none; }

        .rsvp-row {
          display:flex; flex-wrap:wrap; gap:8px; align-items:center;
          margin-top:10px; justify-content:space-between;
        }
        .rsvp-buttons { display:flex; flex-wrap:wrap; gap:8px; }

        .rsvp-btn {
          font-size: 11px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.55);
          background: rgba(255,255,255,0.92);
          color:#0f172a;
          cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
          font-weight: 800;
          transition: box-shadow .12s ease, transform .12s ease, border-color .12s ease, background-color .12s ease;
        }
        .rsvp-btn:hover { box-shadow: 0 10px 18px rgba(15,23,42,.06); transform: translateY(-1px); }
        .rsvp-btn.is-on {
          border-color:#2563eb;
          border-width:2px;
          background:#ffffff;
          box-shadow:none;
        }

        .rsvp-summary { font-size: 12px; color:#64748b; font-weight: 700; }
        .rsvp-meta-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }

        .rsvp-view-btn {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(15,23,42,.08);
          background: rgba(255,255,255,0.92);
          color:#0f172a;
          cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
          font-weight: 800;
        }
        .rsvp-view-btn:hover { box-shadow: 0 10px 18px rgba(15,23,42,.06); transform: translateY(-1px); transition: .12s ease; }

        .manage-row { display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; padding-top: 10px; border-top: 1px solid rgba(15,23,42,.07); }
        .manage-link {
          font-size:12px; color:#334155; display:inline-flex; align-items:center; gap:6px;
          cursor:pointer; background:transparent; border:0; padding:0;
          font-weight: 800;
        }
        .manage-link .icon { font-size:14px; }

        .event-filter-row { display:flex; flex-wrap:wrap; gap:8px; margin: 8px 0 10px; }
        .event-filter-chip {
          padding: 7px 12px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.55);
          font-size: 12px;
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,0.9);
          color: #0f172a;
          cursor: pointer;
          font-weight: 800;
          transition: box-shadow .12s ease, transform .12s ease, border-color .12s ease;
        }
        .event-filter-chip:hover { box-shadow: 0 10px 18px rgba(15,23,42,.06); transform: translateY(-1px); }
        .event-filter-chip.is-active {
          border-color: #2563eb;
          border-width: 2px;
          background: #ffffff;
          box-shadow: none;
        }

        @media (max-width: 520px) {
          .rsvp-row { flex-direction:column; align-items:flex-start; }
          .rsvp-meta-right { align-items:flex-start; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <img src={Logo} alt="GatherGrove logo" style={{ width: 28, height: 28, borderRadius: 8 }} />
        <h2 className="home-title">Home</h2>
      </div>
      <p className="home-sub">
        Home shows events you’re invited to, anything you’re hosting, and your messages.
      </p>

      <button type="button" onClick={() => setShowWelcome(true)} className="helper-link">
        How does Home work?
      </button>

      {/* -------- 1) Welcome -------- */}
      {showWelcome && (
        <div className="welcome-card">
          <div className="welcome-main">
            <div className="welcome-title">🏡 Welcome to GatherGrove</div>
            <div className="welcome-body">
              Home is your personal feed. You’ll see:
              <br />
              📅 <strong>Invited Events</strong> (Happening Now + Future Events)
              <br />
              🌿 <strong>Your Hosted Events</strong> with live RSVP counts
              <br />
              💬 Messages from neighbors
              <br />
            </div>
          </div>
          <button type="button" className="welcome-pill" onClick={handleDismissWelcome}>
            Got it
          </button>
        </div>
      )}

      {/* -------- Profile Completion Prompts -------- */}
      {/* DISABLED: Profile CTAs use mock localStorage keys not connected to backend
          TODO: Re-enable when backend profile API integration complete
      {(() => {
        const hasHouseholdType = localStorage.getItem('user_household_type') !== null;
        const householdType = localStorage.getItem('user_household_type');
        const hasChildren = localStorage.getItem('user_has_children') === 'true';
        ...
      })()}
      */}

      {/* -------- ⚡ HAPPENING NOW SECTION -------- */}
      {/* DISABLED: Duplicates "Invited Events > Happening now" subsection
          The standalone section showed ALL happeningNow (hosted + invited)
          The subsection shows only invitedHappeningNow (invited only)
          Keeping only the subsection for better organization
      {happeningNow.length > 0 && (
        <section className="home-section" style={{ marginBottom: 24 }}>
          ...
        </section>
      )}
      */}

      {/* -------- 2) Invited Events -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowInvited((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon invited">📅</span>
              <span>Invited Events</span>
              <span className="section-count">{invitedCount}</span>
            </div>
            <span className={"chevron " + (showInvited ? "" : "closed")}>{showInvited ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showInvited && (
          <>
            {invitedHappeningNow.length === 0 && invitedFutureEvents.length === 0 && (
              <div className="empty">No invited events yet.</div>
            )}

            {/* ✨ Subpanel: Happening now */}
            <div className="subpanel">
              <div className="subpanel-head">
                <div className="subpanel-left">
                  <span className="subpill now">
                    <span aria-hidden>⚡</span>
                    <span>Happening now</span>
                    <span className="muted">· {invitedHappeningNow.length}</span>
                  </span>
                  <div className="subhint">Live posts expire after 24h.</div>
                </div>
              </div>

              {invitedHappeningNow.length === 0 && (
                <div className="empty" style={{ paddingTop: 0 }}>
                  No live invites right now.
                </div>
              )}

              {invitedHappeningNow.map((p) => {
                const keyId = getRsvpStateKey(p);
                const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
                const summary = formatHappeningSummary(rsvpState.counts);
                const replyCount = replyCounts[p.id] || 0;

                // ✅ 10/10: remove redundant "Happening Now" title inside card (use the actual title)
                const primaryTitle = getHappeningPrimaryTitle(p);
                const subtitle = getHappeningSubtitle(p);
                const body = getHappeningBody(p);

                return (
                  <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                    <div className="home-card-main">
                      <div className="home-card-title">{primaryTitle}</div>
                      <div className="home-card-meta">{subtitle}</div>
                      {body ? <div className="home-card-body">{body}</div> : null}

                      <div className="rsvp-row">
                        <div className="rsvp-buttons">
                          <motion.button
                            type="button"
                            className={"rsvp-btn" + (rsvpState.choice === "going" ? " is-on" : "")}
                            onClick={() => handleRsvp(p, "going")}
                            {...rsvpMotionProps}
                          >
                            <span>👍</span>
                            <span>Going</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            className={"rsvp-btn" + (rsvpState.choice === "cant" ? " is-on" : "")}
                            onClick={() => handleRsvp(p, "cant")}
                            {...rsvpMotionProps}
                          >
                            <span>❌</span>
                            <span>Can't go</span>
                          </motion.button>
                        </div>

                        <div className="rsvp-meta-right">
                          {summary && <div className="rsvp-summary">{summary}</div>}
                          <button type="button" className="rsvp-view-btn" onClick={() => openRsvpDetails(p)}>
                            <span aria-hidden>👀</span>
                            <span>View RSVPs</span>
                          </button>
                        </div>
                      </div>

                      <div className="manage-row" style={{ borderTop: "none", paddingTop: 0, marginTop: 12 }}>
                        <button
                          type="button"
                          onClick={() => openReplies(p)}
                          style={{
                            borderRadius: 999,
                            border: "1px solid rgba(15,23,42,.08)",
                            padding: "7px 12px",
                            background: "rgba(255,255,255,0.92)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          <span aria-hidden>💬</span>
                          <span>
                            {replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Join chat"}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="pill happening">Now</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* ✨ Subpanel: Future events */}
            <div className="subpanel">
              <div className="subpanel-head">
                <div className="subpanel-left">
                  <span className="subpill future">
                    <span aria-hidden>📅</span>
                    {/* ✅ 10/10: consistent naming: “Future events” */}
                    <span>Future events</span>
                    <span className="muted">· {invitedFutureEvents.length}</span>
                  </span>
                  <div className="subhint">Use filters to find the right kind of invite.</div>
                </div>
              </div>

              <div className="event-filter-row">
                <motion.button
                  type="button"
                  className={"event-filter-chip" + (eventCategoryFilter === "all" ? " is-active" : "")}
                  onClick={() => setEventCategoryFilter("all")}
                  {...chipMotionProps}
                >
                  <span>All</span>
                </motion.button>

                {(Object.entries(CATEGORY_META) as [EventCategory, CategoryMeta][]).map(([id, meta]) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={"event-filter-chip" + (eventCategoryFilter === id ? " is-active" : "")}
                    onClick={() => setEventCategoryFilter(id)}
                    {...chipMotionProps}
                  >
                    <span>{meta.emoji}</span>
                    <span>{meta.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* ✅ 10/10: align empty state to section language */}
              {invitedFutureEvents.length === 0 && (
                <div className="empty">No upcoming invites yet.</div>
              )}

              {invitedFutureEvents.map((p) => {
                const keyId = getRsvpStateKey(p);
                const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
                const summary = formatRsvpSummary(rsvpState.counts);
                const categoryMeta = p.category && CATEGORY_META[p.category] ? CATEGORY_META[p.category] : null;

                return (
                  <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                    <div className="home-card-main">
                      <div className="home-card-title">{p.title || "Event"}</div>

                      <div className="home-card-meta">
                        {p.when ? formatEventWhen(p.when) : "Time TBA"}
                        {p.createdBy?.label ? ` · from ${p.createdBy.label}` : ""}
                      </div>

                      {categoryMeta && (
                        <div className="home-card-meta">
                          {categoryMeta.emoji} {categoryMeta.label}
                        </div>
                      )}

                      <div className="home-card-body">{p.details}</div>

                      <div className="rsvp-row">
                        <div className="rsvp-buttons">
                          <motion.button
                            type="button"
                            className={"rsvp-btn" + (rsvpState.choice === "going" ? " is-on" : "")}
                            onClick={() => handleRsvp(p, "going")}
                            {...rsvpMotionProps}
                          >
                            <span>👍</span>
                            <span>Going</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            className={"rsvp-btn" + (rsvpState.choice === "maybe" ? " is-on" : "")}
                            onClick={() => handleRsvp(p, "maybe")}
                            {...rsvpMotionProps}
                          >
                            <span>❓</span>
                            <span>Maybe</span>
                          </motion.button>

                          <motion.button
                            type="button"
                            className={"rsvp-btn" + (rsvpState.choice === "cant" ? " is-on" : "")}
                            onClick={() => handleRsvp(p, "cant")}
                            {...rsvpMotionProps}
                          >
                            <span>❌</span>
                            <span>Can't go</span>
                          </motion.button>
                        </div>

                        <div className="rsvp-meta-right">
                          {summary && <div className="rsvp-summary">{summary}</div>}
                          <button type="button" className="rsvp-view-btn" onClick={() => openRsvpDetails(p)}>
                            <span aria-hidden>👀</span>
                            <span>View RSVPs</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="pill event">Future</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* -------- 3) Your Hosted Events -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowHosted((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon hosted">🌿</span>
              <span>Your Hosted Events</span>
              <span className="section-count">{hostedCount}</span>
            </div>
            <span className={"chevron " + (showHosted ? "" : "closed")}>{showHosted ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showHosted && (
          <>
            {myHappeningNow.length === 0 && myFutureEvents.length === 0 && (
              <div className="empty">
                Nothing hosted yet. When you post a ⚡ Happening Now or create a 📅 Future Event, it will appear here with
                live RSVP counts.
              </div>
            )}

            {myHappeningNow.length > 0 && (
              <div className="subpanel">
                <div className="subpanel-head">
                  <div className="subpanel-left">
                    <span className="subpill now">
                      <span aria-hidden>⚡</span>
                      <span>Happening now</span>
                      <span className="muted">· {myHappeningNow.length}</span>
                    </span>
                    <div className="subhint">Your live posts with responses.</div>
                  </div>
                </div>

                {myHappeningNow.map((p) => {
                  const keyId = getRsvpStateKey(p);
                  const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                    choice: null,
                    counts: { going: 0, maybe: 0, cant: 0 },
                  };
                  const summary = formatHappeningSummary(rsvpState.counts);
                  const replyCount = replyCounts[p.id] || 0;

                  const primaryTitle = getHappeningPrimaryTitle(p);
                  const subtitle = getHappeningSubtitle(p);
                  const body = getHappeningBody(p);

                  return (
                    <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                      <div className="home-card-main">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div className="home-card-title">{primaryTitle}</div>
                          <span className="pill host">
                            <span>🌿</span>
                            <span>You’re hosting</span>
                          </span>
                        </div>

                        <div className="home-card-meta">{subtitle}</div>
                        {body ? <div className="home-card-body">{body}</div> : null}

                        <div className="rsvp-row">
                          <div className="rsvp-buttons">
                            <motion.button
                              type="button"
                              className={"rsvp-btn" + (rsvpState.choice === "going" ? " is-on" : "")}
                              onClick={() => handleRsvp(p, "going")}
                              {...rsvpMotionProps}
                            >
                              <span>👍</span>
                              <span>Going</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              className={"rsvp-btn" + (rsvpState.choice === "cant" ? " is-on" : "")}
                              onClick={() => handleRsvp(p, "cant")}
                              {...rsvpMotionProps}
                            >
                              <span>❌</span>
                              <span>Can't go</span>
                            </motion.button>
                          </div>

                          <div className="rsvp-meta-right">
                            {summary && <div className="rsvp-summary">{summary}</div>}
                            <button type="button" className="rsvp-view-btn" onClick={() => openRsvpDetails(p)}>
                              <span aria-hidden>👀</span>
                              <span>View RSVPs</span>
                            </button>
                          </div>
                        </div>

                        <div className="manage-row">
                          <button type="button" className="manage-link" onClick={() => handleEditPost(p)}>
                            <span className="icon">✏️</span>
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openReplies(p)}
                            style={{
                              borderRadius: 999,
                              border: "1px solid rgba(15,23,42,.08)",
                              padding: "7px 12px",
                              background: "rgba(255,255,255,0.92)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#0f172a",
                            }}
                          >
                            <span aria-hidden>💬</span>
                            <span>
                              {replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Open replies"}
                            </span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="pill happening">Now</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {myFutureEvents.length > 0 && (
              <div className="subpanel">
                <div className="subpanel-head">
                  <div className="subpanel-left">
                    <span className="subpill future">
                      <span aria-hidden>📅</span>
                      <span>Future events</span>
                      <span className="muted">· {myFutureEvents.length}</span>
                    </span>
                    <div className="subhint">Your scheduled events with RSVP counts.</div>
                  </div>
                </div>

                {myFutureEvents.map((p) => {
                  const keyId = getRsvpStateKey(p);
                  const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                    choice: null,
                    counts: { going: 0, maybe: 0, cant: 0 },
                  };
                  const summary = formatRsvpSummary(rsvpState.counts);
                  const categoryMeta = p.category && CATEGORY_META[p.category] ? CATEGORY_META[p.category] : null;

                  return (
                    <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                      <div className="home-card-main">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div className="home-card-title">{p.title || "Event"}</div>
                          <span className="pill host">
                            <span>🌿</span>
                            <span>You’re hosting</span>
                          </span>
                        </div>

                        <div className="home-card-meta">
                          {p.when ? formatEventWhen(p.when) : "Time TBA"}
                          {p.createdBy?.label ? ` · from ${p.createdBy.label}` : ""}
                        </div>

                        {categoryMeta && (
                          <div className="home-card-meta">
                            {categoryMeta.emoji} {categoryMeta.label}
                          </div>
                        )}

                        <div className="home-card-body">{p.details}</div>

                        <div className="rsvp-row">
                          <div className="rsvp-buttons">
                            <motion.button
                              type="button"
                              className={"rsvp-btn" + (rsvpState.choice === "going" ? " is-on" : "")}
                              onClick={() => handleRsvp(p, "going")}
                              {...rsvpMotionProps}
                            >
                              <span>👍</span>
                              <span>Going</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              className={"rsvp-btn" + (rsvpState.choice === "maybe" ? " is-on" : "")}
                              onClick={() => handleRsvp(p, "maybe")}
                              {...rsvpMotionProps}
                            >
                              <span>❓</span>
                              <span>Maybe</span>
                            </motion.button>

                            <motion.button
                              type="button"
                              className={"rsvp-btn" + (rsvpState.choice === "cant" ? " is-on" : "")}
                              onClick={() => handleRsvp(p, "cant")}
                              {...rsvpMotionProps}
                            >
                              <span>❌</span>
                              <span>Can't go</span>
                            </motion.button>
                          </div>

                          <div className="rsvp-meta-right">
                            {summary && <div className="rsvp-summary">{summary}</div>}
                            <button type="button" className="rsvp-view-btn" onClick={() => openRsvpDetails(p)}>
                              <span aria-hidden>👀</span>
                              <span>View RSVPs</span>
                            </button>
                          </div>
                        </div>

                        <div className="manage-row">
                          <button type="button" className="manage-link" onClick={() => handleEditPost(p)}>
                            <span className="icon">✏️</span>
                            <span>Edit</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="pill event">Future</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* -------- 4) Messages -------- */}
      <section className="home-section" style={{ marginTop: 6 }}>
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowDM((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon messages">💬</span>
              <span>Messages</span>
              <span className="section-count">{dmCount}</span>
            </div>
            <span className={"chevron " + (showDM ? "" : "closed")}>{showDM ? "⌃" : "⌄"}</span>
          </button>

          <button
            type="button"
            className={"view-all" + (!hasMessages ? " is-disabled" : "")}
            onClick={() => {
              if (hasMessages) navigate("/messages");
            }}
          >
            <span>View all</span>
            <span aria-hidden>↗</span>
          </button>
        </div>

        {showDM && (
          <>
            {sortedThreads.length === 0 && <div className="empty">No messages yet. Start a message from the People tab.</div>}

            {sortedThreads.slice(0, 5).map((t) => (
              <motion.button
                key={t.id}
                className="home-card"
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() =>
                  navigate("/messages", {
                    state: { recipients: t.participants },
                  })
                }
                {...cardMotionProps}
              >
                <div className="home-card-main">
                  <div className="home-card-title">{otherParticipantsLabel(t)}</div>
                  <div className="home-card-meta">
                    {t.lastMessage ? `Last message · ${formatTimeShort(t.lastMessage.ts)}` : formatTimeShort(t.ts)}
                  </div>
                  {t.lastMessage && <div className="home-card-body">{truncate(t.lastMessage.body, 140)}</div>}
                </div>
              </motion.button>
            ))}
          </>
        )}
      </section>


      {/* RSVP detail bottom sheet */}
      <RsvpDetailsSheet
        open={!!rsvpDetailEvent}
        post={rsvpDetailEvent}
        buckets={rsvpDetailBuckets}
        loading={rsvpDetailLoading}
        error={rsvpDetailError}
        onClose={closeRsvpDetails}
      />

      {/* Replies bottom sheet */}
      <HappeningRepliesSheet
        open={!!activeHappening}
        post={activeHappening}
        replies={activeReplies}
        draft={replyDraft}
        onDraftChange={setReplyDraft}
        onClose={closeReplies}
        onSend={handleSendReply}
        onQuickReply={handleQuickReply}
        quickOptions={QUICK_HAPPENING_REPLIES}
      />
    </div>
  );
}

/* ---------- RSVP Detail Bottom Sheet ---------- */

type RsvpDetailsSheetProps = {
  open: boolean;
  post: Post | null;
  buckets: EventRsvpBuckets | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
};

function RsvpDetailsSheet({ open, post, buckets, loading, error, onClose }: RsvpDetailsSheetProps) {
  if (!open || !post) return null;

  // ✅ tolerate different backend naming: cant vs declined
  const anyBuckets = buckets as any;
  const going = (anyBuckets?.going ?? []) as any[];
  const maybe = (anyBuckets?.maybe ?? []) as any[];
  const cant = (anyBuckets?.cant ?? anyBuckets?.declined ?? anyBuckets?.["can't"] ?? []) as any[];

  // ✅ total from backend buckets only (no fake local "selfRow" injection)
  const total = going.length + maybe.length + cant.length;

  const subtitle =
    post.kind === "event" ? (post.when ? new Date(post.when).toLocaleString() : "Time TBA") : "Happening now";

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 75,
        background: "rgba(15,23,42,.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "min(720px, 100%)",
          maxHeight: "80vh",
          background: "#ffffff",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: "0 -18px 40px rgba(15,23,42,.30)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, margin: "0 auto 6px", background: "#e5e7eb" }} />

        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            RSVPs
          </div>
          {post.title && <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{post.title}</h3>}
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{subtitle}</div>

          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            {total > 0 ? `${total} household${total === 1 ? "" : "s"} responded` : "No RSVPs yet."}
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: "8px 0",
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            flex: 1,
            minHeight: 120,
            maxHeight: 360,
            overflowY: "auto",
          }}
        >
          {loading && <div style={{ fontSize: 13, color: "#6b7280" }}>Loading RSVPs…</div>}
          {!loading && error && <div style={{ fontSize: 13, color: "#b91c1c" }}>{error}</div>}
          {!loading && !error && (
            <div style={{ display: "grid", gap: 12 }}>
              <RsvpBucketSection label="Going" emoji="✅" items={going} />
              <RsvpBucketSection label="Maybe" emoji="🤔" items={maybe} />
              <RsvpBucketSection label="Can't go" emoji="🚫" items={cant} />
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              fontSize: 13,
              fontWeight: 700,
              color: "#374151",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- RSVP Bucket Section (MiniHouseholdCard) ---------- */

type RsvpBucketSectionProps = {
  label: string;
  emoji: string;
  items: any[];
};

function RsvpBucketSection({ label, emoji, items }: RsvpBucketSectionProps) {
  if (!items || items.length === 0) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 4 }}>
          {emoji} {label} (0)
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>No households yet.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 800, color: "#334155", marginBottom: 8 }}>
        {emoji} {label} ({items.length})
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((h) => {
          const lastName = (h as any).lastName ?? (h as any).last_name ?? "Household";
          const householdType = (h as any).householdType ?? (h as any).household_type ?? null;

          const rawNeighborhood =
            (h as any).neighborhood ?? (h as any).neighborhood_name ?? (h as any).neighborhoodLabel ?? null;

          const neighborhood = neighborhoodDisplayLabel(rawNeighborhood);

          const childAges = (h as any).childAges ?? (h as any).child_ages ?? [];
          const childSexes = (h as any).childSexes ?? (h as any).child_sexes ?? [];

          const hid = (h as any).householdId ?? (h as any).household_id ?? "hid";
          const uid = (h as any).uid ?? (h as any).id ?? "uid";

          return (
            <MiniHouseholdCard
              key={`${hid}-${uid}-${label}`}
              lastName={lastName}
              householdType={householdType}
              neighborhood={neighborhood}
              childAges={childAges}
              childSexes={childSexes}
              statusLabel={label}
              statusEmoji={emoji}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Happening Now Replies Bottom Sheet ---------- */

type HappeningRepliesSheetProps = {
  open: boolean;
  post: Post | null;
  replies: HappeningReply[];
  draft: string;
  onDraftChange: (v: string) => void;
  onClose: () => void;
  onSend: () => void;
  onQuickReply: (text: string) => void;
  quickOptions: string[];
};

function HappeningRepliesSheet({
  open,
  post,
  replies,
  draft,
  onDraftChange,
  onClose,
  onSend,
  onQuickReply,
  quickOptions,
}: HappeningRepliesSheetProps) {
  if (!open || !post) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(15,23,42,.45)",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          bottom: 0,
          width: "min(720px, 100%)",
          maxHeight: "80vh",
          background: "#ffffff",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          boxShadow: "0 -18px 40px rgba(15,23,42,.30)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 999, margin: "0 auto 6px", background: "#e5e7eb" }} />

        <div style={{ marginBottom: 6 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: ".08em",
              color: "#6b7280",
              marginBottom: 4,
            }}
          >
            Happening now
          </div>
          {post.title && <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{post.title}</h3>}
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{post.details}</div>
        </div>

        <div
          style={{
            marginTop: 8,
            padding: "8px 0",
            borderTop: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
            flex: 1,
            minHeight: 80,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {replies.length === 0 ? (
            <div style={{ fontSize: 13, color: "#6b7280" }}>
              No replies yet. Be the first to say you’re coming or ask a quick question.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {replies.map((r) => (
                <div key={r.id} style={{ padding: 10, borderRadius: 14, background: "#f8fafc" }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>{r.authorLabel}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.35 }}>{r.body}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 8 }}>
          <textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            rows={2}
            placeholder="Say you're coming, ask a quick question…"
            style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              fontSize: 14,
              padding: 12,
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,.10)",
              resize: "none",
            }}
          />
          <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {quickOptions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuickReply(q)}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(15,23,42,.08)",
                  background: "rgba(255,255,255,0.92)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 800,
                  color: "#0f172a",
                }}
              >
                {q}
              </button>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 700,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSend}
              disabled={!draft.trim()}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "none",
                background: draft.trim() ? "#10b981" : "#9ca3af",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 900,
                cursor: draft.trim() ? "pointer" : "default",
                boxShadow: draft.trim() ? "0 10px 18px rgba(16,185,129,0.24)" : "none",
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
