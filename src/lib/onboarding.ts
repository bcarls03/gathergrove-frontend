// src/lib/onboarding.ts

// ============================================================================
// NEW: Individual-first onboarding state
// ============================================================================

export type OnboardingState = {
  // Step 1: User Profile (REQUIRED)
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  visibility?: "private" | "neighbors" | "public" | null;
  
  // Step 2: Household (OPTIONAL)
  skipHousehold?: boolean;
  householdName?: string | null;
  householdType?: "family_with_kids" | "empty_nesters" | "singles_couples" | null;
  kids?: OnboardingKid[];
  
  // Legacy fields (for backward compatibility during migration)
  neighborhoodCode?: string | null;
  adults?: string[];
};

export type OnboardingKid = {
  age_range: "0-2" | "3-5" | "6-8" | "9-12" | "13-17" | "18+";
  gender?: "male" | "female" | "prefer_not_to_say" | null;
  available_for_babysitting?: boolean;
};

const KEY = "gg:onboarding";

// Safe localStorage helpers (no crash in non-browser envs)
function readStorage(): OnboardingState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Return new state shape
    return {
      firstName: parsed.firstName ?? null,
      lastName: parsed.lastName ?? null,
      email: parsed.email ?? null,
      visibility: parsed.visibility ?? null,
      skipHousehold: parsed.skipHousehold ?? false,
      householdName: parsed.householdName ?? null,
      householdType: parsed.householdType ?? null,
      kids: Array.isArray(parsed.kids) ? parsed.kids : [],
      // Legacy fields
      neighborhoodCode: parsed.neighborhoodCode ?? null,
      adults: Array.isArray(parsed.adults) ? parsed.adults : [],
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
  firstName: null,
  lastName: null,
  email: null,
  visibility: "neighbors",
  skipHousehold: false,
  householdName: null,
  householdType: null,
  kids: [],
  neighborhoodCode: null,
  adults: [],
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
    kids: Array.isArray(fromStorage.kids) ? fromStorage.kids : [],
    adults: Array.isArray(fromStorage.adults) ? fromStorage.adults : [],
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
