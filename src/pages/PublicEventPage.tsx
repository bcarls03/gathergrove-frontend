// src/pages/PublicEventPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Users, Zap, CheckCircle } from 'lucide-react';
import { getViewer } from '../lib/viewer';
import type { GGEvent, EventCategory } from '../lib/api';

type RSVPChoice = 'going' | 'maybe' | 'cant';

interface GuestRSVP {
  name: string;
  phone?: string;
  choice: RSVPChoice;
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
  
  // Debug instrumentation (DEV only)
  const [debugInfo, setDebugInfo] = useState<{
    url: string;
    status: number;
    keys: string[];
  } | null>(null);

  const viewer = getViewer();
  const isSignedIn = !!viewer;

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
  const gradientColors = isHappeningNow 
    ? ['#fbbf24', '#f59e0b']
    : ['#3b82f6', '#2563eb'];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(135deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
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
          borderRadius: 24,
          boxShadow: '0 25px 70px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header Accent */}
        <div style={{
          height: 6,
          background: `linear-gradient(90deg, ${gradientColors[0]} 0%, ${gradientColors[1]} 100%)`,
        }} />

        <div style={{ padding: '40px 32px' }}>
          {/* Event Type Badge */}
          {isHappeningNow && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: 999,
              marginBottom: 20,
            }}>
              <Zap size={16} style={{ color: '#f59e0b' }} />
              <span style={{
                fontSize: 13,
                fontWeight: 800,
                color: '#92400e',
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
            fontWeight: 800,
            color: '#111827',
            marginBottom: 20,
            lineHeight: 1.2,
          }}>
            {event.title || 'Untitled Event'}
          </h1>

          {/* Event Meta Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {/* Category */}
            {event.category && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={18} style={{ color: '#6b7280' }} />
                <div style={{
                  padding: '4px 12px',
                  borderRadius: 8,
                  background: getEventCategoryColor(event.category) + '15',
                  color: getEventCategoryColor(event.category),
                  fontSize: 14,
                  fontWeight: 600,
                }}>
                  {getEventCategoryLabel(event.category)}
                </div>
              </div>
            )}

            {/* Time */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
              <Clock size={18} />
              <span style={{ fontSize: 15, fontWeight: 500 }}>
                {getTimeDisplay(event)}
              </span>
            </div>

            {/* Location */}
            {event.neighborhoods && event.neighborhoods.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569' }}>
                <MapPin size={18} />
                <span style={{ fontSize: 15, fontWeight: 500 }}>
                  {event.neighborhoods[0]}
                </span>
              </div>
            )}
          </div>

          {/* Event Details */}
          {event.details && (
            <div style={{
              padding: 20,
              background: '#f8fafc',
              borderRadius: 12,
              marginBottom: 32,
            }}>
              <p style={{
                fontSize: 15,
                color: '#475569',
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
                  <h3 style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: 16,
                  }}>
                    Can you make it?
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button
                      onClick={() => handleRSVPClick('going')}
                      disabled={submitting}
                      style={{
                        padding: '16px 24px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        opacity: submitting ? 0.6 : 1,
                      }}
                    >
                      ✓ I'm Going!
                    </button>

                    <button
                      onClick={() => handleRSVPClick('maybe')}
                      disabled={submitting}
                      style={{
                        padding: '14px 24px',
                        background: '#fff',
                        color: '#f59e0b',
                        border: '2px solid #fbbf24',
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
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
                        color: '#64748b',
                        border: '2px solid #e2e8f0',
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 600,
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
            /* Success State */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                textAlign: 'center',
                padding: 32,
                background: '#f0fdf4',
                borderRadius: 16,
                border: '2px solid #86efac',
              }}
            >
              <CheckCircle size={64} style={{ color: '#10b981', marginBottom: 16 }} />
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: '#111827',
                marginBottom: 8,
              }}>
                RSVP Sent!
              </h3>
              <p style={{ color: '#475569', marginBottom: 20 }}>
                {isSignedIn 
                  ? "The host will see your response."
                  : "The host will be notified of your response."}
              </p>
              {!isSignedIn && (
                <button
                  onClick={() => navigate('/')}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Explore GatherGrove
                </button>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Footer CTA for non-signed-in users */}
      {!isSignedIn && !rsvpSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            maxWidth: 600,
            margin: '24px auto 0',
            textAlign: 'center',
            color: '#fff',
          }}
        >
          <p style={{ fontSize: 15, marginBottom: 12 }}>
            Want to create your own neighborhood events?
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: gradientColors[1],
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            Join GatherGrove
          </button>
        </motion.div>
      )}
      
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
