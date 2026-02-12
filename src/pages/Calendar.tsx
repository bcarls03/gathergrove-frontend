// src/pages/Calendar.tsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, fetchMyRsvp, type GGEvent } from "../lib/api";
import EventDaySheet from "../components/EventDaySheet.tsx";

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  neighborhood: "#10b981", // Green
  gathering: "#f59e0b",    // Amber
  kids: "#ec4899",         // Pink
  sports: "#3b82f6",       // Blue
  wellness: "#8b5cf6",     // Purple
};

export default function Calendar() {
  const navigate = useNavigate();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<GGEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [timeLens, setTimeLens] = useState<'upcoming' | 'past'>('upcoming');
  const [rsvpStates, setRsvpStates] = useState<Record<string, { status: 'going' | 'maybe' | 'declined' | null }>>({});
  
  // Load events for current month
  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
      
      // Load RSVP states for all events
      data.forEach(async (event) => {
        try {
          const rsvpData = await fetchMyRsvp(event.id);
          setRsvpStates((prev) => ({
            ...prev,
            [event.id]: { status: rsvpData.userStatus },
          }));
        } catch {
          // User hasn't RSVP'd to this event
        }
      });
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Previous month days to fill
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false,
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }
    
    // Next month days to fill grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }
    
    return days;
  }, [currentMonth]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): GGEvent[] => {
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
    return events.filter(event => {
      // Use startAt instead of start
      const eventDateStr = event.startAt || event.when;
      if (!eventDateStr) return false;
      const eventDate = new Date(eventDateStr).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  // Selected date events
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dateStr = selectedDate.toISOString().split("T")[0];
    return events.filter(event => {
      const eventDateStr = event.startAt || event.when;
      if (!eventDateStr) return false;
      const eventDate = new Date(eventDateStr).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  }, [selectedDate, events]);

  // Past events for Past view
  const pastEvents = useMemo(() => {
    if (timeLens !== 'past') return [];
    
    const now = new Date();
    return events
      .filter(event => {
        // Check if event is past
        const eventEnd = event.endAt ? new Date(event.endAt) : 
                        event.startAt ? new Date(event.startAt) : null;
        if (!eventEnd || eventEnd >= now) return false;
        
        // Check if user RSVP'd "going"
        const userRsvp = rsvpStates[event.id]?.status;
        return userRsvp === 'going';
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        const dateA = new Date(a.endAt || a.startAt || 0).getTime();
        const dateB = new Date(b.endAt || b.startAt || 0).getTime();
        return dateB - dateA;
      });
  }, [events, timeLens, rsvpStates]);

  // Navigation
  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const monthYearLabel = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="gg-page page-header-wrapper" style={{ paddingBottom: 80 }}>
      <h1 className="page-header-title">Calendar</h1>
      <p className="page-header-subtitle">
        Your GatherGrove commitments. Events sync with your personal calendar when you RSVP.
      </p>

      {/* Time Lens Toggle */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        padding: 4,
        background: '#f3f4f6',
        borderRadius: 8,
        width: 'fit-content',
        marginBottom: 24
      }}>
        <button
          onClick={() => setTimeLens('upcoming')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            background: timeLens === 'upcoming' ? '#ffffff' : 'transparent',
            color: timeLens === 'upcoming' ? '#111827' : '#6b7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: timeLens === 'upcoming' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTimeLens('past')}
          style={{
            padding: '6px 16px',
            borderRadius: 6,
            border: 'none',
            background: timeLens === 'past' ? '#ffffff' : 'transparent',
            color: timeLens === 'past' ? '#111827' : '#6b7280',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: timeLens === 'past' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s'
          }}
        >
          Past
        </button>
      </div>

      {/* Conditional Rendering: Month Grid OR Past Events List */}
      {timeLens === 'upcoming' ? (
        <>
          {/* Month Navigation */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 24,
            }}
          >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {monthYearLabel}
          </h2>
          <button
            onClick={goToToday}
            style={{
              padding: "6px 12px",
              fontSize: 14,
              fontWeight: 500,
              color: "#10b981",
              border: "2px solid #10b981",
              borderRadius: 8,
              backgroundColor: "white",
              cursor: "pointer",
            }}
          >
            Today
          </button>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={goToPrevMonth}
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #e5e7eb",
              borderRadius: 8,
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: 20,
              fontWeight: 700,
              color: "#374151",
            }}
            title="Previous month"
            aria-label="Previous month"
          >
            ←
          </button>
          <button
            onClick={goToNextMonth}
            style={{
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #e5e7eb",
              borderRadius: 8,
              backgroundColor: "white",
              cursor: "pointer",
              fontSize: 20,
              fontWeight: 700,
              color: "#374151",
            }}
            title="Next month"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
          marginBottom: 8,
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            style={{
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "#6b7280",
              padding: "8px 0",
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 8,
        }}
      >
        {calendarDays.map((day, idx) => {
          const dayEvents = getEventsForDate(day.date);
          const hasEvents = dayEvents.length > 0;
          const isSelectedDate =
            selectedDate &&
            day.date.toDateString() === selectedDate.toDateString();

          return (
            <motion.button
              key={idx}
              onClick={() => setSelectedDate(day.date)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              style={{
                aspectRatio: "1",
                minHeight: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: 8,
                border: isSelectedDate
                  ? "3px solid #10b981"
                  : isToday(day.date)
                  ? "3px solid #3b82f6"
                  : "2px solid #e5e7eb",
                borderRadius: 12,
                backgroundColor: day.isCurrentMonth
                  ? isSelectedDate
                    ? "#f0fdf4"
                    : "white"
                  : "#f9fafb",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {/* Date number */}
              <div
                style={{
                  fontSize: 16,
                  fontWeight: isToday(day.date) ? 700 : 600,
                  color: day.isCurrentMonth ? "#111827" : "#9ca3af",
                }}
              >
                {day.date.getDate()}
              </div>

              {/* Event indicators */}
              {hasEvents && (
                <div
                  style={{
                    display: "flex",
                    gap: 3,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    maxWidth: "100%",
                  }}
                >
                  {dayEvents.slice(0, 3).map((event, i) => {
                    const color = CATEGORY_COLORS[event.category || "neighborhood"];
                    return (
                      <div
                        key={i}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: color,
                        }}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: "#6b7280",
                      }}
                    >
                      +{dayEvents.length - 3}
                    </div>
                  )}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Loading state */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 32,
            color: "#6b7280",
            fontSize: 14,
          }}
        >
          Loading events...
        </div>
      )}
        </>
      ) : (
        // Past Events List
        <div style={{ marginTop: 24 }}>
          {pastEvents.length === 0 ? (
            <div style={{ 
              padding: 64, 
              textAlign: 'center',
              color: '#9ca3af',
              fontSize: 14
            }}>
              <Clock size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No past events yet</p>
              <p style={{ fontSize: 13, marginTop: 8, color: '#d1d5db' }}>
                Events you attended will appear here
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pastEvents.map(event => {
                const photoCount = event.photos?.length || 0;
                const eventDate = new Date(event.startAt || event.endAt || '');
                
                return (
                  <button
                    key={event.id}
                    onClick={() => {
                      setSelectedDate(eventDate);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: 16, 
                        fontWeight: 600, 
                        color: '#111827',
                        marginBottom: 4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {event.title}
                      </div>
                      <div style={{ 
                        fontSize: 13, 
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>
                          {eventDate.toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: eventDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                          })}
                        </span>
                        {event.startAt && (
                          <>
                            <span>•</span>
                            <span>
                              {new Date(event.startAt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {photoCount > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        background: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#166534',
                        flexShrink: 0,
                        marginLeft: 12
                      }}>
                        📷 {photoCount}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Create Event button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate("/compose/event")}
        style={{
          position: "fixed",
          bottom: 80,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          backgroundColor: "#10b981",
          border: "none",
          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.4)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}
      >
        <Plus size={28} color="white" strokeWidth={3} />
      </motion.button>

      {/* Day events bottom sheet */}
      <EventDaySheet
        open={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate}
        events={selectedDateEvents}
      />
    </div>
  );
}
