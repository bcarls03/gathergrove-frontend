// src/lib/neighborhoods.ts
export type NeighborhoodInfo = {
  id: string;
  label: string;
};

export const NEIGHBORHOOD_CODES: Record<string, NeighborhoodInfo> = {
  BH26GG: {
    id: "bayhill",
    label: "Bayhill at the Oasis",
  },
  EP26GG: {
    id: "eaglespointe",
    label: "Eagles Pointe",
  },
};
