// src/components/HouseholdSelector.tsx
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import * as Api from "../lib/api";
import type { GGHousehold } from "../lib/api";
import { useInviteSelection } from "../hooks/useInviteSelection";

// ✅ Simplified InviteContext - removed suggestedHouseholds (single source of truth)
interface InviteContext {
  clickedHouseholdId: string;
  clickedHouseholdName: string;
  visibleHouseholdIds?: string[]; // ✅ The actual filtered list from Discovery
  filterContext?: {
    types: string[];
    ageRange?: { min: number; max: number } | null;
    hasFilters: boolean;
  };
}

/**
 * INVARIANT: Household names MUST be keyed by household ID (not array index).
 * This Map guarantees stable ID→name lookup even when selection order changes.
 * DO NOT change this to string[] - it will break Preview name rendering on toggle.
 */
export type HouseholdNameMap = Map<string, string>;

interface HouseholdSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelectedNamesChange?: (nameMap: HouseholdNameMap) => void;
  inviteContext?: InviteContext;
  selectedPhoneNumbers?: Set<string>;
  onPhoneNumbersChange?: (numbers: Set<string>) => void;
  eventInviteLink?: string; // ✅ Pass from parent after event is created
  eventTitle?: string;
  hideSectionHeaders?: boolean; // ✅ When true, parent controls section headers
}

// ✅ Canonical type labels matching actual enum values
const TYPE_LABELS: Record<string, string> = {
  'family_with_kids': 'Family w/ Kids',
  'empty_nesters': 'Empty Nesters',
  'singles_couples': 'Singles/Couples',
  'young_professionals': 'Young Professionals',
};

