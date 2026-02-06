// src/lib/api/threads.ts
import { getAuthHeaders } from "../api";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export type Thread = {
  threadId: string;
  participants: [string, string];  // BLOCKER 2 FIX: Exactly 2 participants (1:1 threads)
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  threads: Thread[];
};

/**
 * Get or create a thread between current user's household and target household.
 * Returns existing thread if one exists.
 */
export async function getOrCreateThread(targetHouseholdId: string): Promise<Thread> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/threads`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ household_id: targetHouseholdId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create thread: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch all threads where current user's household is a participant.
 */
export async function fetchThreads(): Promise<Thread[]> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/api/threads`, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch threads: ${response.status} ${errorText}`);
  }

  const data: ThreadListResponse = await response.json();
  return data.threads;
}
