// src/lib/neighborhoods.ts
export type NeighborhoodInfo = {
  id: string;
  label: string;
};

/**
 * Canonical mapping from Neighborhood Code -> info
 * These keys MUST match the codes users enter / backend stores.
 */
export const NEIGHBORHOOD_CODES: Record<string, NeighborhoodInfo> = {
  "BH26-GK4": {
    id: "bayhill",
    label: "Bayhill at the Oasis",
  },
  "EP26-QM7": {
    id: "eaglespointe",
    label: "Eagles Pointe",
  },
};

export function normalizeNeighborhoodCode(code?: string | null) {
  // keep hyphens, just uppercase + strip spaces
  return (code || "").toString().trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Returns the human label from a code.
 * If unknown: returns the normalized code (better than blank), or null if empty.
 */
export function neighborhoodLabelFromCode(code?: string | null) {
  const c = normalizeNeighborhoodCode(code);
  if (!c) return null;
  return NEIGHBORHOOD_CODES[c]?.label ?? c;
}

/**
 * Returns a consistent display label from *either*:
 * - a neighborhood code (BH26-GK4)
 * - a short label ("Bayhill")
 * - an already-correct label ("Bayhill at the Oasis")
 */
export function neighborhoodDisplayLabel(raw?: string | null) {
  const v = (raw || "").trim();
  if (!v) return "";

  // If it's a code (or looks like one), prefer code mapping
  const fromCode = neighborhoodLabelFromCode(v);
  if (fromCode && fromCode !== normalizeNeighborhoodCode(v)) {
    return fromCode;
  }

  // Normalize common short forms from backend / legacy data
  const low = v.toLowerCase();
  if (low === "bayhill") return "Bayhill at the Oasis";
  if (low === "eagles point" || low === "eaglespointe") return "Eagles Pointe";

  // If it's already a full label, keep it
  if (low === "bayhill at the oasis") return "Bayhill at the Oasis";
  if (low === "eagles pointe") return "Eagles Pointe";

  // Otherwise, pass through
  return v;
}

/**
 * Optional convenience: canonical neighborhood id (bayhill/eaglespointe) from code or label
 */
export function neighborhoodIdFromAny(raw?: string | null): string | null {
  const v = (raw || "").trim();
  if (!v) return null;

  const c = normalizeNeighborhoodCode(v);
  if (NEIGHBORHOOD_CODES[c]) return NEIGHBORHOOD_CODES[c].id;

  const low = v.toLowerCase();
  if (low.includes("bayhill")) return "bayhill";
  if (low.includes("eagles")) return "eaglespointe";
  return null;
}
