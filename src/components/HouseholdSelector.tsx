// src/components/HouseholdSelector.tsx
import { useEffect, useState } from "react";
import * as Api from "../lib/api";
import type { GGHousehold } from "../lib/api";

interface HouseholdSelectorProps {
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}

export function HouseholdSelector({ selectedIds, onSelectionChange }: HouseholdSelectorProps) {
  const [availableHouseholds, setAvailableHouseholds] = useState<GGHousehold[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHouseholds = async () => {
      setLoading(true);
      try {
        const households = await Api.fetchHouseholds();
        setAvailableHouseholds(households);

        // Check if we were redirected from Discovery with a household to invite
        const preSelectedId = localStorage.getItem("invite_household_id");
        if (preSelectedId) {
          onSelectionChange(new Set([preSelectedId]));
          // Clear localStorage after reading
          localStorage.removeItem("invite_household_id");
          localStorage.removeItem("invite_household_name");
        }
      } catch (error) {
        console.error("Failed to load households:", error);
      } finally {
        setLoading(false);
      }
    };

    loadHouseholds();
  }, [onSelectionChange]);

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

  return (
    <div className="gg-card-section">
      <div className="gg-label">
        Who to invite ({selectedIds.size} selected)
      </div>
      <div style={{ marginTop: "8px", color: "#64748b", fontSize: "14px" }}>
        Select households to invite to this event
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
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {availableHouseholds.map((household) => {
            const householdId = household.id;
            if (!householdId) return null; // Skip households without IDs
            
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
          })}
        </div>
      )}
    </div>
  );
}
