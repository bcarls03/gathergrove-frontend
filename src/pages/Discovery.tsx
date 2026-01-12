import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Home, MapPin, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock household data - will be replaced with API calls
interface Household {
  id: string;
  name: string;
  type: 'family' | 'singles' | 'empty-nesters';
  adults: { firstName: string }[];
  children?: { age: number; gender: string }[];
  distance: number; // in miles
  interests: string[];
  sharedInterests?: string[];
}

const MOCK_HOUSEHOLDS: Household[] = [
  {
    id: '1',
    name: 'The Johnson Family',
    type: 'family',
    adults: [{ firstName: 'Sarah' }, { firstName: 'Mike' }],
    children: [
      { age: 7, gender: 'Female' },
      { age: 5, gender: 'Male' }
    ],
    distance: 0.2,
    interests: ['Playdates', 'Soccer', 'Gardening', 'Cooking'],
    sharedInterests: ['Playdates', 'Soccer']
  },
  {
    id: '2',
    name: 'The Martinez Family',
    type: 'family',
    adults: [{ firstName: 'Carlos' }, { firstName: 'Ana' }],
    children: [
      { age: 8, gender: 'Female' },
      { age: 6, gender: 'Female' },
      { age: 3, gender: 'Male' }
    ],
    distance: 0.4,
    interests: ['Playdates', 'Art', 'Music', 'Hiking'],
    sharedInterests: ['Playdates']
  },
  {
    id: '3',
    name: 'The Chen Family',
    type: 'family',
    adults: [{ firstName: 'Wei' }, { firstName: 'Li' }],
    children: [
      { age: 6, gender: 'Male' }
    ],
    distance: 0.6,
    interests: ['Soccer', 'STEM', 'Reading', 'Board Games'],
    sharedInterests: ['Soccer']
  },
  {
    id: '4',
    name: 'Emma & David',
    type: 'singles',
    adults: [{ firstName: 'Emma' }, { firstName: 'David' }],
    distance: 0.3,
    interests: ['Wine Tasting', 'Running', 'Photography'],
    sharedInterests: []
  },
  {
    id: '5',
    name: 'The Williams Family',
    type: 'empty-nesters',
    adults: [{ firstName: 'Robert' }, { firstName: 'Patricia' }],
    distance: 0.5,
    interests: ['Gardening', 'Book Club', 'Cooking', 'Travel'],
    sharedInterests: ['Gardening', 'Cooking']
  }
];

