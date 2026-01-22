// src/components/filters/DualAgeRange.tsx
import { useRef, useState } from "react";
import type React from "react";

type DualAgeRangeProps = {
  min?: number;
  max?: number;
  step?: number;
  valueMin: number;
  valueMax: number;
  onChange: (nextMin: number, nextMax: number) => void;
};

export default function DualAgeRange(props: DualAgeRangeProps) {
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
      {/* Track background */}
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
      {/* Active range */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: `${pMin}%`,
          width: `${pMax - pMin}%`,
          top: (THUMB - TRACK_H) / 2,
          height: TRACK_H,
          background: "linear-gradient(90deg, #10b981, #0ea5e9)",
          borderRadius: 9999,
          boxShadow: "0 0 8px rgba(16,185,129,0.3)",
          pointerEvents: "none",
        }}
      />
      {/* Min thumb */}
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
          position: "absolute",
          top: 0,
          left: `calc(${pMin}% - ${THUMB / 2}px)`,
          width: THUMB,
          height: THUMB,
          borderRadius: 9999,
          border: "2px solid #10b981",
          background: "#fff",
          boxShadow: "0 8px 18px rgba(16,185,129,.28), 0 1px 2px rgba(0,0,0,.08)",
          cursor: "grab",
          outline: "none",
          zIndex: valueMin === valueMax ? 2 : 1,
        }}
      />
      {/* Max thumb */}
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
        style={{
          position: "absolute",
          top: 0,
          left: `calc(${pMax}% - ${THUMB / 2}px)`,
          width: THUMB,
          height: THUMB,
          borderRadius: 9999,
          border: "2px solid #0ea5e9",
          background: "#fff",
          boxShadow: "0 8px 18px rgba(14,165,233,.28), 0 1px 2px rgba(0,0,0,.08)",
          cursor: "grab",
          outline: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}
