// src/lib/profile.ts

const PROFILE_KEY = "gg:profile_overrides";
const NEIGHBORS_KEY = "gg:demo_neighbors";
const SEED_VERSION_KEY = "gg:demo_neighbors_seed_version";
const SEED_VERSION = "2"; // bump this when you change DEFAULT_NEIGHBORS

/* ===================== Types ===================== */

export type Override = {
  lastName?: string;          // preferred
  last_name?: string;         // legacy/back-compat; normalized on load/save
  householdType?: string;
  email?: string;
};
type Store = Record<string, Override>;

export type Kid = {
  birthMonth?: number | null;   // 1..12
  birthYear?: number | null;    // e.g., 2016
  sex?: string | null;          // "Male" | "Female" | "Prefer not to say"
};

export type Neighbor = {
  id: string;
  lastName?: string | null;
  last_name?: string | null;     // legacy/back-compat
  email?: string | null;
  householdType?: string | null; // "Family w/ Kids" | "Empty Nesters" | "Singles/Couples"
  kids?: Kid[];
  adultNames?: string[];         // ["Erik", "Megan"]
  neighborhood?: string | null;  // "Bayhill at the Oasis" | "Eagles Pointe"
};

/* ===================== Safe storage helpers ===================== */

function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ===================== Defaults ===================== */

// Note: Removed Adams (demo-uid-101) to avoid duplicate with demo neighbors.
const DEFAULT_OVERRIDES: Store = {
  "demo-uid-102": { lastName: "Baker",   householdType: "Singles/Couples", email: "ava.baker@example.com"   },
  "demo-uid-103": { lastName: "Carlson", householdType: "Empty Nesters",   email: "jim.carlson@example.com" },
};

const DEFAULT_NEIGHBORS: Neighbor[] = [
  // Families w/ Kids
  {
    id: "seed-gg-1",
    lastName: "Zarnitz",
    email: "zarnitz.family@example.com",
    householdType: "Family w/ Kids",
    kids: [
      { birthMonth: 6,  birthYear: 2015, sex: "Male" },
      { birthMonth: 2,  birthYear: 2018, sex: "Female" },
    ],
    adultNames: ["Erik", "Megan"],
    neighborhood: "Eagles Pointe",
  },
  {
    id: "seed-gg-2",
    lastName: "Rodriguez",
    email: "hector.rodriguez@example.com",
    householdType: "Family w/ Kids",
    kids: [{ birthMonth: 11, birthYear: 2016, sex: "Male" }],
    adultNames: ["Hector", "Maria"],
    neighborhood: "Bayhill at the Oasis",
  },
  {
    id: "seed-gg-3",
    lastName: "Nguyen",
    email: "thu.nguyen@example.com",
    householdType: "Family w/ Kids",
    kids: [
      { birthMonth: 9,  birthYear: 2021, sex: "Female" },
      { birthMonth: 4,  birthYear: 2024, sex: "Male" },
    ],
    adultNames: ["Thu", "Minh"],
    neighborhood: "Bayhill at the Oasis",
  },
  {
    id: "seed-gg-4",
    lastName: "Patel",
    email: "raj.patel@example.com",
    householdType: "Family w/ Kids",
    kids: [{ birthMonth: 1, birthYear: 2011, sex: "Female" }],
    adultNames: ["Raj", "Priya"],
    neighborhood: "Eagles Pointe",
  },
  {
    id: "seed-gg-5",
    lastName: "O’Connor",
    email: "oconnor.house@example.com",
    householdType: "Family w/ Kids",
    kids: [
      { birthMonth: 8,  birthYear: 2019, sex: "Male" },
      { birthMonth: 12, birthYear: 2013, sex: "Female" },
    ],
    adultNames: ["Seamus", "Claire"],
    neighborhood: "Bayhill at the Oasis",
  },

  // Singles/Couples — non-overlapping with overrides
  { id: "seed-gg-6",  lastName: "Allen",  email: "allen@example.com",  householdType: "Singles/Couples", neighborhood: "Eagles Pointe" },
  { id: "seed-gg-7",  lastName: "Brooks", email: "brooks@example.com", householdType: "Singles/Couples", neighborhood: "Bayhill at the Oasis" },
  { id: "seed-gg-8",  lastName: "Diaz",   email: "carlos.diaz@example.com",   householdType: "Singles/Couples", neighborhood: "Bayhill at the Oasis" },

  // Empty Nesters — non-overlapping with overrides
  { id: "seed-gg-9",  lastName: "Cohen",  email: "cohen@example.com",  householdType: "Empty Nesters",   neighborhood: "Eagles Pointe" },
  { id: "seed-gg-10", lastName: "Hughes", email: "susan.hughes@example.com", householdType: "Empty Nesters", neighborhood: "Bayhill at the Oasis" },

  // Extras
  { id: "seed-gg-11", lastName: "Young",  email: "youngs@example.com", householdType: "Singles/Couples", neighborhood: "Eagles Pointe" },
  {
    id: "seed-gg-12",
    lastName: "Foster",
    email: "foster.family@example.com",
    householdType: "Family w/ Kids",
    kids: [{ birthMonth: 3, birthYear: 2017, sex: "Female" }],
    adultNames: ["Tom", "Elena"],
    neighborhood: "Bayhill at the Oasis",
  },
];

