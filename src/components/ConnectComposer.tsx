import React, { useEffect, useMemo, useRef, useState } from "react";

export type Recipient = { id: string; label: string };

type Props = {
  recipients: Recipient[];
  maxLen?: number;
  onSend: (text: string) => void;
  onCancel: () => void;
};

export default function ConnectComposer({
  recipients,
  maxLen = 500,
  onSend,
  onCancel,
}: Props) {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // focus + autoresize
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    const fit = () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(180, ta.scrollHeight) + "px";
    };
    fit();
    ta.addEventListener("input", fit);
    return () => ta.removeEventListener("input", fit);
  }, []);

  // shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter" && text.trim()) {
        e.preventDefault();
        onSend(text.trim());
      } else if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [text, onCancel, onSend]);

  const remaining = maxLen - text.length;
  const disabled = !text.trim() || remaining < 0;

  const quicks = useMemo(
    () => [
      "Hi there! Just wanted to say hello — we're neighbors 👋",
      "Nice to meet you — just saying hi from around the block.",
      "Always nice meeting nearby neighbors — hope you're having a good week!",
      "If you're ever up for a casual walk or quick hello around the neighborhood, we'd love to say hi.",
      "We love discovering local spots — any favorites you recommend nearby?",
    ],
    []
  );

  return (
    <div className="cc-wrap">
      <style>{`
        .cc-wrap { display:grid; gap: 12px; }
        .cc-title { font-size: 22px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
        .cc-row { display:grid; gap: 6px; }
        .cc-label { font-size: 14px; color: #334155; font-weight: 700; }
        .cc-recipients { display:flex; gap: 6px; flex-wrap: wrap; }
        .cc-chip {
          display:inline-flex; align-items:center; gap:8px; padding:6px 10px;
          border-radius: 999px; background: #f8fafc; border:1px solid #e2e8f0; font-weight:700;
        }
        .cc-initial {
          width:20px; height:20px; border-radius:999px; background:#eef2ff; color:#3730a3;
          display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:800;
        }
        .cc-hint {
          font-size: 12px;
          color: #6b7280;
          margin-top: 2px;
        }
        .cc-quickbar-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 2px;
        }
        .cc-quickbar { display:flex; gap:6px; flex-wrap: wrap; }
        .cc-quick {
          font-size:12px; padding:6px 10px; border-radius:10px; border:1px dashed #cbd5e1; background:#fff;
          cursor:pointer;
        }
        .cc-quick:hover { background:#f8fafc; }
        .cc-textarea {
          width:100%; border-radius:14px; border:1px solid #e5e7eb; padding:12px 14px; font-size:14px;
          outline:none; box-shadow: 0 1px 0 rgba(2,6,23,.02), 0 0 0 rgba(0,0,0,0);
        }
        .cc-textarea:focus { border-color:#93c5fd; box-shadow: 0 0 0 3px rgba(147,197,253,.35); }
        .cc-meta { display:flex; justify-content:space-between; align-items:center; font-size:12px; color:#475569; }
        .cc-counter { font-weight:800; }
        .cc-counter.over { color:#be123c; }
        .cc-actions { display:flex; justify-content:flex-end; gap:8px; }
        .cc-btn {
          padding:10px 14px; border-radius:12px; border:1px solid #e2e8f0; background:#fff; cursor:pointer; font-weight:800;
        }
        .cc-btn.primary {
          border:0; background: linear-gradient(180deg,#3b82f6,#2563eb); color:#fff;
          box-shadow: 0 10px 18px rgba(37,99,235,.25);
        }
        .cc-btn:disabled { opacity:.55; cursor:not-allowed; box-shadow:none; }
      `}</style>

      <h3 className="cc-title">Start a Message</h3>
      <p className="cc-hint">
        After you send, you&apos;ll find this conversation at the top of the{" "}
        <b>Messages</b> tab.
      </p>

      <div className="cc-row">
        <div className="cc-label">Sending to</div>
        <div className="cc-recipients">
          {recipients.map((r) => (
            <span key={r.id} className="cc-chip">
              <span className="cc-initial">
                {r.label.charAt(0).toUpperCase()}
              </span>
              {r.label}
            </span>
          ))}
        </div>
      </div>

      <div className="cc-row">
        <div className="cc-label">Message</div>
        <div className="cc-quickbar-label">Quick suggestions</div>
        <div className="cc-quickbar">
          {quicks.map((q, i) => (
            <button
              key={i}
              type="button"
              className="cc-quick"
              onClick={() => setText(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <textarea
          ref={taRef}
          className="cc-textarea"
          rows={3}
          maxLength={maxLen + 200} // allow typing a bit over; we still block on send
          placeholder="Write a quick hello…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="cc-meta">
          <div>
            Tip: Press <b>⌘/Ctrl + Enter</b> to send
          </div>
          <div className={`cc-counter ${remaining < 0 ? "over" : ""}`}>
            {Math.max(remaining, -999)}/{maxLen}
          </div>
        </div>
      </div>

      <div className="cc-actions">
        <button className="cc-btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="cc-btn primary"
          onClick={() => onSend(text.trim())}
          disabled={disabled}
        >
          Send
        </button>
      </div>
    </div>
  );
}