export default function Discovery() {
  const navigate = useNavigate();
  
  // Check if user has completed profile
  const hasHouseholdType = localStorage.getItem('user_household_type');
  const userHouseholdType = localStorage.getItem('user_household_type');
  
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDistance, setFilterDistance] = useState<number>(1.0);
  const [filterAgeRange, setFilterAgeRange] = useState<string>('all');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      // Filter households based on user profile
      let filtered = MOCK_HOUSEHOLDS;
      
      if (filterType !== 'all') {
        filtered = filtered.filter(h => h.type === filterType);
      }
      
      filtered = filtered.filter(h => h.distance <= filterDistance);
      
      if (filterAgeRange !== 'all' && filterAgeRange) {
        const [min, max] = filterAgeRange.split('-').map(Number);
        filtered = filtered.filter(h => {
          if (!h.children) return false;
          return h.children.some(c => c.age >= min && c.age <= max);
        });
      }
      
      setHouseholds(filtered);
      setLoading(false);
    }, 500);
  }, [filterType, filterDistance, filterAgeRange]);

  const getHouseholdTypeIcon = (type: string) => {
    switch (type) {
      case 'family': return <Users size={16} />;
      case 'singles': return <Heart size={16} />;
      case 'empty-nesters': return <Home size={16} />;
      default: return <Users size={16} />;
    }
  };

  const getHouseholdTypeColor = (type: string) => {
    switch (type) {
      case 'family': return '#3b82f6';
      case 'singles': return '#a855f7';
      case 'empty-nesters': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Show empty state if no profile
  if (!hasHouseholdType) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 500, textAlign: 'center' }}>
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 40
          }}>
            🔍
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: '#111827' }}>
            Complete Your Profile to Discover
          </h2>
          <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32, lineHeight: 1.6 }}>
            Add your household information to see families, singles, and neighbors near you who share your interests.
          </p>
          <button
            onClick={() => navigate('/profile?tab=household')}
            style={{
              padding: '12px 32px',
              borderRadius: 12,
              border: 'none',
              background: '#3b82f6',
              color: '#ffffff',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            }}
          >
            Complete Profile
          </button>
        </div>
      </div>
    );
  }

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#111827' }}>
                Discover Neighbors
              </h1>
            </div>
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
              {households.length} nearby
            </div>
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
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              <option value="all">All Types</option>
              <option value="family">Families</option>
              <option value="singles">Singles/Couples</option>
              <option value="empty-nesters">Empty Nesters</option>
            </select>

            {/* Distance Filter */}
            <select
              value={filterDistance}
              onChange={(e) => setFilterDistance(Number(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                color: '#374151'
              }}
            >
              <option value={0.5}>Within 0.5 miles</option>
              <option value={1.0}>Within 1 mile</option>
              <option value={2.0}>Within 2 miles</option>
              <option value={5.0}>Within 5 miles</option>
            </select>

            {/* Age Range Filter (only show for families) */}
            {(userHouseholdType === 'family' || filterType === 'family') && (
              <select
                value={filterAgeRange}
                onChange={(e) => setFilterAgeRange(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                  background: '#ffffff',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  color: '#374151'
                }}
              >
                <option value="all">All Ages</option>
                <option value="0-3">Ages 0-3</option>
                <option value="4-6">Ages 4-6</option>
                <option value="7-10">Ages 7-10</option>
                <option value="11-14">Ages 11-14</option>
                <option value="15-18">Ages 15-18</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Household List */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
            Loading neighbors...
          </div>
        ) : households.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: 60,
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#374151' }}>
              No households match your filters
            </h3>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>
              Try adjusting your filters to see more neighbors
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {households.map((household, idx) => (
              <motion.div
                key={household.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: '1px solid #e5e7eb',
                  padding: 20,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `${getHouseholdTypeColor(household.type)}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: getHouseholdTypeColor(household.type)
                      }}>
                        {getHouseholdTypeIcon(household.type)}
                      </div>
                      <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827' }}>
                        {household.name}
                      </h3>
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 4 }}>
                      {household.adults.map(a => a.firstName).join(' & ')}
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: '#f3f4f6',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#4b5563'
                  }}>
                    <MapPin size={12} />
                    {household.distance} mi
                  </div>
                </div>

                {/* Children */}
                {household.children && household.children.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Children
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {household.children.map((child, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            background: '#eff6ff',
                            border: '1px solid #dbeafe',
                            fontSize: 13,
                            fontWeight: 500,
                            color: '#1e40af'
                          }}
                        >
                          Age {child.age} · {child.gender}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Interests
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {household.interests.map((interest, i) => {
                      const isShared = household.sharedInterests?.includes(interest);
                      return (
                        <div
                          key={i}
                          style={{
                            padding: '4px 12px',
                            borderRadius: 6,
                            background: isShared ? '#d1fae5' : '#f3f4f6',
                            border: isShared ? '1px solid #a7f3d0' : '1px solid #e5e7eb',
                            fontSize: 13,
                            fontWeight: isShared ? 600 : 500,
                            color: isShared ? '#047857' : '#4b5563'
                          }}
                        >
                          {isShared && '✓ '}{interest}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action hint */}
                {household.sharedInterests && household.sharedInterests.length > 0 && (
                  <div style={{ 
                    marginTop: 12, 
                    paddingTop: 12, 
                    borderTop: '1px solid #f3f4f6',
                    fontSize: 13,
                    color: '#047857',
                    fontWeight: 600
                  }}>
                    {household.sharedInterests.length} shared interest{household.sharedInterests.length > 1 ? 's' : ''} · Tap to connect
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
