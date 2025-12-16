// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getViewer } from "../lib/viewer";
import { loadNeighbors } from "../lib/profile";
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

/* ---------- New neighbors ---------- */

type NewNeighbor = {
  id: string;
  label: string;
  neighborhood?: string | null;
  joinedAt?: number;
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
  help: { emoji: "🤝", label: "Help & favors" },
  pet: { emoji: "🐶", label: "Pets" },
  other: { emoji: "✨", label: "Other" },
};

/* Category filter for Future Events */
type EventFilter = "all" | EventCategory;

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
  if (diffDays < 7) {
    return "Joined " + d.toLocaleDateString([], { weekday: "short" });
  }
  if (diffDays < 365) {
    return "Joined " + d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
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
    // ✅ IMPORTANT: id is the canonicalEventId so RSVP calls are stable for future events
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
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.2, ease: "easeOut" as const },
  whileTap: { scale: 0.97 },
};

const rsvpMotionProps = {
  whileTap: { scale: 0.94 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

const chipMotionProps = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.03 },
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

function bucketsToCounts(buckets: any): EventRsvpCounts {
  const going = (buckets?.going ?? []) as any[];
  const maybe = (buckets?.maybe ?? []) as any[];
  const cant = (buckets?.cant ?? buckets?.declined ?? buckets?.["can't"] ?? []) as any[];
  return { going: going.length || 0, maybe: maybe.length || 0, cant: cant.length || 0 };
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
  const [newNeighbors, setNewNeighbors] = useState<NewNeighbor[]>([]);
  const [eventRsvps, setEventRsvps] = useState<EventRsvpMap>({});
  const [now, setNow] = useState(() => Date.now());

  // ✅ default open
  const [showActivity, setShowActivity] = useState(true);
  const [showNewNeighbors, setShowNewNeighbors] = useState(true);
  const [showDM, setShowDM] = useState(true);
  const [showHappening, setShowHappening] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const [eventCategoryFilter, setEventCategoryFilter] = useState<EventFilter>("all");

  const [replies, setReplies] = useState<HappeningReply[]>(() => loadHappeningRepliesFromStorage());
  const [activeHappening, setActiveHappening] = useState<Post | null>(null);
  const [replyDraft, setReplyDraft] = useState("");

  // RSVP detail drawer state
  const [rsvpDetailEvent, setRsvpDetailEvent] = useState<Post | null>(null);
  const [rsvpDetailBuckets, setRsvpDetailBuckets] = useState<EventRsvpBuckets | null>(null);
  const [rsvpDetailLoading, setRsvpDetailLoading] = useState(false);
  const [rsvpDetailError, setRsvpDetailError] = useState<string | null>(null);
  const [rsvpDetailInline, setRsvpDetailInline] = useState<EventRsvpState | null>(null);

  const refreshHomeEvents = async () => {
    const events = await fetchEvents();

    // ✅ hide canceled events if backend returns them
    const activeOnly = events.filter((ev) => {
      const s = String((ev as any)?.status ?? "").toLowerCase();
      if (!s) return true;
      return !(s === "canceled" || s === "cancelled");
    });

    const backendPosts = activeOnly.map(mapEventToPost);
    const localPosts = loadLocalPosts();

    // ✅ merge by canonical event id (Post.id)
    const merged = new Map<string, Post>();
    for (const p of backendPosts) merged.set(p.id, p);
    for (const p of localPosts) merged.set(p.id, p);

    setPosts(Array.from(merged.values()));
  };

  const replyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of replies) {
      map[r.postId] = (map[r.postId] || 0) + 1;
    }
    return map;
  }, [replies]);

  const activeReplies = useMemo(
    () =>
      activeHappening
        ? replies.filter((r) => r.postId === activeHappening.id).sort((a, b) => a.ts - b.ts)
        : [],
    [activeHappening, replies]
  );

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

    const key = getRsvpStateKey(post);
    setRsvpDetailInline(eventRsvps[key] ?? null);

    // ✅ Happening Now RSVPs are LOCAL ONLY (no backend calls)
    if (post.kind === "happening") {
      setRsvpDetailLoading(false);
      return;
    }

    setRsvpDetailLoading(true);

    void (async () => {
      try {
        const buckets = await getEventRsvps(key);
        setRsvpDetailBuckets(buckets as any);

        // also update counts locally from backend truth
        const counts = bucketsToCounts(buckets as any);
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
    setRsvpDetailInline(null);
  };

  useEffect(() => {
    void (async () => {
      try {
        await refreshHomeEvents();
        const existing = loadRsvps();
        setEventRsvps(existing);
        saveRsvps(existing);
      } catch (err) {
        console.error("Failed to fetch events for Home", err);
        setPosts(loadLocalPosts());
        setEventRsvps(loadRsvps());
      }
    })();

    setThreads(loadDMThreads());

    const demoNeighbors = loadNeighbors() || [];
    const mappedNeighbors: NewNeighbor[] = demoNeighbors.map((n: any) => {
      const joinedAt = typeof n.joinedAt === "number" && !Number.isNaN(n.joinedAt) ? n.joinedAt : undefined;

      return {
        id: n.id ?? n.email ?? n.lastName ?? `neighbor-${Math.random()}`,
        label: n.lastName ?? n.last_name ?? n.name ?? (n.email ? n.email.split("@")[0] : "Household"),
        neighborhood: n.neighborhood ?? null,
        joinedAt,
      };
    });
    setNewNeighbors(mappedNeighbors);

    const stored = loadCollapse();
    if (stored) {
      setShowDM(stored.dm ?? true);
      setShowHappening(stored.happening ?? true);
      setShowEvents(stored.events ?? true);
      setShowNewNeighbors(stored.newNeighbors ?? true);
      setShowActivity(stored.activity ?? true);
    }

    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    saveCollapse({
      dm: showDM,
      happening: showHappening,
      events: showEvents,
      newNeighbors: showNewNeighbors,
      activity: showActivity,
    });
  }, [showDM, showHappening, showEvents, showNewNeighbors, showActivity]);

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

  const { myHappeningNow, myFutureEvents } = useMemo(() => {
    if (!viewer || !viewerId) {
      return { myHappeningNow: [] as Post[], myFutureEvents: [] as Post[] };
    }

    const viewerLabel = viewer.label ?? viewer.name ?? viewer.lastName ?? viewer.email ?? null;

    const isHost = (p: Post) => {
      const hostUid = p._hostUid;
      if (hostUid && viewerId && hostUid === viewerId) return true;

      if (!p.createdBy) return false;
      if (p.createdBy.id && p.createdBy.id === viewerId) return true;
      if (viewerLabel && p.createdBy.label === viewerLabel) return true;
      return false;
    };

    return {
      myHappeningNow: happeningNow.filter(isHost),
      myFutureEvents: upcomingEvents.filter(isHost),
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

  const recentNeighbors = useMemo(() => {
    const nowMs = now;
    const cutoffMs = 14 * DAY_MS;

    return newNeighbors
      .filter((n) => typeof n.joinedAt === "number" && nowMs - n.joinedAt >= 0 && nowMs - n.joinedAt <= cutoffMs)
      .sort((a, b) => b.joinedAt! - a.joinedAt!);
  }, [newNeighbors, now]);

  const activityCount = myHappeningNow.length + myFutureEvents.length;
  const newNeighborCount = recentNeighbors.length;
  const dmCount = sortedThreads.length;
  const happeningCount = happeningNow.length;
  const futureEventsCount = upcomingEvents.length;

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

    // ✅ Happening Now: local only (no backend call)
    if (post.kind === "happening") return;

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

  return (
    <div className="gg-page" style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        @keyframes gg-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .gg-page { animation: gg-page-in .32s ease-out; }

        .home-title { font-size: 30px; font-weight: 800; letter-spacing: .02em; color: #0f172a; margin: 0; }
        .home-sub { font-size: 14px; color: #6b7280; margin: 2px 0 6px; }

        .welcome-card {
          border-radius: 16px; border: 1px solid #A7F3D0; background: #ffffff;
          padding: 14px 16px; margin-bottom: 18px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          display:flex; justify-content:space-between; align-items:flex-start; gap:10px;
        }
        .welcome-main { flex:1; min-width:0; }
        .welcome-title { font-weight: 700; margin-bottom: 4px; font-size: 15px; display:flex; align-items:center; gap:6px; color:#065F46; }
        .welcome-body { font-size: 14px; color:#374151; }
        .welcome-pill {
          font-size: 11px; padding: 4px 10px; border-radius: 999px;
          border: 1px solid #BBF7D0; background: #F0FDF4; color:#047857;
          white-space:nowrap; cursor:pointer;
        }

        .home-section-title { font-size: 18px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 8px; }
        .section-icon {
          width: 26px; height: 26px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 14px; background: #eef2ff; color: #1d4ed8;
        }
        .section-icon.activity { background: #ecfdf5; color: #047857; }
        .section-icon.neighbors { background: #fefce8; color: #a16207; }
        .section-icon.messages { background: #eff6ff; color: #1d4ed8; }
        .section-icon.happening { background: #f5f3ff; color: #7c3aed; }
        .section-icon.events { background: #f0f9ff; color: #0369a1; }

        .section-count { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f3f4f6; color: #374151; }

        .home-section { margin-bottom: 18px; }
        .home-card {
          border-radius: 14px;
          border: 1px solid rgba(15,23,42,.08);
          background: rgba(255,255,255,0.96);
          padding: 12px 14px;
          margin-bottom: 8px;
          box-shadow: 0 4px 12px rgba(15,23,42,.04);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          transition: box-shadow .15s ease;
        }
        .home-card:hover { box-shadow: 0 8px 18px rgba(15,23,42,.10); }

        .home-card-main { flex: 1; min-width: 0; }
        .home-card-title { font-weight: 600; margin-bottom: 2px; font-size: 15px; }
        .home-card-meta { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .home-card-body { font-size: 14px; color: #0f172a; }
        .home-card-body--neighbor { font-size: 13px; color: #4b5563; }

        .pill { font-size: 11px; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(148,163,184,.6); color: #0f172a; white-space: nowrap; }
        .pill.happening { background: #ecfeff; border-color: #a5f3fc; }
        .pill.event { background: #fefce8; border-color: #facc15; }
        .pill.host {
          background:#ecfdf5; border-color:#6ee7b7; color:#047857;
          font-size: 11px; padding: 3px 8px; border-radius:999px;
          display:inline-flex; align-items:center; gap:4px;
        }

        .empty { font-size: 14px; color: #6b7280; padding: 8px 2px; }

        .view-all {
          font-size: 12px; color: #4f46e5; cursor: pointer; font-weight: 600;
          background: #eef2ff; border-radius: 999px;
          border: 1px solid rgba(129,140,248,0.7);
          padding: 4px 10px;
          display: inline-flex; align-items: center; gap: 4px;
          transition: background .12s ease, box-shadow .12s ease, transform .12s ease, opacity .12s ease;
        }
        .view-all:hover { background: #e0e7ff; box-shadow: 0 6px 14px rgba(79,70,229,0.20); transform: translateY(-1px); }
        .view-all.is-disabled { opacity: 0.4; cursor: default; box-shadow: none; transform: none; background: #eef2ff; }

        .section-header-row { display:flex; justify-content:space-between; align-items:center; gap:8px; margin: 18px 0 8px; }
        .section-toggle { display:inline-flex; align-items:center; gap:6px; border:0; padding:0; background:transparent; cursor:pointer; }

        .chevron { font-size: 13px; color:#64748b; transition: transform .15s ease; }
        .chevron.closed { transform: rotate(180deg); }

        .rsvp-row {
          display:flex; flex-wrap:wrap; gap:6px; align-items:center;
          margin-top:8px; justify-content:space-between;
        }
        .rsvp-buttons { display:flex; flex-wrap:wrap; gap:6px; }

        .rsvp-btn {
          font-size: 11px; padding: 5px 11px; border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.6);
          background:#ffffff; color:#0f172a; cursor:pointer;
          display:inline-flex; align-items:center; gap:4px;
          transition: box-shadow .12s ease, transform .12s ease, border-color .12s ease, background-color .12s ease;
        }
        .rsvp-btn:hover { box-shadow: 0 6px 14px rgba(15,23,42,.06); background:#f9fafb; transform: translateY(-1px); }
        .rsvp-btn.is-on {
          background:#ffffff; border-color:#2563eb; border-width:2px; color:#0f172a;
          box-shadow:none; transform: translateY(-1px);
        }

        .rsvp-summary { font-size: 12px; color:#6b7280; }
        .rsvp-meta-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

        .rsvp-view-btn {
          font-size: 11px; padding: 5px 10px; border-radius: 999px;
          border: 1px solid #e5e7eb;
          background:#ffffff; color:#111827; cursor:pointer;
          display:inline-flex; align-items:center; gap:4px;
        }

        .manage-row { display:flex; flex-wrap:wrap; gap:12px; margin-top:10px; }
        .manage-link {
          font-size:12px; color:#4b5563; display:inline-flex; align-items:center; gap:4px;
          cursor:pointer; background:transparent; border:0; padding:0;
        }
        .manage-link .icon { font-size:14px; }

        .event-filter-row { display:flex; flex-wrap:wrap; gap:8px; margin: 4px 0 10px; }
        .event-filter-chip {
          padding: 6px 12px; border-radius: 999px;
          border: 1px solid rgba(148,163,184,0.6);
          font-size: 12px; display: inline-flex; align-items: center; gap: 6px;
          background: #ffffff; color: #0f172a; cursor: pointer;
          transition: box-shadow .12s ease, transform .12s ease, border-color .12s ease, background-color .12s ease;
        }
        .event-filter-chip:focus, .event-filter-chip:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(148,163,184,0.55); }
        .event-filter-chip:hover { box-shadow: 0 6px 14px rgba(15,23,42,.06); transform: translateY(-1px); }
        .event-filter-chip.is-active {
          background: #ffffff; border-color: #2563eb; border-width: 2px;
          color: #0f172a; box-shadow: none; transform: translateY(-1px);
        }

        @media (max-width: 520px) {
          .rsvp-row { flex-direction:column; align-items:flex-start; }
          .rsvp-meta-right { align-items:flex-start; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <img src={Logo} alt="GatherGrove logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <h2 className="home-title">Home</h2>
      </div>
      <p className="home-sub">
        Home shows your activity, new neighbors, your messages, and any Happening Now posts or Future Events that include
        your household.
      </p>

      <button
        type="button"
        onClick={() => setShowWelcome(true)}
        style={{
          fontSize: 12,
          color: "#4f46e5",
          border: "none",
          background: "transparent",
          padding: 0,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
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
              🌿 <strong>Your Activity</strong> for anything you’re hosting with live RSVP counts
              <br />
              👋 new neighbors
              <br />
              💬 messages
              <br />
              ⚡ Happening Now posts
              <br />
              📅 Future Events you’re invited to
            </div>
          </div>
          <button type="button" className="welcome-pill" onClick={handleDismissWelcome}>
            Got it
          </button>
        </div>
      )}

      {/* -------- 2) Your Activity -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowActivity((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon activity">🌿</span>
              <span>Your Activity</span>
              <span className="section-count">{activityCount}</span>
            </div>
            <span className={"chevron " + (showActivity ? "" : "closed")}>{showActivity ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showActivity && (
          <>
            {myHappeningNow.length === 0 && myFutureEvents.length === 0 && (
              <div className="empty">
                Nothing hosted yet. When you post a ⚡ Happening Now or create a 📅 Future Event, it will appear here with
                live RSVP counts.
              </div>
            )}

            {/* Your Happening Now */}
            {myHappeningNow.map((p) => {
              const keyId = getRsvpStateKey(p);
              const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                choice: null,
                counts: { going: 0, maybe: 0, cant: 0 },
              };
              const summary = formatHappeningSummary(rsvpState.counts);
              const replyCount = replyCounts[p.id] || 0;

              return (
                <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                  <div className="home-card-main">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      {p.title && <div className="home-card-title">{p.title}</div>}
                      <span className="pill host">
                        <span>🌿</span>
                        <span>You’re hosting</span>
                      </span>
                    </div>
                    <div className="home-card-meta">
                      {formatTimeShort(p.ts)}
                      {p.createdBy?.label ? ` · from ${p.createdBy.label}` : ""}
                    </div>
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

                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <button type="button" className="manage-link" onClick={() => handleEditPost(p)}>
                        <span className="icon">✏️</span>
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openReplies(p)}
                        style={{
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          padding: "6px 10px",
                          background: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontSize: 13,
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

            {/* Your Future Events */}
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
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
          </>
        )}
      </section>

      {/* -------- 3) New neighbors -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowNewNeighbors((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon neighbors">👋</span>
              <span>New neighbors</span>
              <span className="section-count">{newNeighborCount}</span>
            </div>
            <span className={"chevron " + (showNewNeighbors ? "" : "closed")}>{showNewNeighbors ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showNewNeighbors && (
          <>
            {recentNeighbors.length === 0 && (
              <div className="empty">
                No neighbors have joined in the last couple weeks. When a new household signs up, you’ll see them here.
              </div>
            )}

            {recentNeighbors.slice(0, 5).map((n) => {
              const joinedLabel = formatJoinedRelative(n.joinedAt, now);
              const neighborhoodLabel = n.neighborhood || "New household";
              const metaLabel = joinedLabel ? `${neighborhoodLabel} · ${joinedLabel}` : neighborhoodLabel;

              const isNew = typeof n.joinedAt === "number" && now - n.joinedAt >= 0 && now - n.joinedAt <= 7 * DAY_MS;

              return (
                <motion.div key={n.id} className="home-card" {...cardMotionProps}>
                  <div className="home-card-main">
                    <div className="home-card-title">{n.label}</div>
                    <div className="home-card-meta">{metaLabel}</div>
                    <div className="home-card-body home-card-body--neighbor">
                      Just joined GatherGrove. Say hello in person or send a quick message from the People tab.
                    </div>
                  </div>
                  <div>{isNew && <span className="pill">New</span>}</div>
                </motion.div>
              );
            })}
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

      {/* -------- 5) Happening Now -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowHappening((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon happening">⚡</span>
              <span>Happening Now</span>
              <span className="section-count">{happeningCount}</span>
            </div>
            <span className={"chevron " + (showHappening ? "" : "closed")}>{showHappening ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showHappening && (
          <>
            {happeningNow.length === 0 && <div className="empty">No live happenings that involve you right now.</div>}

            {happeningNow.map((p) => {
              const keyId = getRsvpStateKey(p);
              const rsvpState: EventRsvpState = eventRsvps[keyId] ?? {
                choice: null,
                counts: { going: 0, maybe: 0, cant: 0 },
              };
              const summary = formatHappeningSummary(rsvpState.counts);
              const replyCount = replyCounts[p.id] || 0;

              return (
                <motion.div key={p.id} className="home-card" {...cardMotionProps}>
                  <div className="home-card-main">
                    {p.title && <div className="home-card-title">{p.title}</div>}

                    <div className="home-card-meta">
                      {formatTimeShort(p.ts)}
                      {p.createdBy?.label ? ` · from ${p.createdBy.label}` : ""}
                    </div>

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

                    <div
                      style={{
                        marginTop: 10,
                        paddingTop: 8,
                        borderTop: "1px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "flex-start",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openReplies(p)}
                        style={{
                          borderRadius: 999,
                          border: "1px solid #e5e7eb",
                          padding: "6px 10px",
                          background: "#fff",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                      >
                        <span aria-hidden>💬</span>
                        <span>{replyCount > 0 ? `${replyCount} repl${replyCount === 1 ? "y" : "ies"}` : "Join chat"}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="pill happening">Now</span>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </section>

      {/* -------- 6) Future Events -------- */}
      <section className="home-section" style={{ marginBottom: 24 }}>
        <div className="section-header-row">
          <button type="button" className="section-toggle" onClick={() => setShowEvents((v) => !v)}>
            <div className="home-section-title">
              <span className="section-icon events">📅</span>
              <span>Future Events</span>
              <span className="section-count">{futureEventsCount}</span>
            </div>
            <span className={"chevron " + (showEvents ? "" : "closed")}>{showEvents ? "⌃" : "⌄"}</span>
          </button>
        </div>

        {showEvents && (
          <>
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

            {filteredUpcomingEvents.length === 0 && (
              <div className="empty">No {currentFilterLabel} that include you yet.</div>
            )}

            {filteredUpcomingEvents.map((p) => {
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
        inlineRsvp={rsvpDetailInline}
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
  inlineRsvp: EventRsvpState | null;
  onClose: () => void;
};

function RsvpDetailsSheet({ open, post, buckets, loading, error, inlineRsvp, onClose }: RsvpDetailsSheetProps) {
  if (!open || !post) return null;

  // ✅ tolerate different backend naming: cant vs declined
  const anyBuckets = buckets as any;
  let going = (anyBuckets?.going ?? []) as any[];
  let maybe = (anyBuckets?.maybe ?? []) as any[];
  let cant = (anyBuckets?.cant ?? anyBuckets?.declined ?? anyBuckets?.["can't"] ?? []) as any[];

  // For Happening Now, backend buckets are usually empty because we’re local-only
  // We'll compute "responded" from local inline counts.
  const inlineCounts = inlineRsvp?.counts ?? { going: 0, maybe: 0, cant: 0 };
  const inlineResponded = inlineCounts.going + inlineCounts.maybe + inlineCounts.cant;

  let total = (going?.length || 0) + (maybe?.length || 0) + (cant?.length || 0);

  // If backend returns no households but local RSVP state exists, show "Your household"
  if (total === 0 && inlineResponded > 0) {
    const selfRow: any = {
      uid: "self",
      householdId: "self",
      lastName: "Your household",
      neighborhood: null,
      householdType: null,
      childAges: [] as number[],
      childSexes: [] as (string | null)[],
    };

    if (inlineCounts.going > 0) going = [selfRow];
    if (inlineCounts.maybe > 0) maybe = [selfRow];
    if (inlineCounts.cant > 0) cant = [selfRow];

    total = (going?.length || 0) + (maybe?.length || 0) + (cant?.length || 0);
  }

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
          {post.title && <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{post.title}</h3>}
          <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{subtitle}</div>

          {post.kind === "happening" && (
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              Local RSVP preview (Happening Now RSVPs aren’t synced across browsers yet).
            </div>
          )}

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
              fontWeight: 500,
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
        <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", marginBottom: 4 }}>
          {emoji} {label} (0)
        </div>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>No households yet.</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", marginBottom: 8 }}>
        {emoji} {label} ({items.length})
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((h) => {
          const lastName = (h as any).lastName ?? (h as any).last_name ?? "Household";
          const householdType = (h as any).householdType ?? (h as any).household_type ?? null;
          const neighborhood = (h as any).neighborhood ?? null;

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
          {post.title && <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>{post.title}</h3>}
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
                <div key={r.id} style={{ padding: 8, borderRadius: 12, background: "#f9fafb" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", marginBottom: 2 }}>{r.authorLabel}</div>
                  <div style={{ fontSize: 13, color: "#374151" }}>{r.body}</div>
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
              padding: 10,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              resize: "none",
            }}
          />
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quickOptions.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onQuickReply(q)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  fontSize: 12,
                  cursor: "pointer",
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
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 8,
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                fontSize: 13,
                fontWeight: 500,
                color: "#374151",
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
                fontWeight: 600,
                cursor: draft.trim() ? "pointer" : "default",
                boxShadow: draft.trim() ? "0 8px 16px rgba(16,185,129,0.24)" : "none",
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