/* ===================== Normalizers ===================== */

function normalizeOverride(o: Override | undefined): Override {
  if (!o) return {};
  const lastName = (o.lastName ?? o.last_name) ?? undefined;
  const { householdType, email } = o;
  return { lastName, householdType, email };
}

function normalizeNeighbor(n: Neighbor): Neighbor {
  return { ...n, lastName: n.lastName ?? n.last_name ?? null };
}

/** Merge: local storage wins over defaults */
function mergeStores(a: Store, b: Store): Store {
  const out: Store = { ...b, ...a };
  for (const k of Object.keys(out)) out[k] = normalizeOverride(out[k]);
  return out;
}

/* ===================== Overrides API ===================== */

// Any override IDs we want to silently remove from existing localStorage
const DEPRECATED_OVERRIDE_IDS = new Set<string>(["demo-uid-101"]); // Adams

export function loadOverrides(): Store {
  try {
    const raw = safeGet(PROFILE_KEY);
    const saved = raw ? (JSON.parse(raw) as Store) : {};

    // prune deprecated entries (e.g., old Adams override causing duplicates)
    let changed = false;
    for (const badId of DEPRECATED_OVERRIDE_IDS) {
      if (badId in saved) {
        delete saved[badId];
        changed = true;
      }
    }
    if (changed) safeSet(PROFILE_KEY, JSON.stringify(saved));

    return mergeStores(saved, DEFAULT_OVERRIDES);
  } catch {
    return { ...DEFAULT_OVERRIDES };
  }
}

export function saveOverride(uid: string, patch: Override) {
  const storeRaw = (() => {
    try {
      const raw = safeGet(PROFILE_KEY);
      return raw ? (JSON.parse(raw) as Store) : {};
    } catch {
      return {};
    }
  })();
  const existing = normalizeOverride(storeRaw[uid]);
  const next = normalizeOverride({ ...existing, ...patch });
  const merged = { ...storeRaw, [uid]: next };
  safeSet(PROFILE_KEY, JSON.stringify(merged));
}

export function getOverride(uid: string): Override | undefined {
  const store = loadOverrides();
  return store[uid] ? normalizeOverride(store[uid]) : undefined;
}

/* ===================== Demo neighbors API ===================== */

function seedDefaults() {
  safeSet(NEIGHBORS_KEY, JSON.stringify(DEFAULT_NEIGHBORS));
  safeSet(SEED_VERSION_KEY, SEED_VERSION);
}

/** Load neighbors; reseed if first run, empty, or seed version changed */
export function loadNeighbors(): Neighbor[] {
  try {
    const currentVersion = safeGet(SEED_VERSION_KEY);
    const raw = safeGet(NEIGHBORS_KEY);

    // Reseed on first run, empty list, parse error, or version change
    if (currentVersion !== SEED_VERSION || !raw) {
      seedDefaults();
      return DEFAULT_NEIGHBORS.map(normalizeNeighbor);
    }

    const arr = JSON.parse(raw) as Neighbor[] | null;
    if (!Array.isArray(arr) || arr.length === 0) {
      seedDefaults();
      return DEFAULT_NEIGHBORS.map(normalizeNeighbor);
    }
    return arr.map(normalizeNeighbor);
  } catch {
    seedDefaults();
    return DEFAULT_NEIGHBORS.map(normalizeNeighbor);
  }
}

export function setNeighbors(list: Neighbor[]) {
  const normalized = (Array.isArray(list) ? list : []).map(normalizeNeighbor);
  safeSet(NEIGHBORS_KEY, JSON.stringify(normalized));
  safeSet(SEED_VERSION_KEY, SEED_VERSION);
}

export function addNeighbor(n: Omit<Neighbor, "id">) {
  const list = loadNeighbors();
  const id = (globalThis as any)?.crypto?.randomUUID?.() ?? `seed-${Date.now()}`;
  const normalized = normalizeNeighbor({ id, ...n });
  list.push(normalized);
  safeSet(NEIGHBORS_KEY, JSON.stringify(list));
  safeSet(SEED_VERSION_KEY, SEED_VERSION);
}

export function removeNeighbor(id: string) {
  const list = loadNeighbors().filter((x) => x.id !== id);
  safeSet(NEIGHBORS_KEY, JSON.stringify(list));
  safeSet(SEED_VERSION_KEY, SEED_VERSION);
}

export function resetNeighborsToDefault() {
  seedDefaults();
}
