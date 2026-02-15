// src/pages/Discovery.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Heart,
  Home,
  MapPin,
  Sparkles,
  UserPlus,
  Calendar,
  MessageCircle,
  Clock,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

import {
  fetchHouseholds,
  fetchEvents,
  getMyProfile,
  type GGHousehold,
  type GGEvent,
  API_BASE_URL,
  CURRENT_UID,
  getAuthHeaders,
} from '../lib/api';

import {
  sendConnectionRequest,
  fetchAllConnections,
  acceptConnection,
  declineConnection,
  type Connection,
} from '../lib/api/connections';

import { getOrCreateThread } from '../lib/api/threads';
import { Chip, DualAgeRange, HOUSEHOLD_TYPE_META, type HouseholdType } from '../components/filters';

type DiscoverTab = 'nearby' | 'connected';

// Session storage keys for filter persistence
const FILTER_STORAGE_KEY = 'discovery_filters';

type LocationPrecision = 'all' | 'precise' | 'approximate';

// Helper to load filters from sessionStorage
const loadSavedFilters = () => {
  try {
    const saved = sessionStorage.getItem(FILTER_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        selectedTypes: new Set<HouseholdType>(parsed.selectedTypes || []),
        ageMin: parsed.ageMin ?? 0,
        ageMax: parsed.ageMax ?? 18,
        locationPrecision: (parsed.locationPrecision || 'all') as LocationPrecision,
      };
    }
  } catch (error) {
    console.error('Error loading saved filters:', error);
  }
  return {
    selectedTypes: new Set<HouseholdType>(),
    ageMin: 0,
    ageMax: 18,
    locationPrecision: 'all' as LocationPrecision,
  };
};

