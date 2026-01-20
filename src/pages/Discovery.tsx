// src/pages/Discovery.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Home, MapPin, Sparkles, UserPlus, Calendar, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchHouseholds, type GGHousehold } from '../lib/api';

type DiscoverTab = 'nearby' | 'connected';

export default function Discovery() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<DiscoverTab>('nearby');
  const [households, setHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAgeRange, setFilterAgeRange] = useState<string>('all');

  // Mock connected household IDs (TODO: Replace with real API)
  const [connectedHouseholdIds] = useState<string[]>([]);

  useEffect(() => {
    loadHouseholds();
  }, []);

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

  const handleConnect = (household: GGHousehold) => {
    // TODO: Implement connection request API
    alert(`Connection request to ${getHouseholdName(household)} - Coming soon!`);
  };

  const handleMessage = (household: GGHousehold) => {
    // TODO: Implement messaging
    alert(`Message ${getHouseholdName(household)} - Coming soon!`);
  };

  const isConnected = (householdId?: string) => {
    return connectedHouseholdIds.includes(householdId || '');
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
                      style={{
                        flex: 1,
                        padding: '10px 16px',
                        borderRadius: 10,
                        border: '2px solid #3b82f6',
                        background: '#ffffff',
                        color: '#3b82f6',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <UserPlus size={16} />
                      Connect
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
