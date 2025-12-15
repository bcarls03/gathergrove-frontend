// src/lib/onboarding.ts

// Keep kid shape consistent with the rest of the app
export type OnboardingKid = {
  birthMonth?: number | null;
  birthYear?: number | null;
  sex?: string | null;
};

export type OnboardingState = {
  neighborhoodCode?: string | null;
  lastName?: string | null;
  adults: string[]; // e.g. ["Brian", "Katelyn"]
  householdType?: "Family w/ Kids" | "Singles/Couples" | "Empty Nesters" | null;
  kids: OnboardingKid[];
  email?: string | null;
  password?: string | null;
};

const KEY = "gg:onboarding";

// Safe localStorage helpers (no crash in non-browser envs)
function readStorage(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Ensure required array fields exist
    return {
      adults: Array.isArray(parsed.adults) ? parsed.adults : [],
      kids: Array.isArray(parsed.kids) ? parsed.kids : [],
      neighborhoodCode: parsed.neighborhoodCode ?? null,
      lastName: parsed.lastName ?? null,
      householdType: parsed.householdType ?? null,
      email: parsed.email ?? null,
      password: parsed.password ?? null,
    };
  } catch {
    return null;
  }
}

function writeStorage(state: OnboardingState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const DEFAULT_STATE: OnboardingState = {
  neighborhoodCode: null,
  lastName: null,
  adults: [],
  householdType: null,
  kids: [],
  email: null,
  password: null,
};

/**
 * Get the current onboarding state (or defaults if nothing saved yet).
 */
export function getOnboardingState(): OnboardingState {
  const fromStorage = readStorage();
  if (!fromStorage) return { ...DEFAULT_STATE };
  return {
    ...DEFAULT_STATE,
    ...fromStorage,
    adults: Array.isArray(fromStorage.adults) ? fromStorage.adults : [],
    kids: Array.isArray(fromStorage.kids) ? fromStorage.kids : [],
  };
}

/**
 * Merge a partial update into onboarding state and persist it.
 * Returns the new full state.
 */
export function setOnboardingState(
  patch: Partial<OnboardingState>
): OnboardingState {
  const current = getOnboardingState();
  const next: OnboardingState = {
    ...current,
    ...patch,
    // Make sure arrays stay arrays if caller passes undefined
    adults:
      patch.adults !== undefined ? patch.adults : current.adults ?? [],
    kids: patch.kids !== undefined ? patch.kids : current.kids ?? [],
  };
  writeStorage(next);
  return next;
}

/**
 * Clear onboarding state (e.g. after successful sign-up or logout).
 */
export function clearOnboardingState() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
