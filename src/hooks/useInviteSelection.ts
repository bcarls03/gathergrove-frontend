// src/hooks/useInviteSelection.ts
import { useState, useCallback, useMemo, useEffect } from 'react';
import type { GGHousehold } from '../lib/api';

/**
 * Layered bulk-selection hook for invite recipients.
 * Supports 3 independent selection layers: clicked, matches, additional
 * Plus manual checkbox selections that persist across layer changes.
 */

type BulkAction = 'clicked' | 'matches' | 'additional' | 'all';

export interface InviteSelectionState {
  selectedIds: Set<string>;
  clickedIds: Set<string>;
  activeBulkActions: Set<BulkAction>;
  toggleHousehold: (id: string) => void;
  toggleClickedLayer: () => void;
  toggleMatchesLayer: () => void;
  toggleAdditionalLayer: () => void;
  selectAll: () => void;
  clearAll: () => void;
  matchIds: string[];
  additionalIds: string[];
  allIds: string[];
}

export interface UseInviteSelectionOptions {
  households: GGHousehold[];
  matchingHouseholdIds?: string[];
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export function useInviteSelection({
  households,
  matchingHouseholdIds = [],
  selectedIds,
  onSelectionChange,
}: UseInviteSelectionOptions): InviteSelectionState {
  // Track manually clicked households (history for Clicked layer)
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set());
  
  // Track manual checkbox selections (independent of layers)
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set());
  
  // Track which layers are active
  const [activeBulkActions, setActiveBulkActions] = useState<Set<BulkAction>>(new Set());

  const matchIds = useMemo(() => {
    const visibleIds = new Set(households.map(h => h.id).filter((id): id is string => !!id));
    return matchingHouseholdIds.filter(id => visibleIds.has(id));
  }, [households, matchingHouseholdIds]);

  const allIds = useMemo(() => {
    return households.map(h => h.id).filter((id): id is string => !!id);
  }, [households]);

  const additionalIds = useMemo(() => {
    const matchSet = new Set(matchIds);
    return allIds.filter(id => !matchSet.has(id));
  }, [allIds, matchIds]);

  // Clean up clickedIds and manualSelectedIds when households change
  useEffect(() => {
    const visibleIds = new Set(allIds);
    setClickedIds(prev => {
      const filtered = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
    setManualSelectedIds(prev => {
      const filtered = new Set(Array.from(prev).filter(id => visibleIds.has(id)));
      return filtered.size !== prev.size ? filtered : prev;
    });
  }, [allIds]);

  // Auto-activate clicked layer on initial load if clickedIds exist
  useEffect(() => {
    if (clickedIds.size > 0 && !activeBulkActions.has('clicked')) {
      setActiveBulkActions(prev => new Set(prev).add('clicked'));
    }
  }, [clickedIds.size]); // Only run when clickedIds.size changes

  // Recompute selection whenever layers or manual selection change
  useEffect(() => {
    const result = new Set<string>();
    
    // Always include manual selections
    manualSelectedIds.forEach(id => result.add(id));
    
    // Layer: clicked button active (adds clickedIds history)
    if (activeBulkActions.has('clicked')) {
      clickedIds.forEach(id => result.add(id));
    }
    
    // Layer: matches button active
    if (activeBulkActions.has('matches')) {
      matchIds.forEach(id => result.add(id));
    }
    
    // Layer: additional button active
    if (activeBulkActions.has('additional')) {
      additionalIds.forEach(id => result.add(id));
    }
    
    // Layer: select all button active
    if (activeBulkActions.has('all')) {
      allIds.forEach(id => result.add(id));
    }
    
    // Only call onSelectionChange if selection actually changed
    if (result.size !== selectedIds.size || !Array.from(result).every(id => selectedIds.has(id))) {
      onSelectionChange(result);
    }
  }, [manualSelectedIds, clickedIds, activeBulkActions, matchIds, additionalIds, allIds, selectedIds, onSelectionChange]);

  const toggleHousehold = useCallback((id: string) => {
    // Update clicked history
    setClickedIds(prev => new Set(prev).add(id));
    
    // Toggle manual selection
    setManualSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleClickedLayer = useCallback(() => {
    setActiveBulkActions(prev => {
      const next = new Set(prev);
      if (next.has('clicked')) {
        next.delete('clicked');
      } else {
        next.add('clicked');
      }
      return next;
    });
  }, []);

  const toggleMatchesLayer = useCallback(() => {
    setActiveBulkActions(prev => {
      const next = new Set(prev);
      if (next.has('matches')) {
        next.delete('matches');
      } else {
        next.add('matches');
      }
      return next;
    });
  }, []);

  const toggleAdditionalLayer = useCallback(() => {
    setActiveBulkActions(prev => {
      const next = new Set(prev);
      if (next.has('additional')) {
        next.delete('additional');
      } else {
        next.add('additional');
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setActiveBulkActions(prev => {
      const next = new Set(prev);
      if (next.has('all')) {
        next.delete('all');
      } else {
        next.add('all');
      }
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setManualSelectedIds(new Set());
    setActiveBulkActions(new Set());
    // Keep clickedIds as history
  }, []);

  return {
    selectedIds,
    clickedIds,
    activeBulkActions,
    toggleHousehold,
    toggleClickedLayer,
    toggleMatchesLayer,
    toggleAdditionalLayer,
    selectAll,
    clearAll,
    matchIds,
    additionalIds,
    allIds,
  };
}
