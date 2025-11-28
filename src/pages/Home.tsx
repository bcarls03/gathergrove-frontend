// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getViewer } from "../lib/viewer";
import { loadNeighbors } from "../lib/profile";
import { fetchEvents, type GGEvent, type EventCategory } from "../lib/api";
import Logo from "../assets/gathergrove-logo.png";

/* ---------- Posts (Happening / Event) ---------- */

type Post = {
  id: string;
  kind: "happening" | "event";
  title?: string;
  when?: string;
  details: string;
  recipients?: string[]; // labels (fallback)
  recipientIds?: string[]; // ids (authoritative)
  createdBy?: { id: string; label: string };
  ts: number;
  // Optional host uid from backend so "Your Activity" can detect hosted events
  _hostUid?: string | null;
  // Optional category for events (neighborhood, playdate, help, pet, other)
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
  choice: RSVPChoice | null; // this viewer's choice
  counts: EventRsvpCounts; // simple aggregate counts for demo
};

type EventRsvpMap = Record<string, EventRsvpState>;

const RSVP_KEY = "gg:eventRsvps";

/* ---------- Storage keys ---------- */

const DM_KEY = "gg:dmThreads";
/* local posts key used by ComposePost */
const POSTS_KEY = "gg:posts";

/* collapse state in localStorage */
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

/* NEW: load local posts created in ComposePost (future + happening) */
const loadLocalPosts = (): Post[] => {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY) || "[]");
  } catch {
    return [];
  }
};

/* ---------- Helpers ---------- */

function isPostRelevantToViewer(post: Post, viewer: any | null): boolean {
  if (!viewer) return true; // if we don't know who you are, show everything

  const vid = viewer.id ?? viewer.uid ?? viewer.email ?? null;
  const vLabel = viewer.label ?? viewer.name ?? viewer.lastName ?? null;

  const ids = post.recipientIds || [];
  const labels = post.recipients || [];

  const isBroadcast = ids.length === 0 && labels.length === 0;

  if (isBroadcast) return true;
  if (
    post.createdBy &&
    (post.createdBy.id === vid || post.createdBy.label === vLabel)
  )
    return true;
  if (vid && ids.includes(vid)) return true;
  if (vLabel && labels.includes(vLabel)) return true;

  return false;
}

function formatTimeShort(ts: number): string {
  const d = new Date(ts);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

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

/**
 * formatJoinedRelative
 * - "Joined today"
 * - "Joined yesterday"
 * - "Joined Tue"
 * - "Joined Nov 3"
 * - "Joined Nov 3, 2024" (for older than a year, just in case)
 */
function formatJoinedRelative(
  joinedAt?: number,
  nowMs?: number
): string | null {
  if (!joinedAt) return null;
  const now = nowMs ?? Date.now();
  const diffMs = now - joinedAt;
  if (diffMs < 0) return null;

  const diffDays = Math.floor(diffMs / DAY_MS);
  const d = new Date(joinedAt);

  if (diffDays === 0) return "Joined today";
  if (diffDays === 1) return "Joined yesterday";
  if (diffDays < 7) {
    // within the last week
    return (
      "Joined " +
      d.toLocaleDateString([], {
        weekday: "short",
      })
    );
  }
  if (diffDays < 365) {
    return (
      "Joined " +
      d.toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })
    );
  }
  return (
    "Joined " +
    d.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  );
}

/* ---------- Map backend events → Home posts ---------- */

function mapEventToPost(ev: GGEvent): Post {
  const anyEv = ev as any;

  // Decide kind used by Home buckets
  const kind: "happening" | "event" =
    ev.type === "future" ? "event" : "happening";

  const startIso = ev.startAt ?? null;
  const expiresIso = anyEv.expiresAt ?? null;
  const endIso = ev.endAt ?? null;

  const primaryIso = startIso ?? expiresIso ?? endIso ?? null;

  const ts =
    primaryIso && !Number.isNaN(Date.parse(primaryIso))
      ? Date.parse(primaryIso)
      : Date.now();

  return {
    id: ev.id,
    kind,
    title: ev.title,
    when: startIso || undefined,
    details: ev.details || "",
    recipients: [], // until we wire per-household targeting
    recipientIds: [],
    createdBy: undefined, // later we can add host label
    ts,
    _hostUid: anyEv.hostUid ?? null,
    category: anyEv.category as EventCategory | undefined,
  };
}

