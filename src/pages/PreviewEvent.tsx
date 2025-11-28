// src/pages/PreviewEvent.tsx
import { useLocation, useNavigate } from "react-router-dom";
import { getViewer } from "../lib/viewer";
import type { EventCategory } from "../lib/api";

type DraftEventState = {
  title: string;
  date: string; // yyyy-mm-dd
  startTime: string; // HH:mm
  endTime?: string;
  details: string;
  category: EventCategory;
  recipients: string[];
  recipientIds: string[];
};

type Post = {
  id: string;
  kind: "happening" | "event";
  title?: string;
  when?: string; // ISO datetime
  details: string;
  recipients?: string[];
  recipientIds?: string[];
  createdBy: { id: string; label: string };
  ts: number;
  category?: EventCategory;
};

const KEY = "gg:posts";
const loadPosts = (): Post[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};
const savePosts = (p: Post[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
};

const CATEGORY_META: {
  value: EventCategory;
  label: string;
  icon: string;
}[] = [
  { value: "neighborhood", label: "Event", icon: "🎉" },
  { value: "playdate", label: "Playdate", icon: "🧃" },
  { value: "help", label: "Help Needed", icon: "🧰" },
  { value: "pet", label: "Pets", icon: "🐾" },
  { value: "other", label: "Other", icon: "✏️" },
];

export default function PreviewEvent() {
  const nav = useNavigate();
  const loc = useLocation() as { state?: DraftEventState };
  const draft = loc.state;

  const viewer = getViewer();

  // If someone hits this URL directly without draft data
  if (!draft) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-3">Preview Event</h1>
        <p className="text-sm text-slate-600 mb-4">
          There’s no event draft to preview. Try creating a Future Event again.
        </p>
        <button
          onClick={() => nav("/people")}
          className="px-4 py-2 rounded-lg border border-slate-300 text-sm"
        >
          Go back to People
        </button>
      </div>
    );
  }

  const categoryMeta =
    CATEGORY_META.find((c) => c.value === draft.category) ?? CATEGORY_META[0];

  // Build nice date/time strings
  const eventStart = new Date(`${draft.date}T${draft.startTime}`);
  const dateLabel = eventStart.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const startLabel = eventStart.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  let endLabel = "";
  if (draft.endTime) {
    const end = new Date(`${draft.date}T${draft.endTime}`);
    endLabel = end.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const timeRange = endLabel ? `${startLabel} – ${endLabel}` : startLabel;

  const handleConfirmPost = () => {
    const all = loadPosts();

    let when: string | undefined;
    if (draft.date && draft.startTime) {
      const dt = new Date(`${draft.date}T${draft.startTime}`);
      if (!Number.isNaN(dt.getTime())) {
        when = dt.toISOString();
      }
    }

    const post: Post = {
      id: crypto.randomUUID(),
      kind: "event",
      title: draft.title.trim(),
      when,
      details: draft.details.trim(),
      recipients: draft.recipients,
      recipientIds: draft.recipientIds,
      createdBy: { id: viewer.id, label: viewer.label },
      ts: Date.now(),
      category: draft.category,
    };

    all.unshift(post);
    savePosts(all);
    nav("/"); // back to Home feed
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-3">Preview event</h1>

      {/* Event card preview */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-lg">
              {categoryMeta.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {categoryMeta.label}
              </div>
              <div className="text-xs text-slate-500">
                {dateLabel} · {timeRange}
              </div>
            </div>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          {draft.title}
        </h2>

        <p className="text-sm text-slate-700 whitespace-pre-line mb-4">
          {draft.details}
        </p>

        {draft.recipients.length > 0 && (
          <div className="text-xs text-slate-500">
            Invited:{" "}
            <span className="font-medium">
              {draft.recipients.join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-between gap-3">
        <button
          type="button"
          onClick={() => nav(-1)} // back to form with filled state
          className="px-4 py-2 rounded-full border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50"
        >
          Back to edit
        </button>
        <button
          type="button"
          onClick={handleConfirmPost}
          className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700"
        >
          Post event
        </button>
      </div>
    </div>
  );
}
