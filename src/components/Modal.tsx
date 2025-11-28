import React, { useEffect } from "react";

type Props = {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ title, onClose, children }: Props) {
  // esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="gg-modal-wrap"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        .gg-modal-wrap {
          position: fixed; inset: 0; z-index: 100; /* higher than dock (60) */
          display: flex; align-items: center; justify-content: center;
          background: rgba(2,6,23,.45); backdrop-filter: blur(6px) saturate(120%);
        }
        .gg-modal {
          width: min(640px, 92vw);
          background: #fff; border-radius: 16px; border: 1px solid rgba(2,6,23,.08);
          box-shadow: 0 30px 60px rgba(2,6,23,.35);
          padding: 16px;
        }
        .gg-modal-hd {
          display:flex; align-items:center; justify-content:space-between; margin-bottom: 8px;
        }
        .gg-x {
          border: 1px solid rgba(2,6,23,.12); background:#fff;
          border-radius: 10px; padding: 6px 10px; cursor: pointer;
        }
        .gg-modal-ft { display:flex; justify-content:flex-end; gap: 8px; margin-top: 12px; }
      `}</style>

      <div className="gg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gg-modal-hd">
          <h3 style={{ margin: 0 }}>{title ?? "Compose"}</h3>
          <button className="gg-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
