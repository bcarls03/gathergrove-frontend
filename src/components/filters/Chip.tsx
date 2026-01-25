// src/components/filters/Chip.tsx
import { motion } from "framer-motion";
import type React from "react";

type ChipProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  iconColor?: string;
  iconBorder?: string;
  emoji?: string;
};

const chipMotionProps = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.03 },
  transition: { duration: 0.12, ease: "easeOut" as const },
};

export default function Chip({ label, selected, onClick, Icon, iconColor, iconBorder, emoji }: ChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      {...chipMotionProps}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: selected ? "2px solid #10b981" : "1.5px solid rgba(148,163,184,0.4)",
        fontSize: 12,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        background: selected ? "#f0fdf4" : "#ffffff",
        color: "#0f172a",
        cursor: "pointer",
        transition: "all 0.15s ease",
        outline: "none",
        boxShadow: selected ? "0 3px 9px rgba(16,185,129,0.2)" : "0 1.5px 4px rgba(0,0,0,0.05)",
        minHeight: '36px', // Better touch target for mobile
      }}
    >
      {/* Icon in circle */}
      {Icon && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 999,
            background: "#ffffff",
            border: `1.5px solid ${selected ? "#10b981" : (iconBorder || "#e5e7eb")}`,
            flexShrink: 0,
          }}
        >
          <Icon size={13} color={selected ? "#10b981" : (iconColor || "#374151")} />
        </span>
      )}

      {/* Emoji fallback */}
      {!Icon && emoji && (
        <span aria-hidden style={{ fontSize: 13, flexShrink: 0 }}>
          {emoji}
        </span>
      )}

      {/* Checkmark when selected */}
      {selected && (
        <span
          style={{
            fontSize: 12,
            lineHeight: 1,
            color: "#10b981",
            fontWeight: 700,
          }}
        >
          ✓
        </span>
      )}

      {/* Label */}
      <span style={{ whiteSpace: "nowrap" }}>{label}</span>
    </motion.button>
  );
}
