// src/lib/api/connections.ts
// TODO: Uncomment when implementing real API
// import { getIdToken } from '../firebase';

// TODO: Uncomment when implementing real API
// const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface Connection {
  id: string;
  householdId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all connections for the current user's household
 * Returns household IDs that are connected (status: 'accepted')
 */
export async function fetchConnections(): Promise<string[]> {
  // TODO: Replace with real API once backend implements /api/connections endpoint
  // For now, return mock data
  console.log('[MOCK] fetchConnections() - returning empty array');
  return [];
  
  /* Real implementation when backend is ready:
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch connections: ${response.statusText}`);
    }
    
    const data = await response.json();
    // Return only accepted connections
    return data
      .filter((conn: Connection) => conn.status === 'accepted')
      .map((conn: Connection) => conn.householdId);
  } catch (error) {
    console.error('Error fetching connections:', error);
    return [];
  }
  */
}

/**
 * Send a connection request to another household
 */
export async function sendConnectionRequest(householdId: string): Promise<boolean> {
  // TODO: Replace with real API once backend implements POST /api/connections endpoint
  console.log(`[MOCK] sendConnectionRequest(${householdId}) - simulating success`);
  return true;
  
  /* Real implementation when backend is ready:
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ householdId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send connection request: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error sending connection request:', error);
    return false;
  }
  */
}

/**
 * Accept a connection request
 */
export async function acceptConnection(connectionId: string): Promise<boolean> {
  // TODO: Replace with real API once backend implements PATCH /api/connections/:id endpoint
  console.log(`[MOCK] acceptConnection(${connectionId}) - simulating success`);
  return true;
  
  /* Real implementation when backend is ready:
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
  */
}

/**
 * Remove a connection (disconnect)
 */
export async function removeConnection(householdId: string): Promise<boolean> {
  // TODO: Replace with real API once backend implements DELETE /api/connections/:id endpoint
  console.log(`[MOCK] removeConnection(${householdId}) - simulating success`);
  return true;
  
  /* Real implementation when backend is ready:
  try {
    const token = await getIdToken();
    const response = await fetch(`${API_BASE}/api/connections/${householdId}`, {
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
  */
}
