// src/lib/api/connections.ts
import { getIdToken } from '../firebase';

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
    const token = await getIdToken();
    
    // Suppress network errors in console for expected 400 responses
    const response = await fetch(`${API_BASE}/api/connections?status=accepted`, {
      headers: {
        Authorization: `Bearer ${token}`,
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
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ household_id: householdId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send connection request: ${response.statusText}`);
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
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections/${connectionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
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
