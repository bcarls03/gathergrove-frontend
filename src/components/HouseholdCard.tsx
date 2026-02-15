// src/components/HouseholdCard.tsx
import { Users, Heart, Home, MapPin, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { type GGHousehold } from '../lib/api';
import { HOUSEHOLD_TYPE_META, type HouseholdType } from './filters';

export type KidsGenderFilter = 'all' | 'girls' | 'boys';

export type HouseholdCardProps = {
  household: GGHousehold;
  // Filter state for highlighting kids that match age range
  isAgeFilterActive?: boolean;
  ageMin?: number;
  ageMax?: number;
  // Gender filter for kids highlighting
  kidsGenderFilter?: KidsGenderFilter;
  // Show/hide connected badge
  showConnectedBadge?: boolean;
  isConnected?: boolean;
  // Variant determines which features to show
  variant?: 'discovery' | 'preview' | 'me';
  // Optional click handler
  onClick?: () => void;
  // Optional children (for action buttons)
  children?: React.ReactNode;
};

// ============================================================================
// Helper functions (extracted from Discovery.tsx)
// ============================================================================

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

const getGenderSuffix = (sex?: string | null): string => {
  const s = (sex || "").trim().toLowerCase();
  if (s === "female" || s === "girl" || s === "f") return "Girl";
  if (s === "male" || s === "boy" || s === "m") return "Boy";
  return "";
};

const normalizeKidGender = (sex?: string | null): 'girl' | 'boy' | null => {
  const s = (sex || "").trim().toLowerCase();
  if (!s) return null;
  if (s === "girl" || s === "female" || s === "f") return "girl";
  if (s === "boy" || s === "male" || s === "m") return "boy";
  return null;
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

// ============================================================================
// HouseholdCard Component
// ============================================================================

export function HouseholdCard({
  household,
  isAgeFilterActive = false,
  ageMin = 0,
  ageMax = 18,
  kidsGenderFilter = 'all',
  showConnectedBadge = false,
  isConnected = false,
  variant = 'discovery',
  onClick,
  children,
}: HouseholdCardProps) {
  const kidsAges = getKidsAges(household);
  const householdName = getHouseholdName(household);
  const distanceText = getDistanceText(household);
  
  // Check if household has babysitting help available
  const hasBabysitter = household.kids?.some((kid) => {
    if (!kid.birthYear || !kid.birthMonth || !kid.canBabysit) return false;
    const birthDate = new Date(kid.birthYear, (kid.birthMonth || 1) - 1);
    const today = new Date();
    const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
    const age = Math.floor(ageInMonths / 12);
    return age >= 13 && age <= 25;
  });

  // Check if a kid's age matches the current filter range
  const isAgeInFilterRange = (age: number): boolean => {
    if (!isAgeFilterActive) return false;
    return age >= ageMin && age <= ageMax;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 12,
        border: '2px solid #e5e7eb',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
      whileHover={onClick ? { 
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        borderColor: '#10b981'
      } : {}}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
            {householdName}
          </h3>
          
          {/* Distance */}
          {distanceText && (
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
                {distanceText}
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

            {/* Connected Badge */}
            {showConnectedBadge && isConnected && (
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
          {hasBabysitter && (
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

      {/* Optional children slot (for action buttons, etc.) */}
      {children}
    </motion.div>
  );
}

export default HouseholdCard;
