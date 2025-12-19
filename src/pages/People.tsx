// src/pages/People.tsx
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Home, Heart } from "lucide-react";
import { motion } from "framer-motion";
import { fetchHouseholds, type GGHousehold } from "../lib/api";
import { loadNeighbors } from "../lib/profile";
import { getViewer } from "../lib/viewer";
import Logo from "../assets/gathergrove-logo.png";

/* ---------- types ---------- */
type Kid = {
  birthMonth?: number | null;
  birthYear?: number | null;
  sex?: string | null;
  awayAtCollege?: boolean | null; // lives away from home
  canBabysit?: boolean | null; // can help with babysitting / parent helper
};

type AnyUser = GGHousehold & {
  id: string;
  email?: string | null;
  lastName?: string | null;
  name?: string | null;
  householdType?: string | null;
  kids?: Kid[];
  adultNames?: string[];
  neighborhood?: string | null; // ✅ stores code from backend (e.g., BH26-GK4, EP26-QM7)
};

/* ---------- constants ---------- */
/** Order aligned with onboarding: Family w/ Kids → Empty Nesters → Singles/Couples */
const HOUSEHOLD_TYPES = ["Family w/ Kids", "Empty Nesters", "Singles/Couples"] as const;

type HouseholdTypeFilter = (typeof HOUSEHOLD_TYPES)[number];

/** Visual meta for household-type chips so icons stay visible even on selected state */
const HOUSEHOLD_TYPE_META: Record<
  HouseholdTypeFilter,
  {
    Icon: React.ComponentType<{ size?: number; color?: string }>;
    border: string;
    glow: string;
    color: string;
  }
> = {
  "Family w/ Kids": {
    Icon: Users,
    border: "#bfdbfe",
    glow: "rgba(59,130,246,0.35)",
    color: "#1d4ed8",
  },
  "Empty Nesters": {
    Icon: Home,
    border: "#facc15",
    glow: "rgba(234,179,8,0.35)",
    color: "#92400e",
  },
  "Singles/Couples": {
    Icon: Heart,
    border: "#c4b5fd",
    glow: "rgba(129,140,248,0.35)",
    color: "#6d28d9",
  },
};

const MAX_DM_TARGETS = 10;

const QUICK_SUGGESTIONS: string[] = [
  "Hi there! Just wanted to say hello — we're neighbors 👋",
  "Nice to meet you — just saying hi from around the block.",
  "Great to connect! How long have you been in the neighborhood?",
  "Always nice meeting nearby neighbors — hope you're having a good week!",
  "If you're ever up for a casual walk or quick hello around the neighborhood, we'd love to say hi.",
  "We love discovering local spots — any favorites you recommend nearby?",
];

/* ---------- neighborhood helpers (LOCAL, avoids broken imports) ---------- */
type HoodKey = "bayhill" | "eagles";

function normalizeNeighborhood(s?: string | null): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function neighborhoodKey(raw?: string | null): HoodKey | null {
  const s = normalizeNeighborhood(raw);
  if (!s) return null;

  // ✅ explicit known codes (backend reality)
  if (s === "bh26-gk4") return "bayhill";
  if (s === "ep26-qm7") return "eagles";

  // ✅ code patterns (lets you add new codes without touching UI again)
  if (/^bh\d{2}-[a-z0-9]{3,}$/i.test(s)) return "bayhill";
  if (/^ep\d{2}-[a-z0-9]{3,}$/i.test(s)) return "eagles";

  // fallback match by common strings
  if (s.includes("bayhill") || s === "bay" || s === "bh") return "bayhill";
  if (s.includes("eagles") || s.includes("eagles point") || s.includes("eagles pointe") || s === "ep")
    return "eagles";

  return null;
}

function neighborhoodLabel(k: HoodKey): string {
  if (k === "bayhill") return "Bayhill at the Oasis";
  if (k === "eagles") return "Eagles Pointe"; // ✅ Pointe (with e)
  return "";
}

/** ✅ label for pill on each card: prefer full name when code is known */
function neighborhoodDisplay(raw?: string | null): string {
  const k = neighborhoodKey(raw);
  if (k) return neighborhoodLabel(k);

  // fallback: if someone stored full text, keep it; otherwise show raw
  return (raw ?? "").trim();
}

/* ---------- helpers ---------- */
const displayLabel = (u: AnyUser) => u.lastName ?? u.name ?? "Household";
const displaySortKey = (u: AnyUser) => (u.lastName ?? u.name ?? "").toString().trim().toLowerCase();

function toggleInSet<T>(prev: Set<T>, value: T): Set<T> {
  const next = new Set(prev);
  next.has(value) ? next.delete(value) : next.add(value);
  return next;
}

function useDebounce<T>(value: T, delay = 200) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function ageFromMY(m?: number | null, y?: number | null): number | null {
  if (!y) return null;
  const now = new Date();
  const month = m && m >= 1 && m <= 12 ? m : 6;
  const d = new Date(y, month - 1, 15);
  let a = now.getFullYear() - d.getFullYear();
  const hadBday =
    now.getMonth() > d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() >= d.getDate());
  if (!hadBday) a -= 1;
  return a < 0 ? 0 : a;
}

function sexIcon(sex?: string | null) {
  const s = (sex || "").toLowerCase();
  if (s.startsWith("m")) return "♂";
  if (s.startsWith("f")) return "♀";
  return "";
}

function chipColors(sex?: string | null) {
  const s = (sex || "").toLowerCase();
  if (s.startsWith("m")) return { bg: "#dbeafe", fg: "#1d4ed8" };
  if (s.startsWith("f")) return { bg: "#ffe4e6", fg: "#be123c" };
  return { bg: "#f3f4f6", fg: "#374151" };
}

function agesFromUser(u: AnyUser): number[] {
  const ks = Array.isArray(u.kids) ? u.kids : [];
  const out: number[] = [];
  for (const k of ks) {
    if (k.awayAtCollege) continue;
    const a = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
    if (a != null) out.push(a);
  }
  return out;
}

function userHasBabysitter(u: AnyUser): boolean {
  const kids = Array.isArray(u.kids) ? u.kids : [];
  return kids.some((k) => {
    if (!k.canBabysit) return false;
    const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
    return age !== null && age >= 13 && age <= 25;
  });
}

/* ---------- favorites ---------- */
const FAV_KEY = "gg:favorites";
function useFavorites() {
  const [favs, setFavs] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      return new Set();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch {}
  }, [favs]);

  const toggle = (id: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return { favs, toggle };
}

