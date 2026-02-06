// src/pages/Messages.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getViewer } from "../lib/viewer";
import Logo from "../assets/gathergrove-logo.png";

/* ---------- Types / storage (aligned with Home.tsx) ---------- */

type Recipient = { id: string; label: string };

type DMMessage = {
  body: string;
  ts: number;
  from?: { id: string; label: string };
};

type DMThread = {
  id: string;
  participants: [Recipient, Recipient]  // BLOCKER 2 FIX: Exactly 2 participants (1:1 threads);
  lastMessage?: DMMessage;
  ts: number;
  // Optional history; we’ll hydrate this from lastMessage if missing
  history?: DMMessage[];
};

const DM_KEY = "gg:dmThreads";

const loadThreads = (): DMThread[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(DM_KEY) || "[]") as DMThread[];
    // Hydrate history so older data (without history) still works
    return raw.map((t) => {
      const hasHistory = Array.isArray(t.history) && t.history.length > 0;
      if (hasHistory) return t;
      if (t.lastMessage) {
        return { ...t, history: [t.lastMessage] };
      }
      return { ...t, history: [] };
    });
  } catch {
    return [];
  }
};

const saveThreads = (threads: DMThread[]) => {
  try {
    localStorage.setItem(DM_KEY, JSON.stringify(threads));
  } catch {}
};

/* ---------- Helpers ---------- */

const threadIdFor = (rs: Recipient[]) =>
  `thread:${rs.map((r) => r.id).sort().join(",")}`;

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

  const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 3600 * 1000));
  if (diffDays < 6) {
    return d.toLocaleDateString([], { weekday: "short" });
  }

  return d.toLocaleDateString([], { month: "numeric", day: "numeric" });
}

