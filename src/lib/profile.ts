// src/lib/profile.ts
const PROFILE_KEY = "gg:profile_overrides";
const NEIGHBORS_KEY = "gg:demo_neighbors";

type Override = { last_name?: string; householdType?: string };
type Store = Record<string, Override>;
export type DemoNeighbor = {
  id: string;
  last_name?: string;
  email?: string;
  householdType?: string;
};

export function loadOverrides(): Store {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function saveOverride(uid: string, patch: Override) {
  const store = loadOverrides();
  store[uid] = { ...(store[uid] || {}), ...patch };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(store));
}

export function getOverride(uid: string): Override | undefined {
  const store = loadOverrides();
  return store[uid];
}

/* ---------------- Demo neighbors (local only) ---------------- */

export function loadNeighbors(): DemoNeighbor[] {
  try {
    const raw = localStorage.getItem(NEIGHBORS_KEY);
    const arr = raw ? (JSON.parse(raw) as DemoNeighbor[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addNeighbor(n: Omit<DemoNeighbor, "id">) {
  const list = loadNeighbors();
  const id = crypto.randomUUID();
  list.push({ id, ...n });
  localStorage.setItem(NEIGHBORS_KEY, JSON.stringify(list));
}

export function removeNeighbor(id: string) {
  const list = loadNeighbors().filter((x) => x.id !== id);
  localStorage.setItem(NEIGHBORS_KEY, JSON.stringify(list));
}
