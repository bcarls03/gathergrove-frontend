// src/pages/ComposePost.tsx
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { getViewer } from "../lib/viewer";
import { loadNeighbors } from "../lib/profile";
import { createEvent, type EventCategory } from "../lib/api";

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

  // ✅ IMPORTANT: keep the backend id explicitly too (future-proof)
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
  {
    id: "neighborhood",
    emoji: "🏡",
    label: "Neighborhood",
    description: "Block parties, driveway hangs, cul-de-sac meetups",
  },
  {
    id: "playdate",
    emoji: "🤸",
    label: "Playdate",
    description: "Kids playing together, park meetups, family fun",
  },
  {
    id: "help",
    emoji: "🤝",
    label: "Help & favors",
    description: "Borrow tools, give a hand, share rides",
  },
  {
    id: "pet",
    emoji: "🐶",
    label: "Pets",
    description: "Dog playtimes, lost/found pets, pet sitting",
  },
  {
    id: "other",
    emoji: "✨",
    label: "Other",
    description: "Anything that doesn’t fit above",
  },
];

/* ---------- Small helpers ---------- */

function makeId() {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
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

/* ---------- Page ---------- */

export default function ComposePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ kind?: string; id?: string }>();

  const kind: "happening" | "event" = params.kind === "event" ? "event" : "happening";
  const editId = params.id;

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

  const isEditingExisting = !!existingPost;

  const allNeighbors: Neighbor[] = useMemo(() => {
    try {
      const list = loadNeighbors() as Neighbor[] | undefined;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const lockedRecipients: string[] = existingPost?.recipients ?? [];

  const [mutableRecipients, setMutableRecipients] = useState<string[]>(() => {
    return recipientsFromState;
  });

  const effectiveRecipients: string[] = isEditingExisting
    ? Array.from(new Set([...lockedRecipients, ...mutableRecipients]))
    : mutableRecipients;

  const [details, setDetails] = useState(existingPost?.details ?? "");

  const [title, setTitle] = useState(existingPost?.title ?? "");
  const [date, setDate] = useState<string>(() => isoToDateInput(existingPost?.when));
  const [startTime, setStartTime] = useState<string>(() => isoToTimeInputLocal(existingPost?.when));
  const [endTime, setEndTime] = useState<string>(() => isoToTimeInputLocal(existingPost?.end));

  const [categoryId, setCategoryId] = useState<EventCategory>(
    existingPost?.category ?? DEFAULT_CATEGORY_ID
  );

  const categoryMeta =
    CATEGORY_OPTIONS.find((c) => c.id === categoryId) ?? CATEGORY_OPTIONS[0];

  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [showCategoryStep, setShowCategoryStep] = useState(kind === "event" && !existingPost);
  const [showNeighborEditor, setShowNeighborEditor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedNeighborLabel = (n: Neighbor) => (n.label ?? n.lastName ?? "").toString();

  const canSubmitDetails =
    kind === "happening"
      ? details.trim().length > 0
      : details.trim().length > 0 && title.trim().length > 0 && !!date && !!startTime;

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

      // Build a local payload first (temp id), then replace with backend id after POST succeeds
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

        const nextLocal = existingPost
          ? all.map((p) => (p.id === existingPost.id ? localPayload : p))
          : [...all, localPayload];
        savePosts(nextLocal);

        // ✅ BACKEND SOURCE OF TRUTH
        // Your backend expects: type = "now" | "future"
        try {
          const res = await createEvent({
            type: "now",
            title: "Happening Now",
            details: localPayload.details,
            category: localPayload.category ?? "neighborhood",
            startAt: new Date().toISOString(),
            endAt: null,
          } as any);

          const backend = res?.data ?? res;
          const backendId = backend?.id;

          if (backendId) {
            // Replace local id with backend id so Safari/Chrome use SAME id for RSVPs
            const updated = loadPosts().map((p) => {
              if (p.id !== tempId) return p;
              return { ...p, id: backendId, backendId };
            });
            savePosts(updated);
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

      const nextLocal = existingPost
        ? all.map((p) => (p.id === existingPost.id ? localPayload : p))
        : [...all, localPayload];
      savePosts(nextLocal);

      try {
        const res = await createEvent({
          type: "future",
          title: localPayload.title || "Future Event",
          details: localPayload.details,
          category: localPayload.category ?? DEFAULT_CATEGORY_ID,
          startAt: localPayload.when ?? null,
          endAt: localPayload.end ?? null,
        } as any);

        const backend = res?.data ?? res;
        const backendId = backend?.id;

        if (backendId) {
          const updated = loadPosts().map((p) => {
            if (p.id !== tempId) return p;
            return { ...p, id: backendId, backendId };
          });
          savePosts(updated);
        }
      } catch (err: any) {
        console.error("Failed to create backend future event", err?.response?.data ?? err);
      }

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

  const toggleRecipient = (label: string) => {
    if (isEditingExisting && lockedRecipients.includes(label)) return;
    setMutableRecipients((current) =>
      current.includes(label) ? current.filter((x) => x !== label) : [...current, label]
    );
  };

  const selectableNeighbors = allNeighbors.filter((n) => {
    const label = resolvedNeighborLabel(n);
    if (!label) return false;
    if (isEditingExisting && lockedRecipients.includes(label)) return false;
    return true;
  });

  const neighborButtonLabel = !showNeighborEditor
    ? isEditingExisting
      ? "Add more households"
      : "Add or remove neighbors"
    : isEditingExisting
    ? "Done adding neighbors"
    : "Done choosing neighbors";

  return (
    <div className="gg-compose-root">
      <div className="gg-compose-inner">
        <style>{`
          .gg-compose-root { padding: 16px; display: flex; justify-content: center; }
          .gg-compose-inner { width: 100%; max-width: 760px; }
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
          .gg-footer { display:flex; justify-content:flex-end; gap:8px; margin-top:16px; }
          .btn { border-radius:999px; padding:9px 16px; font-size:14px; font-weight:600; border:1px solid transparent; cursor:pointer; }
          .btn-ghost { background:#f9fafb; border-color:#e5e7eb; color:#111827; }
          .btn-ghost:hover { background:#f3f4f6; }
          .btn-primary { background:linear-gradient(180deg,#0f172a,#020617); color:#fff; }
          .btn-primary:disabled { opacity:.45; cursor:not-allowed; }
          .cat-pill { display:inline-flex; align-items:center; gap:8px; padding:10px 12px; border-radius:14px; background:rgba(15,23,42,.03); border:1px solid rgba(15,23,42,.08); }
          .cat-emoji { font-size:20px; }
          .cat-label { font-weight:700i7OO; font-size:14px; }
          .cat-desc { font-size:13px; color:#6b7280; }
          .cat-change-btn, .neighbor-edit-btn { margin-top:8px; border-radius:999px; border:1px dashed #e5e7eb; padding:6px 12px; font-size:13px; background:#fff; cursor:pointer; }
          .cat-change-btn:hover, .neighbor-edit-btn:hover { background:#f9fafb; }
          .cat-step-options { display:flex; flex-direction:column; gap:10px; margin-top:8px; }
          .cat-option { width:100%; text-align:left; border-radius:14px; padding:10px 12px; border:1px solid #e5e7eb; background:#fff; display:flex; align-items:flex-start; gap:10px; cursor:pointer; }
          .cat-option:hover { background:#f9fafb; }
          .cat-option-main { font-size:14px; font-weight:700; color:#0f172a; }
          .cat-option-sub { font-size:13px; color:#6b7280; }
          .full-preview-card { border-radius: 18px; border: 1px solid rgba(15,23,42,.08); background: #fff; padding: 14px 16px; box-shadow: 0 14px 30px rgba(15,23,42,.08); }
          .full-preview-title-row { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:4px; }
          .full-preview-title { font-size:16px; font-weight:700; color:#0f172a; }
          .full-preview-pill { font-size:11px; padding:4px 9px; border-radius:999px; border:1px solid rgba(52,211,153,.5); background:#ecfdf5; color:#047857; }
          .full-preview-meta { font-size:13px; color:#6b7280; margin-bottom:4px; }
          .full-preview-body { font-size:14px; color:#111827; white-space:pre-wrap; }
          .preview-shell-inline { margin-top:10px; padding:14px 14px 12px; border-radius:16px; border:1px dashed rgba(148,163,184,.8); background:rgba(248,250,252,.85); }
          .preview-label-inline { font-size:12px; text-transform:uppercase; letter-spacing:.08em; color:#64748b; font-weight:700; margin-bottom:6px; }
          @media (max-width: 640px) { .gg-row-2 { grid-template-columns: 1fr; } }
        `}</style>

        <h1 className="gg-page-title">{heading}</h1>
        <div className="gg-page-sub">
          {kind === "happening"
            ? "Share something neighbors can jump into right now."
            : "Plan something neighbors can join later."}
        </div>

        <div className="gg-card-shell">
          {kind === "event" && showCategoryStep ? (
            <>
              <div className="gg-card-section">
                <div className="gg-label">Choose a category</div>
                <div className="gg-label-sub">
                  This helps neighbors quickly understand what kind of event it is.
                </div>
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
                <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCategoryStep(false)}
                >
                  Continue
                </button>
              </div>
            </>
          ) : mode === "edit" ? (
            <>
              <div className="gg-card-section">
                <div className="gg-label">Targeting</div>
                <div className="gg-label-sub">
                  {effectiveRecipients.length === 0
                    ? "Everyone in your neighborhood"
                    : "This post is shared with:"}
                </div>

                {effectiveRecipients.length > 0 && (
                  <>
                    <div className="recipient-row">
                      {lockedRecipients.map((r) => (
                        <span key={`locked-${r}`} className="recipient-pill recipient-pill-locked">
                          {r}
                        </span>
                      ))}
                      {mutableRecipients.map((r) => (
                        <span key={`added-${r}`} className="recipient-pill recipient-pill-added">
                          {r}
                        </span>
                      ))}
                    </div>
                    {isEditingExisting && (
                      <div className="recipient-pill-label-muted">
                        Gray = originally invited · Purple = newly added in this edit.
                      </div>
                    )}
                  </>
                )}

                {allNeighbors.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="neighbor-edit-btn"
                      onClick={() => setShowNeighborEditor((v) => !v)}
                    >
                      {neighborButtonLabel}
                    </button>

                    {showNeighborEditor && (
                      <div style={{ marginTop: 8 }}>
                        <div className="gg-label-sub" style={{ marginBottom: 4 }}>
                          {isEditingExisting
                            ? "Tap to add more households to this post."
                            : "Tap to choose which households should see this post."}
                        </div>
                        <div className="recipient-row">
                          {selectableNeighbors.map((n) => {
                            const label = resolvedNeighborLabel(n);
                            if (!label) return null;
                            const selected = mutableRecipients.includes(label);
                            return (
                              <button
                                key={n.id}
                                type="button"
                                className="recipient-pill recipient-pill-added"
                                style={{
                                  opacity: selected ? 1 : 0.35,
                                  borderStyle: selected ? "solid" : "dashed",
                                }}
                                onClick={() => toggleRecipient(label)}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

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
                    <input
                      className="gg-input"
                      placeholder="Title of the event"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="gg-row-2" style={{ marginBottom: 10 }}>
                    <div>
                      <label className="gg-label">Select a date</label>
                      <input
                        className="gg-input"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="gg-label">Start time</label>
                      <input
                        className="gg-input"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label className="gg-label">Finish time (optional)</label>
                    <input
                      className="gg-input"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
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
                  <div className="gg-label">Details</div>
                  <textarea
                    className="composer-textarea"
                    placeholder="What’s happening right now? (Posts disappear after 24 hours.)"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
              )}

              <div className="preview-shell-inline">
                <div className="preview-label-inline">Next step</div>
                <div>
                  Tap <strong>Preview</strong> below to see exactly how your post will look
                  before you share it.
                </div>
              </div>

              <div className="gg-footer">
                <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSubmitDetails}
                  onClick={() => setMode("preview")}
                >
                  Preview
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="gg-card-section">
                <div className="gg-label">Preview</div>
                <div className="gg-label-sub">
                  This is how your post will appear to neighbors on the Home tab.
                </div>
              </div>

              <div className="gg-card-section">
                <div className="full-preview-card">
                  <div className="full-preview-title-row">
                    <div className="full-preview-title">
                      {kind === "happening" ? "Happening Now" : title.trim() || "Your event title"}
                    </div>
                    <div className="full-preview-pill">{kind === "happening" ? "Now" : "Future"}</div>
                  </div>
                  <div className="full-preview-meta">
                    {previewWhen}
                    {effectiveRecipients.length > 0 && ` · ${effectiveRecipients.join(", ")}`}
                  </div>
                  {kind === "event" && (
                    <div className="full-preview-meta">
                      {categoryMeta.emoji} {categoryMeta.label}
                    </div>
                  )}
                  <div className="full-preview-body" style={{ marginTop: 8 }}>
                    {details.trim() || "Your details will appear here as you type."}
                  </div>
                </div>
              </div>

              <div className="gg-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setMode("edit")}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canSubmitDetails || isSubmitting}
                  onClick={onSubmit}
                >
                  {primaryLabel}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
