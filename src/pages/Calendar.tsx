// src/pages/Calendar.tsx
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, type GGEvent } from "../lib/api";
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
  
  // Load events for current month
  useEffect(() => {
    loadEvents();
  }, [currentMonth]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchEvents();
      setEvents(data);
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
    return getEventsForDate(selectedDate);
  }, [selectedDate, events]);

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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 16px 80px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>
            {monthYearLabel}
          </h1>
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