/* ---------- normalize + de-dupe ---------- */
function normalize(u: any): AnyUser {
  const lastName = u.lastName ?? u.last_name ?? u.name ?? null;
  const name = u.name ?? u.lastName ?? u.last_name ?? null;

  return {
    id: u.id ?? u.uid ?? `temp-${Math.random()}`,
    email: u.email ?? null,
    lastName,
    name,
    householdType: u.householdType ?? u.household_type ?? null,
    kids: u.kids ?? u.children ?? undefined,
    adultNames: u.adultNames ?? u.adults ?? undefined,
    neighborhood: u.neighborhood ?? u.hood ?? null,
    ...u,
  } as AnyUser;
}

function infoScore(u: any) {
  return (
    (u.householdType ? 1 : 0) +
    (u.neighborhood ? 1 : 0) +
    (Array.isArray(u.kids) && u.kids.length ? 0.5 : 0) +
    (Array.isArray(u.adultNames) && u.adultNames.length ? 0.25 : 0)
  );
}

function dedupePeople<
  T extends {
    id?: string;
    lastName?: string | null;
    name?: string | null;
    neighborhood?: string | null;
    householdType?: string | null;
  }
>(arr: T[]) {
  const map = new Map<string, T>();

  for (const u of arr) {
    const id = (u.id ?? "").toString().trim();

    // ✅ Canonical uniqueness = id
    if (id) {
      const existing = map.get(id);
      if (!existing || infoScore(u) > infoScore(existing)) map.set(id, u);
      continue;
    }

    // Fallback if id missing
    const key = `${(u.lastName ?? u.name ?? "")
      .toString()
      .trim()
      .toLowerCase()}|${(u.neighborhood ?? "").toString().trim().toLowerCase()}`;

    if (!key || key === "|") continue;

    const existing = map.get(key);
    if (!existing || infoScore(u) > infoScore(existing)) map.set(key, u);
  }

  return Array.from(map.values());
}

/* ---------- Dual slider ---------- */
function DualAgeRange(props: {
  min?: number;
  max?: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (nextMin: number, nextMax: number) => void;
}) {
  const { min = 0, max = 18, step = 1, valueMin, valueMax, onChange } = props;
  const TRACK_H = 8;
  const THUMB = 22;
  const railRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<null | "min" | "max">(null);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const roundToStep = (n: number) => Math.round(n / step) * step;
  const pct = (n: number) => ((clamp(n) - min) / (max - min)) * 100;

  const setFromClientX = (clientX: number) => {
    const rail = railRef.current;
    if (!rail) return;
    const r = rail.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    let v = roundToStep(min + ratio * (max - min));
    v = clamp(v);
    if (drag === "min") {
      const nextMin = Math.min(v, valueMax);
      onChange(nextMin, Math.max(valueMax, nextMin));
    } else if (drag === "max") {
      const nextMax = Math.max(v, valueMin);
      onChange(Math.min(valueMin, nextMax), nextMax);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (drag) setFromClientX(e.clientX);
  };
  const stopDrag = () => setDrag(null);
  const startDrag = (which: "min" | "max") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag(which);
  };

  const onThumbKey = (which: "min" | "max") => (e: React.KeyboardEvent) => {
    const delta =
      e.key === "ArrowLeft"
        ? -step
        : e.key === "ArrowRight"
        ? step
        : e.key === "PageDown"
        ? -Math.max(step, 2)
        : e.key === "PageUp"
        ? Math.max(step, 2)
        : e.key === "Home"
        ? -(max - min)
        : e.key === "End"
        ? max - min
        : 0;
    if (!delta) return;
    e.preventDefault();
    if (which === "min") onChange(Math.min(clamp(valueMin + delta), valueMax), valueMax);
    else onChange(valueMin, Math.max(clamp(valueMax + delta), valueMin));
  };

  const pMin = pct(valueMin);
  const pMax = pct(valueMax);

  return (
    <div
      ref={railRef}
      style={{ position: "relative", height: THUMB }}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: (THUMB - TRACK_H) / 2,
          height: TRACK_H,
          background: "#e5e7eb",
          borderRadius: 9999,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: `${pMin}%`,
          width: `${pMax - pMin}%`,
          top: (THUMB - TRACK_H) / 2,
          height: TRACK_H,
          background: "linear-gradient(90deg, #22c55e, #0ea5e9)",
          borderRadius: 9999,
          boxShadow: "0 0 6px rgba(34,197,94,0.25)",
          pointerEvents: "none",
        }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Minimum child age"
        aria-valuemin={min}
        aria-valuemax={valueMax}
        aria-valuenow={valueMin}
        onPointerDown={startDrag("min")}
        onKeyDown={onThumbKey("min")}
        className="gg-thumb"
        style={{
          left: `calc(${pMin}% - ${THUMB / 2}px)`,
          zIndex: valueMin === valueMax ? 2 : 1,
        }}
      />
      <button
        type="button"
        role="slider"
        aria-label="Maximum child age"
        aria-valuemin={valueMin}
        aria-valuemax={max}
        aria-valuenow={valueMax}
        onPointerDown={startDrag("max")}
        onKeyDown={onThumbKey("max")}
        className="gg-thumb"
        style={{ left: `calc(${pMax}% - ${THUMB / 2}px)`, zIndex: 2 }}
      />
    </div>
  );
}

/* ---------- Snackbar ---------- */
function Snackbar({
  open,
  text,
  actionLabel,
  onAction,
  onClose,
  duration = 4000,
}: {
  open: boolean;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
  duration?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: `calc(16px + env(safe-area-inset-bottom))`,
        background: "#111827",
        color: "#fff",
        borderRadius: 12,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        alignItems: "center",
        boxShadow: "0 12px 28px rgba(0,0,0,.35)",
        zIndex: 80,
        border: "1px solid rgba(255,255,255,.16)",
        maxWidth: "92vw",
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: ".2px" }}>{text}</span>
      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            marginLeft: 8,
            padding: "6px 10px",
            borderRadius: 10,
            background: "transparent",
            border: "1px solid rgba(255,255,255,.32)",
            color: "#fff",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          marginLeft: 6,
          padding: "6px 8px",
          borderRadius: 8,
          background: "transparent",
          border: 0,
          color: "#fff",
          opacity: 0.75,
          cursor: "pointer",
        }}
      >
        ✕
      </button>
    </div>
  );
}

