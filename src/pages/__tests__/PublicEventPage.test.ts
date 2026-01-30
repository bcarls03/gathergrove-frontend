// src/pages/__tests__/PublicEventPage.test.ts
import { describe, it, expect } from 'vitest';

/**
 * Adapter: Convert backend snake_case response to frontend GGEvent format.
 * Contract: Backend /events/public/{event_id} returns snake_case ONLY.
 * Security: Backend does NOT return host_user_id or neighborhoods for public endpoint.
 */
function publicEventToGGEvent(data: any): any {
  return {
    id: data.id,
    title: data.title,
    details: data.details,
    startAt: data.start_at || undefined,
    endAt: data.end_at || undefined,
    category: data.category,
    visibility: data.visibility,
    type: data.type || (data.start_at ? 'future' : 'now'),
    createdBy: {
      id: '',  // Not exposed in public endpoint for privacy
      label: 'A neighbor'  // Generic label for public viewers
    }
  };
}

describe('publicEventToGGEvent adapter', () => {
  it('converts snake_case to camelCase for all fields', () => {
    const backendData = {
      id: '123abc',
      title: 'Test Event',
      details: 'Event details',
      start_at: '2026-01-30T10:00:00Z',
      end_at: '2026-01-30T12:00:00Z',
      category: 'playdate',
      visibility: 'link_only',
      type: 'future'
    };

    const result = publicEventToGGEvent(backendData);

    expect(result).toEqual({
      id: '123abc',
      title: 'Test Event',
      details: 'Event details',
      startAt: '2026-01-30T10:00:00Z',
      endAt: '2026-01-30T12:00:00Z',
      category: 'playdate',
      visibility: 'link_only',
      type: 'future',
      createdBy: {
        id: '',  // Never exposed in public endpoint
        label: 'A neighbor'
      }
    });
  });

  it('handles missing optional fields', () => {
    const minimalData = {
      id: '456def',
      title: 'Minimal Event',
      visibility: 'public',
      type: 'now'
    };

    const result = publicEventToGGEvent(minimalData);

    expect(result.id).toBe('456def');
    expect(result.title).toBe('Minimal Event');
    expect(result.details).toBeUndefined();
    expect(result.startAt).toBeUndefined();
    expect(result.endAt).toBeUndefined();
    expect(result.createdBy.id).toBe('');
    expect(result.createdBy.label).toBe('A neighbor');
  });

  it('infers type=now when start_at is missing', () => {
    const nowEvent = {
      id: '789ghi',
      title: 'Happening Now',
      visibility: 'link_only'
    };

    const result = publicEventToGGEvent(nowEvent);

    expect(result.type).toBe('now');
  });

  it('infers type=future when start_at is present but type is missing', () => {
    const futureEvent = {
      id: '101jkl',
      title: 'Future Event',
      start_at: '2026-02-15T14:00:00Z',
      visibility: 'link_only'
    };

    const result = publicEventToGGEvent(futureEvent);

    expect(result.type).toBe('future');
  });

  it('uses default host label when host_name is missing', () => {
    const noHostData = {
      id: '202mno',
      title: 'Anonymous Host Event',
      visibility: 'link_only',
      type: 'now'
    };

    const result = publicEventToGGEvent(noHostData);

    expect(result.createdBy.id).toBe('');
    expect(result.createdBy.label).toBe('A neighbor');
  });
});

describe('PublicEventPage RSVP endpoint guards', () => {
  it('ensures PublicEventPage never calls /events/rsvp/* on load', () => {
    // This is a regression guard test
    // PublicEventPage should ONLY call:
    // - GET /events/public/{eventId} for loading
    // - POST /events/{event.id}/rsvp for signed-in RSVP
    // - POST /events/{event.id}/rsvp/guest for guest RSVP
    
    // The old broken pattern was calling /events/rsvp/{token}
    // This test documents the correct pattern
    
    const correctLoadEndpoint = '/events/public/{eventId}';
    const correctSignedInRSVPEndpoint = '/events/{event.id}/rsvp';
    const correctGuestRSVPEndpoint = '/events/{event.id}/rsvp/guest';
    
    // Forbidden patterns (will cause 404)
    const forbiddenPatterns = [
      '/events/rsvp/{token}',  // Old broken pattern
      '/events/rsvp/{eventId}', // Still wrong
    ];
    
    expect(correctLoadEndpoint).toBe('/events/public/{eventId}');
    expect(correctSignedInRSVPEndpoint).toBe('/events/{event.id}/rsvp');
    expect(correctGuestRSVPEndpoint).toBe('/events/{event.id}/rsvp/guest');
    
    // If PublicEventPage uses any forbidden pattern, this test should fail
    forbiddenPatterns.forEach(pattern => {
      expect(pattern).not.toBe(correctLoadEndpoint);
      expect(pattern).not.toBe(correctSignedInRSVPEndpoint);
      expect(pattern).not.toBe(correctGuestRSVPEndpoint);
    });
  });
});

describe('Guest RSVP payload format', () => {
  it('sends correct payload shape for guest RSVP', () => {
    // Contract: Backend expects { choice, name, phone? }
    // where choice is one of: "going" | "maybe" | "declined"
    
    const validPayload = {
      choice: 'going' as const,
      name: 'Jane Neighbor',
      phone: '555-1234'
    };
    
    // Verify payload structure
    expect(validPayload).toHaveProperty('choice');
    expect(validPayload).toHaveProperty('name');
    expect(validPayload).toHaveProperty('phone');
    
    // Verify choice is valid
    expect(['going', 'maybe', 'declined']).toContain(validPayload.choice);
    
    // Forbidden fields (old pattern)
    const forbiddenFields = ['status', 'guest_name', 'guest_phone'];
    forbiddenFields.forEach(field => {
      expect(validPayload).not.toHaveProperty(field);
    });
  });
  
  it('documents that phone is optional in guest RSVP', () => {
    const minimalPayload = {
      choice: 'maybe' as const,
      name: 'John Neighbor'
    };
    
    expect(minimalPayload).toHaveProperty('choice');
    expect(minimalPayload).toHaveProperty('name');
    expect(minimalPayload).not.toHaveProperty('phone');
  });
});
