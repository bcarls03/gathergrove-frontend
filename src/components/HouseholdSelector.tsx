// src/components/HouseholdSelector.tsx
import { useEffect, useState } from "react";
import * as Api from "../lib/api";
import type { GGHousehold } from "../lib/api";

interface SuggestedHousehold {
  id: string;
  name: string;
  neighborhood: string | null;
  householdType: string | null;
  kidsAges: number[];
  kids: any[];
}

interface InviteContext {
  clickedHouseholdId: string;
  clickedHouseholdName: string;
  suggestedHouseholds: SuggestedHousehold[];
  filterContext: {
    types: string[];
    ageRange: { min: number; max: number } | null;
    hasFilters: boolean;
  };
}

interface HouseholdSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  inviteContext?: InviteContext; // Pass invite context from navigation state
}

export function HouseholdSelector({ 
  selectedIds, 
  onSelectionChange,
  inviteContext 
}: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => {
    const loadHouseholds = async () => {
      setLoading(true);
      try {
        const households = await Api.fetchHouseholds();
        setAvailableHouseholds(households);

        // If we have invite context, pre-select ONLY the clicked household
        if (inviteContext?.clickedHouseholdId) {
          onSelectionChange(new Set([inviteContext.clickedHouseholdId]));
        }
      } catch (error) {
        console.error("Failed to load households:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHouseholds();
  }, [inviteContext, onSelectionChange]);

  const toggleHousehold = (householdId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(householdId)) {
      newSet.delete(householdId);
    } else {
      newSet.add(householdId);
    }
    onSelectionChange(newSet);
  };

  const getHouseholdName = (household: GGHousehold): string => {
    return household.lastName || "Unknown Household";
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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 3958.8; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceText = (household: GGHousehold): string | null => {
    const userLat = 45.5152;
    const userLon = -122.6784;
    
    const lat = (household as any).latitude;
    const lon = (household as any).longitude;
    
    if (lat && lon) {
      const distance = calculateDistance(userLat, userLon, lat, lon);
      const isZipOnly = household.location_precision === 'zipcode';
      
      if (distance < 0.1) {
        return isZipOnly ? '< 0.1 miles*' : '< 0.1 miles';
      }
      return isZipOnly ? `~${distance.toFixed(1)} miles*` : `~${distance.toFixed(1)} miles`;
    }
    return null;
  };

  const getAdultsText = (household: GGHousehold): string | null => {
    if (!household.adultNames || household.adultNames.length === 0) return null;
    return household.adultNames.join(', ');
  };

  const selectAll = () => {
    const allIds = new Set(availableHouseholds.map(h => h.id).filter((id): id is string => !!id));
    onSelectionChange(allIds);
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  // Share/invite helpers (works on iOS + Android + Desktop)
  const shareInvite = async (inviteLink: string, eventTitle: string) => {
    const shareText = `You're invited to "${eventTitle}" on GatherGrove! 🎉\n\nRSVP here: ${inviteLink}`;
    
    // Try native share (works on mobile + modern desktop)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invite to ${eventTitle}`,
          text: shareText,
        });
        return true;
      } catch (error: any) {
        // User cancelled or error - fall through to alternatives
        if (error.name !== 'AbortError') {
          console.log('Share failed:', error);
        }
      }
    }
    
    return false; // Share not available or failed
  };

  const sendViaSMS = (inviteLink: string, eventTitle: string) => {
    const message = `You're invited to "${eventTitle}" on GatherGrove! 🎉\n\nRSVP: ${inviteLink}`;
    const smsLink = `sms:?body=${encodeURIComponent(message)}`;
    window.open(smsLink, '_blank');
  };

  const copyInviteLink = async (inviteLink: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert('✅ Link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('✅ Link copied to clipboard!');
      } catch (err) {
        alert('❌ Could not copy link. Please copy manually:\n\n' + inviteLink);
      }
      document.body.removeChild(textArea);
    }
  };

  const allSelected = availableHouseholds.length > 0 && 
    selectedIds.size === availableHouseholds.filter(h => h.id).length;

  // Helper to get calculated distance for sorting
  const getCalculatedDistance = (household: GGHousehold): number => {
    const userLat = 45.5152;
    const userLon = -122.6784;
    const lat = (household as any).latitude;
    const lon = (household as any).longitude;
    
    if (lat && lon) {
      return calculateDistance(userLat, userLon, lat, lon);
    }
    return Infinity; // Put households without location at the end
  };

  // Sort households by distance
  const sortedByDistance = [...availableHouseholds].sort((a, b) => {
    return getCalculatedDistance(a) - getCalculatedDistance(b);
  });

  // Group households into suggested vs others
  const suggestedIds = new Set(inviteContext?.suggestedHouseholds?.map(h => h.id) || []);
  const suggestedHouseholds = sortedByDistance.filter(h => suggestedIds.has(h.id || ''));
  const otherHouseholds = sortedByDistance.filter(h => !suggestedIds.has(h.id || ''));
  
  const hasSuggestions = inviteContext?.filterContext?.hasFilters && suggestedHouseholds.length > 0;

  const renderHouseholdCard = (household: GGHousehold) => {
    const householdId = household.id;
    if (!householdId) return null;
    
    const kidsAges = getKidsAges(household);
    const adultsText = getAdultsText(household);
    const distanceText = getDistanceText(household);
    
    return (
      <label
        key={householdId}
        style={{
          display: "flex",
          alignItems: "flex-start",
          padding: "16px",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          cursor: "pointer",
          backgroundColor: selectedIds.has(householdId) ? "#f0fdf4" : "#fff",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!selectedIds.has(householdId)) {
            e.currentTarget.style.backgroundColor = "#f8fafc";
          }
        }}
        onMouseLeave={(e) => {
          if (!selectedIds.has(householdId)) {
            e.currentTarget.style.backgroundColor = "#fff";
          }
        }}
      >
        <input
          type="checkbox"
          checked={selectedIds.has(householdId)}
          onChange={() => toggleHousehold(householdId)}
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
          {/* Header with name and distance */}
          <div style={{ marginBottom: "8px" }}>
            <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px", marginBottom: "4px" }}>
              {getHouseholdName(household)}
            </div>
            {distanceText && (
              <div style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
                📍 {distanceText}
              </div>
            )}
            {household.neighborhood && (
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                {household.neighborhood}
              </div>
            )}
          </div>

          {/* Adults */}
          {adultsText && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                Adults:
              </div>
              <div style={{ fontSize: "13px", color: "#374151" }}>
                {adultsText}
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
        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
          Loading households...
        </div>
      ) : availableHouseholds.length === 0 ? (
        <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
          No households available
        </div>
      ) : (
        <div style={{ marginTop: "12px" }}>
          {/* Suggested Section (if we have suggestions from filters) */}
          {hasSuggestions && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#059669",
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <span style={{ fontSize: 16 }}>✨</span>
                Suggested ({suggestedHouseholds.length})
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {suggestedHouseholds.map(renderHouseholdCard)}
              </div>
            </div>
          )}
          
          {/* Other Households (collapsed by default if we have suggestions) */}
          {otherHouseholds.length > 0 && (
            <div>
              {hasSuggestions && (
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
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                >
                  <span>Other nearby households ({otherHouseholds.length})</span>
                  <span style={{ fontSize: 11 }}>{showOthers ? '▲' : '▼'}</span>
                </button>
              )}
              
              {(showOthers || !hasSuggestions) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {otherHouseholds.map(renderHouseholdCard)}
                </div>
              )}
            </div>
          )}
          
          {/* Distance accuracy note */}
          <div style={{
            marginTop: 16,
            padding: '8px 12px',
            background: '#f8fafc',
            borderRadius: 8,
            fontSize: 11,
            color: '#64748b',
            lineHeight: 1.4
          }}>
            <strong>*</strong> Distance is approximate (based on ZIP code only). Neighbors with full addresses show more accurate distances.
          </div>
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

        {/* Three action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Share button (uses native share sheet on mobile) */}
          <button
            type="button"
            onClick={() => {
              const inviteLink = window.location.href;
              const eventTitle = "GatherGrove Event";
              shareInvite(inviteLink, eventTitle);
            }}
            style={{
              padding: "14px 16px",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              border: "none",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              boxShadow: "0 3px 10px rgba(16, 185, 129, 0.3)",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 5px 15px rgba(16, 185, 129, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 3px 10px rgba(16, 185, 129, 0.3)";
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            Share…
            <span style={{ 
              fontSize: 11, 
              fontWeight: 600, 
              background: "rgba(255, 255, 255, 0.25)",
              padding: "2px 8px",
              borderRadius: 6,
              color: "white"
            }}>
              recommended
            </span>
          </button>

          {/* Send Text button */}
          <button
            type="button"
            onClick={() => {
              const inviteLink = window.location.href;
              const eventTitle = "GatherGrove Event";
              sendViaSMS(inviteLink, eventTitle);
            }}
            style={{
              padding: "12px 16px",
              background: "white",
              color: "#059669",
              border: "2px solid #10b981",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f0fdf4";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Send Text
          </button>

          {/* Copy Link button */}
          <button
            type="button"
            onClick={() => {
              const inviteLink = window.location.href;
              copyInviteLink(inviteLink);
            }}
            style={{
              padding: "12px 16px",
              background: "white",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.15s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f8fafc";
              e.currentTarget.style.borderColor = "#cbd5e1";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.borderColor = "#e2e8f0";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