/* ---------- Bottom Sheet ---------- */
function BottomSheet({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(2,6,23,.55)",
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
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          background: "#fff",
          boxShadow: "0 -16px 40px rgba(0,0,0,.25)",
          padding: 16,
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 999,
            background: "#e5e7eb",
            margin: "0 auto 6px",
          }}
        />
        <h3 style={{ margin: "4px 0 10px" }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

/* ---------- Minimal thread store ---------- */
type Recipient = { id: string; label: string };
type Msg = { at: number; text: string; fromMe: boolean };
type Thread = { id: string; recipients: Recipient[]; history: Msg[] };

const THREADS_KEY = "gg:threads";
const loadThreads = (): Thread[] => {
  try {
    return JSON.parse(localStorage.getItem(THREADS_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveThreads = (ts: Thread[]) => {
  try {
    localStorage.setItem(THREADS_KEY, JSON.stringify(ts));
  } catch {}
};
const threadIdFor = (rs: Recipient[]) => `thread:${rs.map((r) => r.id).sort().join(",")}`;

/* ---------- DM threads for Home feed (gg:dmThreads) ---------- */
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

const DM_THREADS_KEY = "gg:dmThreads";

const loadDMThreads = (): DMThread[] => {
  try {
    return JSON.parse(localStorage.getItem(DM_THREADS_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveDMThreads = (threads: DMThread[]) => {
  try {
    localStorage.setItem(DM_THREADS_KEY, JSON.stringify(threads));
  } catch {}
};

function upsertDMThread(participants: Recipient[], body: string) {
  const id = threadIdFor(participants);
  const now = Date.now();

  const viewer = getViewer() as any;
  const from =
    viewer && (viewer.id || viewer.label || viewer.name || viewer.email)
      ? {
          id: viewer.id ?? "viewer",
          label: viewer.label ?? viewer.name ?? viewer.email ?? "You",
        }
      : undefined;

  const threads = loadDMThreads();
  const existing = threads.find((t) => t.id === id);

  const lastMessage = { body, ts: now, from };

  if (existing) {
    existing.lastMessage = lastMessage;
    existing.ts = now;
    existing.participants = participants.map((p) => ({ id: p.id, label: p.label }));
  } else {
    threads.push({
      id,
      participants: participants.map((p) => ({ id: p.id, label: p.label })),
      lastMessage,
      ts: now,
    });
  }

  saveDMThreads(threads);
}

/* ---------- Auto-growing textarea ---------- */
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  maxLength = 500,
  onCmdEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  onCmdEnter?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 320) + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          onCmdEnter?.();
        }
      }}
      className="composer-textarea"
    />
  );
}

/* ---------- Small animation helpers (Framer Motion) ---------- */
const tapMotionProps = {
  whileTap: { scale: 0.94 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

const chipMotionProps = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.03 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

/* ---------- UI bits ---------- */
function Chip({
  label,
  selected,
  onClick,
  emoji,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
}) {
  const meta = (HOUSEHOLD_TYPE_META as any)[label as HouseholdTypeFilter];
  const Icon = meta?.Icon;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={["chip", selected ? "chip--on" : "chip--off"].join(" ")}
      aria-pressed={selected}
      {...chipMotionProps}
    >
      {Icon && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            borderRadius: 999,
            marginRight: 6,
            background: "#ffffff",
            border: meta ? `1px solid ${meta.border}` : "1px solid #e5e7eb",
            boxShadow: "none",
          }}
        >
          <Icon size={15} color={meta.color} />
        </span>
      )}

      {!Icon && emoji && (
        <span aria-hidden style={{ fontSize: 14, marginRight: 4 }}>
          {emoji}
        </span>
      )}

      {selected && <span className="chip-check">✓</span>}
      <span>{label}</span>
    </motion.button>
  );
}

function SkeletonCard() {
  return (
    <div className="gg-card gg-skeleton">
      <div className="gg-select-pad sk" />
      <div className="gg-avatar sk" />
      <div className="gg-main">
        <div className="sk sk-line" style={{ width: "40%" }} />
        <div className="sk sk-pill" style={{ width: 120 }} />
        <div className="sk sk-line" style={{ width: "65%", marginTop: 8 }} />
      </div>
      <div className="gg-actions">
        <div className="sk sk-btn" />
      </div>
    </div>
  );
}

function Toast({ text, show }: { text: string; show: boolean }) {
  if (!show) return null;
  return (
    <div role="status" aria-live="polite" className="gg-toast">
      {text}
    </div>
  );
}

function ActionDock({
  count,
  canDM,
  maxDm,
  onDM,
  onHappeningNow,
  onFutureEvent,
  onClear,
}: {
  count: number;
  canDM: boolean;
  maxDm: number;
  onDM: () => void;
  onHappeningNow: () => void;
  onFutureEvent: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  const overLimit = !canDM && count > 0;
  const progress = Math.max(0, Math.min(count, maxDm));
  const pct = (progress / maxDm) * 100;

  const summaryText =
    count === 1 ? "1 selected" : `${count} selected${overLimit ? ` • max ${maxDm} to Message` : ""}`;

  return (
    <div className="dock-wrap" role="region" aria-label="Bulk actions">
      <div className="dock">
        <span className={["dock-count", overLimit ? "dock-count-warn" : ""].join(" ")} aria-live="polite">
          {summaryText}
        </span>
        <div className="dock-actions" role="toolbar" aria-label="Actions">
          <span className="has-tip">
            <motion.button
              className={["dock-btn", "dock-btn-connect", "gg-tap-target", !canDM ? "is-disabled" : ""].join(" ")}
              onClick={() => {
                if (canDM) onDM();
              }}
              aria-disabled={!canDM}
              disabled={!canDM}
              aria-describedby={!canDM ? "connect-cap-tip" : undefined}
              {...tapMotionProps}
            >
              <span className="btn-progress" style={{ width: `${pct}%` }} />
              <span aria-hidden style={{ fontSize: 18, marginRight: 2 }}>
                💬
              </span>
              <div className="dock-label">
                <span className="dock-text">Message</span>
                <span className="dock-sub">Message selected households.</span>
              </div>
            </motion.button>
            {!canDM && (
              <span role="tooltip" id="connect-cap-tip" className="tip">
                {`Select ${maxDm} or fewer to Message`}
              </span>
            )}
          </span>

          <motion.button
            className="dock-btn alt gg-tap-target"
            onClick={onHappeningNow}
            title="Post a Happening Now"
            {...tapMotionProps}
          >
            <span aria-hidden style={{ fontSize: 20, marginRight: 2 }}>
              ⚡
            </span>
            <div className="dock-label">
              <span className="dock-text">Happening Now</span>
              <span className="dock-sub">Share something everyone can join now.</span>
            </div>
          </motion.button>

          <motion.button
            className="dock-btn dock-btn-event gg-tap-target"
            onClick={onFutureEvent}
            title="Create a Future Event"
            {...tapMotionProps}
          >
            <span aria-hidden style={{ fontSize: 18, marginRight: 2 }}>
              📅
            </span>
            <div className="dock-label">
              <span className="dock-text">Future Event</span>
              <span className="dock-sub">Plan something for later.</span>
            </div>
          </motion.button>

          <div className="dock-sep" aria-hidden />
          <motion.button className="dock-ghost" onClick={onClear} title="Clear selection" {...tapMotionProps}>
            Clear
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function People() {
  const navigate = useNavigate();

  const [items, setItems] = useState<AnyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const qDebounced = useDebounce(q, 200);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const { favs, toggle } = useFavorites();

  // ✅ store canonical keys (NOT labels) so renames like “Pointe” never break filters
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<Set<HoodKey>>(new Set());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set(HOUSEHOLD_TYPES));
  const hasFamilySelected = selectedTypes.has("Family w/ Kids");
  const [ageMin, setAgeMin] = useState(0);
  const [ageMax, setAgeMax] = useState(18);
  const [onlyBabysitters, setOnlyBabysitters] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [dmText, setDmText] = useState("");

  const [snackOpen, setSnackOpen] = useState(false);
  const [snackText, setSnackText] = useState("");
  const [snackRecipients, setSnackRecipients] = useState<Recipient[] | null>(null);

  const [showToast, setShowToast] = useState(false);
  const prevCount = useRef(0);
  useEffect(() => {
    const cur = selectedIds.size;
    if (prevCount.current <= MAX_DM_TARGETS && cur > MAX_DM_TARGETS) {
      setShowToast(true);
      window.setTimeout(() => setShowToast(false), 1800);
    }
    prevCount.current = cur;
  }, [selectedIds.size]);

  const load = async () => {
    setLoading(true);
    try {
      // ✅ Directory comes ONLY from backend households + demo neighbors
      const raw = await fetchHouseholds();
      const base = Array.isArray(raw) ? raw : [];

      // ✅ Normalize backend
      const backendUsers = base.map((u: any) => normalize(u));

      // ✅ Demo neighbors (local)
      const demoNeighbors = loadNeighbors().map(
        (n) =>
          normalize({
            id: (n as any).id,
            lastName: (n as any).last_name ?? (n as any).lastName ?? (n as any).name ?? null,
            email: (n as any).email,
            householdType: (n as any).householdType,
            kids: (n as any).kids,
            adultNames: (n as any).adultNames,
            neighborhood: (n as any).neighborhood,
          }) as AnyUser
      );

      let combined = [...backendUsers, ...demoNeighbors];

      // ✅ De-dupe and sort
      combined = dedupePeople(combined);
      combined.sort((a, b) => displaySortKey(a).localeCompare(displaySortKey(b)));

      setItems(combined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const neighborhoods = useMemo(() => {
    const set = new Set<HoodKey>();
    for (const u of items) {
      const k = neighborhoodKey(u.neighborhood ?? null);
      if (k === "bayhill" || k === "eagles") set.add(k);
    }
    const keys = Array.from(set);
    // keep a stable order
    keys.sort((a, b) => neighborhoodLabel(a).localeCompare(neighborhoodLabel(b)));
    return keys.map((k) => ({ key: k, label: neighborhoodLabel(k) }));
  }, [items]);

  const filtered = useMemo(() => {
    const needle = qDebounced.trim().toLowerCase();
    let list = items;

    if (needle) {
      list = list.filter((u) => {
        const hay = [displayLabel(u), u.householdType ?? "", (u.adultNames ?? []).join(" "), u.neighborhood ?? ""]
          .join(" ")
          .toLowerCase();
        return hay.includes(needle);
      });
    }

    if (selectedNeighborhoods.size > 0) {
      list = list.filter((u) => {
        const k = neighborhoodKey(u.neighborhood ?? null);
        return k ? selectedNeighborhoods.has(k) : false;
      });
    }

    if (selectedTypes.size > 0) {
      list = list.filter((u) => (u.householdType ? selectedTypes.has(u.householdType) : false));
    }

    if (onlyBabysitters) list = list.filter((u) => userHasBabysitter(u));

    if (hasFamilySelected && !(ageMin === 0 && ageMax === 18)) {
      list = list.filter((u) => {
        if (u.householdType !== "Family w/ Kids") return true;
        const ages = agesFromUser(u);
        if (ages.length === 0) return false;
        return ages.some((a) => a >= ageMin && a <= ageMax);
      });
    }

    if (onlyFavs) list = list.filter((u) => favs.has(u.id));

    return list.slice().sort((a, b) => displaySortKey(a).localeCompare(displaySortKey(b)));
  }, [
    items,
    qDebounced,
    onlyFavs,
    favs,
    selectedNeighborhoods,
    selectedTypes,
    hasFamilySelected,
    ageMin,
    ageMax,
    onlyBabysitters,
  ]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((u) => u.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next;
    });
  }, [filtered]);

  const clearSelection = () => setSelectedIds(new Set());
  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map((u) => u.id)));

  const selectedUsers = useMemo(() => filtered.filter((u) => selectedIds.has(u.id)), [filtered, selectedIds]);

  const selectedRecipientLabels = useMemo(() => selectedUsers.map((u) => displayLabel(u)), [selectedUsers]);
  const selectedRecipientIds = useMemo(() => selectedUsers.map((u) => u.id), [selectedUsers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      const tag = (ae?.tagName || "").toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || ae?.getAttribute("contenteditable") === "true";
      if (isTyping) return;

      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (filtered.length) selectAllFiltered();
        return;
      }

      const count = selectedIds.size;
      const k = e.key.toLowerCase();
      if (k === "c") {
        if (count > 0 && count <= MAX_DM_TARGETS) setShowConnectModal(true);
      } else if (k === "h") {
        if (count > 0) navigate("/compose/happening", { state: { recipients: selectedRecipientLabels } });
      } else if (k === "e") {
        if (count > 0) navigate("/compose/event", { state: { recipients: selectedRecipientLabels } });
      } else if (e.key === "Escape") {
        clearSelection();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, selectedIds.size, selectedRecipientLabels, navigate]);

  const sendConnect = () => {
    const targets = filtered
      .filter((u) => selectedIds.has(u.id))
      .map((u) => ({ id: u.id, label: displayLabel(u) })) as Recipient[];

    const body = dmText.trim();
    if (targets.length === 0 || !body) return;

    const viewer = getViewer() as any;
    const selfId = viewer?.id ?? viewer?.uid ?? viewer?.email ?? null;
    const selfLabel = viewer?.label ?? viewer?.name ?? viewer?.lastName ?? viewer?.email ?? "You";

    const participants: Recipient[] = selfId ? [...targets, { id: String(selfId), label: selfLabel }] : targets;

    const tid = threadIdFor(participants);
    const all = loadThreads();
    const existing = all.find((t) => t.id === tid);
    if (existing) existing.history.push({ at: Date.now(), text: body, fromMe: true });
    else
      all.push({
        id: tid,
        recipients: participants,
        history: [{ at: Date.now(), text: body, fromMe: true }],
      });
    saveThreads(all);

    upsertDMThread(participants, body);

    setShowConnectModal(false);
    setDmText("");
    clearSelection();

    setSnackRecipients(participants);
    setSnackText("Message sent. You’ll find this conversation at the top of the Messages tab.");
    setSnackOpen(true);

    navigate("/messages", { state: { recipients: participants } });
  };

  return (
    <div className="gg-page" style={{ padding: 16, maxWidth: 760, margin: "0 auto" }}>
      {/* Styles unchanged from your current file */}
      {/* (Keeping your CSS exactly as-is to avoid UI regressions) */}
      <style>{`
        @keyframes gg-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .gg-page { animation: gg-page-in .32s ease-out; }
        @keyframes gg-card-enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .gg-card-enter { opacity: 0; animation: gg-card-enter .26s ease-out forwards; }
        @keyframes gg-tap { 0% { transform: scale(1); box-shadow: none; } 50% { transform: scale(0.92); box-shadow: 0 0 0 2px rgba(191,219,254,.7), 0 8px 18px rgba(15,23,42,.35); } 100% { transform: scale(1); box-shadow: none; } }
        .gg-tap-target { transform-origin: center; }
        .gg-tap-target:active { animation: gg-tap 0.18s ease-out; }
        .home-title { font-size: 30px; font-weight: 800; letter-spacing: .02em; color: #0f172a; margin: 0; }
        .home-sub { font-size: 14px; color: #6b7280; margin: 2px 0 10px; }
        .gg-grid { display: grid; gap: 16px; grid-template-columns: 1fr; max-width: 760px; margin-inline: auto; }
        .gg-card { display: grid; grid-template-columns: auto auto 1fr auto; align-items: start; gap: 12px;
          border: 1px solid rgba(0,0,0,.06); border-radius: 16px; padding: 16px; background: rgba(255,255,255,0.96);
          backdrop-filter: saturate(1.1); box-shadow: 0 8px 24px rgba(16,24,40,.06); transition: box-shadow .18s ease, transform .18s ease, border-color .18s ease; }
        @media (hover:hover) { .gg-card:hover { box-shadow: 0 12px 28px rgba(16,24,40,.10); transform: translateY(-1px); } }
        .gg-card.selected { border-color: #60a5fa; box-shadow: 0 0 0 3px rgba(59,130,246,.12) inset, 0 8px 24px rgba(2,6,23,.12); }
        .gg-select-pad { width: 28px; height: 28px; margin-top: 4px; display:flex; align-items:center; justify-content:center; }
        .gg-checkbox { width: 18px; height: 18px; border-radius: 6px; border: 2px solid #cbd5e1; background: #fff; display: inline-flex; align-items:center; justify-content:center;
          cursor: pointer; transition: all .15s ease; }
        .gg-checkbox.on { background: #2563eb; border-color: #2563eb; color: #fff; box-shadow: 0 6px 16px rgba(37,99,235,.35); }
        .gg-checkbox:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .gg-avatar { width: 42px; height: 42px; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; background: #eef2ff; color: #3730a3; margin-top: 2px; cursor: pointer; }
        .gg-main { min-width: 0; }
        .gg-name { margin: 0; font-size: 22px; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }
        .gg-pill { display: inline-block; font-size: 12px; padding: 6px 10px; border-radius: 999px; }
        .gg-pill.neighborhood { background: rgba(15,23,42,.04); color: #334155; border: 1px solid rgba(15,23,42,.06); }
        .gg-pill.type { background: #eef2ff; color: #3730a3; }
        .gg-actions { display: grid; gap: 8px; align-content: space-between; justify-items: end; min-width: 144px; }
        .gg-star { width: 40px; height: 40px; border-radius: 12px; background: rgba(0,0,0,.02); border: 1px solid rgba(2,6,23,.06); cursor: pointer; font-size: 20px;
          display: inline-flex; align-items: center; justify-content: center; transition: transform .12s ease, box-shadow .12s ease, background .15s ease; }
        .gg-star:hover { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(2,6,23,.08); background: rgba(0,0,0,.03); }
        .gg-star:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .gg-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 12px; background: linear-gradient(180deg,#3b82f6,#2563eb);
          color: #fff; border: 0; cursor: pointer; font-weight: 600; box-shadow: 0 8px 16px rgba(37,99,235,.25); transition: transform .14s ease, box-shadow .14s ease, filter .14s ease; }
        .gg-btn:hover { filter: brightness(1.03); }
        .gg-btn:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        @keyframes gg-shimmer { 0%{opacity:.6} 50%{opacity:.85} 100%{opacity:.6} }
        .gg-skeleton .sk { background: #f3f4f6; border-radius: 8px; animation: gg-shimmer 1.2s ease-in-out infinite; }
        .gg-skeleton .sk-line { height: 14px; }
        .gg-skeleton .sk-pill { height: 24px; border-radius: 999px; }
        .gg-skeleton .sk-btn { width: 110px; height: 38px; border-radius: 12px; }
        .gg-thumb { position: absolute; top: 0; width: 22px; height: 22px; border-radius: 9999px; border: 2px solid #0ea5e9; background: #fff;
          box-shadow: 0 8px 18px rgba(14,165,233,.28), 0 1px 2px rgba(0,0,0,.08); cursor: grab; outline: none; }
        .gg-thumb:active { cursor: grabbing; }
        .gg-thumb:focus-visible { outline: 2px solid #93c5fd; outline-offset: 2px; }
        .adults { line-height: 1.3; margin-top: 6px; color: #374151; font-size: 14px; }
        .kids-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .kids-section { margin-top: 4px; }
        .kids-subheading { font-size: 12px; font-weight: 600; color: #4b5563; margin-bottom: 2px; }
        .filter-wrap { margin-top: 12px; border-top: 1px solid rgba(2,6,23,.06); padding-top: 10px; display: grid; gap: 10px; }
        .filter-row { display: grid; gap: 6px; }
        .filter-label { font-size: 13px; font-weight: 800; color: #0f172a; display: inline-flex; align-items: center; gap: 6px; letter-spacing: .2px; }
        .chip-scroll { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip { padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(148,163,184,0.6); font-size: 12px; display: inline-flex; align-items: center; gap: 6px;
          background: #ffffff; color: #0f172a; transition: box-shadow .12s ease, transform .12s ease, border-color .12s ease, background-color .12s ease; outline: none; }
        .chip:focus, .chip:focus-visible { outline: none; box-shadow: 0 0 0 2px rgba(148,163,184,0.55); }
        .chip--off { border-width: 1px; border-color: rgba(148,163,184,0.6); }
        .chip--off:hover { box-shadow: 0 6px 14px rgba(15,23,42,.06); transform: translateY(-1px); }
        .chip--on { background: #ffffff; border-color: #2563eb; border-width: 2px; color: #0f172a; box-shadow: none; transform: translateY(-1px); }
        .chip-check { font-size: 12px; line-height: 1; }
        .mini-clear { margin-left: 8px; font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(2,6,23,.08); background: #fff; cursor: pointer; }
        .age-block { display: grid; gap: 6px; }
        .age-meta { display: inline-flex; gap: 10px; align-items: center; font-size: 12px; color: #374151; }
        .dock-wrap { position: fixed; inset-inline: 0; bottom: calc(16px + env(safe-area-inset-bottom)); display:flex; justify-content:center; pointer-events:none; z-index: 60; }
        .dock { pointer-events:auto; display:flex; align-items:center; gap: 14px; padding: 14px 16px; border-radius: 18px;
          background: radial-gradient(circle at top left, rgba(148,163,184,.35), rgba(15,23,42,.90));
          color: #fff; backdrop-filter: blur(16px) saturate(140%); border: 1px solid rgba(255,255,255,.18);
          box-shadow: 0 18px 40px rgba(2,6,23,.40), 0 2px 6px rgba(2,6,23,.25) inset; max-width: min(760px, 92vw); }
        .dock-count { font-weight: 900; font-size: 13px; padding: 8px 14px; border-radius: 999px;
          background: linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.06));
          border: 1px solid rgba(255,255,255,.22); white-space: nowrap; }
        .dock-count-warn { border-color: rgba(248,113,113,.85); background: linear-gradient(180deg, rgba(248,113,113,.30), rgba(248,113,113,.18)); }
        .dock-actions { display:flex; align-items:center; gap: 8px; }
        .dock-btn { position: relative; overflow: hidden; display:inline-flex; gap:8px; align-items:center; justify-content:center; min-height: 48px;
          font-weight:800; letter-spacing:.2px; padding: 10px 14px; border-radius: 16px; cursor:pointer; border: 1px solid rgba(255,255,255,.22);
          background: linear-gradient(180deg, rgba(30,64,175,.96), rgba(30,64,175,.88));
          box-shadow: 0 10px 18px rgba(30,64,175,.45); color:#fff; transition: transform .14s ease, box-shadow .14s ease, filter .14s ease; }
        .dock-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .dock-btn.alt { background: linear-gradient(180deg, rgba(14,165,233,.98), rgba(2,132,199,.96)); box-shadow: 0 10px 18px rgba(14,165,233,.50); }
        .dock-btn-event { background: linear-gradient(180deg, rgba(59,130,246,.98), rgba(37,99,235,.96)); box-shadow: 0 10px 18px rgba(37,99,235,.55); }
        .dock-label { display:flex; flex-direction:column; align-items:flex-start; line-height:1.1; }
        .dock-text { display:inline; font-size: 13px; }
        .dock-sub { font-size: 11px; font-weight: 500; opacity: .86; }
        .dock-sep { width:1px; height:26px; background: rgba(255,255,255,.32); margin-inline: 4px; }
        .dock-ghost { background: transparent; border: 1px solid rgba(255,255,255,.50); color:#fff; border-radius: 14px; padding: 9px 14px; min-height:44px; cursor: pointer; font-weight:700; }
        .dock-btn.is-disabled { filter: grayscale(0.85); opacity: 0.60; cursor: not-allowed; box-shadow:none; transform:none;
          background: linear-gradient(180deg, rgba(31,41,55,.96), rgba(15,23,42,.96)); }
        .dock-btn-connect .btn-progress { position:absolute; left:0; top:0; bottom:0; background: rgba(255,255,255,.22); width:0%; transition: width .18s ease; pointer-events: none; }
        .has-tip { position: relative; display: inline-flex; }
        .tip { position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 8px; padding: 6px 8px; white-space: nowrap;
          font-size: 12px; font-weight: 700; background: rgba(17,24,39,.98); color:#fff; border: 1px solid rgba(255,255,255,.18); border-radius: 8px;
          opacity: 0; pointer-events: none; transition: opacity .15s ease; }
        .has-tip:hover .tip, .has-tip:focus-within .tip { opacity: 1; }
        .gg-toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(92px + env(safe-area-inset-bottom)); z-index: 70;
          background: #111827; color: #fff; padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,.16);
          box-shadow: 0 10px 22px rgba(2,6,23,.35); font-size: 13px; font-weight: 700; letter-spacing: .2px; }
        .composer-textarea { width:100%; min-height:96px; resize:none; padding:12px 14px; border-radius:14px; border:1px solid #e5e7eb; background:#fff;
          box-shadow: 0 1px 2px rgba(0,0,0,.04) inset; font-size:14px; line-height:1.45; }
        .composer-textarea:focus { outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.35); }
        .recipients { display:flex; gap:8px; flex-wrap:wrap; margin:6px 0 10px; }
        .recipient-pill { padding:6px 10px; border-radius:999px; font-weight:700; font-size:12px; background:rgba(15,23,42,.06); border:1px solid rgba(15,23,42,.08); color:#0f172a; }
        .quick-templates { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
        .quick-chip { padding: 8px 12px; min-height: 32px; border-radius:999px; font-size:12px; cursor:pointer; border:1px solid rgba(2,6,23,.08); background:#fff; }
        .quick-chip:hover { box-shadow:0 6px 14px rgba(2,6,23,.06); transform:translateY(-1px); }
        .counter-right { margin-top:8px; text-align:right; font-size:12px; color:#475569; }
        .quick-suggestions-header { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 13px; font-weight: 600; color: #475569; }
        .sheet-actions-row { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e5e7eb; }
        @media (max-width: 520px) {
          .gg-actions { min-width: 120px; }
          .gg-btn { width: 100%; justify-content: center; }
          .gg-name { max-width: 65vw; }
          .chip-scroll { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: thin; }
          .dock { gap: 10px; padding-inline: 12px; }
          .dock-label { display:none; }
          .dock-btn, .dock-btn.alt, .dock-btn-event { min-width: 44px; padding-inline: 11px; }
        }
      `}</style>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <img src={Logo} alt="GatherGrove logo" style={{ width: 28, height: 28, borderRadius: 6 }} />
        <h2 className="home-title">People</h2>
      </div>
      <p className="home-sub">Browse the neighbors directory and message nearby households.</p>

      <div>
        <div style={{ fontSize: 14, marginBottom: 4 }}>
          {selectedIds.size === 0
            ? "No households selected."
            : `${selectedIds.size} household${selectedIds.size === 1 ? "" : "s"} selected.`}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            placeholder="Search households…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              minWidth: 220,
              flex: 1,
            }}
          />

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={onlyFavs} onChange={(e) => setOnlyFavs(e.target.checked)} />
            Show favorites only
          </label>

          <button
            onClick={load}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#fff",
              fontWeight: 700,
            }}
            title="Refresh directory"
          >
            Refresh
          </button>
        </div>

        <div className="filter-wrap">
          <div className="filter-row">
            <div className="filter-label">
              Neighborhoods
              {selectedNeighborhoods.size > 0 && (
                <button className="mini-clear" onClick={() => setSelectedNeighborhoods(new Set())}>
                  Clear
                </button>
              )}
            </div>
            <div className="chip-scroll">
              {neighborhoods.map((n) => (
                <Chip
                  key={n.key}
                  label={n.label}
                  selected={selectedNeighborhoods.has(n.key)}
                  onClick={() => setSelectedNeighborhoods((prev) => toggleInSet(prev, n.key))}
                />
              ))}
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-label">
              Household Type
              {selectedTypes.size > 0 && selectedTypes.size < HOUSEHOLD_TYPES.length && (
                <button className="mini-clear" onClick={() => setSelectedTypes(new Set(HOUSEHOLD_TYPES))}>
                  Clear
                </button>
              )}
            </div>
            <div className="chip-scroll">
              {HOUSEHOLD_TYPES.map((t) => (
                <Chip
                  key={t}
                  label={t}
                  selected={selectedTypes.has(t)}
                  onClick={() => setSelectedTypes(toggleInSet(selectedTypes, t))}
                />
              ))}
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-label">Babysitting</div>
            <div className="chip-scroll">
              <Chip
                label="Babysitting help available"
                selected={onlyBabysitters}
                onClick={() => setOnlyBabysitters((prev) => !prev)}
                emoji="🧑‍🍼"
              />
            </div>
          </div>

          {hasFamilySelected && (
            <div className="age-block">
              <div className="filter-label">Child Age Range</div>
              <DualAgeRange
                min={0}
                max={18}
                step={1}
                valueMin={ageMin}
                valueMax={ageMax}
                onChange={(lo, hi) => {
                  const loClamped = Math.max(0, Math.min(18, Math.min(lo, hi)));
                  const hiClamped = Math.max(0, Math.min(18, Math.max(lo, hi)));
                  setAgeMin(loClamped);
                  setAgeMax(hiClamped);
                }}
              />
              {(ageMin !== 0 || ageMax !== 18) && (
                <div className="age-meta">
                  {ageMin}–{ageMax}
                  <button
                    className="mini-clear"
                    onClick={() => {
                      setAgeMin(0);
                      setAgeMax(18);
                    }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, fontSize: 18, fontWeight: 600 }}>
          {loading ? "Loading…" : `${filtered.length} household${filtered.length === 1 ? "" : "s"} found`}
        </div>

        {filtered.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={selectAllFiltered}
              disabled={filtered.length === 0 || selectedIds.size === filtered.length}
              title="Select all households currently shown"
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              Select all ({filtered.length})
            </button>
            <button
              onClick={clearSelection}
              disabled={selectedIds.size === 0}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" }}
            >
              Clear selection
            </button>
            {selectedIds.size > 0 && <span style={{ fontSize: 14, color: "#374151" }}>{selectedIds.size} selected</span>}
          </div>
        )}

        <div className="gg-grid" style={{ marginTop: 16 }}>
          {loading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}

          {!loading && filtered.length === 0 && (
            <div className="gg-card gg-card-enter" role="status" aria-live="polite">
              <div className="gg-select-pad" aria-hidden />
              <div className="gg-avatar" aria-hidden>
                👋
              </div>
              <div className="gg-main">
                <h3 className="gg-name" style={{ marginBottom: 6 }}>
                  No matching households
                </h3>
                <div style={{ color: "#4b5563", fontSize: 14 }}>Try adjusting filters or clearing search text.</div>
              </div>
              <div className="gg-actions" />
            </div>
          )}

          {!loading &&
            filtered.map((u, idx) => {
              const label = displayLabel(u);
              const initial = label.charAt(0).toUpperCase();
              const isFav = favs.has(u.id);
              const type = u.householdType ?? undefined;
              const selected = selectedIds.has(u.id);

              const kids: Kid[] = Array.isArray(u.kids) ? (u.kids as Kid[]) : [];
              const kidsAtHome = kids.filter((k) => !k.awayAtCollege);
              const kidsAway = kids.filter((k) => k.awayAtCollege);
              const totalKids = kids.length;
              const kidsLabel = totalKids === 0 ? "None listed yet" : `${totalKids} kid${totalKids > 1 ? "s" : ""}`;
              const hasBabysitter = userHasBabysitter(u);

              // ✅ display neighborhood label (code → friendly name)
              const hoodText = u.neighborhood ? neighborhoodDisplay(u.neighborhood) : "";

              return (
                <div
                  key={u.id}
                  className={["gg-card", "gg-card-enter", selected ? "selected" : ""].join(" ")}
                  style={{ animationDelay: `${idx * 35}ms` }}
                >
                  <div className="gg-select-pad">
                    <motion.button
                      type="button"
                      aria-pressed={selected}
                      aria-label={selected ? `Deselect ${label}` : `Select ${label}`}
                      className={["gg-checkbox", "gg-tap-target", selected ? "on" : ""].join(" ")}
                      onClick={() => setSelectedIds((prev) => toggleInSet(prev, u.id))}
                      {...tapMotionProps}
                    >
                      {selected ? "✓" : ""}
                    </motion.button>
                  </div>

                  <div className="gg-avatar" aria-hidden onClick={() => setSelectedIds((prev) => toggleInSet(prev, u.id))}>
                    {initial}
                  </div>

                  <div
                    className="gg-main"
                    onClick={(e) => {
                      if ((e as any).metaKey || (e as any).ctrlKey) setSelectedIds((prev) => toggleInSet(prev, u.id));
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h3 className="gg-name">{label}</h3>
                      {hoodText && <span className="gg-pill neighborhood">{hoodText}</span>}
                    </div>

                    {Array.isArray(u.adultNames) && u.adultNames.length > 0 && (
                      <div className="adults">
                        <span style={{ color: "#6b7280" }}>Adults: </span>
                        <span style={{ fontWeight: 600 }}>{u.adultNames.join(" & ")}</span>
                      </div>
                    )}

                    {u.householdType === "Family w/ Kids" && (
                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#4b5563",
                            marginBottom: kids.length && kidsAway.length ? 4 : 6,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>Children:&nbsp;</span>
                          {kidsLabel}
                        </div>

                        {kids.length > 0 && kidsAway.length === 0 && (
                          <div className="kids-row">
                            {kids.map((k, i) => {
                              const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                              const icon = sexIcon(k.sex);
                              const { bg, fg } = chipColors(k.sex);
                              return (
                                <span
                                  key={i}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    fontSize: 12,
                                    padding: "6px 10px",
                                    borderRadius: 999,
                                    background: bg,
                                    color: fg,
                                    fontWeight: 600,
                                    lineHeight: 1,
                                  }}
                                >
                                  {age != null ? `${age} yr` : "?"}
                                  {icon && (
                                    <span aria-hidden style={{ marginLeft: 4 }}>
                                      {icon}
                                    </span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {kidsAway.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 12 }}>
                            {kidsAtHome.length > 0 && (
                              <div className="kids-section">
                                <div className="kids-subheading">At home</div>
                                <div className="kids-row">
                                  {kidsAtHome.map((k, i) => {
                                    const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                                    const icon = sexIcon(k.sex);
                                    const { bg, fg } = chipColors(k.sex);
                                    return (
                                      <span
                                        key={`home-${i}`}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 6,
                                          fontSize: 12,
                                          padding: "6px 10px",
                                          borderRadius: 999,
                                          background: bg,
                                          color: fg,
                                          fontWeight: 600,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {age != null ? `${age} yr` : "?"}
                                        {icon && (
                                          <span aria-hidden style={{ marginLeft: 4 }}>
                                            {icon}
                                          </span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="kids-section">
                              <div className="kids-subheading">Lives away from home</div>
                              <div className="kids-row">
                                {kidsAway.map((k, i) => {
                                  const age = ageFromMY(k.birthMonth ?? null, k.birthYear ?? null);
                                  const icon = sexIcon(k.sex);
                                  const { bg, fg } = chipColors(k.sex);
                                  return (
                                    <span
                                      key={`away-${i}`}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 6,
                                        fontSize: 12,
                                        padding: "6px 10px",
                                        borderRadius: 999,
                                        background: bg,
                                        color: fg,
                                        fontWeight: 600,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {age != null ? `${age} yr` : "?"}
                                      {icon && (
                                        <span aria-hidden style={{ marginLeft: 4 }}>
                                          {icon}
                                        </span>
                                      )}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}

                        {hasBabysitter && (
                          <div style={{ marginTop: 8 }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: "#ecfdf3",
                                color: "#166534",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              <span role="img" aria-label="babysitting">
                                🧑‍🍼
                              </span>
                              <span>Babysitting help available</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {type && (
                      <span className="gg-pill type" style={{ marginTop: 10, display: "inline-block" }}>
                        {type}
                      </span>
                    )}
                  </div>

                  <div className="gg-actions">
                    <motion.button
                      className="gg-star gg-tap-target"
                      aria-label={isFav ? `Unfavorite ${label}` : `Favorite ${label}`}
                      aria-pressed={isFav}
                      onClick={() => toggle(u.id)}
                      title={isFav ? "Unstar" : "Star"}
                      {...tapMotionProps}
                    >
                      {isFav ? "⭐" : "☆"}
                    </motion.button>

                    {selectedIds.size === 0 && (
                      <motion.button
                        className="gg-btn gg-tap-target"
                        onClick={() => {
                          setSelectedIds(new Set([u.id]));
                          setShowConnectModal(true);
                        }}
                        {...tapMotionProps}
                      >
                        <span role="img" aria-label="chat">
                          💬
                        </span>{" "}
                        Message
                      </motion.button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <div style={{ height: "calc(env(safe-area-inset-bottom, 0px) + 104px)" }} />
      </div>

      <Toast text={`Messaging is limited to ${MAX_DM_TARGETS} households`} show={showToast} />

      <ActionDock
        count={selectedIds.size}
        canDM={selectedIds.size > 0 && selectedIds.size <= MAX_DM_TARGETS}
        maxDm={MAX_DM_TARGETS}
        onDM={() => {
          if (selectedIds.size > 0 && selectedIds.size <= MAX_DM_TARGETS) setShowConnectModal(true);
        }}
        onHappeningNow={() =>
          selectedIds.size > 0 &&
          navigate("/compose/happening", {
            state: { recipients: selectedRecipientLabels, recipientIds: selectedRecipientIds },
          })
        }
        onFutureEvent={() =>
          selectedIds.size > 0 &&
          navigate("/compose/event", {
            state: { recipients: selectedRecipientLabels, recipientIds: selectedRecipientIds },
          })
        }
        onClear={clearSelection}
      />

      <BottomSheet open={showConnectModal} title="Start a Message" onClose={() => setShowConnectModal(false)}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <div className="text-sm text-slate-600">Sending to:</div>
          <div className="recipients">
            {selectedUsers.map((u) => (
              <span key={u.id} className="recipient-pill">
                {displayLabel(u)}
              </span>
            ))}
          </div>

          <div className="mt-3">
            <label className="block text-sm font-semibold mb-1">Message</label>
            <AutoGrowTextarea
              value={dmText}
              onChange={setDmText}
              placeholder="Write a quick hello…"
              maxLength={500}
              onCmdEnter={() => dmText.trim() && sendConnect()}
            />

            {QUICK_SUGGESTIONS.length > 0 && (
              <>
                <div className="quick-suggestions-header">Quick suggestions</div>
                <div className="quick-templates">
                  {QUICK_SUGGESTIONS.map((t) => (
                    <motion.button
                      key={t}
                      type="button"
                      className="quick-chip"
                      onClick={() => setDmText(t)}
                      {...tapMotionProps}
                    >
                      {t}
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            <div className="counter-right">{dmText.length}/500</div>
          </div>

          <div className="sheet-actions-row" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <motion.button
              type="button"
              className="gg-tap-target"
              onClick={() => setShowConnectModal(false)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: "1px solid #d1d5db",
                background: "#ffffff",
                fontSize: 14,
                fontWeight: 500,
                color: "#374151",
                cursor: "pointer",
              }}
              {...tapMotionProps}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              className="gg-tap-target"
              onClick={sendConnect}
              disabled={!dmText.trim()}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: dmText.trim() ? "#0f172a" : "#9ca3af",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 600,
                cursor: dmText.trim() ? "pointer" : "default",
                boxShadow: dmText.trim() ? "0 10px 22px rgba(15,23,42,.45)" : "none",
                opacity: dmText.trim() ? 1 : 0.8,
              }}
              {...tapMotionProps}
            >
              Send
            </motion.button>
          </div>
        </div>
      </BottomSheet>

      <Snackbar
        open={snackOpen}
        text={snackText}
        actionLabel={snackRecipients ? "View thread" : undefined}
        onAction={() => {
          if (!snackRecipients) return;
          navigate("/messages", { state: { recipients: snackRecipients } });
          setSnackOpen(false);
        }}
        onClose={() => setSnackOpen(false)}
      />
    </div>
  );
}