function truncate(text: string, max = 80) {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

/* ---------- Page ---------- */

export default function Messages() {
  const location = useLocation() as any;
  const navigate = useNavigate();
  const viewer = getViewer() as any | null;
  const viewerId = viewer?.id ?? viewer?.uid ?? viewer?.email ?? null;
  const viewerLabel =
    viewer?.label ?? viewer?.name ?? viewer?.lastName ?? "You";

  const initialRecipients = (location.state?.recipients ?? null) as
    | Recipient[]
    | null;

  const [threads, setThreads] = useState<DMThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [mobileMode, setMobileMode] = useState<"list" | "detail">("list");

  // Load threads + pick active conversation
  useEffect(() => {
    const loaded = loadThreads();

    // sort newest first by last message / thread timestamp
    loaded.sort((a, b) => {
      const at = a.lastMessage?.ts ?? a.ts ?? 0;
      const bt = b.lastMessage?.ts ?? b.ts ?? 0;
      return bt - at;
    });

    setThreads(loaded);

    let chosen: string | null = null;
    if (initialRecipients && initialRecipients.length) {
      const targetId = threadIdFor(initialRecipients);
      const match = loaded.find((t) => t.id === targetId);
      if (match) chosen = match.id;
    }
    if (!chosen && loaded.length) {
      chosen = loaded[0].id;
    }
    setActiveId(chosen || null);
  }, [initialRecipients]);

  // If viewport is wide, default to showing both columns
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => {
      if (window.innerWidth > 720) {
        setMobileMode("detail"); // CSS will still show both
      } else {
        setMobileMode("list");
      }
    };
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const activeThread = threads.find((t) => t.id === activeId) ?? null;

  const handleSelectThread = (id: string) => {
    setActiveId(id);
    setDraft("");
    if (typeof window !== "undefined" && window.innerWidth <= 720) {
      setMobileMode("detail");
    }
  };

  const handleBackToList = () => {
    setMobileMode("list");
  };

  const handleSend = () => {
    const text = draft.trim();
    if (!text || !activeThread) return;

    const now = Date.now();
    const from = viewerId ? { id: viewerId, label: viewerLabel } : undefined;
    const newMsg: DMMessage = { body: text, ts: now, from };

    const nextThreads = threads.map((t) => {
      if (t.id !== activeThread.id) return t;
      const history = Array.isArray(t.history) ? t.history : [];
      return {
        ...t,
        history: [...history, newMsg],
        lastMessage: newMsg,
        ts: now,
      };
    });

    setThreads(nextThreads);
    saveThreads(nextThreads);
    setDraft("");
  };

  return (
    <div style={{ padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <style>{`
        .msg-back-row {
          margin-bottom: 6px;
        }
        .msg-back {
          display:inline-flex;
          align-items:center;
          gap:6px;
          font-size:13px;
          font-weight:600;
          color:#4f46e5;
          padding:6px 10px;
          border-radius:999px;
          border:1px solid rgba(79,70,229,.18);
          background:rgba(249,250,251,0.95);
          cursor:pointer;
          box-shadow:0 2px 6px rgba(15,23,42,.06);
        }
        .msg-back:hover {
          background:#eef2ff;
        }
        .msg-back:focus-visible {
          outline:2px solid #a5b4fc;
          outline-offset:2px;
        }

        .msg-title-row {
          display:flex;
          align-items:center;
          gap:10px;
          margin-bottom:4px;
        }
        .msg-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: .02em;
          color: #0f172a;
          margin: 0;
        }
        .msg-sub {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 16px;
        }
        .msg-layout {
          display: grid;
          grid-template-columns: 320px minmax(0, 1fr);
          gap: 16px;
        }
        .msg-layout.list-only .conv-shell {
          display: none;
        }
        .msg-layout.detail-only .thread-list {
          display: none;
        }
        @media (max-width: 720px) {
          .msg-layout {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .thread-list {
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.4);
          background: #fff;
          overflow: hidden;
        }
        .thread-item {
          width: 100%;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(226,232,240,.8);
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
          text-align: left;
          background: #fff;
        }
        .thread-item:last-child {
          border-bottom: none;
        }
        .thread-item:hover {
          background: #f8fafc;
        }
        .thread-item.active {
          background: #eef2ff;
        }
        .thread-name-row {
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
        }
        .thread-name {
          font-size: 14px;
          font-weight: 600;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .thread-time {
          font-size: 11px;
          color: #94a3b8;
          white-space: nowrap;
        }
        .thread-preview {
          font-size: 12px;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .thread-empty {
          font-size: 14px;
          color: #6b7280;
          padding: 10px 12px;
        }

        .conv-shell {
          border-radius: 16px;
          border: 1px solid rgba(148,163,184,.4);
          background: #fff;
          padding: 12px 14px;
          min-height: 260px;
          display:flex;
          flex-direction:column;
        }
        .conv-header {
          border-bottom: 1px solid rgba(226,232,240,.9);
          padding-bottom: 8px;
          margin-bottom: 8px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:8px;
        }
        .conv-left {
          display:flex;
          align-items:center;
          gap:8px;
        }
        .back-btn {
          display:none;
          border-radius:999px;
          border:1px solid #e5e7eb;
          padding:4px 10px;
          font-size:12px;
          background:#f9fafb;
          cursor:pointer;
        }
        @media (max-width:720px) {
          .back-btn {
            display:inline-flex;
            align-items:center;
            gap:4px;
          }
        }
        .conv-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
        }
        .conv-body {
          display:flex;
          flex-direction:column;
          gap: 6px;
          padding-top: 4px;
          flex: 1;
        }
        .bubble-row {
          display:flex;
        }
        .bubble-row.me {
          justify-content:flex-end;
        }
        .bubble {
          max-width: 100%;
          padding: 8px 10px;
          border-radius: 14px;
          font-size: 14px;
          line-height: 1.4;
        }
        .bubble.me {
          background: #0f172a;
          color: #f9fafb;
          border-bottom-right-radius: 4px;
        }
        .bubble.them {
          background: #f3f4f6;
          color: #0f172a;
          border-bottom-left-radius: 4px;
        }
        .bubble-meta {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
        }
        .conv-empty {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }

        .composer {
          border-top: 1px solid rgba(226,232,240,.9);
          padding-top: 8px;
          margin-top: 8px;
          display:flex;
          gap:8px;
          align-items:center;
        }
        .composer-input {
          flex:1;
          border-radius: 999px;
          border:1px solid #e5e7eb;
          padding:8px 12px;
          font-size:14px;
        }
        .composer-input:focus {
          outline:none;
          border-color:#93c5fd;
          box-shadow:0 0 0 2px rgba(147,197,253,.5);
        }
        .composer-send {
          border-radius: 999px;
          border:none;
          padding:8px 14px;
          font-size:14px;
          font-weight:600;
          background:#0f172a;
          color:#fff;
          cursor:pointer;
        }
        .composer-send:disabled {
          opacity:.5;
          cursor:default;
        }
      `}</style>

      <div className="msg-back-row">
        <button
          type="button"
          className="msg-back"
          onClick={() => navigate("/")}
        >
          <span aria-hidden>←</span>
          <span>Back to Home</span>
        </button>
      </div>

      <div className="msg-title-row">
        <img
          src={Logo}
          alt="GatherGrove logo"
          style={{ width: 28, height: 28, borderRadius: 8 }}
        />
        <h2 className="msg-title">Messages</h2>
      </div>
      <p className="msg-sub">
        View and continue your private conversations with neighbors.
      </p>

      <div
        className={
          "msg-layout " +
          (typeof window !== "undefined" && window.innerWidth <= 720
            ? mobileMode === "list"
              ? "list-only"
              : "detail-only"
            : "")
        }
      >
        {/* Thread list */}
        <div className="thread-list">
          {threads.length === 0 && (
            <div className="thread-empty">
              No conversations yet. Start a Connect from the People tab.
            </div>
          )}
          {threads.map((t) => {
            const history = Array.isArray(t.history) ? t.history : [];
            const last = t.lastMessage ?? history[history.length - 1];
            const names = t.participants.map((r) => r.label).join(", ");
            return (
              <button
                key={t.id}
                type="button"
                className={
                  "thread-item" + (t.id === activeThread?.id ? " active" : "")
                }
                onClick={() => handleSelectThread(t.id)}
              >
                <div className="thread-name-row">
                  <span className="thread-name">{names}</span>
                  {last && (
                    <span className="thread-time">
                      {formatTimeShort(last.ts)}
                    </span>
                  )}
                </div>
                {last && (
                  <div className="thread-preview">
                    {truncate(last.body, 60)}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Conversation body */}
        <div className="conv-shell">
          {!activeThread && (
            <div className="conv-empty">
              Select a conversation on the left to view messages.
            </div>
          )}
          {activeThread && (
            <>
              <div className="conv-header">
                <div className="conv-left">
                  <button
                    type="button"
                    className="back-btn"
                    onClick={handleBackToList}
                  >
                    ← Back
                  </button>
                  <div className="conv-title">
                    {activeThread.participants.map((r) => r.label).join(", ")}
                  </div>
                </div>
              </div>

              <div className="conv-body">
                {(!activeThread.history || activeThread.history.length === 0) &&
                  !activeThread.lastMessage && (
                    <div className="conv-empty">
                      No messages yet in this conversation.
                    </div>
                  )}
                {(
                  activeThread.history && activeThread.history.length
                    ? activeThread.history
                    : activeThread.lastMessage
                    ? [activeThread.lastMessage]
                    : []
                ).map((m, idx) => {
                  const fromMe = viewerId && m.from && m.from.id === viewerId;
                  return (
                    <div
                      key={idx}
                      className={"bubble-row " + (fromMe ? "me" : "them")}
                    >
                      <div className={"bubble " + (fromMe ? "me" : "them")}>
                        {m.body}
                        <div className="bubble-meta">
                          {fromMe
                            ? `You · ${formatTimeShort(m.ts)}`
                            : `${m.from?.label ?? "Neighbor"} · ${formatTimeShort(
                                m.ts
                              )}`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Inline composer */}
              <div className="composer">
                <input
                  className="composer-input"
                  placeholder={
                    activeThread
                      ? `Reply to ${activeThread.participants
                          .map((r) => r.label)
                          .join(", ")}…`
                      : "Select a conversation to start typing…"
                  }
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!activeThread}
                />
                <button
                  className="composer-send"
                  onClick={handleSend}
                  disabled={!activeThread || !draft.trim()}
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