/* ---------- Page ---------- */

export default function Home() {
  const navigate = useNavigate();
  const viewer = getViewer() as any | null;
  const viewerId = viewer?.id ?? viewer?.uid ?? viewer?.email ?? null;

  // Welcome card visibility, remembered in localStorage
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

  // collapse toggles
  const [showActivity, setShowActivity] = useState(true);
  const [showNewNeighbors, setShowNewNeighbors] = useState(true);
  const [showDM, setShowDM] = useState(true);
  const [showHappening, setShowHappening] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  // Category filter for Future Events
  const [eventCategoryFilter, setEventCategoryFilter] =
    useState<EventFilter>("all");

  // Single "Edit" entry point so the card stays clean:
  // navigate back to the composer in edit mode.
  const handleEditPost = (post: Post) => {
    navigate(`/compose/${post.kind}/${post.id}`);
  };

  useEffect(() => {
    // Load events from backend & merge with local posts so
    // Future Events you create always show up even if the backend write fails.
    void (async () => {
      try {
        const events = await fetchEvents();
        const backendPosts = events.map(mapEventToPost);

        const localPosts = loadLocalPosts();

        const merged = new Map<string, Post>();
        for (const p of backendPosts) merged.set(p.id, p);
        for (const p of localPosts) merged.set(p.id, p);

        setPosts(Array.from(merged.values()));
      } catch (err) {
        // If backend fails (e.g., 422 on /events), still show local posts
        console.error("Failed to fetch events for Home", err);
        setPosts(loadLocalPosts());
      }
    })();

    setThreads(loadDMThreads());
    setEventRsvps(loadRsvps());

    // Use the same demo neighbors as Settings / People
    const demoNeighbors = loadNeighbors() || [];
    const mappedNeighbors: NewNeighbor[] = demoNeighbors.map((n: any) => {
      const joinedAt =
        typeof n.joinedAt === "number" && !Number.isNaN(n.joinedAt)
          ? n.joinedAt
          : undefined; // don't pretend they joined today if we don't know

      return {
        id: n.id ?? n.email ?? n.lastName ?? `neighbor-${Math.random()}`,
        label:
          n.lastName ??
          n.last_name ??
          n.name ??
          (n.email ? n.email.split("@")[0] : "Household"),
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

    // keep Happening / Events buckets reasonably fresh
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // persist collapse state
  useEffect(() => {
    saveCollapse({
      dm: showDM,
      happening: showHappening,
      events: showEvents,
      newNeighbors: showNewNeighbors,
      activity: showActivity,
    });
  }, [showDM, showHappening, showEvents, showNewNeighbors, showActivity]);

  // Buckets: filter only posts that involve the viewer (or are broadcast)
  const { happeningNow, upcomingEvents } = useMemo(() => {
    const relevant = posts.filter((p) => isPostRelevantToViewer(p, viewer));
    const nowMs = now;

    const happening: Post[] = [];
    const upcoming: Post[] = [];

    for (const p of relevant) {
      if (p.kind === "happening") {
        // For backend events, treat "happening" as: started already and not expired
        if (p.when) {
          const startMs = new Date(p.when).getTime();
          const ageMs = nowMs - startMs;
          if (!Number.isNaN(startMs) && ageMs >= 0 && ageMs <= DAY_MS) {
            happening.push(p);
          }
        } else {
          // Fallback: use ts within the last day
          const age = nowMs - p.ts;
          if (age <= DAY_MS) {
            happening.push(p);
          }
        }
      } else if (p.kind === "event") {
        if (!p.when) {
          upcoming.push(p);
        } else {
          const startMs = new Date(p.when).getTime();
          if (!Number.isNaN(startMs) && startMs >= nowMs - 60 * 60 * 1000) {
            // show events from 1h before start time onward
            upcoming.push(p);
          }
        }
      }
    }

    happening.sort((a, b) => b.ts - a.ts); // most recent first

    upcoming.sort((a, b) => {
      if (a.when && b.when) return a.when.localeCompare(b.when);
      if (a.when) return -1;
      if (b.when) return 1;
      return a.ts - b.ts;
    });

    return { happeningNow: happening, upcomingEvents: upcoming };
  }, [posts, viewer, now]);

  // Filtered list for the "Future Events" section based on category chip
  const filteredUpcomingEvents = useMemo(() => {
    if (eventCategoryFilter === "all") return upcomingEvents;
    return upcomingEvents.filter((p) => p.category === eventCategoryFilter);
  }, [upcomingEvents, eventCategoryFilter]);

  // Your Activity: posts you are hosting (based on backend hostUid when present)
  const { myHappeningNow, myFutureEvents } = useMemo(() => {
    if (!viewer || !viewerId) {
      return { myHappeningNow: [] as Post[], myFutureEvents: [] as Post[] };
    }

    const viewerLabel =
      viewer.label ?? viewer.name ?? viewer.lastName ?? viewer.email ?? null;

    const isHost = (p: Post) => {
      // Prefer hostUid from backend when it's there
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

  // Private DM threads that involve this viewer
  const sortedThreads = useMemo(() => {
    if (!viewerId) return [];

    const mine = threads.filter((t) =>
      t.participants.some((p) => p.id === viewerId)
    );

    return [...mine].sort((a, b) => {
      const at = a.lastMessage?.ts ?? a.ts ?? 0;
      const bt = b.lastMessage?.ts ?? b.ts ?? 0;
      return bt - at;
    });
  }, [threads, viewerId]);

  // New neighbors: only show neighbors who joined within the last 14 days,
  // sorted newest first.
  const recentNeighbors = useMemo(() => {
    const nowMs = now;
    const cutoffMs = 14 * DAY_MS;

    return newNeighbors
      .filter(
        (n) =>
          typeof n.joinedAt === "number" &&
          nowMs - n.joinedAt >= 0 &&
          nowMs - n.joinedAt <= cutoffMs
      )
      .sort((a, b) => b.joinedAt! - a.joinedAt!);
  }, [newNeighbors, now]);

  const otherParticipantsLabel = (t: DMThread): string => {
    if (!viewerId) {
      return t.participants.map((p) => p.label).join(", ");
    }
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

  const handleRsvp = (postId: string, choice: RSVPChoice) => {
    setEventRsvps((prev) => {
      const prevState: EventRsvpState =
        prev[postId] ?? {
          choice: null,
          counts: { going: 0, maybe: 0, cant: 0 },
        };

      const nextCounts: EventRsvpCounts = { ...prevState.counts };
      let nextChoice: RSVPChoice | null = prevState.choice;

      // If user taps the same choice again, clear their RSVP
      if (prevState.choice === choice) {
        if (choice === "going" && nextCounts.going > 0) nextCounts.going--;
        if (choice === "maybe" && nextCounts.maybe > 0) nextCounts.maybe--;
        if (choice === "cant" && nextCounts.cant > 0) nextCounts.cant--;
        nextChoice = null;
      } else {
        // Remove previous choice from counts
        if (prevState.choice === "going" && nextCounts.going > 0)
          nextCounts.going--;
        if (prevState.choice === "maybe" && nextCounts.maybe > 0)
          nextCounts.maybe--;
        if (prevState.choice === "cant" && nextCounts.cant > 0)
          nextCounts.cant--;

        // Add new choice
        if (choice === "going") nextCounts.going++;
        if (choice === "maybe") nextCounts.maybe++;
        if (choice === "cant") nextCounts.cant++;
        nextChoice = choice;
      }

      const nextState: EventRsvpState = {
        choice: nextChoice,
        counts: nextCounts,
      };

      const nextMap: EventRsvpMap = { ...prev, [postId]: nextState };
      saveRsvps(nextMap);
      return nextMap;
    });
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
    if (counts.going <= 0) return null;
    const n = counts.going;
    return `${n} neighbor${n === 1 ? "" : "s"} going`;
  };

  const currentFilterLabel =
    eventCategoryFilter === "all"
      ? "future events"
      : `${CATEGORY_META[eventCategoryFilter].label.toLowerCase()} events`;

  return (
    <div style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      <style>{`
        .home-title {
          font-size: 30px;
          font-weight: 800;
          letter-spacing: .02em;
          color: #0f172a;
          margin: 0;
        }
        .home-sub {
          font-size: 14px;
          color: #6b7280;
          margin: 2px 0 10px;
        }

        /* Welcome / Getting started card – mostly white with mint accents */
        .welcome-card {
          border-radius: 16px;
          border: 1px solid #A7F3D0;
          background: #ffffff;
          padding: 14px 16px;
          margin-bottom: 18px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04);
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:10px;
        }
        .welcome-main {
          flex:1;
          min-width:0;
        }
        .welcome-title {
          font-weight: 700;
          margin-bottom: 4px;
          font-size: 15px;
          display:flex;
          align-items:center;
          gap:6px;
          color:#065F46;
        }
        .welcome-body {
          font-size: 14px;
          color:#374151;
        }
        .welcome-pill {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #BBF7D0;
          background: #F0FDF4;
          color:#047857;
          white-space:nowrap;
          cursor:pointer;
        }

        .home-section-title {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .home-section {
          margin-bottom: 18px;
        }
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
          transition: box-shadow .15s ease, transform .15s ease;
        }
        .home-card:hover {
          box-shadow: 0 8px 18px rgba(15,23,42,.10);
          transform: translateY(-1px);
        }
        .home-card-main {
          flex: 1;
          min-width: 0;
        }
        .home-card-title {
          font-weight: 600;
          margin-bottom: 2px;
          font-size: 15px;
        }
        .home-card-meta {
          font-size: 12px;
          color: #64748b;
          margin-bottom: 4px;
        }
        .home-card-body {
          font-size: 14px;
          color: #0f172a;
        }
        .home-card-body--neighbor {
          font-size: 13px;
          color: #4b5563;
        }
        .pill {
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.6);
          color: #0f172a;
          white-space: nowrap;
        }
        .pill.happening {
          background: #ecfeff;
          border-color: #a5f3fc;
        }
        .pill.event {
          background: #fefce8;
          border-color: #facc15;
        }
        .pill.host {
          background:#ecfdf5;
          border-color:#6ee7b7;
          color:#047857;
          font-size: 11px;
          padding: 3px 8px;
          border-radius:999px;
          display:inline-flex;
          align-items:center;
          gap:4px;
        }
        .empty {
          font-size: 14px;
          color: #6b7280;
          padding: 8px 2px;
        }
        .view-all {
          font-size: 12px;
          color: #4f46e5;
          cursor: pointer;
          font-weight: 600;
          background: transparent;
          border: 0;
          padding: 0;
        }
        .section-header-row {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
          margin: 18px 0 8px;
        }
        .section-toggle {
          display:inline-flex;
          align-items:center;
          gap:6px;
          border:0;
          padding:0;
          background:transparent;
          cursor:pointer;
        }
        .chevron {
          font-size: 13px;
          color:#64748b;
          transition: transform .15s ease;
        }
        .chevron.closed {
          transform: rotate(180deg);
        }

        /* RSVP shared styles */
        .rsvp-row {
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          align-items:center;
          margin-top:8px;
        }
        .rsvp-buttons {
          display:flex;
          flex-wrap:wrap;
          gap:6px;
        }
        .rsvp-btn {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          border: 1px solid rgba(148,163,184,.5);
          background:#f9fafb;
          color:#111827;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:4px;
        }
        .rsvp-btn:hover {
          background:#e5e7eb;
        }
        .rsvp-btn.is-on {
          background:#111827;
          color:#f9fafb;
          border-color:#111827;
        }
        .rsvp-summary {
          font-size: 12px;
          color:#6b7280;
        }

        /* Host-only manage row (Your Activity) */
        .manage-row {
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-top:10px;
        }
        .manage-link {
          font-size:12px;
          color:#4b5563;
          display:inline-flex;
          align-items:center;
          gap:4px;
          cursor:pointer;
          background:transparent;
          border:0;
          padding:0;
        }
        .manage-link .icon {
          font-size:14px;
        }

        /* Future Events category filter chips */
        .event-filter-row {
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin: 4px 0 10px;
        }
        .event-filter-chip {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background:#f9fafb;
          color:#374151;
          cursor:pointer;
          display:inline-flex;
          align-items:center;
          gap:4px;
        }
        .event-filter-chip:hover {
          background:#e5e7eb;
        }
        .event-filter-chip.is-active {
          background:#111827;
          color:#f9fafb;
          border-color:#111827;
        }

        @media (max-width: 520px) {
          .rsvp-row {
            flex-direction:column;
            align-items:flex-start;
          }
        }
      `}</style>

      {/* Header with logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 2,
        }}
      >
        <img
          src={Logo}
          alt="GatherGrove logo"
          style={{ width: 28, height: 28, borderRadius: 6 }}
        />
        <h2 className="home-title">Home</h2>
      </div>
      <p className="home-sub">
        Home shows your activity, new neighbors, your messages, and any
        Happening Now posts or Future Events that include your household.
      </p>

      {/* -------- 1) Welcome to GatherGrove (top) -------- */}
      {showWelcome && (
        <div className="welcome-card">
          <div className="welcome-main">
            <div className="welcome-title">🏡 Welcome to GatherGrove</div>
            <div className="welcome-body">
              Home is your personal feed. You’ll see:
              <br />
              🌿 a <strong>Your Activity</strong> section with any posts or
              events you’re hosting, including live RSVP counts
              <br />
              👋 new neighbors who’ve just joined
              <br />
              💬 messages with neighbors
              <br />
              ⚡ Happening Now posts you’re included in
              <br />
              📅 Future Events your household is invited to
              <br />
              <br />
              To start something new, go to the <strong>People</strong> tab to
              send a message, post a ⚡ Happening Now, or create a 📅 Future
              Event, then check <strong>Your Activity</strong> on Home to see
              who’s going.
            </div>
          </div>
          <button
            type="button"
            className="welcome-pill"
            onClick={handleDismissWelcome}
          >
            Got it
          </button>
        </div>
      )}

      {/* -------- 2) Your Activity (hosted by you) -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowActivity((v) => !v)}
          >
            <div className="home-section-title">🌿 Your Activity</div>
            <span className={"chevron " + (showActivity ? "" : "closed")}>
              {showActivity ? "⌃" : "⌄"}
            </span>
          </button>
        </div>

        {showActivity && (
          <>
            {myHappeningNow.length === 0 && myFutureEvents.length === 0 && (
              <div className="empty">
                Nothing hosted yet. When you post a ⚡ Happening Now or create a
                📅 Future Event, it will appear here with live RSVP counts.
              </div>
            )}

            {/* Your Happening Now */}
            {myHappeningNow.map((p) => {
              const rsvpState: EventRsvpState =
                eventRsvps[p.id] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
              const summary = formatHappeningSummary(rsvpState.counts);

              return (
                <div key={p.id} className="home-card">
                  <div className="home-card-main">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {p.title && (
                        <div className="home-card-title">{p.title}</div>
                      )}
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
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "going" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "going")}
                        >
                          <span>👍</span>
                          <span>Going</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "cant" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "cant")}
                        >
                          <span>❌</span>
                          <span>Can't go</span>
                        </button>
                      </div>
                      {summary && (
                        <div className="rsvp-summary">{summary}</div>
                      )}
                    </div>

                    {/* Single Edit entry point */}
                    <div className="manage-row">
                      <button
                        type="button"
                        className="manage-link"
                        onClick={() => handleEditPost(p)}
                      >
                        <span className="icon">✏️</span>
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="pill happening">Now</span>
                  </div>
                </div>
              );
            })}

            {/* Your Future Events */}
            {myFutureEvents.map((p) => {
              const rsvpState: EventRsvpState =
                eventRsvps[p.id] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
              const summary = formatRsvpSummary(rsvpState.counts);
              const categoryMeta =
                p.category && CATEGORY_META[p.category]
                  ? CATEGORY_META[p.category]
                  : null;

              return (
                <div key={p.id} className="home-card">
                  <div className="home-card-main">
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
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
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "going" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "going")}
                        >
                          <span>👍</span>
                          <span>Going</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "maybe" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "maybe")}
                        >
                          <span>❓</span>
                          <span>Maybe</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "cant" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "cant")}
                        >
                          <span>❌</span>
                          <span>Can't go</span>
                        </button>
                      </div>
                      {summary && (
                        <div className="rsvp-summary">{summary}</div>
                      )}
                    </div>

                    {/* Single Edit entry point */}
                    <div className="manage-row">
                      <button
                        type="button"
                        className="manage-link"
                        onClick={() => handleEditPost(p)}
                      >
                        <span className="icon">✏️</span>
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="pill event">Future</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* -------- 3) New neighbors -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowNewNeighbors((v) => !v)}
          >
            <div className="home-section-title">👋 New neighbors</div>
            <span className={"chevron " + (showNewNeighbors ? "" : "closed")}>
              {showNewNeighbors ? "⌃" : "⌄"}
            </span>
          </button>
        </div>

        {showNewNeighbors && (
          <>
            {recentNeighbors.length === 0 && (
              <div className="empty">
                No neighbors have joined in the last couple weeks. When a new
                household signs up, you’ll see them here.
              </div>
            )}
            {recentNeighbors.slice(0, 5).map((n) => {
              const joinedLabel = formatJoinedRelative(n.joinedAt, now);
              const neighborhoodLabel = n.neighborhood || "New household";
              const metaLabel = joinedLabel
                ? `${neighborhoodLabel} · ${joinedLabel}`
                : neighborhoodLabel;

              const isNew =
                typeof n.joinedAt === "number" &&
                now - n.joinedAt >= 0 &&
                now - n.joinedAt <= 7 * DAY_MS;

              return (
                <div key={n.id} className="home-card">
                  <div className="home-card-main">
                    <div className="home-card-title">{n.label}</div>
                    <div className="home-card-meta">{metaLabel}</div>
                    <div className="home-card-body home-card-body--neighbor">
                      Just joined GatherGrove. Say hello in person or send a
                      quick message from the People tab.
                    </div>
                  </div>
                  <div>{isNew && <span className="pill">New</span>}</div>
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* -------- 4) Messages -------- */}
      <section
        className="home-section"
        style={{ marginTop: 6 }} // tiny extra breathing room below New neighbors
      >
        <div className="section-header-row">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowDM((v) => !v)}
          >
            <div className="home-section-title">💬 Messages</div>
            <span className={"chevron " + (showDM ? "" : "closed")}>
              {showDM ? "⌃" : "⌄"}
            </span>
          </button>
          <button
            type="button"
            className="view-all"
            onClick={() => navigate("/messages")}
          >
            View all
          </button>
        </div>

        {showDM && (
          <>
            {sortedThreads.length === 0 && (
              <div className="empty">
                No messages yet. Start a message from the People tab.
              </div>
            )}
            {sortedThreads.slice(0, 5).map((t) => (
              <button
                key={t.id}
                className="home-card"
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() =>
                  navigate("/messages", {
                    state: { recipients: t.participants },
                  })
                }
              >
                <div className="home-card-main">
                  <div className="home-card-title">
                    {otherParticipantsLabel(t)}
                  </div>
                  <div className="home-card-meta">
                    {t.lastMessage
                      ? `Last message · ${formatTimeShort(t.lastMessage.ts)}`
                      : formatTimeShort(t.ts)}
                  </div>
                  {t.lastMessage && (
                    <div className="home-card-body">
                      {truncate(t.lastMessage.body, 140)}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </>
        )}
      </section>

      {/* -------- 5) Happening Now with RSVP -------- */}
      <section className="home-section">
        <div className="section-header-row">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowHappening((v) => !v)}
          >
            <div className="home-section-title">⚡ Happening Now</div>
            <span className={"chevron " + (showHappening ? "" : "closed")}>
              {showHappening ? "⌃" : "⌄"}
            </span>
          </button>
        </div>

        {showHappening && (
          <>
            {happeningNow.length === 0 && (
              <div className="empty">
                No live happenings that involve you right now.
              </div>
            )}
            {happeningNow.map((p) => {
              const rsvpState: EventRsvpState =
                eventRsvps[p.id] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
              const summary = formatHappeningSummary(rsvpState.counts);

              return (
                <div key={p.id} className="home-card">
                  <div className="home-card-main">
                    {p.title && <div className="home-card-title">{p.title}</div>}
                    <div className="home-card-meta">
                      {formatTimeShort(p.ts)}
                      {p.createdBy?.label ? ` · from ${p.createdBy.label}` : ""}
                    </div>
                    <div className="home-card-body">{p.details}</div>

                    <div className="rsvp-row">
                      <div className="rsvp-buttons">
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "going" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "going")}
                        >
                          <span>👍</span>
                          <span>Going</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "cant" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "cant")}
                        >
                          <span>❌</span>
                          <span>Can't go</span>
                        </button>
                      </div>
                      {summary && (
                        <div className="rsvp-summary">{summary}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="pill happening">Now</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      {/* -------- 6) Future Events with RSVP + category filter -------- */}
      <section className="home-section" style={{ marginBottom: 24 }}>
        <div className="section-header-row">
          <button
            type="button"
            className="section-toggle"
            onClick={() => setShowEvents((v) => !v)}
          >
            <div className="home-section-title">📅 Future Events</div>
            <span className={"chevron " + (showEvents ? "" : "closed")}>
              {showEvents ? "⌃" : "⌄"}
            </span>
          </button>
        </div>

        {showEvents && (
          <>
            {/* Category filter chips */}
            <div className="event-filter-row">
              <button
                type="button"
                className={
                  "event-filter-chip" +
                  (eventCategoryFilter === "all" ? " is-active" : "")
                }
                onClick={() => setEventCategoryFilter("all")}
              >
                <span>All</span>
              </button>
              {(Object.entries(CATEGORY_META) as [
                EventCategory,
                CategoryMeta
              ][]).map(([id, meta]) => (
                <button
                  key={id}
                  type="button"
                  className={
                    "event-filter-chip" +
                    (eventCategoryFilter === id ? " is-active" : "")
                  }
                  onClick={() => setEventCategoryFilter(id)}
                >
                  <span>{meta.emoji}</span>
                  <span>{meta.label}</span>
                </button>
              ))}
            </div>

            {filteredUpcomingEvents.length === 0 && (
              <div className="empty">
                No {currentFilterLabel} that include you yet.
              </div>
            )}
            {filteredUpcomingEvents.map((p) => {
              const rsvpState: EventRsvpState =
                eventRsvps[p.id] ?? {
                  choice: null,
                  counts: { going: 0, maybe: 0, cant: 0 },
                };
              const summary = formatRsvpSummary(rsvpState.counts);
              const categoryMeta =
                p.category && CATEGORY_META[p.category]
                  ? CATEGORY_META[p.category]
                  : null;

              return (
                <div key={p.id} className="home-card">
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
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "going" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "going")}
                        >
                          <span>👍</span>
                          <span>Going</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "maybe" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "maybe")}
                        >
                          <span>❓</span>
                          <span>Maybe</span>
                        </button>
                        <button
                          type="button"
                          className={
                            "rsvp-btn" +
                            (rsvpState.choice === "cant" ? " is-on" : "")
                          }
                          onClick={() => handleRsvp(p.id, "cant")}
                        >
                          <span>❌</span>
                          <span>Can't go</span>
                        </button>
                      </div>
                      {summary && (
                        <div className="rsvp-summary">{summary}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="pill event">Future</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
