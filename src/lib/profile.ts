// src/lib/profile.ts
const PROFILE_KEY = "gg:profile_overrides";
const NEIGHBORS_KEY = "gg:demo_neighbors";

/** What we allow the UI to override locally for a user */
export type Override = {
  lastName?: string;          // preferred
  last_name?: string;         // legacy/back-compat; normalized on load/save
  householdType?: string;
  email?: string;             // optional convenience
};
type Store = Record<string, Override>;

export type DemoNeighbor = {
  id: string;
  lastName?: string;
  last_name?: string;         // legacy/back-compat
  email?: string;
  householdType?: string;
};

/** Hardcoded demo overrides so badges show even if backend doesn't store them yet */
const DEFAULT_OVERRIDES: Store = {
  "demo-uid-101": { lastName: "Adams",   householdType: "Singles/Couples", email: "megan.adams@example.com" },
  "demo-uid-102": { lastName: "Baker",   householdType: "Singles/Couples", email: "ava.baker@example.com"   },
  "demo-uid-103": { lastName: "Carlson", householdType: "Empty Nesters",   email: "jim.carlson@example.com" },
};

/** Normalize one override object (camelCase, drop legacy field) */
function normalizeOverride(o: Override | undefined): Override {
  if (!o) return {};
  const lastName = (o.lastName ?? o.last_name) ?? undefined;
  const { householdType, email } = o;
  return { lastName, householdType, email };
}

/** Merge: local storage wins over defaults */
function mergeStores(a: Store, b: Store): Store {
  const out: Store = { ...b, ...a }; // a (stored) should override b (defaults)
  // normalize all entries
  for (const k of Object.keys(out)) out[k] = normalizeOverride(out[k]);
  return out;
}

/* ---------------- Overrides ---------------- */

export function loadOverrides(): Store {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const saved = raw ? (JSON.parse(raw) as Store) : {};
    return mergeStores(saved, DEFAULT_OVERRIDES);
  } catch {
    // if parsing fails, at least return the defaults
    return { ...DEFAULT_OVERRIDES };
  }
}

export function saveOverride(uid: string, patch: Override) {
  const storeRaw = (() => {
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      return raw ? (JSON.parse(raw) as Store) : {};
    } catch {
      return {};
    }
  })();

  const existing = normalizeOverride(storeRaw[uid]);
  const next = normalizeOverride({ ...existing, ...patch });
  const merged = { ...storeRaw, [uid]: next };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
}

export function getOverride(uid: string): Override | undefined {
  const store = loadOverrides();
  return store[uid] ? normalizeOverride(store[uid]) : undefined;
}

/* ---------------- Demo neighbors (local only) ---------------- */

export function loadNeighbors(): DemoNeighbor[] {
  try {
    const raw = localStorage.getItem(NEIGHBORS_KEY);
    const arr = raw ? (JSON.parse(raw) as DemoNeighbor[]) : [];
    // normalize legacy last_name on read
    return (Array.isArray(arr) ? arr : []).map(n => ({
      ...n,
      lastName: n.lastName ?? n.last_name ?? undefined,
    }));
  } catch {
    return [];
  }
}

export function addNeighbor(n: Omit<DemoNeighbor, "id">) {
  const list = loadNeighbors();
  const id = crypto.randomUUID();
  // normalize on write
  const lastName = n.lastName ?? n.last_name ?? undefined;
  list.push({ id, ...n, lastName });
  localStorage.setItem(NEIGHBORS_KEY, JSON.stringify(list));
}

export function removeNeighbor(id: string) {
  const list = loadNeighbors().filter((x) => x.id !== id);
  localStorage.setItem(NEIGHBORS_KEY, JSON.stringify(list));
}
