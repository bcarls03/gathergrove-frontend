// src/pages/Discovery.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Home, MapPin, Sparkles, UserPlus, Calendar, MessageCircle, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchHouseholds, fetchEvents, type GGHousehold, type GGEvent } from '../lib/api';
import { fetchConnections, sendConnectionRequest } from '../lib/api/connections';

type DiscoverTab = 'nearby' | 'connected';

export default function Discovery() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<DiscoverTab>('nearby');
  const [households, setHouseholds] = useState<GGHousehold[]>([]);
  const [events, setEvents] = useState<GGEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('all');

  // Connected household IDs from API
  const [connectedHouseholdIds, setConnectedHouseholdIds] = useState<string[]>([]);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadHouseholds();
    loadConnections();
    loadEvents();
  }, []);

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
      const connections = await fetchConnections();
      setConnectedHouseholdIds(connections);
    } catch (err) {
      console.error('Failed to load connections:', err);
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

  // Filter households locally
  const filteredHouseholds = currentHouseholds.filter(h => {
    // Filter by household type
    if (filterType !== 'all' && h.householdType !== filterType) {
      return false;
    }
    
    // Filter by age range (if kids exist)
    if (filterAgeRange !== 'all' && filterAgeRange) {
      const [minAge, maxAge] = filterAgeRange.split('-').map(Number);
      const hasMatchingKid = h.kids?.some(kid => {
        if (!kid.birthYear || !kid.birthMonth) return false;
        const today = new Date();
        const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        const ageInYears = Math.floor(ageInMonths / 12);
        return ageInYears >= minAge && ageInYears <= maxAge;
      });
      if (!hasMatchingKid) return false;
    }
    
    return true;
  });

  const getHouseholdTypeIcon = (type?: string) => {
    switch (type) {
      case 'family': return <Users size={16} />;
      case 'couple': return <Heart size={16} />;
      case 'individual': return <Home size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getHouseholdTypeColor = (type?: string) => {
    switch (type) {
      case 'family': return '#3b82f6';
      case 'couple': return '#a855f7';
      case 'individual': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getHouseholdTypeLabel = (type?: string) => {
    switch (type) {
      case 'family': return 'Family';
      case 'couple': return 'Couple';
      case 'individual': return 'Individual';
      default: return 'Household';
    }
  };

  const getHouseholdName = (household: GGHousehold): string => {
    if (household.lastName) {
      return `The ${household.lastName} Family`;
    }
    if (household.adultNames && household.adultNames.length > 0) {
      return household.adultNames.join(' & ');
    }
    return 'Neighbor';
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

  const handleInviteToEvent = (household: GGHousehold) => {
    // Store household ID in localStorage to pre-select when creating event
    localStorage.setItem('invite_household_id', household.id || '');
    localStorage.setItem('invite_household_name', getHouseholdName(household));
    navigate('/compose/event');
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
          padding: '20px 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827' }}>
              Discover
            </h1>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              padding: '6px 12px',
              borderRadius: 8,
              background: '#f0fdf4',
              border: '1px solid #d1fae5',
              fontSize: 13,
              fontWeight: 600,
              color: '#047857'
            }}>
              <Sparkles size={14} />
              {filteredHouseholds.length} {activeTab === 'connected' ? 'connected' : 'nearby'}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setActiveTab('nearby')}
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: 10,
                border: '2px solid',
                borderColor: activeTab === 'nearby' ? '#10b981' : '#e5e7eb',
                background: activeTab === 'nearby' ? '#10b981' : '#ffffff',
                color: activeTab === 'nearby' ? '#ffffff' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
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
                padding: '10px 16px',
                borderRadius: 10,
                border: '2px solid',
                borderColor: activeTab === 'connected' ? '#10b981' : '#e5e7eb',
                background: activeTab === 'connected' ? '#10b981' : '#ffffff',
                color: activeTab === 'connected' ? '#ffffff' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              Connected ({connectedHouseholds.length})
            </button>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {/* Household Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '2px solid #e5e7eb',
                background: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Types</option>
              <option value="family">Families</option>
              <option value="couple">Couples</option>
              <option value="individual">Individuals</option>
            </select>

            {/* Age Range Filter */}
            <select
              value={filterAgeRange}
              onChange={(e) => setFilterAgeRange(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '2px solid #e5e7eb',
                background: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Ages</option>
              <option value="0-2">0-2 years</option>
              <option value="3-5">3-5 years</option>
              <option value="6-8">6-8 years</option>
              <option value="9-12">9-12 years</option>
              <option value="13-17">13-17 years</option>
            </select>
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
          marginBottom: 16 
        }}>
          <Users size={20} style={{ color: '#10b981' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
            {activeTab === 'connected' ? 'Your Connections' : 'Nearby Neighbors'}
          </h2>
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
                    <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                      {householdName}
                    </h3>
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
                      {kidsAges.map((age, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 8,
                            background: '#f0fdf4',
                            border: '1px solid #d1fae5',
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#047857'
                          }}
                        >
                          {age} {age === 1 ? 'year' : 'years'}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  {/* Always show Invite to Event */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInviteToEvent(household);
                    }}
                    style={{
                      flex: 1,
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
                  </button>

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
