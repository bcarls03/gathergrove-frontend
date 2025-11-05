// src/lib/profile.ts
const KEY = "gg:profile_overrides";

type Override = { last_name?: string; householdType?: string };
type Store = Record<string, Override>;

export function loadOverrides(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

export function saveOverride(uid: string, patch: Override) {
  const store = loadOverrides();
  store[uid] = { ...(store[uid] || {}), ...patch };
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function getOverride(uid: string): Override | undefined {
  const store = loadOverrides();
  return store[uid];
}
