// src/lib/viewer.ts
export type Viewer = { id: string; label: string };

const KEY = "gg:viewer";

export function getViewer(): Viewer {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Viewer;
  } catch {}
  // Bootstrap a viewer if missing
  const v: Viewer = { id: crypto.randomUUID(), label: "You" };
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {}
  return v;
}

export function setViewerLabel(label: string): Viewer {
  const v = getViewer();
  const next = { ...v, label: label.trim() || v.label };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}
