// src/lib/dates.ts
export const toDate = (v: string | null | undefined) => {
  if (!v) return null;
  // Trim microseconds to milliseconds so JS Date can parse reliably
  const s1 = v.replace(/\.(\d{3})\d+/, ".$1");
  let d = new Date(s1);
  if (!isNaN(d.getTime())) return d;
  // Fallback: strip fractional seconds completely
  const s2 = v.replace(/\.\d+/, "");
  d = new Date(s2);
  return isNaN(d.getTime()) ? null : d;
};

export const toMs = (v: string | null | undefined) => {
  const d = toDate(v);
  return d ? d.getTime() : Number.POSITIVE_INFINITY; // puts missing/invalid dates at the end
};

export const fmt = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d)
    : "TBD";
