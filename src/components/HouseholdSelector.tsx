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
  selectedPhoneNumbers?: Set<string>;  // NEW: For off-platform invites
  onPhoneNumbersChange?: (phones: Set<string>) => void;  // NEW
  inviteContext?: InviteContext; // Pass invite context from navigation state
}

export function HouseholdSelector({ 
  selectedIds, 
  onSelectionChange,
  selectedPhoneNumbers = new Set(),  // NEW: Default to empty set
  onPhoneNumbersChange,  // NEW
  inviteContext 
}: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  
  // NEW: Phone number input state
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneError, setPhoneError] = useState("");

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

  // NEW: Contact Picker API handler
  const pickFromContacts = async () => {
    try {
      // Check if Contact Picker API is available
      if (!('contacts' in navigator)) {
        alert('Contact picker is not supported on this device. Please enter the phone number manually.');
        return;
      }

      // @ts-ignore - ContactsManager API not in TypeScript types yet
      const contacts = await navigator.contacts.select(['tel'], { multiple: true });
      
      // Process each selected contact
      contacts.forEach((contact: any) => {
        if (contact.tel && contact.tel.length > 0) {
          // Add the first phone number from the contact
          const phoneNumber = contact.tel[0];
          const cleaned = phoneNumber.replace(/\D/g, '');
          
          if (cleaned.length === 10 || cleaned.length === 11) {
            const formatted = cleaned.length === 10 
              ? `+1${cleaned}`
              : `+${cleaned}`;
            
            if (!selectedPhoneNumbers.has(formatted)) {
              const newSet = new Set(selectedPhoneNumbers);
              newSet.add(formatted);
              onPhoneNumbersChange?.(newSet);
            }
          }
        }
      });
    } catch (error) {
      // User cancelled or error occurred
      console.log('Contact picker cancelled or error:', error);
    }
  };

  // NEW: Phone number handlers
  const addPhoneNumber = () => {
    if (!onPhoneNumbersChange) return;
    
    // Remove all non-digits
    const cleaned = phoneInput.replace(/\D/g, '');
    
    // Validate length (10 digits for US)
    if (cleaned.length !== 10) {
      setPhoneError("Please enter a valid 10-digit phone number");
      return;
    }
    
    // Format as E.164 (+1 for US)
    const formatted = `+1${cleaned}`;
    
    // Check for duplicates
    if (selectedPhoneNumbers.has(formatted)) {
      setPhoneError("This number has already been added");
      return;
    }
    
    // Add to set
    const newSet = new Set(selectedPhoneNumbers);
    newSet.add(formatted);
    onPhoneNumbersChange(newSet);
    
    // Clear input
    setPhoneInput("");
    setPhoneError("");
  };

  const removePhoneNumber = (phone: string) => {
    if (!onPhoneNumbersChange) return;
    const newSet = new Set(selectedPhoneNumbers);
    newSet.delete(phone);
    onPhoneNumbersChange(newSet);
  };

  const formatPhoneForDisplay = (e164: string): string => {
    // Convert +15551234567 to (555) 123-4567
    const digits = e164.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      const areaCode = digits.slice(1, 4);
      const prefix = digits.slice(4, 7);
      const line = digits.slice(7, 11);
      return `(${areaCode}) ${prefix}-${line}`;
    }
    return e164;
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

      {/* NEW: Off-platform invitation section */}
      {onPhoneNumbersChange && (
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
            📱 Invite People Not on GatherGrove
            <span style={{ 
              fontSize: 11, 
              fontWeight: 500, 
              color: "#64748b",
              background: "#f1f5f9",
              padding: "2px 6px",
              borderRadius: 4
            }}>
              Optional
            </span>
          </div>
          
          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
            Send a text message with event details. They can RSVP without creating an account.
          </div>

          {/* Phone number input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addPhoneNumber()}
              style={{
                flex: 1,
                padding: "8px 12px",
                border: phoneError ? "1px solid #ef4444" : "1px solid #e2e8f0",
                borderRadius: 8,
                fontSize: 14
              }}
            />
            <button
              type="button"
              onClick={pickFromContacts}
              style={{
                padding: "8px 16px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(16, 185, 129, 0.3)";
              }}
              title="Pick from your phone contacts"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                <line x1="12" y1="18" x2="12.01" y2="18"></line>
              </svg>
              Contacts
            </button>
            <button
              type="button"
              onClick={addPhoneNumber}
              style={{
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              Add
            </button>
          </div>

          {phoneError && (
            <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 8 }}>
              {phoneError}
            </div>
          )}

          {/* Selected phone numbers */}
          {selectedPhoneNumbers.size > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
              {Array.from(selectedPhoneNumbers).map(phone => (
                <div
                  key={phone}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "#f0fdf4",
                    border: "1px solid #d1fae5",
                    borderRadius: 8
                  }}
                >
                  <span style={{ fontSize: 13, color: "#047857" }}>
                    {formatPhoneForDisplay(phone)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePhoneNumber(phone)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#dc2626",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: 4
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Privacy/delivery explanation */}
          <div style={{
            marginTop: 12,
            padding: "8px 12px",
            background: "#eff6ff",
            borderRadius: 8,
            fontSize: 11,
            color: "#1e40af",
            lineHeight: 1.4
          }}>
            <strong>How delivery works:</strong>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 16 }}>
              <li>Members on GatherGrove receive in-app notifications</li>
              <li>Non-members receive a text message with RSVP link</li>
              <li>Phone numbers are used only for this event invitation</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
