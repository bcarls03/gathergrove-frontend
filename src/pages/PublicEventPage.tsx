// src/pages/PublicEventPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Zap } from 'lucide-react';
import { getCurrentUser, auth } from '../lib/firebase';
import type { GGEvent, EventCategory } from '../lib/api';

type RSVPChoice = 'going' | 'maybe' | 'cant';

interface GuestRSVP {
  name: string;
  phone?: string;
  choice: RSVPChoice;
}

/**
 * Production-ready analytics helper - fire-and-forget
 * Logs to console in DEV, sends to backend in production
 */
function track(eventName: string, payload: Record<string, any>) {
  const analyticsData = {
    eventName,
    payload,
    ts: Date.now(),
    path: window.location.pathname,
    isSignedIn: !!getCurrentUser(),
  };

  // Always log in DEV mode
  if (import.meta.env.DEV) {
    console.info('[analytics]', eventName, payload);
  }

  // Send to backend in production only (fire-and-forget)
  if (!import.meta.env.PROD) return;
  
  const endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/analytics`;
  
  try {
    // Use sendBeacon for reliability (especially on page unload)
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(analyticsData)], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
    } else {
      // Fallback to fetch with keepalive
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analyticsData),
        keepalive: true,
      }).catch(() => {}); // Silently ignore errors (fire-and-forget)
    }
  } catch (err) {
    // Silently ignore errors (fire-and-forget)
  }
}


/**
 * Adapter: Convert backend snake_case response to frontend GGEvent format.
 * Contract: Backend /events/public/{event_id} returns snake_case ONLY.
 * Security: Backend does NOT return host_user_id or neighborhoods for public endpoint.
 */
function publicEventToGGEvent(data: any): GGEvent {
  return {
    id: data.id,
    title: data.title,
    details: data.details,
    startAt: data.start_at || undefined,
    endAt: data.end_at || undefined,
    category: data.category as EventCategory,
    visibility: data.visibility,
    type: data.type || (data.start_at ? 'future' : 'now'),
    createdBy: {
      id: '',  // Not exposed in public endpoint for privacy
      label: 'A neighbor'  // Generic label for public viewers
    }
  };
}

export default function PublicEventPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<GGEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [selectedChoice, setSelectedChoice] = useState<RSVPChoice>('going');
  const [rsvpSubmitted, setRsvpSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(!!getCurrentUser());
  
  // Track which eventId we've already logged to prevent double-firing in StrictMode
  const trackedEventId = useRef<string | null>(null);
  
  // Debug instrumentation (DEV only)
  const [debugInfo, setDebugInfo] = useState<{
    url: string;
    status: number;
    keys: string[];
  } | null>(null);

  useEffect(() => {
    // Listen to Firebase auth state changes to properly track signed-in state
    if (!auth) {
      setIsSignedIn(false);
      return;
    }
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsSignedIn(!!user);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) {
      setError('Event ID is missing');
      setLoading(false);
      return;
    }

    try {
      // Fetch event from backend using event ID (public endpoint, no auth required)
      // eventId from URL path /e/{event_id} is the event's UUID
      const url = `http://localhost:8000/events/public/${eventId}`;
      
      const response = await fetch(url);
      const status = response.status;
      
      if (!response.ok) {
        const bodyText = await response.text();
        const bodyPreview = bodyText.substring(0, 120);
        
        if (import.meta.env.DEV) {
          console.log(`[PublicEventPage] ERROR status=${status} body=${bodyPreview}`);
        }
        
        if (status === 404) {
          setError('Event not found');
        } else {
          setError('Failed to load event');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();
      const keys = Object.keys(data);
      const keysStr = keys.join(',');
      
      if (import.meta.env.DEV) {
        console.log(`[PublicEventPage] OK status=${status} keys=${keysStr}`);
        setDebugInfo({ url, status, keys });
      }
      
      const ggEvent = publicEventToGGEvent(data);
      setEvent(ggEvent);
      
      // Track successful public event view (once per eventId to avoid StrictMode double-fire)
      if (trackedEventId.current !== ggEvent.id) {
        trackedEventId.current = ggEvent.id;
        track('public_event_viewed', {
          eventId: ggEvent.id,
          eventType: ggEvent.type || 'unknown',
          visibility: ggEvent.visibility,
        });
      }
    } catch (err: any) {
      console.error('Error loading event:', err);
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVPClick = (choice: RSVPChoice) => {
    setSelectedChoice(choice);
    
    if (isSignedIn) {
      // User is signed in - instant RSVP
      handleSignedInRSVP(choice);
    } else {
      // Show guest form
      setShowGuestForm(true);
    }
  };

  const handleSignedInRSVP = async (choice: RSVPChoice) => {
    setSubmitting(true);
    try {
      if (!eventId || !event) {
        alert('Invalid RSVP link');
        return;
      }

      // Backend expects: going | maybe | declined
      const status = choice === 'cant' ? 'declined' : choice;
      
      // Use event ID for RSVP endpoint
      const response = await fetch(`http://localhost:8000/events/${event.id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setRsvpSubmitted(true);
        
        // Track successful RSVP submission
        track('public_rsvp_submitted', {
          eventId: event.id,
          choice: choice, // Original choice (going | maybe | cant)
        });
        
        // Optionally navigate to home after a delay
        setTimeout(() => navigate('/'), 2000);
      } else {
        alert('Failed to submit RSVP. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting RSVP:', err);
      alert('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestRSVPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!eventId || !event) {
      alert('Invalid RSVP link');
      return;
    }

    setSubmitting(true);
    try {
      // Guest RSVP endpoint expects 'choice' field (going/maybe/declined)
      // Map UI "cant" to backend "declined"
      const choice = selectedChoice === 'cant' ? 'declined' : selectedChoice;
      
      const response = await fetch(`http://localhost:8000/events/${event.id}/rsvp/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choice: choice,
          name: guestName.trim(),
          phone: guestPhone.trim() || undefined,
        }),
      });

      if (response.ok) {
        setRsvpSubmitted(true);
        setShowGuestForm(false);
        
        // Track successful guest RSVP submission
        track('public_rsvp_submitted', {
          eventId: event.id,
          choice: selectedChoice, // Original choice (going | maybe | cant)
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.detail || 'Failed to submit RSVP. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting guest RSVP:', err);
      alert('Failed to submit RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const getEventCategoryColor = (category?: string) => {
    switch (category) {
      case 'playdate': return '#ec4899';
      case 'neighborhood': return '#3b82f6';
      case 'celebrations': return '#a855f7';
      case 'sports': return '#f59e0b';
      case 'food': return '#10b981';
      case 'pet': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getEventCategoryLabel = (category?: string) => {
    switch (category) {
      case 'playdate': return '🎪 Playdate';
      case 'neighborhood': return '🏡 Neighborhood';
      case 'celebrations': return '🎉 Celebrations';
      case 'sports': return '⚽ Sports';
      case 'food': return '🍕 Food';
      case 'pet': return '🐶 Pets';
      default: return '✨ Other';
    }
  };

  const getTimeDisplay = (event: GGEvent): string => {
    if (event.type === 'now' || event.type === 'happening') {
      if (event.startAt) {
        const start = new Date(event.startAt);
        const now = new Date();
        const diffMinutes = Math.floor((now.getTime() - start.getTime()) / 60000);
        
        if (diffMinutes < 5) return 'Just started';
        if (diffMinutes < 60) return `Started ${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        return `Started ${diffHours}h ago`;
      }
      return 'Happening now';
    } else {
      // Future event
      if (event.startAt) {
        const start = new Date(event.startAt);
        return start.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
      }
      return 'Date TBD';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Loading event...</div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: 20,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: 40,
          maxWidth: 400,
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12, color: '#111827' }}>
            Event Not Found
          </h2>
          <p style={{ color: '#6b7280', marginBottom: 24 }}>
            {error || 'This event may have been removed or the link is invalid.'}
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to GatherGrove
          </button>
        </div>
      </div>
    );
  }

  const isHappeningNow = event.type === 'now' || event.type === 'happening';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f9fa',
      padding: '40px 20px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          maxWidth: 600,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header Accent */}
        <div style={{
          height: 3,
          background: '#3bb19b',
        }} />

        <div style={{ padding: '40px 32px' }}>
          {/* Event Type Badge */}
          {isHappeningNow && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              background: '#ecfdf5',
              borderRadius: 6,
              marginBottom: 18,
            }}>
              <Zap size={14} style={{ color: '#10b981' }} />
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#059669',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                Happening Now
              </span>
            </div>
          )}

          {/* Event Title */}
          <h1 style={{
            fontSize: 32,
            fontWeight: 600,
            color: '#111827',
            marginBottom: 24,
            lineHeight: 1.25,
            letterSpacing: '-0.02em',
          }}>
            {event.title || 'Untitled Event'}
          </h1>

          {/* Event Meta Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 28 }}>
            {/* Category */}
            {event.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={17} style={{ color: '#9ca3af' }} />
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#6b7280',
                }}>
                  {getEventCategoryLabel(event.category)}
                </span>
              </div>
            )}

            {/* Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280' }}>
              <Clock size={17} />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                {getTimeDisplay(event)}
              </span>
            </div>

            {/* Location */}
            {event.neighborhoods && event.neighborhoods.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280' }}>
                <MapPin size={17} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  {event.neighborhoods[0]}
                </span>
              </div>
            )}
          </div>

          {/* Event Details */}
          {event.details && (
            <div style={{
              padding: 16,
              background: '#fafafa',
              borderRadius: 8,
              marginBottom: 36,
            }}>
              <p style={{
                fontSize: 15,
                color: '#6b7280',
                lineHeight: 1.6,
                margin: 0,
              }}>
                {event.details}
              </p>
            </div>
          )}

          {/* RSVP Section */}
          {!rsvpSubmitted ? (
            <>
              {!showGuestForm ? (
                <div>
                  <div style={{
                    paddingTop: 32,
                    borderTop: '1px solid #f3f4f6',
                    marginBottom: 20,
                  }}>
                    <h3 style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: '#111827',
                      marginBottom: 16,
                      letterSpacing: '-0.01em',
                    }}>
                      Can you make it?
                    </h3>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <button
                      onClick={() => handleRSVPClick('going')}
                      disabled={submitting}
                      style={{
                        padding: '14px 24px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 9,
                        fontSize: 16,
                        fontWeight: 600,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: submitting ? 0.6 : 1,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      I'm Going
                    </button>

                    <button
                      onClick={() => handleRSVPClick('maybe')}
                      disabled={submitting}
                      style={{
                        padding: '14px 24px',
                        background: '#fff',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        borderRadius: 9,
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      Maybe
                    </button>

                    <button
                      onClick={() => handleRSVPClick('cant')}
                      disabled={submitting}
                      style={{
                        padding: '14px 24px',
                        background: '#fff',
                        color: '#9ca3af',
                        border: '1px solid #f3f4f6',
                        borderRadius: 9,
                        fontSize: 15,
                        fontWeight: 500,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      Can't Make It
                    </button>
                  </div>
                </div>
              ) : (
                /* Guest RSVP Form */
                <form onSubmit={handleGuestRSVPSubmit}>
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 12,
                  }}>
                    {selectedChoice === 'going' && "Great! Let the host know you're coming"}
                    {selectedChoice === 'maybe' && "Let the host know you might come"}
                    {selectedChoice === 'cant' && "Let the host know you can't make it"}
                  </h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 6,
                    }}>
                      Your Name *
                    </label>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="John Doe"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 15,
                        border: '2px solid #e2e8f0',
                        borderRadius: 8,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: 24 }}>
                    <label style={{
                      display: 'block',
                      fontSize: 14,
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: 6,
                    }}>
                      Phone (optional)
                    </label>
                    <input
                      type="tel"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: 15,
                        border: '2px solid #e2e8f0',
                        borderRadius: 8,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowGuestForm(false)}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        background: '#fff',
                        color: '#64748b',
                        border: '2px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      style={{
                        flex: 2,
                        padding: '12px 24px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      {submitting ? 'Sending...' : 'Send RSVP'}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* Post-RSVP Confirmation */
            <div style={{
              paddingTop: 32,
              borderTop: '1px solid #f3f4f6',
            }}>
              <div style={{
                textAlign: 'center',
                paddingBottom: 32,
              }}>
                <h3 style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#111827',
                  marginBottom: 8,
                  letterSpacing: '-0.01em',
                }}>
                  {selectedChoice === 'going' && "You're going"}
                  {selectedChoice === 'maybe' && "RSVP sent — Maybe"}
                  {selectedChoice === 'cant' && "Thanks — we let the host know"}
                </h3>
                <p style={{
                  fontSize: 14,
                  color: '#6b7280',
                  margin: 0,
                }}>
                  We've shared your response with the host.
                </p>
              </div>

              {/* Onboarding CTA */}
              <div style={{
                textAlign: 'center',
                paddingTop: 28,
                borderTop: '1px solid #f9fafb',
              }}>
                <p style={{
                  fontSize: 13,
                  color: '#6b7280',
                  marginBottom: 14,
                  fontWeight: 500,
                }}>
                  Want an easier way to organize moments like this?
                </p>
                <button
                  onClick={() => {
                    // Track join button click
                    track('public_join_clicked', {
                      eventId: event?.id || 'unknown',
                    });
                    navigate('/');
                  }}
                  aria-label="Join GatherGrove"
                  style={{
                    padding: '10px 20px',
                    background: '#fff',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s',
                  }}
                >
                  Join <span style={{ color: '#3bb19b' }}>GatherGrove</span>
                </button>
              </div>
            </div>
          )}

          {/* Attribution Footer - Shown to unauthenticated guests */}
          {!isSignedIn && (
            <div style={{
              marginTop: 40,
              paddingTop: 32,
              borderTop: '1px solid #f9fafb',
              textAlign: 'center',
            }}>
              <a
                href="/"
                style={{
                  display: 'block',
                  fontSize: 11,
                  color: '#9ca3af',
                  textDecoration: 'none',
                  padding: '8px 0',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                }}
              >
                Created with GatherGrove — Free to join
              </a>
            </div>
          )}
        </div>
      </motion.div>

      {/* Debug Footer (DEV only) */}
      {import.meta.env.DEV && debugInfo && (
        <div style={{
          maxWidth: 600,
          margin: '24px auto 0',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: 12,
          fontSize: 12,
          fontFamily: 'monospace',
          color: '#10b981',
          border: '1px solid rgba(16, 185, 129, 0.3)',
        }}>
          <div style={{ marginBottom: 8, fontWeight: 700, color: '#34d399' }}>
            🔍 DEV DEBUG INFO
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <div>
              <span style={{ color: '#9ca3af' }}>Event ID:</span> {eventId}
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>Fetch URL:</span> {debugInfo.url}
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>Status Code:</span> {debugInfo.status}
            </div>
            <div>
              <span style={{ color: '#9ca3af' }}>Response Keys ({debugInfo.keys.length}):</span>{' '}
              {debugInfo.keys.join(', ')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
