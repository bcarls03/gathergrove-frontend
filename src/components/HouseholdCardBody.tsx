// src/components/HouseholdCardBody.tsx
import { MapPin, UserPlus } from 'lucide-react';
import type { ReactElement } from 'react';
import type { GGHousehold } from '../lib/api';

type DiscoverTab = 'nearby' | 'connected';

type HouseholdCardBodyProps = {
  household: GGHousehold;
  householdName: string;
  connected: boolean;
  activeTab: DiscoverTab;
  isAgeInFilterRange: (age: number) => boolean;
  kidsGenderFilter: 'all' | 'girls' | 'boys';
  normalizeKidGender: (sex?: string | null) => 'girl' | 'boy' | null;
  getGenderSuffix: (sex?: string | null) => string;
  getDistanceText: (household: GGHousehold) => string | null;
  getHouseholdTypeColor: (type?: string) => string;
  getHouseholdTypeIcon: (type?: string) => ReactElement;
  getHouseholdTypeLabel: (type?: string) => string;
  kidsAges: number[];
  variant?: 'discovery' | 'preview';
};

export default function HouseholdCardBody({
  household,
  householdName,
  connected,
  activeTab,
  isAgeInFilterRange,
  kidsGenderFilter,
  normalizeKidGender,
  getGenderSuffix,
  getDistanceText,
  getHouseholdTypeColor,
  getHouseholdTypeIcon,
  getHouseholdTypeLabel,
  kidsAges,
  variant = 'discovery',
}: HouseholdCardBodyProps) {
  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
            {householdName}
          </h3>

          {variant === 'discovery' && getDistanceText(household) && (
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
                background: variant === 'preview' ? '#f3f4f6' : getHouseholdTypeColor(household.householdType) + '15',
                border: variant === 'preview' ? '1px solid #e5e7eb' : undefined,
                color: variant === 'preview' ? '#374151' : getHouseholdTypeColor(household.householdType),
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
                // In preview mode, force no match styling
                const isMatch = variant === 'preview' ? false : (isAgeMatch && isGenderMatch);
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
              padding: '2px 8px',
              borderRadius: 6,
              background: '#f0fdf4',
              border: '1px solid #d1fae5',
              fontSize: 12,
              fontWeight: 400,
              color: '#166534',
              marginTop: 6,
            }}>
              <span style={{ fontSize: 14 }}>🧑‍🍼</span>
              <span>Babysitting help</span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
