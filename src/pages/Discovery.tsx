// src/pages/Discovery.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Home, MapPin, Sparkles, UserPlus, Calendar, MessageCircle, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchHouseholds, fetchEvents, getMyProfile, type GGHousehold, type GGEvent } from '../lib/api';
import { fetchConnections, sendConnectionRequest } from '../lib/api/connections';
import { Chip, DualAgeRange, HOUSEHOLD_TYPE_META, type HouseholdType } from '../components/filters';

type DiscoverTab = 'nearby' | 'connected';

// Session storage keys for filter persistence
const FILTER_STORAGE_KEY = 'discovery_filters';

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
      };
    }
  } catch (error) {
    console.error('Error loading saved filters:', error);
  }
  return {
    selectedTypes: new Set<HouseholdType>(),
    ageMin: 0,
    ageMax: 18,
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

  // Connected household IDs from API
  const [connectedHouseholdIds, setConnectedHouseholdIds] = useState<string[]>([]);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  // Create event dropdown state
  const [showCreateDropdown, setShowCreateDropdown] = useState(false);
  
  // Per-card invite dropdown state (tracks which card's dropdown is open)
  const [inviteDropdownOpen, setInviteDropdownOpen] = useState<string | null>(null);

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
      };
      sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filtersToSave));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  }, [selectedTypes, ageMin, ageMax]);

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
      const profile = await getMyProfile().catch(() => null);
      if (!profile?.household_id) {
        // User hasn't completed onboarding yet - skip connections fetch silently
        setConnectedHouseholdIds([]);
        return;
      }
      
      const connections = await fetchConnections();
      setConnectedHouseholdIds(connections);
    } catch (err) {
      // Silently fail - user might not have completed onboarding yet
      setConnectedHouseholdIds([]);
    }
  };

  const loadHouseholds = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchHouseholds();
      setHouseholds(data);
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
    if (household.lastName) {
      return `The ${household.lastName} Family`;
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
    // Build invite context from current Discover state
    const hasActiveFilters = selectedTypes.size > 0;
    
    const inviteContext = {
      clickedHouseholdId: household.id || '',
      clickedHouseholdName: getHouseholdName(household),
      // ONLY pass filtered households as suggestions if filters are active
      // Otherwise pass empty array so all households show in "other" section
      suggestedHouseholds: hasActiveFilters ? filteredHouseholds.map(h => ({
        id: h.id || '',
        name: getHouseholdName(h),
        neighborhood: h.neighborhood || null,
        householdType: h.householdType || null,
        kidsAges: getKidsAges(h),
        kids: h.kids || [],
      })) : [],
      // Store filter context (for display/debugging)
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
            
            {/* Bottom row: Badge and Button with better spacing */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Nearby/Connected Count Badge */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '10px 16px',
                borderRadius: 12,
                background: '#f0fdf4',
                border: '2px solid #d1fae5',
                fontSize: 14,
                fontWeight: 700,
                color: '#047857',
                flex: '0 0 auto'
              }}>
                <Sparkles size={16} />
                <span>{filteredHouseholds.length} {activeTab === 'connected' ? 'connected' : 'nearby'}</span>
              </div>

              {/* Create Event Dropdown */}
              <div style={{ position: 'relative', flex: '1 1 auto', minWidth: '140px' }} data-dropdown="create-event">
                <button
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '12px 16px',
                    borderRadius: 12,
                    border: '2px solid #10b981',
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.2)';
                  }}
                >
                  <Calendar size={18} />
                  <span>New Event</span>
                  <motion.div
                    animate={{ rotate: showCreateDropdown ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto' }}
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

          {/* Tabs - Better mobile spacing */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setActiveTab('nearby')}
              style={{
                flex: 1,
                padding: '14px 20px',
                borderRadius: 12,
                border: '2px solid',
                borderColor: activeTab === 'nearby' ? '#10b981' : '#e5e7eb',
                background: activeTab === 'nearby' ? '#10b981' : '#ffffff',
                color: activeTab === 'nearby' ? '#ffffff' : '#6b7280',
                fontSize: 15,
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
                padding: '14px 20px',
                borderRadius: 12,
                border: '2px solid',
                borderColor: activeTab === 'connected' ? '#10b981' : '#e5e7eb',
                background: activeTab === 'connected' ? '#10b981' : '#ffffff',
                color: activeTab === 'connected' ? '#ffffff' : '#6b7280',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Connected ({connectedHouseholds.length})
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Household Type Filter - Icon-based chips with better spacing */}
            <div>
              <div style={{ 
                fontSize: 13, 
                fontWeight: 700, 
                color: '#6b7280', 
                marginBottom: 12,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Household Type
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

            {/* Age Range Filter - Only show if "Family w/ Kids" is selected */}
            {selectedTypes.has("Family w/ Kids") && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={{ 
                  fontSize: 13, 
                  fontWeight: 600, 
                  color: '#6b7280', 
                  marginBottom: 10,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Kids' Ages: {ageMin}–{ageMax} years
                </div>
                <div style={{ paddingLeft: 8, paddingRight: 8 }}>
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

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
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

        {/* Distance Accuracy Legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 14px',
          background: '#f8fafc',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 12,
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: '#dcfce7',
              border: '1px solid #86efac',
              fontSize: 11,
              fontWeight: 600,
              color: '#166534'
            }}>
              ~0.2 miles
            </div>
            <span>Precise location (street address)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              padding: '2px 6px',
              borderRadius: 4,
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              fontSize: 11,
              fontWeight: 600,
              color: '#92400e'
            }}>
              ~0.3 miles*
            </div>
            <span>Approximate (ZIP code only)</span>
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

        {!loading && !error && filteredHouseholds.length === 0 && (
          <div style={{ textAlign: 'center', padding: 64 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {activeTab === 'connected' ? '👋' : '🏘️'}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
              {activeTab === 'connected' 
                ? 'No connections yet' 
                : 'No households found'}
            </h3>
            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
              {activeTab === 'connected'
                ? 'Connect with neighbors from the Nearby tab to start messaging and coordinating events'
                : 'Try adjusting your filters or check back later'}
            </p>
            {activeTab === 'connected' && (
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
                  cursor: 'pointer'
                }}
              >
                Browse Nearby Neighbors
              </button>
            )}
          </div>
        )}

        {/* Household Cards */}
        <div style={{ display: 'grid', gap: 16 }}>
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
                  borderRadius: 16,
                  padding: 20,
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#111827' }}>
                      {householdName}
                    </h3>
                    
                    {/* Distance */}
                    {getDistanceText(household) && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 6, 
                        marginBottom: 8
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: household.location_precision === 'zipcode' ? '#fef3c7' : '#dcfce7',
                          border: household.location_precision === 'zipcode' ? '1px solid #fbbf24' : '1px solid #86efac',
                          fontSize: 12,
                          fontWeight: 600,
                          color: household.location_precision === 'zipcode' ? '#92400e' : '#166534'
                        }}>
                          <MapPin size={12} />
                          {getDistanceText(household)}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      {/* Household Type Badge */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: getHouseholdTypeColor(household.householdType) + '15',
                          color: getHouseholdTypeColor(household.householdType),
                          fontSize: 13,
                          fontWeight: 600
                        }}
                      >
                        {getHouseholdTypeIcon(household.householdType)}
                        {getHouseholdTypeLabel(household.householdType)}
                      </div>
                      
                      {/* Neighborhood */}
                      {household.neighborhood && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
                          <MapPin size={14} />
                          {household.neighborhood}
                        </div>
                      )}

                      {/* Connected Badge (only show in Nearby tab) */}
                      {activeTab === 'nearby' && connected && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '4px 10px',
                          borderRadius: 8,
                          background: '#f0fdf4',
                          border: '1px solid #d1fae5',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#047857'
                        }}>
                          <UserPlus size={12} />
                          Connected
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adults */}
                {household.adultNames && household.adultNames.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                      Adults:
                    </div>
                    <div style={{ fontSize: 14, color: '#374151' }}>
                      {household.adultNames.join(', ')}
                    </div>
                  </div>
                )}

                {/* Kids */}
                {kidsAges.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 4 }}>
                      Kids:
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {kidsAges.map((age, idx) => {
                        const isMatch = isAgeInFilterRange(age);
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: isMatch ? '#10b981' : '#f0fdf4',
                              border: isMatch ? '2px solid #059669' : '1px solid #d1fae5',
                              fontSize: 13,
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
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {/* Invite to Event with dropdown */}
                  <div style={{ flex: 1, position: 'relative' }} data-dropdown="invite-event">
                    <button
                      onClick={(e) => handleInviteToEvent(household, e)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '2px solid #10b981',
                        background: '#10b981',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Calendar size={16} />
                      Invite to Event
                      <motion.div
                        animate={{ rotate: inviteDropdownOpen === household.id ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'flex', marginLeft: 4 }}
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
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '2px solid #3b82f6',
                        background: '#3b82f6',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <MessageCircle size={16} />
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
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '2px solid #3b82f6',
                        background: '#ffffff',
                        color: '#3b82f6',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: isConnecting(household.id) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: isConnecting(household.id) ? 0.6 : 1
                      }}
                    >
                      <UserPlus size={16} />
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
