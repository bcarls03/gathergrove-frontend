// API client for Groups endpoints
// Groups are the universal organizing layer - households, activities, interests, etc.

import type { Group, GroupType } from '../types/group';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface CreateGroupRequest {
  type: GroupType;
  name: string;
  metadata: Record<string, any>;
}

export interface UpdateGroupRequest {
  name?: string;
  metadata?: Record<string, any>;
}

export interface AddMemberRequest {
  user_id: string;
  role: 'admin' | 'member';
}

export interface GroupResponse {
  success: boolean;
  group?: Group;
  message?: string;
}

export interface GroupListResponse {
  success: boolean;
  groups: Group[];
  total: number;
  message?: string;
}

/**
 * Create a new group (household, activity, interest, etc.)
 */
export async function createGroup(request: CreateGroupRequest, token?: string): Promise<GroupResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to create group: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get details of a specific group
 */
export async function getGroup(groupId: string, token?: string): Promise<GroupResponse> {
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups/${groupId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get group: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update group details (admin only)
 */
export async function updateGroup(
  groupId: string, 
  request: UpdateGroupRequest, 
  token?: string
): Promise<GroupResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups/${groupId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to update group: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a group (admin only)
 */
export async function deleteGroup(groupId: string, token?: string): Promise<{ success: boolean; message: string }> {
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups/${groupId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to delete group: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Add a member to a group (admin only)
 */
export async function addGroupMember(
  groupId: string, 
  request: AddMemberRequest, 
  token?: string
): Promise<GroupResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups/${groupId}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to add member: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Remove a member from a group (admin only, or user can remove themselves)
 */
export async function removeGroupMember(
  groupId: string, 
  userId: string, 
  token?: string
): Promise<{ success: boolean; message: string }> {
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to remove member: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List groups with optional filters
 * 
 * @param type - Filter by group type (household, activity, interest, etc.)
 * @param userId - Filter by user membership
 */
export async function listGroups(
  filters?: {
    type?: GroupType;
    userId?: string;
  },
  token?: string
): Promise<GroupListResponse> {
  const params = new URLSearchParams();
  
  if (filters?.type) {
    params.append('type', filters.type);
  }
  
  if (filters?.userId) {
    params.append('user_id', filters.userId);
  }

  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}/api/groups${params.toString() ? `?${params.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to list groups: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all groups a user is a member of
 */
export async function getUserGroups(userId: string, token?: string): Promise<GroupListResponse> {
  return listGroups({ userId }, token);
}

/**
 * Get all household groups
 */
export async function getHouseholds(token?: string): Promise<GroupListResponse> {
  return listGroups({ type: 'household' }, token);
}

/**
 * Get all activity groups
 */
export async function getActivityGroups(token?: string): Promise<GroupListResponse> {
  return listGroups({ type: 'activity' }, token);
}

/**
 * Get all interest groups
 */
export async function getInterestGroups(token?: string): Promise<GroupListResponse> {
  return listGroups({ type: 'interest' }, token);
}
