// src/components/HouseholdSelector.tsx
import { useEffect, useState, useMemo, useRef } from "react";
import * as Api from "../lib/api";
import type { GGHousehold } from "../lib/api";

// ✅ Simplified InviteContext - removed suggestedHouseholds (single source of truth)
interface InviteContext {
  clickedHouseholdId: string;
  clickedHouseholdName: string;
  visibleHouseholdIds?: string[]; // ✅ The actual filtered list from Discovery
  filterContext?: {
    types: string[];
    ageRange: { min: number; max: number } | null;
    hasFilters: boolean;
  };
}

interface HouseholdSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelectedNamesChange?: (names: string[]) => void;
  inviteContext?: InviteContext;
  selectedPhoneNumbers?: Set<string>;
  onPhoneNumbersChange?: (numbers: Set<string>) => void;
  eventInviteLink?: string; // ✅ Pass from parent after event is created
  eventTitle?: string;
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
}: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  
  // ✅ Track initialization to prevent repeated preselect
  const initRef = useRef<string | null>(null);

  // ✅ Normalize visibleHouseholdIds to Set once
  const visibleSet = useMemo(
    () => new Set(inviteContext?.visibleHouseholdIds || []),
    [inviteContext?.visibleHouseholdIds]
  );

  // ✅ Check if user came from Discovery (by checking if inviteContext exists)
  const cameFromDiscovery = !!inviteContext?.clickedHouseholdId;

  // Update parent with selected household names whenever selection changes
  useEffect(() => {
    if (onSelectedNamesChange && availableHouseholds.length > 0) {
      const names = Array.from(selectedIds)
        .map(id => availableHouseholds.find(h => h.id === id))
        .filter((h): h is GGHousehold => h !== undefined)
        .map(h => h.lastName || "Unknown Household");
      onSelectedNamesChange(names);
    }
  }, [selectedIds, availableHouseholds, onSelectedNamesChange]);

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
        
        setAvailableHouseholds(mockHouseholds);
        
        // const households = await Api.fetchHouseholds();
        // console.log("✅ Fetched households:", households.length);
        // setAvailableHouseholds(households);
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

    // If nothing selected → set clicked
    if (selectedIds.size === 0) {
      onSelectionChange(new Set([clicked]));
      return;
    }

    // If some selected → add clicked (if not already there)
    if (!selectedIds.has(clicked)) {
      const next = new Set(selectedIds);
      next.add(clicked);
      onSelectionChange(next);
    }
  }, [inviteContext?.clickedHouseholdId, cameFromDiscovery, onSelectionChange, availableHouseholds.length]);

  const toggleHousehold = (householdId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(householdId)) {
      newSet.delete(householdId);
    } else {
      newSet.add(householdId);
    }
    onSelectionChange(newSet);
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
      .sort((a, b) => b - a);
  };

  const selectAll = () => {
    const allIds = new Set(availableHouseholds.map(h => h.id).filter((id): id is string => !!id));
    onSelectionChange(allIds);
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
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
    selectedIds.size === availableHouseholds.filter(h => h.id).length;

  // ✅ FIX #2: Smart 3-tier sorting using ?? for distance (handles 0, null, undefined)
  const sortedHouseholds = useMemo(() => {
    const clicked = inviteContext?.clickedHouseholdId;

    return [...availableHouseholds].sort((a, b) => {
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
  }, [availableHouseholds, inviteContext?.clickedHouseholdId, visibleSet]);

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
    const isClickedHousehold = householdId === inviteContext?.clickedHouseholdId;
    const isSelected = selectedIds.has(householdId);
    
    return (
      <label
        key={householdId}
        onClick={() => toggleHousehold(householdId)} // ✅ Clicking card toggles
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
        {/* ✅ FIX #1: ReadOnly checkbox that toggles via label click */}
        <input
          type="checkbox"
          checked={isSelected}
          readOnly
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
      <div className="gg-label">
        Who to invite ({selectedIds.size} selected)
      </div>
      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#64748b", fontSize: "14px" }}>
          {hasSuggestions 
            ? `Based on your filters in Discovery`
            : `Select households to invite to this event`}
        </div>
        {!loading && availableHouseholds.length > 0 && (
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={selectAll}
              disabled={allSelected}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
                color: allSelected ? "#94a3b8" : "#2563eb",
                background: "transparent",
                border: "1px solid",
                borderColor: allSelected ? "#e2e8f0" : "#bfdbfe",
                borderRadius: "6px",
                cursor: allSelected ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: allSelected ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!allSelected) {
                  e.currentTarget.style.background = "#eff6ff";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Select All
            </button>
            <button
              type="button"
              onClick={deselectAll}
              disabled={selectedIds.size === 0}
              style={{
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: "600",
                color: selectedIds.size === 0 ? "#94a3b8" : "#dc2626",
                background: "transparent",
                border: "1px solid",
                borderColor: selectedIds.size === 0 ? "#e2e8f0" : "#fecaca",
                borderRadius: "6px",
                cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: selectedIds.size === 0 ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (selectedIds.size > 0) {
                  e.currentTarget.style.background = "#fef2f2";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              Clear All
            </button>
          </div>
        )}
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

      {/* NEW: Share invite section (works everywhere!) */}
      <div style={{ 
        marginTop: 24, 
        paddingTop: 24, 
        borderTop: "2px solid #e5e7eb" 
      }}>
        <div style={{ 
          fontSize: 14, 
          fontWeight: 600, 
          color: "#1e293b",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          � Invite Anyone
        </div>
        
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
          Share your event with neighbors, friends, or family — they can RSVP without creating an account.
        </div>

        {/* ✅ FIX #4: Always show Share section, but disable if no link */}
        {!eventInviteLink && (
          <div style={{
            padding: "12px 14px",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: 8,
            fontSize: 13,
            color: "#92400e",
            marginBottom: 12,
          }}>
            💡 <strong>Save your event first</strong> to generate the invite link
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            onClick={shareInvite}
            disabled={!eventInviteLink}
            style={{
              padding: "14px 16px",
              background: eventInviteLink ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : "#e5e7eb",
              color: eventInviteLink ? "white" : "#94a3b8",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              cursor: eventInviteLink ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: eventInviteLink ? "0 3px 10px rgba(16, 185, 129, 0.3)" : "none",
              opacity: eventInviteLink ? 1 : 0.6,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share…
            {eventInviteLink && (
              <span style={{ 
                fontSize: 11, 
                background: "rgba(255, 255, 255, 0.25)",
                padding: "2px 8px",
                borderRadius: 6,
              }}>
                recommended
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={sendViaSMS}
            disabled={!eventInviteLink}
            style={{
              padding: "12px 16px",
              background: "white",
              color: eventInviteLink ? "#059669" : "#94a3b8",
              border: `2px solid ${eventInviteLink ? "#10b981" : "#e5e7eb"}`,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: eventInviteLink ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: eventInviteLink ? 1 : 0.6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Send Text
          </button>

          <button
            type="button"
            onClick={copyInviteLink}
            disabled={!eventInviteLink}
            style={{
              padding: "12px 16px",
              background: "white",
              color: eventInviteLink ? "#64748b" : "#94a3b8",
              border: `1px solid ${eventInviteLink ? "#e2e8f0" : "#e5e7eb"}`,
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: eventInviteLink ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: eventInviteLink ? 1 : 0.6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy Link
          </button>
        </div>

        {/* How it works */}
        <div style={{
          marginTop: 16,
          padding: "12px 14px",
          background: "#eff6ff",
          borderRadius: 10,
          fontSize: 12,
          color: "#1e40af",
          lineHeight: 1.5
        }}>
          <strong>✨ Works everywhere:</strong>
          <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
            <li><strong>Share…</strong> opens your device's share menu (Messages, WhatsApp, email, etc.)</li>
            <li><strong>Send Text</strong> opens your messaging app with pre-filled invite</li>
            <li><strong>Copy Link</strong> copies the link so you can paste anywhere</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
