// src/lib/api/connections.ts
import { getAuthHeaders } from '../api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Connection {
  id: string;
  householdId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
  initiatedByMe?: boolean;
  requestedAt?: string;
  respondedAt?: string;
}

/**
 * Fetch all connections for the current user's household
 * Returns household IDs that are connected (status: 'accepted')
 */
export async function fetchConnections(): Promise<string[]> {
  try {
    const authHeaders = await getAuthHeaders();
    
    // DEV: Log auth presence
    if (import.meta.env.DEV) {
      console.log('🔵 fetchConnections auth:', {
        hasXUid: 'X-Uid' in authHeaders,
        hasAuth: 'Authorization' in authHeaders,
      });
    }
    
    // Suppress network errors in console for expected 400 responses
    const response = await fetch(`${API_BASE}/api/connections?status=accepted`, {
      headers: {
        ...authHeaders,
      },
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
 * Send a connection request to another household
 */
export async function sendConnectionRequest(householdId: string): Promise<boolean> {
  try {
    const authHeaders = await getAuthHeaders();
    
    // DEV: Log request details
    if (import.meta.env.DEV) {
      console.log('🔵 sendConnectionRequest:', {
        targetHouseholdId: householdId,
        url: `${API_BASE}/api/connections`,
        payload: { household_id: householdId },
        hasXUid: 'X-Uid' in authHeaders,
        hasAuth: 'Authorization' in authHeaders,
      });
    }
    
    const response = await fetch(`${API_BASE}/api/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ household_id: householdId }),
    });
    
    // DEV: Log response
    if (import.meta.env.DEV) {
      console.log('🔵 sendConnectionRequest response:', {
        status: response.status,
        ok: response.ok,
      });
    }
    
    if (!response.ok) {
      // Try to get error detail
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      const errorDetail = typeof errorData.detail === 'string' ? errorData.detail : `Status ${response.status}`;
      
      if (import.meta.env.DEV) {
        console.error('❌ sendConnectionRequest failed:', errorDetail);
      }
      
      throw new Error(`Failed to send connection request: ${errorDetail}`);
    }
    
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
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ status: 'accepted' }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to accept connection: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error accepting connection:', error);
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
      headers: {
        ...authHeaders,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to remove connection: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error removing connection:', error);
    return false;
  }
}
