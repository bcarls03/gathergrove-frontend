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
  inviteContext?: InviteContext; // NEW: Pass invite context from navigation state
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

  const getKidsInfo = (household: GGHousehold): string => {
    if (!household.kids || household.kids.length === 0) return "No kids listed";
    return `${household.kids.length} kid${household.kids.length !== 1 ? 's' : ''}`;
  };

  const selectAll = () => {
    const allIds = new Set(availableHouseholds.map(h => h.id).filter((id): id is string => !!id));
    onSelectionChange(allIds);
  };

  const deselectAll = () => {
    onSelectionChange(new Set());
  };

  const allSelected = availableHouseholds.length > 0 && 
    selectedIds.size === availableHouseholds.filter(h => h.id).length;

  // Group households into suggested vs others
  const suggestedIds = new Set(inviteContext?.suggestedHouseholds?.map(h => h.id) || []);
  const suggestedHouseholds = availableHouseholds.filter(h => suggestedIds.has(h.id || ''));
  const otherHouseholds = availableHouseholds.filter(h => !suggestedIds.has(h.id || ''));
  
  const hasSuggestions = inviteContext?.filterContext?.hasFilters && suggestedHouseholds.length > 0;

  const renderHouseholdCard = (household: GGHousehold) => {
    const householdId = household.id;
    if (!householdId) return null;
    
    return (
      <label
        key={householdId}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
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
            cursor: "pointer",
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "500", color: "#1e293b" }}>
            {getHouseholdName(household)}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
            {getKidsInfo(household)}
            {household.neighborhood && ` • ${household.neighborhood}`}
          </div>
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
        </div>
      )}
    </div>
  );
}