export default function Discovery() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<DiscoverTab>('nearby');
  const [households, setHouseholds] = useState<GGHousehold[]>([]);
  const [events, setEvents] = useState<GGEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters - Restore from sessionStorage on mount
  const savedFilters = loadSavedFilters();
  const [selectedTypes, setSelectedTypes] = useState<Set<HouseholdType>>(savedFilters.selectedTypes);
  const [ageMin, setAgeMin] = useState<number>(savedFilters.ageMin);
  const [ageMax, setAgeMax] = useState<number>(savedFilters.ageMax);
  const [locationPrecision, setLocationPrecision] = useState<LocationPrecision>(savedFilters.locationPrecision);
  const [searchQuery, setSearchQuery] = useState('');

  // Kids' Gender filter
  type KidsGenderFilter = 'all' | 'girls' | 'boys';
  const [kidsGenderFilter, setKidsGenderFilter] = useState<KidsGenderFilter>('all');

  // Connected household IDs from API
  const [connectedHouseholdIds, setConnectedHouseholdIds] = useState<string[]>([]);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  const [connectionByHouseholdId, setConnectionByHouseholdId] = useState<Map<string, Connection>>(new Map());
  const [pendingByHouseholdId, setPendingByHouseholdId] = useState<Map<string, string>>(new Map());

  // Respond modal state
  const [respondModal, setRespondModal] = useState<{
    householdId: string;
    householdName: string;
    connectionId: string;
  } | null>(null);

  // Create event dropdown state
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);

  // Per-card invite dropdown state
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState<string | null>(null);

  // Dismiss growth banner
  const [growthMessageDismissed, setGrowthMessageDismissed] = useState(false);

  // Dev-only: Seed demo households
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dev-only: Create household
  const [creatingHousehold, setCreatingHousehold] = useState(false);
  const [householdCreationMessage, setHouseholdCreationMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Connection error message state (per household)
  const [connectionErrors, setConnectionErrors] = useState<Map<string, string>>(new Map());

  // Current user's household_id (to filter out from lists)
  const [myHouseholdId, setMyHouseholdId] = useState<string | null>(null);

  // DEV-only invariant: verify setters exist
  if (import.meta.env.DEV) {
    if (
      typeof setConnectionByHouseholdId !== 'function' ||
      typeof setPendingByHouseholdId !== 'function' ||
      typeof setConnectedHouseholdIds !== 'function'
    ) {
      console.error('[Discovery] INVARIANT VIOLATION: Connection state setters not defined. Check useState declarations.');
    }
  }

  const toggleInSet = <T,>(set: Set<T>, item: T): Set<T> => {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    return next;
  };

  useEffect(() => {
    loadHouseholds();
    loadConnections();
    loadEvents();
  }, []);

  // Reset Kids' Gender filter when Family with Kids is deselected
  useEffect(() => {
    if (!selectedTypes.has('Family with Kids' as HouseholdType)) {
      setKidsGenderFilter('all');
    }
  }, [selectedTypes]);

  // Save filters to sessionStorage whenever they change
  useEffect(() => {
    try {
      const filtersToSave = {
        selectedTypes: Array.from(selectedTypes),
        ageMin,
        ageMax,
        locationPrecision,
      };
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [selectedTypes, ageMin, ageMax, locationPrecision]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (showCreateDropdown && !target.closest('[data-dropdown="create-event"]')) {
        setShowCreateDropdown(false);
      }

      if (inviteDropdownOpen && !target.closest('[data-dropdown="invite-event"]')) {
        setInviteDropdownOpen(null);
      }
    };

    if (showCreateDropdown || inviteDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCreateDropdown, inviteDropdownOpen]);

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await fetchEvents();

      const now = new Date();
      const happeningNow = data.filter((event) => {
        const isNowType = event.type === 'now' || event.type === 'happening';
        const notExpired = !event.expiresAt || new Date(event.expiresAt) > now;
        const notCanceled = event.status !== 'canceled';
        return isNowType && notExpired && notCanceled;
      });
      setEvents(happeningNow);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const profile = await getMyProfile().catch((err) => {
        if (err.message?.includes('NOT_FOUND') || err.message?.includes('404')) return null;
        throw err;
      });

      setMyHouseholdId(profile?.household_id || null);

      if (!profile?.household_id) {
        setConnectedHouseholdIds([]);
        setConnectionByHouseholdId(new Map());
        setPendingByHouseholdId(new Map());
        return;
      }

      const allConnections = await fetchAllConnections();

      const connectionMap = new Map<string, Connection>();
      const connectedIds: string[] = [];
      const pendingMap = new Map<string, string>();

      const getPriority = (status: string): number => {
        if (status === 'accepted') return 3;
        if (status === 'pending') return 2;
        if (status === 'declined') return 1;
        return 0;
      };

      allConnections.forEach((conn: Connection) => {
        const targetId = conn.householdId || (conn as any).household_id;
        if (!targetId) return;

        const existing = connectionMap.get(targetId);
        if (!existing || getPriority(conn.status) > getPriority(existing.status)) {
          connectionMap.set(targetId, conn);
        }

        if (conn.status === 'accepted') connectedIds.push(targetId);
        if (conn.status === 'pending') pendingMap.set(targetId, conn.id);
      });

      setConnectedHouseholdIds(connectedIds);
      setConnectionByHouseholdId(connectionMap);
      setPendingByHouseholdId(pendingMap);
    } catch (err) {
      console.debug('Could not load connections:', err);
      setConnectedHouseholdIds([]);
      setConnectionByHouseholdId(new Map());
      setPendingByHouseholdId(new Map());
    }
  };

  // Normalize household types to canonical backend raw values for filtering
  const normalizeHouseholdTypeRaw = (raw?: string): string | undefined => {
    if (!raw) return raw;
    
    // Already canonical backend values - return as-is
    if (raw === "family_with_kids" || raw === "empty_nesters" || raw === "couple" || raw === "single") {
      return raw;
    }
    
    // Map display labels to backend values
    if (raw === "Family w/ Kids" || raw === "Family with Kids") return "family_with_kids";
    if (raw === "Empty Nesters") return "empty_nesters";
    if (raw === "Singles/Couples") return "couple";
    
    // Map legacy/older internal values
    if (raw === "family" || raw === "single_parent") return "family_with_kids";
    
    // Unknown - return as-is
    return raw;
  };

  const loadHouseholds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHouseholds();
      // Normalize household types for dev-created households
      const normalized = data.map(h => ({
        ...h,
        householdType: normalizeHouseholdTypeRaw(h.householdType),
      }));
      setHouseholds(normalized);
    } catch (err) {
      console.error('Failed to load households:', err);
      setError('Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedHouseholds = async () => {
    setSeeding(true);
    setSeedMessage(null);
    try {
      const response = await fetch(`${API_BASE_URL}/dev/seed-households?count=20`, { method: 'POST' });
      if (!response.ok) throw new Error(`Seed failed: ${response.status}`);
      const result = await response.json();
      setSeedMessage({ type: 'success', text: `Seeded ${result.count || 20} demo households` });

      await loadHouseholds();
      await loadConnections();
    } catch (err) {
      console.error('❌ Seed failed:', err);
      setSeedMessage({ type: 'error', text: 'Failed to seed households' });
    } finally {
      setSeeding(false);
    }
  };

  // Dev-only: Create household for current dev user
  const handleCreateDevHousehold = async () => {
    setCreatingHousehold(true);
    setHouseholdCreationMessage(null);
    try {
      const authHeaders = await getAuthHeaders();

      // Step 1: Ensure user exists
      const signupResponse = await fetch(`${API_BASE_URL}/users/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          email: `${CURRENT_UID}@example.com`,
          first_name: 'Dev',
          last_name: 'User',
        }),
      });

      if (!signupResponse.ok) {
        const signupError = await signupResponse.json().catch(() => ({ detail: 'Unknown error' }));
        if (signupResponse.status !== 409) {
          console.log(`⚠️ Signup failed (${signupResponse.status}): ${signupError.detail}`);
        }
      }

      // Step 2: Create household
      const createResponse = await fetch(`${API_BASE_URL}/users/me/household/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          name: 'Dev Household',
          household_type: 'family_with_kids',
          kids: [{ age_range: '0-2' }],
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({ detail: `Status ${createResponse.status}` }));
        if (createResponse.status !== 409) {
          const errorMsg = typeof errorData.detail === 'string' ? errorData.detail : `Status ${createResponse.status}`;
          throw new Error(errorMsg);
        }
      }

      // Step 3: Verify
      const meResponse = await fetch(`${API_BASE_URL}/users/me`, { method: 'GET', headers: authHeaders });
      if (!meResponse.ok) throw new Error(`Failed to verify: Status ${meResponse.status}`);

      const userData = await meResponse.json();
      if (userData.household_id) {
        setHouseholdCreationMessage({
          type: 'success',
          text: `✅ Dev household ready (household_id: ${userData.household_id.slice(0, 12)}...)`,
        });
      } else {
        setHouseholdCreationMessage({ type: 'error', text: '❌ /users/me has no household_id after create' });
        return;
      }

      await loadHouseholds();
      await loadConnections();
    } catch (err: any) {
      console.error('❌ Create household failed:', err);
      const errorMsg = typeof err.message === 'string' ? err.message : 'Failed to create household';
      setHouseholdCreationMessage({ type: 'error', text: `❌ ${errorMsg}` });
    } finally {
      setCreatingHousehold(false);
    }
  };

  // Split households into connected vs nearby (filter out my own household)
  const connectedHouseholds = households.filter((h) => {
    if (h.id === myHouseholdId) return false;
    return connectedHouseholdIds.includes(h.id || '');
  });

  const nearbyHouseholds = households.filter((h) => {
    if (h.id === myHouseholdId) return false;
    return !connectedHouseholdIds.includes(h.id || '');
  });

  const currentHouseholds = activeTab === 'connected' ? connectedHouseholds : nearbyHouseholds;

  const mapToFilterType = (type?: string): HouseholdType | null => {
    switch (type) {
      case 'family_with_kids':
      case 'single_parent':
      case 'family':
      case 'Family w/ Kids':
      case 'Family with Kids':
        return 'Family with Kids' as HouseholdType;
      case 'empty_nesters':
      case 'Empty Nesters':
        return 'Empty Nesters';
      case 'couple':
      case 'single':
      case 'Singles/Couples':
        return 'Singles/Couples';
      default:
        return null;
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Ranking helpers for intent-first discovery ordering
  const countMatchingKids = (household: GGHousehold, ageMin: number, ageMax: number): number => {
    if (!household.kids || household.kids.length === 0) return 0;
    const today = new Date();
    return household.kids.filter((kid) => {
      if (!kid.birthYear || !kid.birthMonth) return false;
      const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
      const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const ageInYears = Math.floor(ageInMonths / 12);
      return ageInYears >= ageMin && ageInYears <= ageMax;
    }).length;
  };

  const getUsableChildGenders = (kids?: GGHousehold['kids']): string[] => {
    if (!kids || kids.length === 0) return [];
    return kids
      .map((kid) => kid.sex)
      .filter((sex) => sex && sex !== 'prefer_not_to_say') as string[];
  };

  const computeChildGenderOverlap = (userKids?: GGHousehold['kids'], candidateKids?: GGHousehold['kids']): boolean | null => {
    const userGenders = getUsableChildGenders(userKids);
    const candidateGenders = getUsableChildGenders(candidateKids);
    // If either side lacks usable genders, return null (neutral; no effect on ranking)
    if (userGenders.length === 0 || candidateGenders.length === 0) return null;
    // Check for overlap
    return userGenders.some((g) => candidateGenders.includes(g));
  };

  const filteredHouseholds = currentHouseholds
    .filter((h) => {
      if (selectedTypes.size > 0) {
        const mappedType = mapToFilterType(h.householdType);
        const matchesType = mappedType && selectedTypes.has(mappedType);
        if (!matchesType) return false;
      }

      if (locationPrecision !== 'all') {
        const isPrecise = h.location_precision === 'street';
        const isApproximate = h.location_precision === 'zipcode';
        if (locationPrecision === 'precise' && !isPrecise) return false;
        if (locationPrecision === 'approximate' && !isApproximate) return false;
      }

      if (selectedTypes.has('Family with Kids' as HouseholdType)) {
        const hasMatchingKid = h.kids?.some((kid) => {
          if (!kid.birthYear || !kid.birthMonth) return false;
          const today = new Date();
          const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
          const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
          const ageInYears = Math.floor(ageInMonths / 12);
          return ageInYears >= ageMin && ageInYears <= ageMax;
        });
        if (!hasMatchingKid) return false;

        // Kids' Gender filter (only when Family with Kids is active)
        if (kidsGenderFilter === 'girls' && !hasKidSex(h, 'girls')) return false;
        if (kidsGenderFilter === 'boys' && !hasKidSex(h, 'boys')) return false;
      }

      if (searchQuery) {
        const query = searchQuery.trim().toLowerCase();
        if (query) {
          const matchesLastName = h.lastName?.toLowerCase().includes(query);
          const matchesHouseholdName = h.name?.toLowerCase().includes(query);
          const matchesAdultName = h.adultNames?.some((name) => name?.toLowerCase().includes(query));
          const matchesNeighborhood = h.neighborhood?.toLowerCase().includes(query);
          if (!matchesLastName && !matchesHouseholdName && !matchesAdultName && !matchesNeighborhood) {
            return false;
          }
        }
      }

      return true;
    })
    .sort((a, b) => {
      // Intent-first ranking with deterministic tie-breakers
      const isFamilyBrowsing = selectedTypes.has('Family with Kids' as HouseholdType);
      
      // TODO: Replace hardcoded coords with actual user profile lat/lng
      const hasUserCoords = false; // Hardcoded coords are placeholders; treat as missing

      if (isFamilyBrowsing) {
        // Family browsing mode: prioritize age overlap, then distance, then optional gender overlap
        
        // 1. Primary: matchingKidsCount DESC (most age overlap first)
        const aMatchingKids = countMatchingKids(a, ageMin, ageMax);
        const bMatchingKids = countMatchingKids(b, ageMin, ageMax);
        if (aMatchingKids !== bMatchingKids) {
          return bMatchingKids - aMatchingKids; // DESC
        }

        // 2. Secondary: distance ASC (only if user coords exist)
        if (hasUserCoords) {
          const userLat = 45.5152;
          const userLon = -122.6784;
          const aLat = (a as any).latitude;
          const aLon = (a as any).longitude;
          const bLat = (b as any).latitude;
          const bLon = (b as any).longitude;
          
          const distanceA = (aLat != null && aLon != null) 
            ? calculateDistance(userLat, userLon, aLat, aLon) 
            : Infinity;
          const distanceB = (bLat != null && bLon != null) 
            ? calculateDistance(userLat, userLon, bLat, bLon) 
            : Infinity;
          
          if (distanceA !== distanceB) {
            return distanceA - distanceB; // ASC
          }
        }

        // 3. Tertiary: childGenderOverlap DESC (only if both sides have usable genders)
        // Gender is kids-only, optional, never displayed, and has ZERO effect if missing
        const userKids = undefined; // TODO: Get from actual user household when available
        const aGenderOverlap = computeChildGenderOverlap(userKids, a.kids);
        const bGenderOverlap = computeChildGenderOverlap(userKids, b.kids);
        
        // Only apply if both have non-null results (meaning both have usable gender data)
        if (aGenderOverlap !== null && bGenderOverlap !== null) {
          if (aGenderOverlap !== bGenderOverlap) {
            return (bGenderOverlap ? 1 : 0) - (aGenderOverlap ? 1 : 0); // DESC (true > false)
          }
        }
      } else {
        // Non-family browsing mode: distance only
        if (hasUserCoords) {
          const userLat = 45.5152;
          const userLon = -122.6784;
          const aLat = (a as any).latitude;
          const aLon = (a as any).longitude;
          const bLat = (b as any).latitude;
          const bLon = (b as any).longitude;
          
          const distanceA = (aLat != null && aLon != null) 
            ? calculateDistance(userLat, userLon, aLat, aLon) 
            : Infinity;
          const distanceB = (bLat != null && bLon != null) 
            ? calculateDistance(userLat, userLon, bLat, bLon) 
            : Infinity;
          
          if (distanceA !== distanceB) {
            return distanceA - distanceB; // ASC
          }
        }
      }

      // Deterministic tie-breakers prevent shuffle between renders
      const aLastName = (a.lastName || '').toLowerCase();
      const bLastName = (b.lastName || '').toLowerCase();
      if (aLastName !== bLastName) {
        return aLastName < bLastName ? -1 : 1; // ASC
      }
      
      const aId = a.id || '';
      const bId = b.id || '';
      return aId < bId ? -1 : 1; // ASC
    });

  const getHouseholdTypeIcon = (type?: string) => {
    const filterType = mapToFilterType(type);
    if (filterType && HOUSEHOLD_TYPE_META[filterType]) {
      const { Icon } = HOUSEHOLD_TYPE_META[filterType];
      return <Icon size={16} />;
    }
    switch (type) {
      case 'family_with_kids':
      case 'family':
        return <Users size={16} />;
      case 'couple':
        return <Heart size={16} />;
      case 'single_parent':
      case 'single':
      case 'individual':
        return <Home size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const getHouseholdTypeColor = (type?: string) => {
    const filterType = mapToFilterType(type);
    if (filterType && HOUSEHOLD_TYPE_META[filterType]) return HOUSEHOLD_TYPE_META[filterType].iconColor;

    switch (type) {
      case 'family_with_kids':
      case 'family':
        return '#3b82f6';
      case 'couple':
        return '#ec4899';
      case 'single_parent':
      case 'single':
      case 'individual':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getHouseholdTypeLabel = (type?: string) => {
    const filterType = mapToFilterType(type);
    if (filterType) return filterType;

    switch (type) {
      case 'family_with_kids':
      case 'single_parent':
        return 'Family with Kids';
      case 'couple':
      case 'single':
      case 'individual':
        return 'Singles/Couples';
      default:
        return 'Household';
    }
  };

  const getDistanceText = (household: GGHousehold): string | null => {
    const userLat = 45.5152;
    const userLon = -122.6784;

    const lat = (household as any).latitude;
    const lon = (household as any).longitude;

    if (lat && lon) {
      const distance = calculateDistance(userLat, userLon, lat, lon);
      const isZipOnly = household.location_precision === 'zipcode';

      if (distance < 0.1) return isZipOnly ? '< 0.1 miles (approx)*' : '< 0.1 miles';
      return isZipOnly ? `~${distance.toFixed(1)} miles (approx)*` : `~${distance.toFixed(1)} miles`;
    }
    return null;
  };

  const getHouseholdName = (household: GGHousehold): string => {
    if (household.name && household.name.trim()) return household.name;
    if (household.lastName) return household.lastName;
    if (household.adultNames && household.adultNames.length > 0) {
      const names = household.adultNames.filter((n) => n && n.trim());
      if (names.length > 0) return names.length === 1 ? names[0] : names.join(' & ');
    }
    if (household.email) {
      const username = household.email.split('@')[0];
      return `${username}'s Household`;
    }
    return household.householdType === 'couple'
      ? 'Couple'
      : household.householdType === 'single'
        ? 'Neighbor'
        : 'Household';
  };

  function getKidsAges(household: GGHousehold): number[] {
    if (!household.kids || household.kids.length === 0) return [];
    const today = new Date();
    return household.kids
      .filter((kid) => kid.birthYear && kid.birthMonth)
      .map((kid) => {
        const birthDate = new Date(kid.birthYear!, (kid.birthMonth || 1) - 1);
        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        return Math.floor(ageInMonths / 12);
      })
      .sort((a, b) => b - a);
  }

  function getKidsAgesByGender(household: GGHousehold): { girlsAges: number[]; boysAges: number[] } {
    if (!household.kids || household.kids.length === 0) return { girlsAges: [], boysAges: [] };
    
    const today = new Date();
    const girlsAges: number[] = [];
    const boysAges: number[] = [];
    
    household.kids.forEach((kid) => {
      if (!kid.birthYear || !kid.birthMonth) return;
      
      const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
      const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
      const age = Math.floor(ageInMonths / 12);
      
      const sex = (kid.sex ?? (kid as any).gender ?? '').toLowerCase();
      if (sex.startsWith('f')) {
        girlsAges.push(age);
      } else if (sex.startsWith('m')) {
        boysAges.push(age);
      }
      // Ignore unknown/unspecified
    });
    
    // Sort descending (oldest to youngest) to match chip display order
    girlsAges.sort((a, b) => b - a);
    boysAges.sort((a, b) => b - a);
    
    return { girlsAges, boysAges };
  }

  function getGenderSuffix(sex?: string | null) {
    const s = (sex || "").trim().toLowerCase();

    if (s === "female" || s === "girl" || s === "f") return "Girl";
    if (s === "male" || s === "boy" || s === "m") return "Boy";

    return "";
  }

  function normalizeKidGender(sex?: string | null) {
    const s = (sex || "").trim().toLowerCase();
    if (!s) return null;
    if (s === "girl" || s === "female" || s === "f") return "girl";
    if (s === "boy" || s === "male" || s === "m") return "boy";
    return null;
  }

  function hasKidSex(household: GGHousehold, target: 'girls' | 'boys'): boolean {
    if (!household.kids || household.kids.length === 0) return false;
    return household.kids.some((kid) => {
      const normalized = normalizeKidGender(kid.sex ?? (kid as any).gender ?? null);
      if (target === 'girls') return normalized === 'girl';
      if (target === 'boys') return normalized === 'boy';
      return false;
    });
  }

  const isAgeInFilterRange = (age: number): boolean => {
    if (!selectedTypes.has('Family with Kids' as HouseholdType)) return false;
    return age >= ageMin && age <= ageMax;
  };

  const handleInviteToEvent = (household: GGHousehold, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setInviteDropdownOpen(inviteDropdownOpen === household.id ? null : household.id || null);
  };

  const handleInviteToEventType = (household: GGHousehold, type: 'now' | 'future') => {
    const hasActiveFilters = selectedTypes.size > 0 || locationPrecision !== 'all';

    const inviteContext = {
      clickedHouseholdId: household.id || '',
      clickedHouseholdName: getHouseholdName(household),
      visibleHouseholdIds: hasActiveFilters ? filteredHouseholds.map((h) => h.id || '').filter(Boolean) : [],
      filterContext: {
        types: Array.from(selectedTypes),
        ageRange: selectedTypes.has('Family with Kids' as HouseholdType) ? { min: ageMin, max: ageMax } : null,
        hasFilters: hasActiveFilters,
      },
    };

    if (type === 'now') navigate('/compose/happening', { state: { inviteContext } });
    else navigate('/compose/event', { state: { inviteContext } });

    setInviteDropdownOpen(null);
  };

  const handleConnect = async (household: GGHousehold) => {
    if (!household.id) return;

    setConnectionErrors((prev) => {
      const next = new Map(prev);
      next.delete(household.id!);
      return next;
    });

    setConnectingIds((prev) => new Set(prev).add(household.id!));

    try {
      const success = await sendConnectionRequest(household.id);
      if (success) {
        // ✅ IMPORTANT: refresh so pendingByHouseholdId stores the real connectionId
        await loadConnections();
      } else {
        // fallback: try direct request to capture detail (DEV)
        try {
          const authHeaders = await getAuthHeaders();
          const testResponse = await fetch(`${API_BASE_URL}/api/connections`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ household_id: household.id }),
          });

          if (!testResponse.ok) {
            const errorData = await testResponse.json().catch(() => ({ detail: 'Unknown error' }));

            if (testResponse.status === 409) {
              await loadConnections();
              return;
            }

            const errorDetail =
              typeof errorData.detail === 'string' ? errorData.detail : `Status ${testResponse.status}`;

            setConnectionErrors((prev) => {
              const next = new Map(prev);
              next.set(household.id!, errorDetail);
              return next;
            });

            if (import.meta.env.DEV) alert(`❌ Connection failed: ${errorDetail}`);
            else alert(`❌ Failed to send connection request. Please try again.`);
            return;
          }
        } catch (testErr) {
          console.error('Error checking connection failure:', testErr);
        }

        alert(`❌ Failed to send connection request. Please try again.`);
      }
    } catch (err) {
      console.error('Error sending connection request:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      if (import.meta.env.DEV) alert(`❌ Connection error: ${errorMsg}`);
      else alert(`❌ Failed to send connection request. Please try again.`);
    } finally {
      setConnectingIds((prev) => {
        const next = new Set(prev);
        next.delete(household.id!);
        return next;
      });
    }
  };

  const handleAcceptConnection = async () => {
    if (!respondModal) return;
    try {
      const success = await acceptConnection(respondModal.connectionId);
      if (success) {
        setRespondModal(null);
        await loadConnections();
      }
    } catch (err) {
      console.error('Error accepting connection:', err);
      alert('❌ Failed to accept connection. Please try again.');
    }
  };

  const handleDeclineConnection = async () => {
    if (!respondModal) return;
    try {
      const success = await declineConnection(respondModal.connectionId);
      if (success) {
        setRespondModal(null);
        await loadConnections();
      }
    } catch (err) {
      console.error('Error declining connection:', err);
      alert('❌ Failed to decline connection. Please try again.');
    }
  };

  const handleMessage = async (household: GGHousehold) => {
    if (!household.id) return;
    try {
      const thread = await getOrCreateThread(household.id);
      navigate('/messages', {
        state: {
          threadId: thread.threadId,
          householdId: household.id,
          householdName: getHouseholdName(household),
        },
      });
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const isConnected = (householdId?: string) => connectedHouseholdIds.includes(householdId || '');
  const isConnecting = (householdId?: string) => connectingIds.has(householdId || '');
  const isPending = (householdId?: string) => pendingByHouseholdId.has(householdId || '');

  return (
    <div className="gg-page page-header-wrapper" style={{ paddingBottom: 80 }}>
      {/* ✅ Fixed: style tag is now valid and closed */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            details[open] summary span:first-child { transform: rotate(90deg); }
            details summary span:first-child { display:inline-block; transition: transform 0.2s; }
          `,
        }}
      />

      {/* Header - normalized to match Home/Calendar/Me */}
      <h1 className="page-header-title">Discover</h1>
      <p className="page-header-subtitle">
        {filteredHouseholds.length} {activeTab === 'connected' ? 'connected' : 'nearby'}
      </p>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button
              onClick={() => setActiveTab('nearby')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 5,
                border: 'none',
                background: activeTab === 'nearby' ? '#f3f4f6' : 'transparent',
                color: activeTab === 'nearby' ? '#111827' : '#9ca3af',
                fontSize: 13,
                fontWeight: activeTab === 'nearby' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderBottom: activeTab === 'nearby' ? '2px solid #10b981' : '2px solid transparent',
              }}
            >
              Nearby ({nearbyHouseholds.length})
            </button>
            <button
              onClick={() => setActiveTab('connected')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: 5,
                border: 'none',
                background: activeTab === 'connected' ? '#f3f4f6' : 'transparent',
                color: activeTab === 'connected' ? '#111827' : '#9ca3af',
                fontSize: 13,
                fontWeight: activeTab === 'connected' ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                borderBottom: activeTab === 'connected' ? '2px solid #10b981' : '2px solid transparent',
              }}
            >
              Connected ({connectedHouseholds.length})
            </button>
          </div>

          {/* Filters */}
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#9ca3af',
                marginBottom: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Filters
            </div>

            {/* Search */}
            <div style={{ marginBottom: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }}>
                🔍
              </div>
              <input
                type="text"
                placeholder="Search by last name, adult name, or neighborhood…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && searchQuery) {
                    setSearchQuery('');
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  fontSize: 14,
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  outline: 'none',
                  background: '#f9fafb',
                  transition: 'border-color 0.2s, background 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                  e.currentTarget.style.background = '#f9fafb';
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    lineHeight: 1,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#111827')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#6b7280')}
                >
                  ×
                </button>
              )}
            </div>

            {/* Household Type */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                Household Type
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(Object.keys(HOUSEHOLD_TYPE_META) as HouseholdType[]).map((type) => {
                  const { Icon, iconColor, iconBorder } = HOUSEHOLD_TYPE_META[type];
                  return (
                    <Chip
                      key={type}
                      label={type}
                      selected={selectedTypes.has(type)}
                      onClick={() => setSelectedTypes(toggleInSet(selectedTypes, type))}
                      Icon={Icon}
                      iconColor={iconColor}
                      iconBorder={iconBorder}
                    />
                  );
                })}
              </div>
            </div>

            {/* Age Range */}
            {selectedTypes.has('Family with Kids' as HouseholdType) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ marginBottom: 12 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                  Kids&apos; Ages: {ageMin}–{ageMax} years
                </div>
                <div style={{ paddingLeft: 6, paddingRight: 6, width: '100%', boxSizing: 'border-box' }}>
                  <DualAgeRange
                    min={0}
                    max={18}
                    step={1}
                    valueMin={ageMin}
                    valueMax={ageMax}
                    onChange={(nextMin, nextMax) => {
                      setAgeMin(nextMin);
                      setAgeMax(nextMax);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {/* Kids' Gender */}
            {selectedTypes.has('Family with Kids' as HouseholdType) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ marginBottom: 12 }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                  Kids&apos; Gender
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    padding: '2px',
                    background: '#f3f4f6',
                    borderRadius: 8,
                  }}
                >
                  {(['all', 'girls', 'boys'] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setKidsGenderFilter(option)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: 6,
                        border: 'none',
                        background: kidsGenderFilter === option ? '#ffffff' : 'transparent',
                        color: kidsGenderFilter === option ? '#111827' : '#6b7280',
                        fontSize: 12,
                        fontWeight: kidsGenderFilter === option ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: kidsGenderFilter === option ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      }}
                    >
                      {option === 'all' ? 'All' : option === 'girls' ? 'Girls' : 'Boys'}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Location Precision */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                Location Precision
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: 4,
                  padding: '2px',
                  background: '#f3f4f6',
                  borderRadius: 6,
                  width: 'fit-content',
                }}
              >
                <button
                  onClick={() => setLocationPrecision('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: 'none',
                    background: locationPrecision === 'all' ? '#ffffff' : 'transparent',
                    color: locationPrecision === 'all' ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setLocationPrecision('precise')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: 'none',
                    background: locationPrecision === 'precise' ? '#dcfce7' : 'transparent',
                    color: locationPrecision === 'precise' ? '#166534' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Precise
                </button>
                <button
                  onClick={() => setLocationPrecision('approximate')}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 5,
                    border: 'none',
                    background: locationPrecision === 'approximate' ? '#fef3c7' : 'transparent',
                    color: locationPrecision === 'approximate' ? '#92400e' : '#6b7280',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  Approx
                </button>
              </div>
            </div>
          </div>

          {/* Dev Tools */}
          {import.meta.env.DEV && (
            <details style={{ marginTop: 12 }}>
              <summary
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '6px 0',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 10 }}>▶</span>
                Dev Tools
              </summary>
              <div style={{ paddingTop: 12 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCreateDevHousehold}
                    disabled={creatingHousehold}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                      background: creatingHousehold ? '#f9fafb' : '#ffffff',
                      color: '#6b7280',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: creatingHousehold ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: creatingHousehold ? 0.5 : 1,
                    }}
                  >
                    <Home size={10} />
                    {creatingHousehold ? 'Creating...' : 'Create Dev Household'}
                  </button>

                  <button
                    onClick={handleSeedHouseholds}
                    disabled={seeding}
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid #d1d5db',
                      background: seeding ? '#f9fafb' : '#ffffff',
                      color: '#6b7280',
                      fontSize: 10,
                      fontWeight: 500,
                      cursor: seeding ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      opacity: seeding ? 0.5 : 1,
                    }}
                  >
                    <Sparkles size={10} />
                    {seeding ? 'Seeding...' : 'Seed Households'}
                  </button>
                </div>

                {(householdCreationMessage || seedMessage) && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 10,
                      color: (householdCreationMessage?.type || seedMessage?.type) === 'success' ? '#10b981' : '#ef4444',
                      fontWeight: 500,
                    }}
                  >
                    {householdCreationMessage?.text || seedMessage?.text}
                  </div>
                )}
              </div>
            </details>
          )}

        {/* Content */}
        {loading && (
            <div style={{ textAlign: 'center', padding: 64, color: '#6b7280' }}>
              Loading nearby households...
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: 32,
                background: '#fef2f2',
                borderRadius: 12,
                color: '#991b1b',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Growth Banner */}
          {!loading &&
            !error &&
            !growthMessageDismissed &&
            filteredHouseholds.length >= 1 &&
            filteredHouseholds.length <= 4 &&
            activeTab === 'nearby' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '8px 32px 8px 10px',
                  marginBottom: 12,
                  textAlign: 'left',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <button
                  onClick={() => setGrowthMessageDismissed(true)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 4,
                    color: '#6b7280',
                    opacity: 0.5,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}
                  aria-label="Dismiss message"
                >
                  <X size={14} />
                </button>

                <div style={{ fontSize: 20, flexShrink: 0 }}>🌱</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 1 }}>
                      Your neighborhood is growing!
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.3 }}>
                      Invite friends nearby to build your community faster.
                    </div>
                  </div>
                  <button
                    onClick={() => alert('Invite feature coming soon! Share GatherGrove with your neighbors.')}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: '1.5px solid #10b981',
                      background: 'transparent',
                      color: '#10b981',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <UserPlus size={11} />
                    Invite
                  </button>
                </div>
              </motion.div>
            )}

          {/* Empty state(s) */}
          {!loading &&
            !error &&
            filteredHouseholds.length === 0 &&
            (() => {
              const hasFiltersActive = selectedTypes.size > 0 || locationPrecision !== 'all';
              const hasSearchActive = searchQuery.trim().length > 0;
              const unfilteredCount = activeTab === 'connected' ? connectedHouseholds.length : nearbyHouseholds.length;
              const isFilteredEmpty = (hasFiltersActive || hasSearchActive) && unfilteredCount > 0;

              if (activeTab === 'connected') {
                return (
                  <div style={{ textAlign: 'center', padding: 64 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                      No connections yet
                    </h3>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                      Connect with neighbors from the Nearby tab to start messaging and coordinating events
                    </p>
                    <button
                      onClick={() => setActiveTab('nearby')}
                      style={{
                        padding: '10px 20px',
                        borderRadius: 10,
                        border: '2px solid #10b981',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      Browse Nearby Neighbors
                    </button>
                  </div>
                );
              }

              if (isFilteredEmpty) {
                return (
                  <div style={{ textAlign: 'center', padding: 64 }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                      {hasSearchActive ? 'No households match your search' : 'No neighbors match your filters'}
                    </h3>
                    <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                      Try adjusting your filters or invite more neighbors to grow your community.
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                      <button
                        onClick={() => {
                          setSelectedTypes(new Set());
                          setLocationPrecision('all');
                          setAgeMin(0);
                          setAgeMax(18);
                          setSearchQuery('');
                        }}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 10,
                          border: '2px solid #10b981',
                          background: '#10b981',
                          color: '#ffffff',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        Clear Filters
                      </button>
                      <button
                        onClick={() => alert('Invite feature coming soon! Share GatherGrove with your neighbors.')}
                        style={{
                          padding: '10px 20px',
                          borderRadius: 10,
                          border: '2px solid #e5e7eb',
                          background: '#ffffff',
                          color: '#6b7280',
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <UserPlus size={16} />
                        Invite Neighbors
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div style={{ textAlign: 'center', padding: 64 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                    Still building your neighborhood
                  </h3>
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                    Be the first! Invite neighbors to join GatherGrove and start building your community.
                  </p>
                  <button
                    onClick={() => alert('Invite feature coming soon! Share GatherGrove with your neighbors.')}
                    style={{
                      padding: '10px 20px',
                      borderRadius: 10,
                      border: '2px solid #10b981',
                      background: '#10b981',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <UserPlus size={16} />
                    Invite Neighbors
                  </button>

                  {import.meta.env.DEV && (
                    <div style={{ marginTop: 24 }}>
                      <button
                        onClick={handleSeedHouseholds}
                        disabled={seeding}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          border: '2px solid #6366f1',
                          background: seeding ? '#e0e7ff' : '#6366f1',
                          color: seeding ? '#6366f1' : '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: seeding ? 'not-allowed' : 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          opacity: seeding ? 0.6 : 1,
                        }}
                      >
                        <Sparkles size={14} />
                        {seeding ? 'Seeding...' : 'Seed Demo Households'}
                      </button>
                      {seedMessage && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: seedMessage.type === 'success' ? '#10b981' : '#ef4444',
                            fontWeight: 500,
                          }}
                        >
                          {seedMessage.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Household Cards */}
          <div style={{ display: 'grid', gap: 10, width: '100%', boxSizing: 'border-box' }}>
            {filteredHouseholds.map((household) => {
              const kidsAges = getKidsAges(household);
              const { girlsAges, boysAges } = getKidsAgesByGender(household);
              const householdName = getHouseholdName(household);
              const connected = isConnected(household.id);
              const pending = isPending(household.id);

              return (
                <motion.div
                  key={household.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#ffffff',
                    borderRadius: 12,
                    padding: 12,
                    border: '2px solid #e5e7eb',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  whileHover={{
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    borderColor: '#10b981',
                  }}
                >
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
                        {householdName}
                      </h3>

                      {getDistanceText(household) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '2px 6px',
                              borderRadius: 5,
                              background: household.location_precision === 'zipcode' ? '#fef3c7' : '#dcfce7',
                              border: household.location_precision === 'zipcode' ? '1px solid #fbbf24' : '1px solid #86efac',
                              fontSize: 11,
                              fontWeight: 600,
                              color: household.location_precision === 'zipcode' ? '#92400e' : '#166534',
                            }}
                          >
                            <MapPin size={11} />
                            {getDistanceText(household)}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: getHouseholdTypeColor(household.householdType) + '15',
                            color: getHouseholdTypeColor(household.householdType),
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {getHouseholdTypeIcon(household.householdType)}
                          {getHouseholdTypeLabel(household.householdType)}
                        </div>

                        {household.neighborhood && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#6b7280', fontSize: 12 }}>
                            <MapPin size={12} />
                            {household.neighborhood}
                          </div>
                        )}

                        {activeTab === 'nearby' && connected && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: '#f0fdf4',
                              border: '1px solid #d1fae5',
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#047857',
                            }}
                          >
                            <UserPlus size={11} />
                            Connected
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Adults */}
                  {household.adultNames && household.adultNames.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>
                        Adults:
                      </div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{household.adultNames.join(', ')}</div>
                    </div>
                  )}

                  {/* Kids */}
                  {kidsAges.length > 0 && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>
                        Kids:
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {household.kids
                          ?.filter((kid) => kid.birthYear && kid.birthMonth)
                          .map((kid) => {
                            const birthDate = new Date(kid.birthYear!, (kid.birthMonth || 1) - 1);
                            const today = new Date();
                            const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                            const age = Math.floor(ageInMonths / 12);
                            const sex = kid.sex ?? (kid as any).gender ?? null;
                            return {
                              age,
                              sex: sex,
                              awayAtCollege: Boolean(kid.awayAtCollege),
                              canBabysit: Boolean(kid.canBabysit),
                            };
                          })
                          .sort((a, b) => b.age - a.age)
                          .map((kid, idx) => {
                            const isAgeMatch = isAgeInFilterRange(kid.age);
                            
                            // Gender filter matching - use normalization for consistency
                            const sex = kid.sex;
                            const normalizedGender = normalizeKidGender(sex);
                            
                            let isGenderMatch = true; // Default when filter is "all"
                            if (kidsGenderFilter === 'girls') {
                              isGenderMatch = normalizedGender === 'girl';
                            } else if (kidsGenderFilter === 'boys') {
                              isGenderMatch = normalizedGender === 'boy';
                            }
                            
                            // Combined match: age filter (if active) AND gender filter (if active)
                            const isMatch = isAgeMatch && isGenderMatch;
                            const genderSuffix = getGenderSuffix(sex);
                            
                            return (
                              <div
                                key={idx}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: 6,
                                  background: isMatch ? '#10b981' : '#f3f4f6',
                                  border: isMatch ? '2px solid #059669' : '1px solid rgba(15,23,42,0.10)',
                                  fontSize: 12,
                                  fontWeight: isMatch ? 700 : 600,
                                  color: isMatch ? '#ffffff' : '#6b7280',
                                  boxShadow: isMatch ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                                  transform: isMatch ? 'scale(1.05)' : 'scale(1)',
                                  transition: 'all 0.2s',
                                }}
                              >
                                <span style={{ fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>
                                  {kid.age}y
                                </span>
                                {genderSuffix && (
                                  <span
                                    style={{
                                      fontSize: 11.5,
                                      opacity: 0.78,
                                      fontWeight: 600,
                                      marginLeft: 6,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {genderSuffix}
                                  </span>
                                )}
                                {kid.awayAtCollege && (
                                  <span
                                    style={{
                                      fontSize: 9.5,
                                      opacity: 0.62,
                                      fontWeight: 500,
                                      marginLeft: 6,
                                      lineHeight: 1,
                                    }}
                                  >
                                    Away
                                  </span>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      
                      {/* Babysitting badge */}
                      {household.kids?.some((kid) => {
                        if (!kid.birthYear || !kid.birthMonth || !kid.canBabysit) return false;
                        const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
                        const today = new Date();
                        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
                        const age = Math.floor(ageInMonths / 12);
                        return age >= 13 && age <= 25;
                      }) && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(16,185,129,0.10)',
                          fontSize: 12,
                          fontWeight: 500,
                          color: '#166534',
                          marginTop: 6,
                        }}>
                          <span style={{ fontSize: 14 }}>🧑‍🍼</span>
                          <span>Babysitting help</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {/* Invite to Event */}
                    <div style={{ flex: 1, position: 'relative' }} data-dropdown="invite-event">
                      <button
                        onClick={(e) => handleInviteToEvent(household, e)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '2px solid #e5e7eb',
                          background: '#ffffff',
                          color: '#6b7280',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#d1d5db';
                          e.currentTarget.style.background = '#f9fafb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.background = '#ffffff';
                        }}
                      >
                        <Calendar size={14} />
                        Invite to Event
                        <motion.div
                          animate={{ rotate: inviteDropdownOpen === household.id ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ display: 'flex', marginLeft: 2 }}
                        >
                          ▼
                        </motion.div>
                      </button>

                      {inviteDropdownOpen === household.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 8,
                            background: '#ffffff',
                            borderRadius: 12,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            border: '2px solid #e5e7eb',
                            overflow: 'hidden',
                            zIndex: 1000,
                          }}
                        >
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInviteToEventType(household, 'now');
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              transition: 'background 0.2s',
                              background: 'transparent',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: '#fef3c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                              }}
                            >
                              ⚡
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                                Happening Now
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>Quick spontaneous gathering</div>
                            </div>
                          </div>

                          <div style={{ height: 1, background: '#e5e7eb' }} />

                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInviteToEventType(household, 'future');
                            }}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              transition: 'background 0.2s',
                              background: 'transparent',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: '#dbeafe',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 18,
                              }}
                            >
                              📅
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                                Future Event
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>Schedule for later</div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Message / Pending / Connect */}
                    {connected ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMessage(household);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '2px solid #3b82f6',
                          background: '#3b82f6',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <MessageCircle size={14} />
                        Message
                      </button>
                    ) : pending ? (
                      <button
                        disabled
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '2px solid #fbbf24',
                          background: '#fef3c7',
                          color: '#92400e',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'not-allowed',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          opacity: 0.9,
                        }}
                      >
                        <Clock size={14} />
                        Pending
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(household);
                        }}
                        disabled={isConnecting(household.id)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '2px solid #3b82f6',
                          background: '#ffffff',
                          color: '#3b82f6',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isConnecting(household.id) ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                          opacity: isConnecting(household.id) ? 0.6 : 1,
                        }}
                      >
                        <UserPlus size={14} />
                        {isConnecting(household.id) ? 'Connecting...' : 'Connect'}
                      </button>
                    )}
                  </div>

                  {/* Connection Error */}
                  {household.id && connectionErrors.has(household.id) && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        fontSize: 11,
                        color: '#dc2626',
                        fontWeight: 500,
                        lineHeight: 1.4,
                      }}
                    >
                      {connectionErrors.get(household.id)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

        {/* Fixed Create Event Action Button */}
        <div style={{ position: 'relative' }} data-dropdown="create-event">
          <button
            onClick={() => setShowCreateDropdown(!showCreateDropdown)}
            style={{
              position: 'fixed',
              bottom: 100,
              right: 20,
              width: 52,
              height: 52,
              padding: 0,
              borderRadius: 9999,
              border: 'none',
              background: '#10b981',
              color: '#ffffff',
              fontSize: 26,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
              zIndex: 50,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25)';
            }}
          >
            +
          </button>

          {showCreateDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                bottom: 162,
                right: 20,
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                minWidth: 240,
                zIndex: 1000,
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => {
                  setShowCreateDropdown(false);
                  const visibleHouseholdIds = filteredHouseholds.map((h) => h.id).filter(Boolean) as string[];
                  const inviteContext = {
                    clickedHouseholdId: '',
                    clickedHouseholdName: '',
                    visibleHouseholdIds,
                    filterContext: {
                      types: Array.from(selectedTypes),
                      ageRange: selectedTypes.has('Family with Kids' as HouseholdType) ? { min: ageMin, max: ageMax } : null,
                      hasFilters: selectedTypes.size > 0 || locationPrecision !== 'all',
                    },
                  };
                  navigate('/compose/happening', { state: { inviteContext } });
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  borderBottom: '1px solid #f3f4f6',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#fef3c7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Happening Now</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>Quick spontaneous gathering</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateDropdown(false);
                  const visibleHouseholdIds = filteredHouseholds.map((h) => h.id).filter(Boolean) as string[];
                  const inviteContext = {
                    clickedHouseholdId: '',
                    clickedHouseholdName: '',
                    visibleHouseholdIds,
                    filterContext: {
                      types: Array.from(selectedTypes),
                      ageRange: selectedTypes.has('Family with Kids' as HouseholdType) ? { min: ageMin, max: ageMax } : null,
                      hasFilters: selectedTypes.size > 0 || locationPrecision !== 'all',
                    },
                  };
                  navigate('/compose/event', { state: { inviteContext } });
                }}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: '#dbeafe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                    }}
                  >
                    📅
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Future Event</div>
                    <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>Schedule for later</div>
                  </div>
                </div>
              </button>
            </motion.div>
          )}
        </div>

        {/* Respond Modal (kept, even if not currently wired to a button) */}
        {respondModal && (
          <div
            onClick={() => setRespondModal(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 24,
                maxWidth: 400,
                width: '90%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                Connection Request
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {respondModal.householdName} wants to connect with you.
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={handleAcceptConnection}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: 'none',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Accept
                </button>
                <button
                  onClick={handleDeclineConnection}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: '2px solid #e5e7eb',
                    background: '#ffffff',
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
              </div>

              <button
                onClick={() => setRespondModal(null)}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: '#9ca3af',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
    </div>
  );
}
