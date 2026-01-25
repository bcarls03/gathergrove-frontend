// src/pages/Discovery.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Home, MapPin, Sparkles, UserPlus, Calendar, MessageCircle, Zap, Clock, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchHouseholds, fetchEvents, getMyProfile, type GGHousehold, type GGEvent } from '../lib/api';
import { fetchConnections, sendConnectionRequest } from '../lib/api/connections';
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

  // Connected household IDs from API
  const [connectedHouseholdIds, setConnectedHouseholdIds] = useState<string[]>([]);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  // Create event dropdown state
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  
  // Per-card invite dropdown state (tracks which card's dropdown is open)
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState<string | null>(null);
  
  // State for dismissing growth message
  const [growthMessageDismissed, setGrowthMessageDismissed] = useState(false);

  // Helper: Toggle item in Set
  const toggleInSet = <T,>(set: Set<T>, item: T): Set<T> => {
    const next = new Set(set);
    if (next.has(item)) {
      next.delete(item);
    } else {
      next.add(item);
    }
    return next;
  };

  useEffect(() => {
    loadHouseholds();
    loadConnections();
    loadEvents();
  }, []);

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
      
      // Close create event dropdown
      if (showCreateDropdown && !target.closest('[data-dropdown="create-event"]')) {
        setShowCreateDropdown(false);
      }
      
      // Close invite dropdowns
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
      
      // Filter to only "Happening Now" events (type: "now" or "happening")
      const now = new Date();
      const happeningNow = data.filter(event => {
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
      // Check if user has a household before fetching connections
      // Silently handle 404s - user may not have completed onboarding
      const profile = await getMyProfile().catch((err) => {
        // Suppress 404 errors - expected for new users
        if (err.message?.includes('NOT_FOUND') || err.message?.includes('404')) {
          return null;
        }
        throw err;
      });
      
      if (!profile?.household_id) {
        // User hasn't completed onboarding yet - skip connections fetch silently
        setConnectedHouseholdIds([]);
        return;
      }
      
      const connections = await fetchConnections();
      setConnectedHouseholdIds(connections);
    } catch (err) {
      // Silently fail - user might not have completed onboarding yet
      console.debug('Could not load connections:', err);
      setConnectedHouseholdIds([]);
    }
  };

  const loadHouseholds = async () => {
    setLoading(true);
    setError(null);
    try {
      // ✅ Mock data with lastName fields for consistency with invite selector
      const mockData: GGHousehold[] = [
        {
          id: 'test-1',
          lastName: 'Anderson',
          householdType: 'family_with_kids',
          neighborhood: 'Oak Ridge',
          location_precision: 'street',
          kids: [{ birthYear: 2018, birthMonth: 5 }],
          uid: 'test-uid-1',
        },
        {
          id: 'test-2',
          lastName: 'Brown',
          householdType: 'family_with_kids',
          neighborhood: 'Oak Ridge',
          location_precision: 'street',
          kids: [{ birthYear: 2016, birthMonth: 8 }],
          uid: 'test-uid-2',
        },
        {
          id: 'test-3',
          lastName: 'Chen',
          householdType: 'family_with_kids',
          neighborhood: 'Riverside',
          location_precision: 'street',
          kids: [{ birthYear: 2017, birthMonth: 11 }],
          uid: 'test-uid-3',
        },
        {
          id: 'test-4',
          lastName: 'Davis',
          householdType: 'couple',
          neighborhood: 'Riverside',
          location_precision: 'street',
          uid: 'test-uid-4',
        },
        {
          id: 'test-5',
          lastName: 'Evans',
          householdType: 'single',
          neighborhood: 'Hillside',
          location_precision: 'street',
          uid: 'test-uid-5',
        },
      ];
      setHouseholds(mockData);
      // const data = await fetchHouseholds();
      // setHouseholds(data);
    } catch (err) {
      console.error('Failed to load households:', err);
      setError('Failed to load households');
    } finally {
      setLoading(false);
    }
  };

  // Split households into connected vs nearby
  const connectedHouseholds = households.filter(h => 
    connectedHouseholdIds.includes(h.id || '')
  );

  const nearbyHouseholds = households.filter(h => 
    !connectedHouseholdIds.includes(h.id || '')
  );

  // Get current list based on active tab
  const currentHouseholds = activeTab === 'connected' 
    ? connectedHouseholds 
    : nearbyHouseholds;

  // Helper to map backend householdType values to filter HouseholdType
  const mapToFilterType = (type?: string): HouseholdType | null => {
    switch (type) {
      case 'family_with_kids':
      case 'single_parent':
        return 'Family w/ Kids';
      case 'empty_nesters':
        return 'Empty Nesters';
      case 'couple':
      case 'single':
        return 'Singles/Couples';
      default:
        return null;
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter households locally
  const filteredHouseholds = currentHouseholds.filter(h => {
    // Filter by household type (if any types selected)
    if (selectedTypes.size > 0) {
      // Map backend householdType to frontend display type for comparison
      const mappedType = mapToFilterType(h.householdType);
      const matchesType = mappedType && selectedTypes.has(mappedType);
      if (!matchesType) return false;
    }
    
    // Filter by location precision
    if (locationPrecision !== 'all') {
      const isPrecise = h.location_precision === 'street';
      const isApproximate = h.location_precision === 'zipcode';
      
      if (locationPrecision === 'precise' && !isPrecise) return false;
      if (locationPrecision === 'approximate' && !isApproximate) return false;
    }
    
    // Filter by age range (only if "Family w/ Kids" is selected)
    if (selectedTypes.has("Family w/ Kids")) {
      const hasMatchingKid = h.kids?.some(kid => {
        if (!kid.birthYear || !kid.birthMonth) return false;
        const today = new Date();
        const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        const ageInYears = Math.floor(ageInMonths / 12);
        return ageInYears >= ageMin && ageInYears <= ageMax;
      });
      if (!hasMatchingKid) return false;
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by distance (closest first)
    const userLat = 45.5152;
    const userLon = -122.6784;
    
    const aLat = (a as any).latitude;
    const aLon = (a as any).longitude;
    const bLat = (b as any).latitude;
    const bLon = (b as any).longitude;
    
    const distanceA = (aLat && aLon) 
      ? calculateDistance(userLat, userLon, aLat, aLon)
      : Infinity;
    const distanceB = (bLat && bLon)
      ? calculateDistance(userLat, userLon, bLat, bLon)
      : Infinity;
    
    return distanceA - distanceB;
  });

  const getHouseholdTypeIcon = (type?: string) => {
    const filterType = mapToFilterType(type);
    if (filterType && HOUSEHOLD_TYPE_META[filterType]) {
      const { Icon } = HOUSEHOLD_TYPE_META[filterType];
      return <Icon size={16} />;
    }
    
    // Fallback for legacy or unknown types
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
    if (filterType && HOUSEHOLD_TYPE_META[filterType]) {
      return HOUSEHOLD_TYPE_META[filterType].iconColor;
    }
    
    // Fallback for legacy or unknown types
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
    if (filterType) {
      return filterType; // Return the display label directly
    }
    
    // Fallback for legacy or unknown types
    switch (type) {
      case 'family_with_kids': 
        return 'Family w/ Kids';
      case 'single_parent': 
        return 'Family w/ Kids'; // Single parents are families with kids
      case 'family': 
        return 'Family';
      case 'couple': 
        return 'Singles/Couples';
      case 'single':
      case 'individual': 
        return 'Singles/Couples';
      default: 
        return 'Household';
    }
  };

  // Format distance for display
  const getDistanceText = (household: GGHousehold): string | null => {
    // TODO: Get user's current location
    // For now, using a default location (Portland, OR area)
    const userLat = 45.5152;
    const userLon = -122.6784;
    
    const lat = (household as any).latitude;
    const lon = (household as any).longitude;
    
    if (lat && lon) {
      const distance = calculateDistance(userLat, userLon, lat, lon);
      const isZipOnly = household.location_precision === 'zipcode';
      
      if (distance < 0.1) {
        return isZipOnly ? '< 0.1 miles (approx)*' : '< 0.1 miles';
      }
      return isZipOnly ? `~${distance.toFixed(1)} miles (approx)*` : `~${distance.toFixed(1)} miles`;
    }
    return null;
  };

  const getHouseholdName = (household: GGHousehold): string => {
    // ✅ Match HouseholdSelector: show lastName directly for consistency
    if (household.lastName) {
      return household.lastName;
    }
    if (household.adultNames && household.adultNames.length > 0) {
      const names = household.adultNames.filter(n => n && n.trim());
      if (names.length > 0) {
        return names.length === 1 ? names[0] : names.join(' & ');
      }
    }
    // Fallback: use email username or just "Household"
    if (household.email) {
      const username = household.email.split('@')[0];
      return `${username}'s Household`;
    }
    return household.householdType === 'couple' ? 'Couple' : 
           household.householdType === 'single' ? 'Neighbor' :
           'Household';
  };

  const getKidsAges = (household: GGHousehold): number[] => {
    if (!household.kids || household.kids.length === 0) return [];
    
    const today = new Date();
    return household.kids
      .filter(kid => kid.birthYear && kid.birthMonth)
      .map(kid => {
        const birthDate = new Date(kid.birthYear!, (kid.birthMonth || 1) - 1);
        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        return Math.floor(ageInMonths / 12);
      })
      .sort((a, b) => b - a); // Sort descending (oldest first)
  };

  // Check if a kid's age matches the current filter range
  const isAgeInFilterRange = (age: number): boolean => {
    // Only highlight if "Family w/ Kids" is selected (meaning age filter is active)
    if (!selectedTypes.has("Family w/ Kids")) return false;
    return age >= ageMin && age <= ageMax;
  };

  const handleInviteToEvent = (household: GGHousehold, e?: React.MouseEvent) => {
    e?.stopPropagation();
    // Toggle dropdown for this specific household
    setInviteDropdownOpen(inviteDropdownOpen === household.id ? null : household.id || null);
  };

  const handleInviteToEventType = (household: GGHousehold, type: 'now' | 'future') => {
    // ✅ Build invite context matching HouseholdSelector's new interface
    const hasActiveFilters = selectedTypes.size > 0;
    
    const inviteContext = {
      clickedHouseholdId: household.id || '',
      clickedHouseholdName: getHouseholdName(household),
      // ✅ Use visibleHouseholdIds (single source of truth)
      visibleHouseholdIds: hasActiveFilters 
        ? filteredHouseholds.map(h => h.id || '').filter(id => id !== '')
        : [],
      // Store filter context (for display badges and logic)
      filterContext: {
        types: Array.from(selectedTypes),
        ageRange: selectedTypes.has("Family w/ Kids") ? { min: ageMin, max: ageMax } : null,
        hasFilters: hasActiveFilters,
      }
    };
    
    // Navigate with state (no localStorage pollution)
    if (type === 'now') {
      navigate('/compose/happening', { state: { inviteContext } });
    } else {
      navigate('/compose/event', { state: { inviteContext } });
    }
    
    // Close dropdown
    setInviteDropdownOpen(null);
  };

  const handleConnect = async (household: GGHousehold) => {
    if (!household.id) return;
    
    // Optimistic UI update
    setConnectingIds(prev => new Set(prev).add(household.id!));
    
    try {
      const success = await sendConnectionRequest(household.id);
      if (success) {
        // Add to connected list immediately (optimistic)
        setConnectedHouseholdIds(prev => [...prev, household.id!]);
        alert(`✅ Connection request sent to ${getHouseholdName(household)}!`);
      } else {
        alert(`❌ Failed to send connection request. Please try again.`);
      }
    } catch (err) {
      console.error('Error sending connection request:', err);
      alert(`❌ Failed to send connection request. Please try again.`);
    } finally {
      setConnectingIds(prev => {
        const next = new Set(prev);
        next.delete(household.id!);
        return next;
      });
    }
  };

  const handleMessage = (household: GGHousehold) => {
    // Navigate to messages page with household pre-selected
    navigate('/messages', { state: { householdId: household.id, householdName: getHouseholdName(household) } });
  };

  const isConnected = (householdId?: string) => {
    return connectedHouseholdIds.includes(householdId || '');
  };

  const isConnecting = (householdId?: string) => {
    return connectingIds.has(householdId || '');
  };

  const getEventTimeDisplay = (event: GGEvent): string => {
    if (event.when) return event.when;
    if (event.startAt) {
      const start = new Date(event.startAt);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
      
      if (diffMinutes < 5) return 'Just started';
      if (diffMinutes < 60) return `Started ${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      return `Started ${diffHours}h ago`;
    }
    return 'Happening now';
  };

  const getEventCategoryColor = (category?: string) => {
    switch (category) {
      case 'playdate': return '#ec4899';
      case 'neighborhood': return '#3b82f6';
      case 'celebrations': return '#a855f7';
      case 'sports': return '#f59e0b';
      case 'food': return '#10b981';
      case 'pet': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getEventCategoryLabel = (category?: string) => {
    switch (category) {
      case 'playdate': return '🎪 Playdate';
      case 'neighborhood': return '🏡 Neighborhood';
      case 'celebrations': return '🎉 Celebrations';
      case 'sports': return '⚽ Sports';
      case 'food': return '🍕 Food';
      case 'pet': return '🐶 Pets';
      default: return '✨ Other';
    }
  };

  const handleJoinEvent = (event: GGEvent) => {
    navigate(`/calendar?event=${event.id}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{ 
          maxWidth: 900, 
          margin: '0 auto', 
          padding: '16px 20px'
        }}>
          {/* Mobile-optimized header layout */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Top row: Title only */}
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#111827' }}>
              Discover
            </h1>
            
            {/* Bottom row: Badge and Button - Centered */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              {/* Nearby/Connected Count Badge - Smaller */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1.5px solid #d1fae5',
                fontSize: 12,
                fontWeight: 700,
                color: '#047857',
                flex: '0 0 auto'
              }}>
                <Sparkles size={14} />
                <span>{filteredHouseholds.length} {activeTab === 'connected' ? 'connected' : 'nearby'}</span>
              </div>

              {/* Create Event Dropdown - Centered */}
              <div style={{ position: 'relative', flex: '0 0 auto', minWidth: '120px' }} data-dropdown="create-event">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1.5px solid #10b981',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 4px rgba(16, 185, 129, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 4px rgba(16, 185, 129, 0.2)';
                  }}
                >
                  <Calendar size={15} />
                  <span>Event</span>
                  <motion.div
                    animate={{ rotate: showCreateDropdown ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', fontSize: 10 }}
                  >
                    ▼
                  </motion.div>
                </button>

                {/* Dropdown Menu */}
                {showCreateDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      right: 0,
                      background: '#ffffff',
                      border: '2px solid #e5e7eb',
                      borderRadius: 12,
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
                      minWidth: 240,
                      zIndex: 1000,
                      overflow: 'hidden'
                    }}
                  >
                    {/* Happening Now Option */}
                    <button
                      onClick={() => {
                        setShowCreateDropdown(false);
                        navigate('/compose/happening');
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        borderBottom: '1px solid #f3f4f6'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f0fdf4';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#fef3c7',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18
                        }}>
                          ⚡
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                            Happening Now
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>
                            Quick spontaneous gathering
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Plan Event Option */}
                    <button
                      onClick={() => {
                        setShowCreateDropdown(false);
                        navigate('/compose/event');
                      }}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        border: 'none',
                        background: 'transparent',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18
                        }}>
                          📅
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                            Plan Event
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.3 }}>
                            Schedule for later
                          </div>
                        </div>
                      </div>
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs - Centered with more spacing above */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, maxWidth: 400 }}>
              <button
                onClick={() => setActiveTab('nearby')}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: activeTab === 'nearby' ? '#10b981' : '#e5e7eb',
                  background: activeTab === 'nearby' ? '#10b981' : '#ffffff',
                  color: activeTab === 'nearby' ? '#ffffff' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Nearby ({nearbyHouseholds.length})
              </button>
              <button
                onClick={() => setActiveTab('connected')}
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: activeTab === 'connected' ? '#10b981' : '#e5e7eb',
                  background: activeTab === 'connected' ? '#10b981' : '#ffffff',
                  color: activeTab === 'connected' ? '#ffffff' : '#6b7280',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                Connected ({connectedHouseholds.length})
              </button>
            </div>
          </div>

          {/* Filters - Compact Horizontal Layout for Mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Household Type Filter - Centered horizontal scrollable chips */}
            <div>
              <div style={{ 
                fontSize: 11, 
                fontWeight: 700, 
                color: '#9ca3af', 
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                textAlign: 'center'
              }}>
                Household Type
              </div>
              <div style={{ 
                display: 'flex', 
                gap: 8, 
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                paddingBottom: 4,
                justifyContent: 'center'
              }}>
                <style dangerouslySetInnerHTML={{
                  __html: `
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `
                }} />
                {(Object.keys(HOUSEHOLD_TYPE_META) as HouseholdType[]).map(type => {
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

            {/* Age Range Filter - Compact version for mobile */}
            {selectedTypes.has("Family w/ Kids") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ paddingTop: 4 }}
              >
                <div style={{ 
                  fontSize: 11, 
                  fontWeight: 700, 
                  color: '#9ca3af', 
                  marginBottom: 8,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Kids' Ages: {ageMin}–{ageMax} years
                </div>
                <div style={{ paddingLeft: 4, paddingRight: 4 }}>
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
          </div>
        </div>
      </div>

      {/* Content - Reduced padding for mobile */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 24px' }}>
        {/* Happening Now Section */}
        {!eventsLoading && events.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              marginBottom: 16 
            }}>
              <Zap size={20} style={{ color: '#f59e0b' }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
                Happening Now
              </h2>
              <div style={{
                padding: '2px 8px',
                borderRadius: 6,
                background: '#fef3c7',
                fontSize: 12,
                fontWeight: 600,
                color: '#92400e'
              }}>
                {events.length} active
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {events.slice(0, 3).map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    background: '#ffffff',
                    border: '2px solid #fbbf24',
                    borderRadius: 12,
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  whileHover={{ 
                    borderColor: '#f59e0b',
                    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.2)',
                    y: -2
                  }}
                  onClick={() => handleJoinEvent(event)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
                        {event.title || 'Untitled Event'}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        {/* Category Badge */}
                        {event.category && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: getEventCategoryColor(event.category) + '15',
                              color: getEventCategoryColor(event.category),
                              fontSize: 13,
                              fontWeight: 600
                            }}
                          >
                            {getEventCategoryLabel(event.category)}
                          </div>
                        )}
                        
                        {/* Time Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
                          <Clock size={14} />
                          {getEventTimeDisplay(event)}
                        </div>

                        {/* Neighborhood */}
                        {event.neighborhoods && event.neighborhoods.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
                            <MapPin size={14} />
                            {event.neighborhoods[0]}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Join Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinEvent(event);
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '2px solid #f59e0b',
                        background: '#f59e0b',
                        color: '#ffffff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Zap size={14} />
                      Join Now
                    </button>
                  </div>

                  {/* Details */}
                  {event.details && (
                    <p style={{ 
                      fontSize: 14, 
                      color: '#6b7280', 
                      margin: 0,
                      lineHeight: 1.5
                    }}>
                      {event.details.length > 120 
                        ? event.details.substring(0, 120) + '...' 
                        : event.details
                      }
                    </p>
                  )}

                  {/* Attendance Count */}
                  {event.goingCount !== undefined && event.goingCount > 0 && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: '#059669',
                      fontWeight: 600
                    }}>
                      <Users size={14} />
                      {event.goingCount} {event.goingCount === 1 ? 'neighbor' : 'neighbors'} going
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ 
              height: 1, 
              background: '#e5e7eb', 
              marginTop: 32,
              marginBottom: 32
            }} />
          </div>
        )}

        {/* Households Section */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          marginBottom: 8 
        }}>
          <Users size={20} style={{ color: '#10b981' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
            {activeTab === 'connected' ? 'Your Connections' : 'Nearby Neighbors'}
          </h2>
        </div>

        {/* Distance Accuracy Legend - Centered */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 12
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            background: '#f8fafc',
            borderRadius: 6,
            fontSize: 11,
            color: '#64748b',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                padding: '3px 7px',
                borderRadius: 4,
                background: '#dcfce7',
                border: '1.5px solid #86efac',
                fontSize: 11,
                fontWeight: 700,
                color: '#166534',
                whiteSpace: 'nowrap'
              }}>
                ~0.2mi
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Precise</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>(exact address)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                padding: '3px 7px',
                borderRadius: 4,
                background: '#fef3c7',
                border: '1.5px solid #fbbf24',
                fontSize: 11,
                fontWeight: 700,
                color: '#92400e',
                whiteSpace: 'nowrap'
              }}>
                ~0.3mi*
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>Approx</span>
              <span style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>(ZIP only)</span>
            </div>
          </div>
        </div>
        
        {/* Location Precision Filter - Centered and larger for mobile */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 16
        }}>
          <div style={{ 
            display: 'flex', 
            gap: 6,
            padding: '3px',
            background: '#e2e8f0',
            borderRadius: 8,
          }}>
            <button
              onClick={() => setLocationPrecision('all')}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: locationPrecision === 'all' ? '#ffffff' : 'transparent',
                color: locationPrecision === 'all' ? '#0f172a' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                boxShadow: locationPrecision === 'all' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                minWidth: 70
              }}
            >
              All
            </button>
            <button
              onClick={() => setLocationPrecision('precise')}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: locationPrecision === 'precise' ? '#dcfce7' : 'transparent',
                color: locationPrecision === 'precise' ? '#166534' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                boxShadow: locationPrecision === 'precise' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                minWidth: 70
              }}
            >
              Precise
            </button>
            <button
              onClick={() => setLocationPrecision('approximate')}
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: locationPrecision === 'approximate' ? '#fef3c7' : 'transparent',
                color: locationPrecision === 'approximate' ? '#92400e' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                boxShadow: locationPrecision === 'approximate' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                minWidth: 70
              }}
            >
              Approx
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 64, color: '#6b7280' }}>
            Loading nearby households...
          </div>
        )}

        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: 32,
            background: '#fef2f2',
            borderRadius: 12,
            color: '#991b1b',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Growth Banner - Show when filtered results are sparse (1-4) */}
        {!loading && !error && !growthMessageDismissed && 
         filteredHouseholds.length >= 1 && filteredHouseholds.length <= 4 && 
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
              gap: 8
            }}
          >
            {/* Close button */}
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
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
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
                onClick={() => {
                  // TODO: Add invite flow
                  alert('Invite feature coming soon! Share GatherGrove with your neighbors.');
                }}
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
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <UserPlus size={11} />
                Invite
              </button>
            </div>
          </motion.div>
        )}


        {/* Empty State - TWO STATES: True Empty vs Filtered Empty */}
        {!loading && !error && filteredHouseholds.length === 0 && (() => {
          const hasFiltersActive = selectedTypes.size > 0 || locationPrecision !== 'all';
          // Check against the unfiltered list for the current tab to determine true vs filtered empty
          const unfilteredCount = activeTab === 'connected' ? connectedHouseholds.length : nearbyHouseholds.length;
          const isFilteredEmpty = hasFiltersActive && unfilteredCount > 0;

          if (activeTab === 'connected') {
            // Connected tab empty state (unchanged)
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
                    gap: 6
                  }}
                >
                  Browse Nearby Neighbors
                </button>
              </div>
            );
          }

          if (isFilteredEmpty) {
            // FILTERED EMPTY: User has households, but none match filters
            return (
              <div style={{ textAlign: 'center', padding: 64 }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                  No neighbors match your filters
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
                      gap: 6
                    }}
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => {
                      alert('Invite feature coming soon! Share GatherGrove with your neighbors.');
                    }}
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
                      gap: 6
                    }}
                  >
                    <UserPlus size={16} />
                    Invite Neighbors
                  </button>
                </div>
              </div>
            );
          }

          // TRUE EMPTY: No households at all
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
                onClick={() => {
                  alert('Invite feature coming soon! Share GatherGrove with your neighbors.');
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
                  gap: 6
                }}
              >
                <UserPlus size={16} />
                Invite Neighbors
              </button>
            </div>
          );
        })()}

        {/* Household Cards */}
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredHouseholds.map((household) => {
            const kidsAges = getKidsAges(household);
            const householdName = getHouseholdName(household);
            const connected = isConnected(household.id);
            
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
                  transition: 'all 0.2s'
                }}
                whileHover={{ 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                  borderColor: '#10b981'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
                      {householdName}
                    </h3>
                    
                    {/* Distance */}
                    {getDistanceText(household) && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4, 
                        marginBottom: 6
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '2px 6px',
                          borderRadius: 5,
                          background: household.location_precision === 'zipcode' ? '#fef3c7' : '#dcfce7',
                          border: household.location_precision === 'zipcode' ? '1px solid #fbbf24' : '1px solid #86efac',
                          fontSize: 11,
                          fontWeight: 600,
                          color: household.location_precision === 'zipcode' ? '#92400e' : '#166534'
                        }}>
                          <MapPin size={11} />
                          {getDistanceText(household)}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Household Type Badge */}
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
                          fontWeight: 600
                        }}
                      >
                        {getHouseholdTypeIcon(household.householdType)}
                        {getHouseholdTypeLabel(household.householdType)}
                      </div>
                      
                      {/* Neighborhood */}
                      {household.neighborhood && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#6b7280', fontSize: 12 }}>
                          <MapPin size={12} />
                          {household.neighborhood}
                        </div>
                      )}

                      {/* Connected Badge (only show in Nearby tab) */}
                      {activeTab === 'nearby' && connected && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#f0fdf4',
                          border: '1px solid #d1fae5',
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#047857'
                        }}>
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
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      {household.adultNames.join(', ')}
                    </div>
                  </div>
                )}

                {/* Kids */}
                {kidsAges.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>
                      Kids:
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {kidsAges.map((age, idx) => {
                        const isMatch = isAgeInFilterRange(age);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: isMatch ? '#10b981' : '#f0fdf4',
                              border: isMatch ? '2px solid #059669' : '1px solid #d1fae5',
                              fontSize: 12,
                              fontWeight: isMatch ? 700 : 600,
                              color: isMatch ? '#ffffff' : '#047857',
                              boxShadow: isMatch ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                              transform: isMatch ? 'scale(1.05)' : 'scale(1)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {age} {age === 1 ? 'year' : 'years'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {/* Invite to Event with dropdown */}
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
                        transition: 'all 0.2s'
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

                    {/* Dropdown menu */}
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
                          zIndex: 1000
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
                            background: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#fef3c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18
                          }}>
                            ⚡
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                              Happening Now
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              Quick spontaneous gathering
                            </div>
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
                            background: 'transparent'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: 10,
                            background: '#dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18
                          }}>
                            📅
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', marginBottom: 2 }}>
                              Plan Event
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              Schedule for later
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Show Message if connected, Connect if not */}
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
                        gap: 4
                      }}
                    >
                      <MessageCircle size={14} />
                      Message
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
                        opacity: isConnecting(household.id) ? 0.6 : 1
                      }}
                    >
                      <UserPlus size={14} />
                      {isConnecting(household.id) ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
