// src/lib/api/connections.ts
import { getAuthHeaders } from '../api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type ConnectionStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export type ConnectionState = 
  | 'STRANGER'
  | 'REQUEST_SENT'
  | 'REQUEST_RECEIVED'
  | 'CONNECTED'
  | 'EXPIRED';

export interface Connection {
  id: string;
  householdId: string;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  initiatedByMe?: boolean;
  requestedAt?: string;
  expiresAt?: string;
  respondedAt?: string;
}

export interface ConnectionStateResponse {
  state: ConnectionState;
  canSendMessage: boolean;
  canSendRequest: boolean;
  canInviteToEvent: boolean;
}

// Cache for connection states (cleared on page load)
const stateCache = new Map<string, { data: ConnectionStateResponse; timestamp: number }>();
const CACHE_TTL_MS = 30000; // 30 seconds

/**
 * Fetch all connections for the current user's household
 * Returns household IDs that are connected (status: 'accepted')
 */
export async function fetchConnections(): Promise<string[]> {
  try {
    const authHeaders = await getAuthHeaders();
    
    // Suppress network errors in console for expected 400 responses
    const response = await fetch(`${API_BASE}/api/connections?status=accepted`, {
      headers: authHeaders,
    }).catch((error) => {
      // Network-level error (e.g., server down) - silently fail
      console.warn('Could not reach connections API:', error.message);
      return null;
    });
    
    if (!response) {
      return [];
    }
    
    if (!response.ok) {
      // If user doesn't have a household yet (400 Bad Request), return empty array
      if (response.status === 400) {
        // Silently ignore - this is expected for users who haven't completed onboarding
        return [];
      }
      // Other errors should be logged
      console.warn(`Failed to fetch connections: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data: Connection[] = await response.json();
    // Return only accepted connections' household IDs
    return data
      .filter((conn) => conn.status === 'accepted')
      .map((conn) => conn.householdId);
  } catch (error) {
    // Unexpected error
    console.warn('Error fetching connections:', error);
    return [];
  }
}

/**
 * Fetch all connections (full details) for the current user's household
 */
export async function fetchAllConnections(): Promise<Connection[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/connections`, {
      headers: authHeaders,
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        return [];
      }
      console.warn(`Failed to fetch all connections: ${response.status}`);
      return [];
    }
    
    return await response.json();
  } catch (error) {
    console.warn('Error fetching all connections:', error);
    return [];
  }
}

/**
 * Send a connection request to another household
 */
export async function sendConnectionRequest(householdId: string): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await fetch(`${API_BASE}/api/connections`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ household_id: householdId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send connection request: ${response.statusText}`);
    }
    
    clearConnectionStateCache();
    return true;
  } catch (error) {
    console.error('Error sending connection request:', error);
    return false;
  }
}

/**
 * Accept a connection request
 */
export async function acceptConnection(connectionId: string): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to accept connection: ${response.statusText}`);
    }
    
    clearConnectionStateCache();
    return true;
  } catch (error) {
    console.error('Error accepting connection:', error);
    return false;
  }
}

/**
 * Decline a connection request
 */
export async function declineConnection(connectionId: string): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'declined' }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to decline connection: ${response.statusText}`);
    }
    
    clearConnectionStateCache();
    return true;
  } catch (error) {
    console.error('Error declining connection:', error);
    return false;
  }
}

/**
 * Remove a connection (disconnect)
 */
export async function removeConnection(connectionId: string): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove connection: ${response.statusText}`);
    }
    
    clearConnectionStateCache();
    return true;
  } catch (error) {
    console.error('Error removing connection:', error);
    return false;
  }
}

/**
 * Get connection state between current user and another household.
 * Uses 30-second cache to reduce API calls.
 */
export async function getConnectionState(
  targetHouseholdId: string
): Promise<ConnectionStateResponse> {
  const cacheKey = targetHouseholdId;
  const cached = stateCache.get(cacheKey);
  
  // Return cached value if still fresh
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    const authHeaders = await getAuthHeaders();
    
    const response = await fetch(
      `${API_BASE}/api/connections/state/${targetHouseholdId}`,
      {
        headers: authHeaders,
      }
    );
    
    if (!response.ok) {
      // 400 errors are expected before onboarding/household setup - return defaults silently
      if (response.status === 400) {
        return {
          state: 'STRANGER',
          canSendMessage: false,
          canSendRequest: true,
          canInviteToEvent: true,
        };
      }
      // Only warn for non-400 errors
      console.warn(`Failed to fetch connection state: ${response.status}`);
      return {
        state: 'STRANGER',
        canSendMessage: false,
        canSendRequest: true,
        canInviteToEvent: true,
      };
    }
    
    const data: ConnectionStateResponse = await response.json();
    
    // Cache the result
    stateCache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  } catch (error) {
    console.warn('Error fetching connection state:', error);
    return {
      state: 'STRANGER',
      canSendMessage: false,
      canSendRequest: true,
      canInviteToEvent: true,
    };
  }
}

/**
 * Check if current user can send a direct message to a household.
 * RULE: Messaging requires state === CONNECTED
 */
export async function canSendMessage(targetHouseholdId: string): Promise<boolean> {
  const state = await getConnectionState(targetHouseholdId);
  return state.canSendMessage;
}

/**
 * Check if current user can send a connection request to a household.
 * RULES: Cannot send if REQUEST_SENT, CONNECTED, or REQUEST_RECEIVED
 *        CAN send if STRANGER or EXPIRED
 */
export async function canSendConnectionRequest(targetHouseholdId: string): Promise<boolean> {
  const state = await getConnectionState(targetHouseholdId);
  return state.canSendRequest;
}

/**
 * Check if current user can invite a household to an event.
 * RULE: Event invitations are allowed regardless of connection state
 */
export async function canInviteToEvent(targetHouseholdId: string): Promise<boolean> {
  const state = await getConnectionState(targetHouseholdId);
  return state.canInviteToEvent;
}

/**
 * Clear the connection state cache.
 * Call this after actions that change connection state.
 */
export function clearConnectionStateCache(): void {
  stateCache.clear();
}
