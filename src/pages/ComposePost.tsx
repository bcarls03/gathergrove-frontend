// src/pages/ComposePost.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { getViewer } from "../lib/viewer";
import { loadNeighbors } from "../lib/profile";
import * as Api from "../lib/api";
import type { EventCategory, EventVisibility } from "../lib/api";
import { HouseholdSelector } from "../components/HouseholdSelector";

/* ---------- Types ---------- */

type Post = {
  id: string;
  kind: "happening" | "event";
  title?: string;
  when?: string; // ISO for event time (built from date + start time)
  end?: string; // ISO for optional end time
  details: string;

  // local-only targeting (labels)
  recipients?: string[];
  // local-only targeting (uids)
  recipientIds?: string[];

  createdBy: { id: string; label: string };
  ts: number;
  category?: EventCategory;

  _hostUid?: string | null;

  // keep backend id explicitly too (future-proof)
  backendId?: string;
};

type Neighbor = {
  id: string;
  label?: string | null;
  lastName?: string | null;
};

const KEY = "gg:posts";

/* ---------- LocalStorage helpers (safe) ---------- */

const safeGetLocalStorage = (): Storage | null => {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
};

const loadPosts = (): Post[] => {
  try {
    const ls = safeGetLocalStorage();
    if (!ls) return [];
    return JSON.parse(ls.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const savePosts = (p: Post[]) => {
  try {
    const ls = safeGetLocalStorage();
    if (!ls) return;
    ls.setItem(KEY, JSON.stringify(p));
  } catch {}
};

/* ---------- Category display helper ---------- */

type CategoryMeta = {
  id: EventCategory;
  emoji: string;
  label: string;
  description: string;
};

const DEFAULT_CATEGORY_ID: EventCategory = "neighborhood";

const CATEGORY_OPTIONS: CategoryMeta[] = [
  { id: "neighborhood", emoji: "🏡", label: "Neighborhood", description: "Community gatherings, block parties, neighborhood events" },
  { id: "playdate", emoji: "🤸", label: "Playdate", description: "Family hangouts, kids playing together, park meetups" },
  { id: "babysitting", emoji: "👶", label: "Babysitting", description: "Babysitter requests, childcare needs" },
  { id: "pet", emoji: "🐶", label: "Pets", description: "Dog playdates, pet sitting, lost/found pets" },
  { id: "celebrations", emoji: "🎉", label: "Celebrations", description: "Birthdays, holidays, milestones" },
  { id: "other", emoji: "✨", label: "Other", description: "Anything that doesn’t fit above" },
];

/* ---------- Small helpers ---------- */

function makeId() {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2);
}

function combineDateAndTime(dateStr: string, timeStr: string): string | undefined {
  if (!dateStr || !timeStr) return undefined;
  try {
    const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
    const [hh, mm] = timeStr.split(":").map((s) => parseInt(s, 10));
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return undefined;
    const dt = new Date(y, m - 1, d, hh, mm);
    return dt.toISOString();
  } catch {
    return undefined;
  }
}

function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function isoToTimeInputLocal(iso?: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  } catch {
    return "";
  }
}

function removeLocalPostById(id: string) {
  const all = loadPosts();
  savePosts(all.filter((p) => p.id !== id));
}

/* ---------- Page ---------- */

export default function ComposePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ kind?: string; id?: string }>();

  const kind: "happening" | "event" = params.kind === "event" ? "event" : "happening";
  const editId = params.id;

  // Extract invite context from navigation state
  const inviteContext = (location.state as any)?.inviteContext;

  const recipientsFromState: string[] =
    (location.state as any)?.recipients && Array.isArray((location.state as any).recipients)
      ? (location.state as any).recipients
      : [];

  const viewer = getViewer() as any;
  const createdBy = {
    id: viewer?.id ?? viewer?.uid ?? viewer?.email ?? "me",
    label: viewer?.label ?? viewer?.name ?? viewer?.email ?? "You",
  };

  const existingPost = useMemo(() => {
    if (!editId) return undefined;
    return loadPosts().find((p) => p.id === editId);
  }, [editId]);

  const isEditingExisting = !!editId;

  const allNeighbors: Neighbor[] = useMemo(() => {
    try {
      const list = loadNeighbors() as Neighbor[] | undefined;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const lockedRecipients: string[] = existingPost?.recipients ?? [];

  const mutableRecipients: string[] = recipientsFromState;

  const effectiveRecipients: string[] = isEditingExisting
    ? Array.from(new Set([...lockedRecipients, ...mutableRecipients]))
    : mutableRecipients;

  const [details, setDetails] = useState(existingPost?.details ?? "");

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [date, setDate] = useState<string>(() => isoToDateInput(existingPost?.when));
  const [startTime, setStartTime] = useState<string>(() => isoToTimeInputLocal(existingPost?.when));
  const [endTime, setEndTime] = useState<string>(() => isoToTimeInputLocal(existingPost?.end));

  const [categoryId, setCategoryId] = useState<EventCategory>(existingPost?.category ?? DEFAULT_CATEGORY_ID);
  const [visibility, setVisibility] = useState<EventVisibility>("public");
  const [eventLocation, setEventLocation] = useState<string>("");  // ✅ NEW: Event location field

  const categoryMeta = CATEGORY_OPTIONS.find((c) => c.id === categoryId) ?? CATEGORY_OPTIONS[0];

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showCategoryStep, setShowCategoryStep] = useState(kind === "event" && !existingPost);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedHouseholdIds, setSelectedHouseholdIds] = useState<Set<string>>(new Set());
  const [selectedPhoneNumbers, setSelectedPhoneNumbers] = useState<Set<string>>(new Set());

  // ✅ NEW: Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const [createdEventTitle, setCreatedEventTitle] = useState<string>("");
  const [createdEventType, setCreatedEventType] = useState<"happening" | "event">("happening");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const resolvedNeighborLabel = (n: Neighbor) => (n.label ?? n.lastName ?? "").toString();

  // ✅ Modal styling based on event type
  const isHappeningNow = createdEventType === "happening";
  const modalEmoji = isHappeningNow ? "⚡" : "🎉";
  const modalGradient = isHappeningNow 
    ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)"
    : "linear-gradient(135deg, #34d399 0%, #10b981 50%, #059669 100%)";
  const modalShimmer = isHappeningNow 
    ? `@keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }`
    : "";

  const canSubmitDetails =
    kind === "happening"
      ? details.trim().length > 0
      : details.trim().length > 0 && title.trim().length > 0 && !!date && !!startTime;

  /* ---------- Send Invitations ---------- */

  const sendInvitations = async (eventId: string) => {
    // Build invitation payload with arrays of household IDs and phone numbers
    const household_ids = Array.from(selectedHouseholdIds);
    const phone_numbers = Array.from(selectedPhoneNumbers);

    // Only call API if there are invitations to send
    if (household_ids.length === 0 && phone_numbers.length === 0) return;

    try {
      const invitationPayload: Api.InvitationCreate = {
        household_ids,
        phone_numbers,
      };
      
      await Api.createEventInvitations(eventId, invitationPayload);
      console.log(`Successfully sent invitations to ${household_ids.length} household(s) and ${phone_numbers.length} phone number(s)`);
    } catch (err: any) {
      console.error("Failed to send invitations:", err?.response?.data ?? err);
      // Don't block event creation if invitations fail
    }
  };

  /* ---------- Submit ---------- */

  const onSubmit = async () => {
    if (!canSubmitDetails || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const all = loadPosts();
      const now = Date.now();

      // label -> uid (best-effort)
      const labelToId = new Map<string, string>();
      for (const n of allNeighbors) {
        const lbl = resolvedNeighborLabel(n);
        if (lbl && n.id) labelToId.set(lbl, n.id);
      }

      const recipientIds = (effectiveRecipients || [])
        .map((lbl) => labelToId.get(lbl))
        .filter(Boolean) as string[];

      // Build local payload first (temp id), then replace with backend id after POST succeeds
      const tempId = existingPost?.id ?? makeId();

      if (kind === "happening") {
        const localPayload: Post = {
          id: tempId,
          kind: "happening",
          title: "Happening Now",
          details: details.trim(),
          recipients: effectiveRecipients,
          recipientIds,
          createdBy,
          ts: existingPost?.ts ?? now,
          _hostUid: createdBy.id ?? null,
          category: "neighborhood",
        };

        const nextLocal = existingPost ? all.map((p) => (p.id === existingPost.id ? localPayload : p)) : [...all, localPayload];
        savePosts(nextLocal);

        // Backend source of truth
        try {
          const res = await (Api as any).createEvent?.({
            type: "now",
            title: title.trim() || "Happening Now",  // ✅ Use custom title if provided
            details: localPayload.details,
            category: localPayload.category ?? "neighborhood",
            visibility: visibility,
            location: eventLocation.trim() || undefined,  // ✅ NEW: Send location
            startAt: new Date().toISOString(),
            endAt: null,
          });

          const backend = res?.data ?? res;
          const backendId = backend?.id;
          const shareLink = backend?.shareable_link || backend?.shareableLink;  // ✅ Capture shareable link

          if (backendId) {
            const updated = loadPosts().map((p) => (p.id !== tempId ? p : { ...p, id: backendId, backendId }));
            savePosts(updated);

            // Send invitations if households or phone numbers are selected
            await sendInvitations(backendId);
            
            // ✅ Show success modal with share link instead of navigating away
            if (shareLink) {
              setCreatedEventTitle(title.trim() || "Happening Now");
              setCreatedEventType("happening");
              setShareableLink(shareLink);
              setShowSuccessModal(true);
              return;  // Don't navigate yet
            }
          }
        } catch (err: any) {
          console.error("Failed to create backend happening", err?.response?.data ?? err);
        }

        navigate("/");
        return;
      }

      // Future Event branch
      const whenIso = combineDateAndTime(date, startTime);
      const endIso = endTime ? combineDateAndTime(date, endTime) : undefined;

      const localPayload: Post = {
        id: tempId,
        kind: "event",
        title: title.trim(),
        details: details.trim(),
        when: whenIso,
        end: endIso,
        recipients: effectiveRecipients,
        recipientIds,
        createdBy,
        ts: existingPost?.ts ?? now,
        category: categoryId,
        _hostUid: createdBy.id ?? null,
      };

      const nextLocal = existingPost ? all.map((p) => (p.id === existingPost.id ? localPayload : p)) : [...all, localPayload];
      savePosts(nextLocal);

      try {
        const res = await (Api as any).createEvent?.({
          type: "future",
          title: localPayload.title || "Future Event",
          details: localPayload.details,
          category: localPayload.category ?? DEFAULT_CATEGORY_ID,
          visibility: visibility,
          location: eventLocation.trim() || undefined,  // ✅ NEW: Send location
          startAt: localPayload.when ?? null,
          endAt: localPayload.end ?? null,
        });

        const backend = res?.data ?? res;
        const backendId = backend?.id;
        const shareLink = backend?.shareable_link || backend?.shareableLink;  // ✅ Capture shareable link

        if (backendId) {
          const updated = loadPosts().map((p) => (p.id !== tempId ? p : { ...p, id: backendId, backendId }));
          savePosts(updated);

          // Send invitations if households or phone numbers are selected
          await sendInvitations(backendId);
          
          // ✅ Show success modal with share link instead of navigating away
          if (shareLink) {
            setCreatedEventTitle(localPayload.title || "Future Event");
            setCreatedEventType("event");
            setShareableLink(shareLink);
            setShowSuccessModal(true);
            setIsSubmitting(false);
            return;  // Don't navigate yet
          }
        }
      } catch (err: any) {
        console.error("Failed to create backend future event", err?.response?.data ?? err);
      }

      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Cancel Event (works for Happening Now + Future Event) ---------- */

  const onCancelEvent = async () => {
    if (!existingPost || isSubmitting) return;

    const label = existingPost.kind === "happening" ? "Cancel this Happening Now post?" : "Cancel this event?";
    const ok = window.confirm(label);
    if (!ok) return;

    setIsSubmitting(true);
    try {
      const eventId = existingPost.backendId ?? existingPost.id;

      // Prefer the real API helper if present
      if (typeof (Api as any).cancelEvent === "function") {
        await (Api as any).cancelEvent(eventId);
      } else if (typeof (Api as any).deleteEvent === "function") {
        // fallback if cancel isn't implemented
        await (Api as any).deleteEvent(eventId);
      } else {
        console.warn("No cancelEvent/deleteEvent found in lib/api — canceled locally only.");
      }

      // Always remove local copy so UI updates immediately
      removeLocalPostById(existingPost.id);

      navigate("/");
    } catch (err: any) {
      console.error("Failed to cancel event", err?.response?.data ?? err);
      // Still remove locally so you can proceed
      removeLocalPostById(existingPost.id);
      navigate("/");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ---------- Preview helpers ---------- */

  const previewWhen = useMemo(() => {
    if (kind === "happening") return "Happening right now";
    if (!date || !startTime) return "Date & time TBD";
    const d = new Date(combineDateAndTime(date, startTime) || "");
    if (Number.isNaN(d.getTime())) return "Date & time TBD";
    return d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [kind, date, startTime]);

  const heading =
    kind === "happening"
      ? editId
        ? "Edit Happening Now"
        : "Post Happening Now"
      : editId
      ? "Edit Future Event"
      : "Create Future Event";

  const primaryLabel = editId ? "Save changes" : kind === "happening" ? "Post" : "Create event";

  const showCancelEventButton = isEditingExisting; // ✅ show for BOTH edit happening + edit future

  return (
    <div className="gg-compose-root">
      <div className="gg-compose-inner">
        <style>{`
          .gg-compose-root { padding: 16px; display: flex; justify-content: center; }
          .gg-compose-inner { width: 100%; max-width: 760px; }
          .gg-back-button { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; color: #374151; font-size: 14px; font-weight: 600; cursor: pointer; margin-bottom: 16px; transition: all 0.15s; }
          .gg-back-button:hover { background: #f9fafb; border-color: #d1d5db; }
          .gg-back-arrow { font-size: 16px; }
          .gg-page-title { font-size: 30px; font-weight: 800; letter-spacing: .02em; color: #0f172a; margin-bottom: 8px; }
          .gg-page-sub { font-size: 14px; color: #6b7280; margin-bottom: 16px; }
          .gg-card-shell { background: #fff; border-radius: 20px; border: 1px solid rgba(15,23,42,.06); box-shadow: 0 18px 40px rgba(15,23,42,.06); padding: 18px 18px 16px; width: 100%; box-sizing: border-box; }
          .gg-card-section { margin-bottom: 18px; }
          .gg-label { font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 4px; }
          .gg-label-sub { font-size: 13px; color: #6b7280; }
          .recipient-row { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
          .recipient-pill { padding:6px 10px; border-radius:999px; font-size:12px; font-weight:600; border:1px solid rgba(148,163,184,.6); background:rgba(15,23,42,.03); color:#0f172a; }
          .recipient-pill-locked { background:rgba(15,23,42,.03); border-style:solid; border-color:rgba(148,163,184,.7); }
          .recipient-pill-added { background:#eef2ff; border-color:#4f46e5; }
          .recipient-pill-label-muted { font-size:11px; color:#6b7280; margin-top:4px; }
          .composer-textarea { width:100%; min-height:96px; resize:vertical; padding:12px 14px; border-radius:14px; border:1px solid #e5e7eb; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.04) inset; font-size:14px; line-height:1.45; box-sizing: border-box; }
          .composer-textarea:focus { outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.35); }
          .gg-input { width:100%; padding:9px 11px; border-radius:10px; border:1px solid #e5e7eb; font-size:14px; box-sizing: border-box; }
          .gg-input:focus { outline:none; border-color:#93c5fd; box-shadow:0 0 0 3px rgba(147,197,253,.25); }
          .gg-row-2 { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap:12px; }
          .gg-footer { display:flex; justify-content:space-between; gap:8px; margin-top:16px; align-items:center; flex-wrap:wrap; }
          .gg-footer-right { display:flex; gap:8px; justify-content:flex-end; flex:1; }
          .btn { border-radius:999px; padding:9px 16px; font-size:14px; font-weight:600; border:1px solid transparent; cursor:pointer; }
          .btn-ghost { background:#f9fafb; border-color:#e5e7eb; color:#111827; }
          .btn-ghost:hover { background:#f3f4f6; }
          .btn-primary { background:linear-gradient(180deg,#0f172a,#020617); color:#fff; }
          .btn-primary:disabled { opacity:.45; cursor:not-allowed; }
          .btn-danger { background:#fff; border-color:#fecaca; color:#b91c1c; }
          .btn-danger:hover { background:#fef2f2; }
          .cat-pill { display:inline-flex; align-items:center; gap:8px; padding:10px 12px; border-radius:14px; background:rgba(15,23,42,.03); border:1px solid rgba(15,23,42,.08); }
          .cat-emoji { font-size:20px; }
          .cat-label { font-weight:700; font-size:14px; }
          .cat-desc { font-size:13px; color:#6b7280; }
          .cat-change-btn, .neighbor-edit-btn { margin-top:8px; border-radius:999px; border:1px dashed #e5e7eb; padding:6px 12px; font-size:13px; background:#fff; cursor:pointer; }
          .cat-change-btn:hover, .neighbor-edit-btn:hover { background:#f9fafb; }
          .cat-step-options { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
          .cat-option { width:100%; text-align:left; border-radius:14px; padding:10px 12px; border:1px solid #e5e7eb; background:#fff; display:flex; align-items:flex-start; gap:10px; cursor:pointer; }
          .cat-option:hover { background:#f9fafb; }
          .cat-option-main { font-size:14px; font-weight:700; color:#0f172a; }
          .cat-option-sub { font-size:13px; color:#6b7280; }
          .full-preview-card { border-radius: 20px; border: 1px solid rgba(15,23,42,.08); background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%); padding: 20px 20px 24px; box-shadow: 0 20px 50px rgba(15,23,42,.12), 0 5px 15px rgba(15,23,42,.06); position: relative; overflow: hidden; }
          .full-preview-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #34d399 0%, #10b981 50%, #059669 100%); opacity: 0.8; }
          .full-preview-card.happening-now::before { background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%); animation: shimmer 3s ease-in-out infinite; }
          @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.9; } }
          .full-preview-title-row { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:4px; }
          .full-preview-title { font-size:20px; font-weight:800; color:#0f172a; line-height:1.3; letter-spacing:-0.01em; }
          .full-preview-pill { font-size:11px; padding:5px 11px; border-radius:999px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; flex-shrink: 0; }
          .full-preview-pill.happening { border:1.5px solid rgba(251,191,36,.6); background:linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color:#92400e; box-shadow: 0 2px 8px rgba(251,191,36,.3); }
          .full-preview-pill.future { border:1.5px solid rgba(52,211,153,.5); background:linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color:#065f46; box-shadow: 0 2px 8px rgba(52,211,153,.25); }
          .full-preview-host { font-size:13px; color:#64748b; margin-bottom:10px; display:flex; align-items:center; gap:6px; font-weight:500; }
          .full-preview-host-icon { font-size:15px; }
          .full-preview-meta { font-size:14px; color:#64748b; margin-bottom:5px; display:flex; align-items:center; gap:6px; font-weight:500; }
          .full-preview-meta-icon { font-size:16px; }
          .full-preview-divider { height:1px; background:linear-gradient(90deg, transparent 0%, rgba(148,163,184,.15) 50%, transparent 100%); margin:14px 0; }
          .full-preview-category { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:12px; background:rgba(241,245,249,.8); border:1px solid rgba(148,163,184,.2); font-size:13px; font-weight:600; color:#475569; margin-bottom:12px; }
          .full-preview-body { font-size:15px; color:#1e293b; white-space:pre-wrap; line-height:1.6; margin-bottom:0; }
          .full-preview-invites { margin-top:16px; padding-top:16px; border-top:1px solid rgba(148,163,184,.15); }
          .full-preview-invites-label { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; font-weight:700; margin-bottom:8px; }
          .full-preview-invites-list { display:flex; flex-wrap:wrap; gap:6px; }
          .full-preview-invite-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px; background:linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border:1px solid rgba(34,197,94,.2); font-size:13px; font-weight:600; color:#166534; }
          .full-preview-invite-icon { font-size:14px; }
          .full-preview-cta { margin-top:20px; padding:16px; border-radius:16px; background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border:1px solid rgba(148,163,184,.2); text-align:center; }
          .full-preview-cta-text { font-size:13px; color:#475569; font-weight:500; line-height:1.5; }
          .full-preview-cta-text strong { color:#0f172a; font-weight:700; }
          .preview-shell-inline { margin-top:10px; padding:14px 14px 12px; border-radius:16px; border:1px dashed rgba(148,163,184,.8); background:rgba(248,250,252,.85); }
          .preview-label-inline { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; font-weight:700; margin-bottom:6px; }
          @media (max-width: 640px) { .gg-row-2 { grid-template-columns: 1fr; } }
        `}</style>

        {/* Only show "Back to Discovery" when NOT in preview mode */}
        {mode !== "preview" && (
          <button type="button" className="gg-back-button" onClick={() => navigate(-1)}>
            <span className="gg-back-arrow">←</span>
            <span>Back to Discovery</span>
          </button>
        )}

        <h1 className="gg-page-title">{heading}</h1>
        <div className="gg-page-sub">
          {kind === "happening" ? "Share something neighbors can jump into right now." : "Plan something neighbors can join later."}
        </div>

        <div className="gg-card-shell">
          {kind === "event" && showCategoryStep ? (
            <>
              <div className="gg-card-section">
                <div className="gg-label">Choose a category</div>
                <div className="gg-label-sub">This helps neighbors quickly understand what kind of event it is.</div>

                <div className="cat-step-options">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="cat-option"
                      onClick={() => {
                        setCategoryId(opt.id);
                        setShowCategoryStep(false);
                      }}
                    >
                      <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                      <div>
                        <div className="cat-option-main">{opt.label}</div>
                        <div className="cat-option-sub">{opt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="gg-footer">
                <div />
                <div className="gg-footer-right">
                  <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setShowCategoryStep(false)}>
                    Continue
                  </button>
                </div>
              </div>
            </>
          ) : mode === "edit" ? (
            <>
              {kind === "event" && (
                <div className="gg-card-section">
                  <div className="gg-label">Category</div>
                  <div className="cat-pill">
                    <span className="cat-emoji" aria-hidden>
                      {categoryMeta.emoji}
                    </span>
                    <div>
                      <div className="cat-label">{categoryMeta.label}</div>
                      <div className="cat-desc">{categoryMeta.description}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cat-change-btn"
                    onClick={() => {
                      setShowCategoryStep(true);
                      setMode("edit");
                    }}
                  >
                    Change category
                  </button>
                </div>
              )}

              {kind === "event" && (
                <div className="gg-card-section">
                  <div className="gg-label" style={{ marginBottom: 8 }}>
                    Event details
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Title</label>
                    <input className="gg-input" placeholder="Title of the event" value={title} onChange={(e) => setTitle(e.target.value)} />
                  </div>

                  <div className="gg-row-2" style={{ marginBottom: 10 }}>
                    <div>
                      <label className="gg-label">Select a date</label>
                      <input className="gg-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="gg-label">Start time</label>
                      <input className="gg-input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Finish time (optional)</label>
                    <input className="gg-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>

                  {/* ✅ NEW: Location input for future events */}
                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">📍 Location</label>
                    <input 
                      className="gg-input" 
                      placeholder="e.g., Oak Hill Park, 123 Main St, or Starbucks on 5th" 
                      value={eventLocation} 
                      onChange={(e) => setEventLocation(e.target.value)} 
                    />
                  </div>

                  <div>
                    <label className="gg-label">Details</label>
                    <textarea
                      className="composer-textarea"
                      placeholder="Details (e.g., BYOB, bring chairs, snacks, kids welcome, etc.)"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {kind === "happening" && (
                <div className="gg-card-section">
                  <div className="gg-label">Title (optional)</div>
                  <input
                    className="gg-input"
                    placeholder="e.g., Sledding at our house!"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  
                  <div style={{ marginTop: 10 }}>
                  <div className="gg-label">Details</div>
                  <textarea
                    className="composer-textarea"
                    placeholder="What’s happening right now? (Posts disappear after 24 hours.)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                  </div>
                  
                  {/* ✅ NEW: Location input for happening now */}
                  <div style={{ marginTop: 10 }}>
                    <label className="gg-label">📍 Where? (optional)</label>
                    <input 
                      className="gg-input" 
                      placeholder="e.g., Oak Hill Park, my backyard, or corner of Oak & Maple" 
                      value={eventLocation} 
                      onChange={(e) => setEventLocation(e.target.value)} 
                    />
                  </div>
                </div>
              )}

              {/* Household Selector */}
              <HouseholdSelector 
                selectedIds={selectedHouseholdIds}
                onSelectionChange={setSelectedHouseholdIds}
                selectedPhoneNumbers={selectedPhoneNumbers}
                onPhoneNumbersChange={setSelectedPhoneNumbers}
                inviteContext={inviteContext}
              />

              <div className="preview-shell-inline">
                <div className="preview-label-inline">Next step</div>
                <div>
                  Tap <strong>Preview</strong> below to see exactly how your post will look before you share it.
                </div>
              </div>

              <div className="gg-footer">
                {/* ✅ Cancel Event button on EDIT screen for both kinds */}
                <div>
                  {showCancelEventButton && (
                    <button type="button" className="btn btn-danger" disabled={isSubmitting} onClick={onCancelEvent}>
                      Cancel event
                    </button>
                  )}
                </div>

                <div className="gg-footer-right">
                  <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!canSubmitDetails} onClick={() => setMode("preview")}>
                    Preview
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="gg-card-section">
                <div className="gg-label">✨ Preview</div>
                <div className="gg-label-sub">This is how your {kind === "happening" ? "happening now post" : "event"} will appear to neighbors.</div>
              </div>

              <div className="gg-card-section">
                <div className={`full-preview-card ${kind === "happening" ? "happening-now" : ""}`}>
                  <div className="full-preview-title-row">
                    <div className="full-preview-title">
                      {kind === "happening" ? (title.trim() || "Something happening now") : (title.trim() || "Your event title")}
                    </div>
                    <div className={`full-preview-pill ${kind === "happening" ? "happening" : "future"}`}>
                      {kind === "happening" ? "Now" : "Upcoming"}
                    </div>
                  </div>
                  
                  {/* Host name */}
                  <div className="full-preview-host">
                    <span className="full-preview-host-icon">👤</span>
                    <span>Hosted by {createdBy.label}</span>
                  </div>
                  
                  <div className="full-preview-meta">
                    <span className="full-preview-meta-icon">🕐</span>
                    {previewWhen}
                  </div>
                  
                  {/* Show location if entered */}
                  {eventLocation && eventLocation.trim() && (
                    <div className="full-preview-meta">
                      <span className="full-preview-meta-icon">📍</span>
                      {eventLocation}
                    </div>
                  )}
                  
                  {kind === "event" && categoryMeta && (
                    <div className="full-preview-category">
                      <span>{categoryMeta.emoji}</span>
                      <span>{categoryMeta.label}</span>
                    </div>
                  )}
                  
                  {/* Subtle divider */}
                  <div className="full-preview-divider"></div>
                  
                  <div className="full-preview-body">
                    {details.trim() || "Your details will appear here as you type..."}
                  </div>

                  {/* Show invited households */}
                  {(selectedHouseholdIds.size > 0 || selectedPhoneNumbers.size > 0) && (
                    <div className="full-preview-invites">
                      <div className="full-preview-invites-label">
                        📨 Invited ({selectedHouseholdIds.size + selectedPhoneNumbers.size})
                      </div>
                      <div className="full-preview-invites-list">
                        {Array.from(selectedHouseholdIds).slice(0, 8).map((id) => {
                          // Get household name from ID
                          const householdName = id === 'test-1' ? 'Anderson' :
                                               id === 'test-2' ? 'Brown' :
                                               id === 'test-3' ? 'Chen' :
                                               id === 'test-4' ? 'Garcia' :
                                               id === 'test-5' ? 'Johnson' :
                                               'Family';
                          return (
                            <div key={id} className="full-preview-invite-chip">
                              <span className="full-preview-invite-icon">👥</span>
                              <span>{householdName}</span>
                            </div>
                          );
                        })}
                        {Array.from(selectedPhoneNumbers).slice(0, 3).map((phone) => (
                          <div key={phone} className="full-preview-invite-chip">
                            <span className="full-preview-invite-icon">📱</span>
                            <span>{phone}</span>
                          </div>
                        ))}
                        {(selectedHouseholdIds.size + selectedPhoneNumbers.size) > 11 && (
                          <div className="full-preview-invite-chip">
                            <span>+{selectedHouseholdIds.size + selectedPhoneNumbers.size - 11} more</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Beautiful CTA */}
                  <div className="full-preview-cta">
                    <div className="full-preview-cta-text">
                      {kind === "happening" ? (
                        <>Ready to share? Your neighbors will see this <strong>instantly</strong> on their Home tab!</>
                      ) : (
                        <>Looking good? Hit <strong>Create Event</strong> to send invitations and make it official!</>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="gg-footer">
                <div />

                <div className="gg-footer-right">
                  <button type="button" className="btn btn-ghost" onClick={() => setMode("edit")}>
                    ← Back to Edit
                  </button>
                  <button type="button" className="btn btn-primary" disabled={!canSubmitDetails || isSubmitting} onClick={onSubmit}>
                    {isSubmitting ? "Publishing..." : primaryLabel}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Success Modal */}
      {showSuccessModal && shareableLink && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "20px",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            backgroundColor: "#fff",
            borderRadius: "24px",
            padding: "40px 32px 32px",
            maxWidth: "480px",
            width: "100%",
            boxShadow: "0 25px 70px rgba(0,0,0,0.35)",
            animation: "slideUp 0.3s ease-out",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Top accent bar matching event type */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "6px",
              background: modalGradient,
              opacity: 0.9,
              animation: isHappeningNow ? "shimmer 3s ease-in-out infinite" : "none",
            }} />
            
            <style>{`
              @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes checkmark {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
              ${modalShimmer}
            `}</style>
            
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ 
                fontSize: "56px", 
                marginBottom: "16px",
                animation: "checkmark 0.4s ease-out 0.1s both"
              }}>{modalEmoji}</div>
              
              {isHappeningNow && (
                <div style={{
                  fontSize: "18px",
                  fontWeight: "700",
                  color: "#f59e0b",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}>
                  Happening Now
                </div>
              )}
              
              <h2 style={{ 
                fontSize: "28px", 
                fontWeight: "800", 
                color: "#0f172a", 
                marginBottom: "12px",
                lineHeight: "1.2"
              }}>
                Event Posted!
              </h2>
              <p style={{ 
                fontSize: "18px", 
                color: "#475569", 
                marginBottom: "0",
                fontWeight: "600"
              }}>
                {createdEventTitle}
              </p>
            </div>

            <div style={{
              backgroundColor: "#f8fafc",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ 
                fontSize: "12px", 
                fontWeight: "700", 
                color: "#64748b", 
                marginBottom: "12px", 
                textTransform: "uppercase", 
                letterSpacing: "0.08em" 
              }}>
                📤 Share this event
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#eff6ff",
                padding: "14px 16px",
                borderRadius: "12px",
                border: "1px solid #bfdbfe",
              }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}${shareableLink}`}
                  style={{
                    flex: 1,
                    border: "none",
                    background: "none",
                    fontSize: "13px",
                    color: "#475569",
                    outline: "none",
                    fontFamily: "monospace",
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}${shareableLink}`);
                    setCopyFeedback(true);
                    setTimeout(() => setCopyFeedback(false), 2000);
                  }}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: copyFeedback ? "#10b981" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {copyFeedback ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/");
                }}
                style={{
                  padding: "16px 24px",
                  backgroundColor: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "14px",
                  fontSize: "16px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 16px rgba(59, 130, 246, 0.4)";
                  e.currentTarget.style.backgroundColor = "#2563eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.3)";
                  e.currentTarget.style.backgroundColor = "#3b82f6";
                }}
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: createdEventTitle,
                      text: `Join me: ${createdEventTitle}`,
                      url: `${window.location.origin}${shareableLink}`,
                    }).catch(() => {});
                  } else {
                    // Fallback: Open SMS with pre-filled link
                    const smsBody = encodeURIComponent(`Join me: ${createdEventTitle}\n${window.location.origin}${shareableLink}`);
                    window.open(`sms:?body=${smsBody}`, '_blank');
                  }
                }}
                style={{
                  padding: "14px 24px",
                  backgroundColor: "#fff",
                  color: "#10b981",
                  border: "2px solid #10b981",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f0fdf4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#fff";
                }}
              >
                <span style={{ fontSize: "18px" }}>📱</span>
                Share via Text/SMS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
