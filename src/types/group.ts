// Universal Group type - the core organizing layer for GatherGrove
// Groups can represent neighborhoods, households, activity groups, interest groups, etc.

export type GroupType = 
  | 'neighborhood' 
  | 'household' 
  | 'activity' 
  | 'interest' 
  | 'extended-family';

export interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  verification_status?: 'pending' | 'neighbor_vouched' | 'admin_verified';
  verified_by?: string[]; // Array of user_ids who vouched/verified
}

export interface Group {
  id: string;
  type: GroupType;
  name: string;
  members: GroupMember[];
  metadata: Record<string, any>; // Flexible storage for type-specific data
  created_at: string;
  updated_at: string;
}

// Household-specific metadata structure (stored in group.metadata)
export interface HouseholdMetadata {
  household_type: 'family' | 'singles' | 'empty-nesters';
  children?: Child[];
}

// Neighborhood group metadata (for HOAs, apartment complexes, etc.)
export interface NeighborhoodMetadata {
  neighborhood_type: 'hoa' | 'apartment_complex' | 'subdivision';
  hoa_name?: string;
  management_company?: string;
  amenities?: string[]; // e.g., ['pool', 'clubhouse', 'tennis courts']
  boundaries?: {
    streets?: string[];
    zip?: string;
  };
  board_contact?: string;
  website?: string;
  building_address?: string; // For apartments
  subdivision_name?: string; // For subdivisions
  center_lat?: number; // For radius-based matching
  center_lng?: number;
  radius_miles?: number;
}

export interface Child {
  birth_month: number;
  birth_year: number;
  gender: string;
  away_at_college?: boolean;
  can_babysit?: boolean;
}

// Activity group metadata example (for future use)
export interface ActivityGroupMetadata {
  activity_type: string;
  schedule?: string;
  location?: string;
}

// Interest group metadata example (for future use)
export interface InterestGroupMetadata {
  interest_category: string;
  meeting_frequency?: string;
}
