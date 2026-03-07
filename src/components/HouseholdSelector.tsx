// src/components/HouseholdSelector.tsx
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import * as Api from "../lib/api";
import type { GGHousehold } from "../lib/api";
import { useInviteSelection } from "../hooks/useInviteSelection";
import { HOUSEHOLD_TYPE_META, type HouseholdType } from "./filters";

// ✅ Simplified InviteContext - removed suggestedHouseholds (single source of truth)
interface InviteContext {
  clickedHouseholdId: string;
  clickedHouseholdName: string;
  visibleHouseholdIds?: string[]; // ✅ The actual filtered list from Discovery
  filterContext?: {
    types: string[];
    ageRange?: { min: number; max: number } | null;
    kidsGenderFilter?: 'all' | 'girls' | 'boys';
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
  onAvailableCountChange?: (count: number) => void; // ✅ Callback to notify parent of available households count
  existingInvitedIds?: Set<string>; // ✅ NEW: IDs of households already invited (when editing event)
}

// ✅ Canonical type labels matching actual enum values
const TYPE_LABELS: Record<string, string> = {
  'family_with_kids': 'Family w/ Kids',
  'empty_nesters': 'Empty Nesters',
  'singles_couples': 'Singles/Couples',
  'young_professionals': 'Young Professionals',
};

// Map household type string to HouseholdType for display
const mapToHouseholdType = (type?: string): HouseholdType | null => {
  switch (type) {
    case 'family_with_kids':
    case 'single_parent':
    case 'family':
    case 'Family w/ Kids':
    case 'Family with Kids':
      return 'Family with Kids';
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
  onAvailableCountChange,
  existingInvitedIds = new Set(),
}: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  
  console.log('[HouseholdSelector] Rendered with:', {
    selectedIds_size: selectedIds.size,
    existingInvitedIds_size: existingInvitedIds.size,
    existingInvitedIds_array: Array.from(existingInvitedIds),
  });
  
  // ✅ Track initialization to prevent repeated preselect
  const initRef = useRef<string | null>(null);
  // ✅ Track if we've already loaded households to prevent duplicate fetches
  const loadedRef = useRef(false);
  // ✅ Track in-flight requests to prevent duplicate calls
  const inFlightRef = useRef(false);

  // ✅ Stable refs for callbacks to avoid dependency issues
  const onSelectedNamesChangeRef = useRef(onSelectedNamesChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onAvailableCountChangeRef = useRef(onAvailableCountChange);

  // Keep refs updated
  useEffect(() => {
    onSelectedNamesChangeRef.current = onSelectedNamesChange;
  }, [onSelectedNamesChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    onAvailableCountChangeRef.current = onAvailableCountChange;
  }, [onAvailableCountChange]);

  // ✅ DEV: Component lifecycle logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[HS] mount");
    }
    return () => {
      if (import.meta.env.DEV) {
        console.log("[HS] unmount");
      }
    };
  }, []);

  // ✅ Normalize visibleHouseholdIds to Set once
  const visibleSet = useMemo(
    () => new Set(inviteContext?.visibleHouseholdIds || []),
    [inviteContext?.visibleHouseholdIds]
  );

  // ✅ Check if user came from Discovery (by checking if inviteContext exists)
  const cameFromDiscovery = !!inviteContext?.clickedHouseholdId;

  // ✅ DEV: Log inviteContext values
  if (import.meta.env.DEV) {
    console.log('[HS] inviteContext:', {
      cameFromDiscovery,
      clickedHouseholdId: inviteContext?.clickedHouseholdId,
      visibleHouseholdIds_length: inviteContext?.visibleHouseholdIds?.length ?? 0,
      filterContext: inviteContext?.filterContext,
    });
  }

  // ✅ Stable callback to prevent infinite loops
  const handleSelectionChange = useCallback((newIds: Set<string>) => {
    onSelectionChangeRef.current(newIds);
  }, []);

  // ✅ Use shared invite selection hook
  const selection = useInviteSelection({
    households: availableHouseholds,
    matchingHouseholdIds: inviteContext?.visibleHouseholdIds || [],
    selectedIds,
    onSelectionChange: handleSelectionChange,
  });

  // Update parent with selected household names whenever selection changes
  useEffect(() => {
    if (onSelectedNamesChangeRef.current && availableHouseholds.length > 0) {
      const names = new Map(Array.from(selection.selectedIds)
        .map(id => [id, availableHouseholds.find(h => h.id === id)?.lastName || "Unknown Household"]));
      onSelectedNamesChangeRef.current(names);
    }
  }, [selection.selectedIds, availableHouseholds]);

  // ✅ Notify parent of available households count (only after loading completes)
  useEffect(() => {
    if (onAvailableCountChangeRef.current && !loading) {
      onAvailableCountChangeRef.current(availableHouseholds.length);
    }
  }, [availableHouseholds.length, loading]);

  // Load households
  useEffect(() => {
    // ✅ Guard: only load once successfully, but allow retries if in-flight was cancelled
    if (loadedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;

    let cancelled = false;
    const abortController = new AbortController();

    const loadHouseholds = async () => {
      if (import.meta.env.DEV) {
        console.log("[HS] loadHouseholds START");
      }
      setLoading(true);
      try {
        const households = await Api.fetchHouseholds();
        
        if (import.meta.env.DEV) {
          console.log("[HS] fetchHouseholds resolved: isArray=", Array.isArray(households), "length=", households.length);
          console.log("[HS] After fetch: total households =", households.length);
        }
        
        if (cancelled) {
          if (import.meta.env.DEV) {
            console.log("[HS] cancelled after fetch, skipping state updates");
          }
          return;
        }
        
        if (import.meta.env.DEV) {
          console.log("[HS] setAvailableHouseholds: setting", households.length, "households");
          if (households.length > 0) {
            console.log("[HS] Sample household:", households[0]);
          }
        }
        
        setAvailableHouseholds(households);
        loadedRef.current = true; // ✅ Only set after successful state update, inside !cancelled block
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[HS] CATCH block: error=", error);
        }
        
        // ✅ Ignore AbortError (expected on cleanup)
        if ((error as Error).name === 'AbortError') {
          if (import.meta.env.DEV) {
            console.log("[HS] Request aborted (cleanup)");
          }
          return;
        }
        
        if (cancelled) {
          if (import.meta.env.DEV) {
            console.log("[HS] cancelled in catch, skipping error state updates");
          }
          return;
        }
        
        console.error("❌ Failed to load households:", error);
        setAvailableHouseholds([]);
        // Don't set loadedRef on error - allow retry
      } finally {
        inFlightRef.current = false; // ✅ Clear in-flight flag regardless of outcome
        if (import.meta.env.DEV) {
          console.log("[HS] FINALLY block: cancelled=", cancelled);
        }
        // ✅ ALWAYS clear loading state, even if cancelled (prevents stuck loading in StrictMode)
        if (import.meta.env.DEV) {
          console.log("[HS] finally: setLoading(false)");
        }
        setLoading(false);
      }
    };

    loadHouseholds();

    return () => {
      cancelled = true;
      abortController.abort();
      // ✅ CRITICAL: Reset guards so second StrictMode mount can run
      inFlightRef.current = false;
      loadedRef.current = false;
      if (import.meta.env.DEV) {
        console.log("[HS] cleanup: reset inFlightRef and loadedRef for next mount");
      }
    };
  }, []); // ✅ Empty deps - only run on mount

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
  }, [inviteContext?.clickedHouseholdId, cameFromDiscovery, selection.selectedIds, selection.toggleHousehold, availableHouseholds.length]);

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

  // Helper to get kids with age and gender info
  const getKidsData = (household: GGHousehold): Array<{ age: number; sex?: string | null }> => {
    if (!household.kids || household.kids.length === 0) return [];
    
    const today = new Date();
    return household.kids
      .filter(kid => kid.birthYear && kid.birthMonth)
      .map(kid => {
        const birthDate = new Date(kid.birthYear!, (kid.birthMonth || 1) - 1);
        const ageInMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        const age = Math.floor(ageInMonths / 12);
        return { age, sex: kid.sex };
      })
      .sort((a, b) => b.age - a.age);
  };

  // Helper to format gender suffix matching Discovery behavior
  const getGenderSuffix = (sex?: string | null): string => {
    const s = (sex || "").trim().toLowerCase();
    if (s === "female" || s === "girl" || s === "f") return "Girl";
    if (s === "male" || s === "boy" || s === "m") return "Boy";
    return "";
  };

  // Helper to normalize kid gender (mirrors Discovery logic)
  const normalizeKidGender = (sex?: string | null): 'girl' | 'boy' | null => {
    const s = (sex || "").trim().toLowerCase();
    if (!s) return null;
    if (s === "girl" || s === "female" || s === "f") return "girl";
    if (s === "boy" || s === "male" || s === "m") return "boy";
    return null;
  };

  // Helper to check if age is in filter range
  const isAgeInFilterRange = (age: number): boolean => {
    const ageRange = inviteContext?.filterContext?.ageRange;
    if (!ageRange) return true; // No filter = matches all
    return age >= ageRange.min && age <= ageRange.max;
  };

  // Helper to check if kid matches gender filter
  const isGenderMatch = (sex?: string | null): boolean => {
    const genderFilter = inviteContext?.filterContext?.kidsGenderFilter || 'all';
    if (genderFilter === 'all') return true;
    
    const normalizedGender = normalizeKidGender(sex);
    if (genderFilter === 'girls') return normalizedGender === 'girl';
    if (genderFilter === 'boys') return normalizedGender === 'boy';
    return true;
  };

  // Helper to check if kid matches ALL active filters
  const isKidMatch = (age: number, sex?: string | null): boolean => {
    return isAgeInFilterRange(age) && isGenderMatch(sex);
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

  // ✅ FIX #2: Smart 4-tier sorting using ?? for distance (handles 0, null, undefined)
  const sortedHouseholds = useMemo(() => {
    const clicked = inviteContext?.clickedHouseholdId;

    return [...displayedHouseholds].sort((a, b) => {
      // 1. Already invited households always first
      const aIsInvited = existingInvitedIds.has(a.id || '');
      const bIsInvited = existingInvitedIds.has(b.id || '');
      if (aIsInvited && !bIsInvited) return -1;
      if (!aIsInvited && bIsInvited) return 1;

      // 2. Clicked household next
      if (a.id === clicked) return -1;
      if (b.id === clicked) return 1;

      // 3. Suggested (from visibleSet) next
      const aIsSuggested = visibleSet.has(a.id || '');
      const bIsSuggested = visibleSet.has(b.id || '');
      if (aIsSuggested && !bIsSuggested) return -1;
      if (!aIsSuggested && bIsSuggested) return 1;

      // 4. Within same group: sort by distance (✅ using ?? to handle 0, null, undefined)
      const aDist = (a as any).distance ?? 999;
      const bDist = (b as any).distance ?? 999;
      return aDist - bDist;
    });
  }, [displayedHouseholds, inviteContext?.clickedHouseholdId, visibleSet, existingInvitedIds]);

  // ✅ Group households: suggested vs others (single source of truth: visibleSet)
  const suggestedHouseholds = sortedHouseholds.filter(
    h => h.id === inviteContext?.clickedHouseholdId || visibleSet.has(h.id || '')
  );
  const otherHouseholds = sortedHouseholds.filter(
    h => h.id !== inviteContext?.clickedHouseholdId && !visibleSet.has(h.id || '')
  );
  
  if (import.meta.env.DEV) {
    console.log('[HS] After filtering:', {
      suggestedHouseholds_length: suggestedHouseholds.length,
      otherHouseholds_length: otherHouseholds.length,
      visibleSet_size: visibleSet.size,
    });
  }
  
  const hasSuggestions = cameFromDiscovery && 
                        inviteContext?.filterContext?.hasFilters && 
                        suggestedHouseholds.length > 0;

  const shouldShowSections = availableHouseholds.length >= 30;

  const isSuggested = (householdId: string) => {
    return householdId === inviteContext?.clickedHouseholdId || visibleSet.has(householdId);
  };

  // ✅ Determine default visible households: matches when filters active, all otherwise
  const defaultVisibleHouseholds = useMemo(() => {
    if (hasSuggestions) {
      // When filters are active, default to showing only matches
      return suggestedHouseholds;
    }
    // No filters: show all households
    return sortedHouseholds;
  }, [hasSuggestions, suggestedHouseholds, sortedHouseholds]);

  // ✅ DEV: Log render-time state to diagnose loading issue
  if (import.meta.env.DEV) {
    console.log("[HS RENDER]", {
      loading,
      availableHouseholds_length: availableHouseholds.length,
      displayedHouseholds_length: displayedHouseholds.length,
      sortedHouseholds_length: sortedHouseholds.length,
      suggestedHouseholds_length: suggestedHouseholds.length,
      otherHouseholds_length: otherHouseholds.length,
      shouldShowSections,
      hasSuggestions,
      visibleSet_size: visibleSet.size,
      defaultVisibleHouseholds_length: defaultVisibleHouseholds.length,
      willTakeLargeBranch: shouldShowSections && visibleSet.size > 0,
      willTakeSmallBranch: !(shouldShowSections && visibleSet.size > 0),
    });
    
    // Additional debug: log IDs for verification
    console.log("[HS ARRAYS]", {
      suggestedHouseholdIds: suggestedHouseholds.map(h => h.id),
      defaultVisibleHouseholdIds: defaultVisibleHouseholds.map(h => h.id),
      matchIds: selection.matchIds,
    });
  }

  // ✅ DEV: Log branch decision
  if (import.meta.env.DEV) {
    const takingLargeBranch = shouldShowSections && visibleSet.size > 0;
    console.log("[HS BRANCH DECISION]", {
      takingLargeBranch,
      shouldShowSections,
      visibleSetSize: visibleSet.size,
      hasSuggestions,
      cameFromDiscovery,
      hasFiltersInContext: inviteContext?.filterContext?.hasFilters,
      renderingArray: takingLargeBranch ? "suggestedHouseholds (large branch)" : "defaultVisibleHouseholds (small branch)"
    });
  }

  const renderHouseholdCard = (household: GGHousehold, isRecommended: boolean = false) => {
    const householdId = household.id;
    if (!householdId) return null;
    
    const kidsAges = getKidsAges(household);
    const isClickedHousehold = selection.clickedIds.has(householdId);
    const isSelected = selection.selectedIds.has(householdId);
    
    // Determine border and background based on state priority: selected > recommended > default
    let borderColor = '#e2e8f0';  // Default neutral
    let backgroundColor = '#fff';  // Default white
    let boxShadow = 'none';
    
    if (isSelected) {
      // Selected state (strongest)
      borderColor = '#3b82f6';     // Blue border
      backgroundColor = '#eff6ff';  // Blue background
    } else if (isRecommended) {
      // Matched/recommended state (Discovery-like highlight)
      borderColor = '#10b981';      // Green border (Discovery hover color)
      backgroundColor = '#fff';      // White background
      boxShadow = '0 4px 12px rgba(16, 185, 129, 0.12)';  // Subtle green shadow
    }
    
    return (
      <label
        key={householdId}
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "16px",
          border: `2px solid ${borderColor}`,
          borderRadius: "12px",
          cursor: "pointer",
          backgroundColor: backgroundColor,
          boxShadow: boxShadow,
          transition: "all 0.2s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = "#f8fafc";
            if (isRecommended) {
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.15)';
            }
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = backgroundColor;
            if (isRecommended) {
              e.currentTarget.style.boxShadow = boxShadow;
            }
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
            {existingInvitedIds.has(householdId) && (
              <span style={{
                fontSize: 11,
                padding: "3px 8px",
                borderRadius: 999,
                background: "#f0fdf4",
                border: "1px solid #86efac",
                color: "#166534",
                fontWeight: 600,
              }}>
                Already invited
              </span>
            )}
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
            {isRecommended && !isClickedHousehold && !existingInvitedIds.has(householdId) && (
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

          {/* Household type pill */}
          {(() => {
            const mappedType = mapToHouseholdType(household.householdType);
            if (!mappedType || !HOUSEHOLD_TYPE_META[mappedType]) return null;
            const { Icon, iconColor, iconBg } = HOUSEHOLD_TYPE_META[mappedType];
            return (
              <div style={{ marginBottom: 6 }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 6,
                    background: iconBg,
                    color: iconColor,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <Icon size={12} />
                  {mappedType}
                </div>
              </div>
            );
          })()}

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
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 3 }}>
                Kids:
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {getKidsData(household).map((kid, idx) => {
                  const genderSuffix = getGenderSuffix(kid.sex);
                  const kidMatches = isKidMatch(kid.age, kid.sex);
                  
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: kidMatches ? '#10b981' : '#f3f4f6',
                        border: kidMatches ? '2px solid #059669' : '1px solid rgba(15,23,42,0.10)',
                        fontSize: 12,
                        fontWeight: kidMatches ? 700 : 600,
                        color: kidMatches ? '#ffffff' : '#6b7280',
                        boxShadow: kidMatches ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                        transform: kidMatches ? 'scale(1.05)' : 'scale(1)',
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
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </label>
    );
  };

  return (
    <div className="gg-card-section">
      {/* ✅ DEV: Debug state display */}
      {import.meta.env.DEV && (
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontFamily: "monospace" }}>
          [DEBUG] loading={String(loading)} households={availableHouseholds?.length ?? 0}
        </div>
      )}
      
      {/* Section header: In-app delivery */}
      {!hideSectionHeaders && (
        <div className="gg-label" style={{ marginBottom: 12 }}>
          Invite on GatherGrove
        </div>
      )}
      
      <div className="gg-label">
        Who to invite ({selection.selectedIds.size} selected{existingInvitedIds.size > 0 ? `, ${existingInvitedIds.size} already invited` : ''})
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
          <div style={{ color: "#94a3b8", marginBottom: 8 }}>No neighbors available yet</div>
          <div style={{ fontSize: 12, color: "#cbd5e1" }}>
            Invite someone to get started.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "12px" }}>
          {/* ✅ Single list if <30 households, sectioned if >=30 */}
          {/* ✅ FIX: Only use sections if we have actual suggestions (visibleSet not empty) */}
          {shouldShowSections && visibleSet.size > 0 ? (
            // Large list (30+) WITH suggestions: show sections
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
            // ✅ When filters active: default to showing only matches, with expandable access to others
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
              
              {/* Show default visible households (matches when filters active, all otherwise) */}
              {defaultVisibleHouseholds.map(h => renderHouseholdCard(h, isSuggested(h.id || '')))}
              
              {/* When filters active and there are other households, show expand button */}
              {hasSuggestions && otherHouseholds.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowOthers(!showOthers)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      marginTop: 8,
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
                  
                  {showOthers && otherHouseholds.map(h => renderHouseholdCard(h, false))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
