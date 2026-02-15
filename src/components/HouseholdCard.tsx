// src/components/HouseholdCard.tsx
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import HouseholdCardBody from './HouseholdCardBody';
import type { GGHousehold } from '../lib/api';

type DiscoverTab = 'nearby' | 'connected';

type HouseholdCardProps = {
  // Props for HouseholdCardBody
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
  getHouseholdTypeIcon: (type?: string) => React.ReactElement;
  getHouseholdTypeLabel: (type?: string) => string;
  kidsAges: number[];
  
  // Additional wrapper props
  variant?: 'preview' | 'default';
  onClick?: () => void;
  children?: ReactNode;
};

export default function HouseholdCard({
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
  variant = 'default',
  onClick,
  children,
}: HouseholdCardProps) {
  return (
    <motion.div
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
      onClick={onClick}
    >
      <HouseholdCardBody
        household={household}
        householdName={householdName}
        connected={connected}
        activeTab={activeTab}
        isAgeInFilterRange={isAgeInFilterRange}
        kidsGenderFilter={kidsGenderFilter}
        normalizeKidGender={normalizeKidGender}
        getGenderSuffix={getGenderSuffix}
        getDistanceText={getDistanceText}
        getHouseholdTypeColor={getHouseholdTypeColor}
        getHouseholdTypeIcon={getHouseholdTypeIcon}
        getHouseholdTypeLabel={getHouseholdTypeLabel}
        kidsAges={kidsAges}
        variant={variant === 'preview' ? 'preview' : 'discovery'}
      />
      {children}
    </motion.div>
  );
}