export function HouseholdSelector({ 
  selectedIds, 
  onSelectionChange,
  onSelectedNamesChange,
  inviteContext,
  selectedPhoneNumbers,
  onPhoneNumbersChange,
  eventInviteLink,
  eventTitle = "GatherGrove Event",
  hideSectionHeaders = false,
}: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  
  // ✅ Track initialization to prevent repeated preselect
  const initRef = useRef<string | null>(null);

  // ✅ Stable refs for callbacks to avoid dependency issues
  const onSelectedNamesChangeRef = useRef(onSelectedNamesChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // Keep refs updated
  useEffect(() => {
    onSelectedNamesChangeRef.current = onSelectedNamesChange;
  }, [onSelectedNamesChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // ✅ Normalize visibleHouseholdIds to Set once
  const visibleSet = useMemo(
    () => new Set(inviteContext?.visibleHouseholdIds || []),
    [inviteContext?.visibleHouseholdIds]
  );

  // ✅ Check if user came from Discovery (by checking if inviteContext exists)
  const cameFromDiscovery = !!inviteContext?.clickedHouseholdId;

  // ✅ Use shared invite selection hook
  const selection = useInviteSelection({
    households: availableHouseholds,
    matchingHouseholdIds: inviteContext?.visibleHouseholdIds || [],
    selectedIds,
    onSelectionChange: (newIds) => {
      onSelectionChangeRef.current(newIds);
    },
  });

  // Update parent with selected household names whenever selection changes
  useEffect(() => {
    if (onSelectedNamesChangeRef.current && availableHouseholds.length > 0) {
      const names = new Map(Array.from(selection.selectedIds)
        .map(id => [id, availableHouseholds.find(h => h.id === id)?.lastName || "Unknown Household"]));
      onSelectedNamesChangeRef.current(names);
    }
  }, [selection.selectedIds, availableHouseholds]);

  // Load households
  useEffect(() => {
    const loadHouseholds = async () => {
      setLoading(true);
      try {
        // ✅ Use same mock data as Discovery for consistency
        const mockHouseholds: GGHousehold[] = [
          {
            id: 'test-1',
            lastName: 'Anderson',
            householdType: 'family_with_kids',
            neighborhood: 'Oak Ridge',
            location_precision: 'street',
            kids: [
              { birthYear: 2014, birthMonth: 5 },
              { birthYear: 2018, birthMonth: 3 }
            ],
            uid: 'test-uid-1',
          },
          {
            id: 'test-2',
            lastName: 'Brown',
            householdType: 'family_with_kids',
            neighborhood: 'Oak Ridge',
            location_precision: 'street',
            kids: [{ birthYear: 2019, birthMonth: 8 }],
            uid: 'test-uid-2',
          },
          {
            id: 'test-3',
            lastName: 'Chen',
            householdType: 'family_with_kids',
            neighborhood: 'Hillside',
            location_precision: 'street',
            kids: [
              { birthYear: 2019, birthMonth: 11 },
              { birthYear: 2022, birthMonth: 6 }
            ],
            uid: 'test-uid-3',
          },
          {
            id: 'test-4',
            lastName: 'Garcia',
            householdType: 'family_with_kids',
            neighborhood: 'Riverside',
            location_precision: 'street',
            kids: [
              { birthYear: 2016, birthMonth: 2 },
              { birthYear: 2020, birthMonth: 9 }
            ],
            uid: 'test-uid-4',
          },
          {
            id: 'test-5',
            lastName: 'Johnson',
            householdType: 'family_with_kids',
            neighborhood: 'Oak Ridge',
            location_precision: 'street',
            kids: [
              { birthYear: 2015, birthMonth: 7 },
              { birthYear: 2017, birthMonth: 12 },
              { birthYear: 2021, birthMonth: 4 }
            ],
            uid: 'test-uid-5',
          },
        ];
        
        // setAvailableHouseholds(mockHouseholds);
        
        const households = await Api.fetchHouseholds();
        if (import.meta.env.DEV) {
          console.log("✅ Fetched households:", households.length);
        }
        setAvailableHouseholds(households);
      } catch (error) {
        console.error("❌ Failed to load households:", error);
        setAvailableHouseholds([]);
      } finally {
        setLoading(false);
      }
    };

    loadHouseholds();
  }, []);

  // ✅ FIX #3: Preselect clicked household (only if came from Discovery, with ref guard)
  useEffect(() => {
    const clicked = inviteContext?.clickedHouseholdId;
    if (!clicked || !cameFromDiscovery) return; // ✅ Only preselect from Discovery flow

    // ✅ Wait for households to load before preselecting
    if (availableHouseholds.length === 0) return;

    // Prevent repeated initialization for same household
    if (initRef.current === clicked) return;
    initRef.current = clicked;

    // If nothing selected → add clicked
    if (selection.selectedIds.size === 0) {
      selection.toggleHousehold(clicked);
      return;
    }

    // If some selected → add clicked (if not already there)
    if (!selection.selectedIds.has(clicked)) {
      selection.toggleHousehold(clicked);
    }
  }, [inviteContext?.clickedHouseholdId, cameFromDiscovery, selection, availableHouseholds.length]);

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
      .sort((a, b) => b - a);
  };

  // ✅ Share/invite helpers (safe - only work when eventInviteLink exists)
  const shareInvite = async () => {
    if (!eventInviteLink) return;
    
    const shareText = `You're invited to "${eventTitle}" on GatherGrove! 🎉\n\nRSVP here: ${eventInviteLink}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invite to ${eventTitle}`,
          text: shareText,
        });
        return true;
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.log('Share failed:', error);
        }
      }
    }
    
    return false;
  };

  const sendViaSMS = () => {
    if (!eventInviteLink) return;
    
    const message = `You're invited to "${eventTitle}" on GatherGrove! 🎉\n\nRSVP: ${eventInviteLink}`;
    const smsLink = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsLink, '_blank');
  };

  const copyInviteLink = async () => {
    if (!eventInviteLink) return;
    
    try {
      await navigator.clipboard.writeText(eventInviteLink);
      alert('✅ Link copied to clipboard!');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = eventInviteLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('✅ Link copied to clipboard!');
      } catch (err) {
        alert('❌ Could not copy link. Please copy manually:\n\n' + eventInviteLink);
      }
      document.body.removeChild(textArea);
    }
  };

  const allSelected = availableHouseholds.length > 0 && 
    selection.selectedIds.size === availableHouseholds.filter(h => h.id).length;

  // ✅ Compute hasMatches for bulk actions
  const hasMatches = selection.matchIds.length > 0;

  // Always show full household list - filters only affect selection, not visibility
  const displayedHouseholds = useMemo(() => {
    return availableHouseholds;
  }, [availableHouseholds]);

  // ✅ FIX #2: Smart 3-tier sorting using ?? for distance (handles 0, null, undefined)
  const sortedHouseholds = useMemo(() => {
    const clicked = inviteContext?.clickedHouseholdId;

    return [...displayedHouseholds].sort((a, b) => {
      // 1. Clicked household always first
      if (a.id === clicked) return -1;
      if (b.id === clicked) return 1;

      // 2. Suggested (from visibleSet) next
      const aIsSuggested = visibleSet.has(a.id || '');
      const bIsSuggested = visibleSet.has(b.id || '');
      if (aIsSuggested && !bIsSuggested) return -1;
      if (!aIsSuggested && bIsSuggested) return 1;

      // 3. Within same group: sort by distance (✅ using ?? to handle 0, null, undefined)
      const aDist = (a as any).distance ?? 999;
      const bDist = (b as any).distance ?? 999;
      return aDist - bDist;
    });
  }, [displayedHouseholds, inviteContext?.clickedHouseholdId, visibleSet]);

  // ✅ Group households: suggested vs others (single source of truth: visibleSet)
  const suggestedHouseholds = sortedHouseholds.filter(
    h => h.id === inviteContext?.clickedHouseholdId || visibleSet.has(h.id || '')
  );
  const otherHouseholds = sortedHouseholds.filter(
    h => h.id !== inviteContext?.clickedHouseholdId && !visibleSet.has(h.id || '')
  );
  
  const hasSuggestions = cameFromDiscovery && 
                        inviteContext?.filterContext?.hasFilters && 
                        suggestedHouseholds.length > 0;

  const shouldShowSections = availableHouseholds.length >= 30;

  const isSuggested = (householdId: string) => {
    return householdId === inviteContext?.clickedHouseholdId || visibleSet.has(householdId);
  };

  const renderHouseholdCard = (household: GGHousehold, isRecommended: boolean = false) => {
    const householdId = household.id;
    if (!householdId) return null;
    
    const kidsAges = getKidsAges(household);
    const isClickedHousehold = selection.clickedIds.has(householdId);
    const isSelected = selection.selectedIds.has(householdId);
    
    return (
      <label
        key={householdId}
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "16px",
          border: `1px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
          borderRadius: "12px",
          cursor: "pointer",
          backgroundColor: isSelected ? '#eff6ff' : '#fff',
          transition: "all 0.2s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = "#f8fafc";
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = "#fff";
          }
        }}
      >
        {/* Checkbox controlled directly */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => selection.toggleHousehold(householdId)}
          style={{
            width: "18px",
            height: "18px",
            marginRight: "12px",
            marginTop: "2px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges in top-right */}
          <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 6 }}>
            {isClickedHousehold && (
              <span style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "#dbeafe",
                color: "#1e40af",
                fontWeight: 600,
              }}>
                👆 Clicked
              </span>
            )}
            {isRecommended && !isClickedHousehold && (
              <span style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#475569",
                fontWeight: 600,
              }}>
                ✓ Match
              </span>
            )}
          </div>
          
          {/* Household name */}
          <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px", marginBottom: "4px", paddingRight: isRecommended ? "70px" : "0" }}>
            {household.lastName || 'Unknown Household'}
          </div>

          {/* Distance (from API if available) */}
          {(household as any).distance != null && (
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 4 }}>
              � ~{((household as any).distance as number).toFixed(1)} mi
              {household.location_precision === 'zipcode' && '*'}
            </div>
          )}
          
          {/* Neighborhood */}
          {household.neighborhood && (
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: 8 }}>
              {household.neighborhood}
            </div>
          )}

          {/* Adults */}
          {household.adultNames && household.adultNames.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Adults:
              </div>
              <div style={{ fontSize: "13px", color: "#374151" }}>
                {household.adultNames.join(', ')}
              </div>
            </div>
          )}

          {/* Kids ages */}
          {kidsAges.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                Kids:
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {kidsAges.map((age, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: "#f0fdf4",
                      border: "1px solid #d1fae5",
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "#047857",
                    }}
                  >
                    {age} {age === 1 ? 'yr' : 'yrs'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="gg-card-section">
      {/* Section header: In-app delivery */}
      {!hideSectionHeaders && (
        <div className="gg-label" style={{ marginBottom: 12 }}>
          Invite on GatherGrove
        </div>
      )}
      
      <div className="gg-label">
        Who to invite ({selection.selectedIds.size} selected)
      </div>
      {/* ✅ NEW: Compact bulk action bar with clearer mental model */}
      {!loading && availableHouseholds.length > 0 && (
        <div style={{
          marginTop: "12px",
          marginBottom: "12px",
          padding: "10px 14px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
        }}>
          {/* Bulk action buttons (left to right) */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
            {/* 1) Clicked (n) - Manually clicked households */}
            <button
              type="button"
              onClick={() => selection.toggleClickedLayer()}
              disabled={selection.clickedIds.size === 0}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "600",
                color: selection.clickedIds.size === 0 ? "#94a3b8" : "#2563eb",
                background: selection.activeBulkActions.has('clicked') ? "#eff6ff" : "transparent",
                border: "1px solid #bfdbfe",
                borderRadius: "6px",
                cursor: selection.clickedIds.size === 0 ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: selection.clickedIds.size === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!selection.activeBulkActions.has('clicked') && selection.clickedIds.size > 0) {
                  e.currentTarget.style.background = "#eff6ff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selection.activeBulkActions.has('clicked') ? "#eff6ff" : "transparent";
              }}
              title="Keep only manually clicked households"
            >
              Clicked ({selection.clickedIds.size})
            </button>

            {/* 2) Matches (m) - FILTER-ONLY: Toggle visibility, do NOT change selection */}
            {hasMatches && (
              <button
                type="button"
                onClick={() => selection.toggleMatchesLayer()}
                disabled={selection.matchIds.length === 0}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: selection.matchIds.length === 0 ? "#94a3b8" : "#2563eb",
                  background: selection.activeBulkActions.has('matches') ? "#eff6ff" : "transparent",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  cursor: selection.matchIds.length === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: selection.matchIds.length === 0 ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!selection.activeBulkActions.has('matches') && selection.matchIds.length > 0) {
                    e.currentTarget.style.background = "#eff6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selection.activeBulkActions.has('matches') ? "#eff6ff" : "transparent";
                }}
                title={`Filter view to show only ${selection.matchIds.length} matched households`}
              >
                Matches ({selection.matchIds.length})
              </button>
            )}

            {/* 3) Add Households (M) - Add ADDITIONAL (non-matching) households to selection */}
            {hasMatches && (
              <button
                type="button"
                onClick={() => selection.toggleAdditionalLayer()}
                disabled={selection.additionalIds.length === 0}
                style={{
                  padding: "5px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: selection.additionalIds.length === 0 ? "#94a3b8" : "#2563eb",
                  background: selection.activeBulkActions.has('additional') ? "#eff6ff" : "transparent",
                  border: "1px solid #bfdbfe",
                  borderRadius: "6px",
                  cursor: selection.additionalIds.length === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  opacity: selection.additionalIds.length === 0 ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!selection.activeBulkActions.has('additional') && selection.additionalIds.length > 0) {
                    e.currentTarget.style.background = "#eff6ff";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = selection.activeBulkActions.has('additional') ? "#eff6ff" : "transparent";
                }}
                title={`Add additional (non-matching) households to selection (${selection.additionalIds.length})`}
              >
                Add Households ({selection.additionalIds.length})
              </button>
            )}

            {/* 4) Select All - Always visible */}
            <button
              type="button"
              onClick={() => selection.selectAll()}
              disabled={selection.allIds.length === 0}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "600",
                color: selection.allIds.length === 0 ? "#94a3b8" : "#2563eb",
                background: selection.activeBulkActions.has('all') ? "#eff6ff" : "transparent",
                border: "1px solid",
                borderColor: selection.allIds.length === 0 ? "#e2e8f0" : "#bfdbfe",
                borderRadius: "6px",
                cursor: selection.allIds.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: selection.allIds.length === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (selection.allIds.length > 0 && !selection.activeBulkActions.has('all')) {
                  e.currentTarget.style.background = "#eff6ff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = selection.activeBulkActions.has('all') ? "#eff6ff" : "transparent";
              }}
              title="Select all households in list"
            >
              Select All
            </button>

            {/* 5) Clear - Always enabled */}
            <button
              type="button"
              onClick={() => selection.clearAll()}
              disabled={false}
              style={{
                padding: "5px 10px",
                fontSize: "12px",
                fontWeight: "600",
                color: "#dc2626",  // Always red, never grayed
                background: "transparent",
                border: "1px solid #fecaca",  // Always red border
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.15s",
                opacity: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fef2f2";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              title="Clear all selections (clickedIds persist)"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: "8px", marginBottom: "12px", color: "#64748b", fontSize: "14px" }}>
        {hasSuggestions 
          ? `Based on your filters in Discovery`
          : `Select households to invite to this event`}
      </div>

      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>Loading households...</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Check browser console (F12) if this takes more than 5 seconds
          </div>
        </div>
      ) : availableHouseholds.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>No households available</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Check browser console (F12) for error details
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "12px" }}>
          {/* ✅ Single list if <30 households, sectioned if >=30 */}
          {shouldShowSections ? (
            // Large list (30+): show sections
            <>
              {hasSuggestions && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#475569",
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <span style={{ fontSize: 16 }}>✨</span>
                    Suggested ({suggestedHouseholds.length})
                  </div>
                  
                  {/* ✅ Filter context banner with human-readable labels */}
                  {inviteContext?.filterContext && (
                    <div style={{
                      padding: "10px 12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "#475569",
                      marginBottom: 10,
                      lineHeight: 1.5
                    }}>
                      <strong>Based on your Discovery filters:</strong>
                      <div style={{ marginTop: 4 }}>
                        {inviteContext.filterContext.types && inviteContext.filterContext.types.length > 0 && (
                          <div>• {inviteContext.filterContext.types.map(t => TYPE_LABELS[t] ?? t).join(", ")}</div>
                        )}
                        {inviteContext.filterContext.ageRange && (
                          <div>• Kids ages {inviteContext.filterContext.ageRange.min}-{inviteContext.filterContext.ageRange.max}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {suggestedHouseholds.map(h => renderHouseholdCard(h, true))}
                  </div>
                </div>
              )}
              
              {/* Other Households (collapsed by default) */}
              {otherHouseholds.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowOthers(!showOthers)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginBottom: showOthers ? 8 : 0,
                      border: '1px dashed #e5e7eb',
                      borderRadius: 8,
                      background: '#f9fafb',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#6b7280',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>Other nearby households ({otherHouseholds.length})</span>
                    <span style={{ fontSize: 11 }}>{showOthers ? '▲' : '▼'}</span>
                  </button>
                  
                  {showOthers && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {otherHouseholds.map(h => renderHouseholdCard(h, false))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            // ✅ Small list (<30): single unified list with "Match" badges
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {hasSuggestions && inviteContext?.filterContext && (
                <div style={{
                  padding: "10px 12px",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#475569",
                  marginBottom: 4,
                  lineHeight: 1.5
                }}>
                  <strong>Suggested based on:</strong>
                  {' '}
                  {inviteContext.filterContext.types?.map(t => TYPE_LABELS[t] ?? t).join(", ")}
                  {inviteContext.filterContext.ageRange && 
                    ` • Ages ${inviteContext.filterContext.ageRange.min}-${inviteContext.filterContext.ageRange.max}`}
                </div>
              )}
              {sortedHouseholds.map(h => renderHouseholdCard(h, isSuggested(h.id || '')))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
