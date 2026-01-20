// src/components/EventDaySheet.tsx
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, MapPin, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { GGEvent } from "../lib/api";
import {
  rsvpToEvent,
  leaveEventRsvp,
  fetchMyRsvp,
  type RSVPStatus,
} from "../lib/api";
import { downloadICS } from "../lib/calendar";

type Props = {
  open: boolean;
  onClose: () => void;
  date: Date | null;
  events: GGEvent[];
};

const CATEGORY_COLORS: Record<string, string> = {
  neighborhood: "#10b981",
  gathering: "#f59e0b",
  kids: "#ec4899",
  sports: "#3b82f6",
  wellness: "#8b5cf6",
};

const CATEGORY_EMOJI: Record<string, string> = {
  neighborhood: "🏘️",
  gathering: "🎉",
  kids: "👶",
  sports: "⚽",
  wellness: "🧘",
};

type EventRsvpState = Record<
  string,
  { status: "going" | "maybe" | "declined" | null; loading: boolean }
>;

export default function EventDaySheet({ open, onClose, date, events }: Props) {
  const navigate = useNavigate();
  const [rsvpStates, setRsvpStates] = useState<EventRsvpState>({});

  // Load RSVP states when events change
  useEffect(() => {
    if (!open || events.length === 0) return;

    events.forEach(async (event) => {
      try {
        const data = await fetchMyRsvp(event.id);
        setRsvpStates((prev) => ({
          ...prev,
          [event.id]: { status: data.userStatus, loading: false },
        }));
      } catch {
        setRsvpStates((prev) => ({
          ...prev,
          [event.id]: { status: null, loading: false },
        }));
      }
    });
  }, [open, events]);

  const handleRsvp = async (
    eventId: string,
    status: "going" | "maybe" | "declined"
  ) => {
    setRsvpStates((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], loading: true },
    }));

    try {
      const statusToSend = status === "declined" ? "cant" : status;
      await rsvpToEvent(eventId, statusToSend as RSVPStatus);

      setRsvpStates((prev) => ({
        ...prev,
        [eventId]: { status, loading: false },
      }));
    } catch (err) {
      console.error("RSVP failed:", err);
      setRsvpStates((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], loading: false },
      }));
    }
  };

  const handleRemoveRsvp = async (eventId: string) => {
    setRsvpStates((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], loading: true },
    }));

    try {
      await leaveEventRsvp(eventId);
      setRsvpStates((prev) => ({
        ...prev,
        [eventId]: { status: null, loading: false },
      }));
    } catch (err) {
      console.error("Remove RSVP failed:", err);
      setRsvpStates((prev) => ({
        ...prev,
        [eventId]: { ...prev[eventId], loading: false },
      }));
    }
  };

  const formatTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const dateLabel = date
    ? date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 100,
            }}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "80vh",
              backgroundColor: "white",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
              zIndex: 101,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px",
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>
                  {dateLabel}
                </h2>
                <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
                  {events.length === 0
                    ? "No events"
                    : `${events.length} ${events.length === 1 ? "event" : "events"}`}
                </p>
              </div>

              <button
                onClick={onClose}
                style={{
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "#f3f4f6",
                  cursor: "pointer",
                }}
              >
                <X size={20} color="#374151" />
              </button>
            </div>

            {/* Events list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
              {events.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#6b7280",
                  }}
                >
                  <Calendar size={48} color="#d1d5db" style={{ margin: "0 auto 16px" }} />
                  <p style={{ fontSize: 16, fontWeight: 500, margin: 0 }}>
                    No events on this day
                  </p>
                  <p style={{ fontSize: 14, margin: "8px 0 0" }}>
                    Create an event to bring neighbors together!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      navigate("/compose/event");
                    }}
                    style={{
                      marginTop: 16,
                      padding: "10px 20px",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "white",
                      backgroundColor: "#10b981",
                      border: "none",
                      borderRadius: 10,
                      cursor: "pointer",
                    }}
                  >
                    Create Event
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {events.map((event) => {
                    const color = CATEGORY_COLORS[event.category || "neighborhood"];
                    const emoji = CATEGORY_EMOJI[event.category || "neighborhood"];
                    const rsvp = rsvpStates[event.id];
                    const currentStatus = rsvp?.status;
                    const isLoading = rsvp?.loading;

                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          padding: 16,
                          border: `2px solid ${color}`,
                          borderRadius: 12,
                          backgroundColor: "white",
                        }}
                      >
                        {/* Category badge */}
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            backgroundColor: `${color}15`,
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color,
                            marginBottom: 8,
                          }}
                        >
                          <span>{emoji}</span>
                          {event.category}
                        </div>

                        {/* Title */}
                        <h3
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            margin: "0 0 8px",
                            color: "#111827",
                          }}
                        >
                          {event.title}
                        </h3>

                        {/* Details */}
                        {event.details && (
                          <p
                            style={{
                              fontSize: 14,
                              color: "#6b7280",
                              margin: "0 0 12px",
                              lineHeight: 1.5,
                            }}
                          >
                            {event.details}
                          </p>
                        )}

                        {/* Meta info */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Clock size={16} color="#6b7280" />
                            <span style={{ fontSize: 14, color: "#374151" }}>
                              {formatTime(event.startAt || event.when || "")}
                              {event.endAt && ` - ${formatTime(event.endAt)}`}
                            </span>
                          </div>

                          {event.neighborhoods && event.neighborhoods.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <MapPin size={16} color="#6b7280" />
                              <span style={{ fontSize: 14, color: "#374151" }}>
                                {event.neighborhoods[0]}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* RSVP buttons */}
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 12,
                          }}
                        >
                          <button
                            onClick={() => {
                              if (currentStatus === "going") {
                                handleRemoveRsvp(event.id);
                              } else {
                                handleRsvp(event.id, "going");
                              }
                            }}
                            disabled={isLoading}
                            style={{
                              flex: 1,
                              padding: "10px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              color: currentStatus === "going" ? "white" : "#10b981",
                              backgroundColor:
                                currentStatus === "going" ? "#10b981" : "white",
                              border: `2px solid #10b981`,
                              borderRadius: 8,
                              cursor: isLoading ? "not-allowed" : "pointer",
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >
                            {currentStatus === "going" ? "✓ Going" : "Going"}
                          </button>

                          <button
                            onClick={() => {
                              if (currentStatus === "maybe") {
                                handleRemoveRsvp(event.id);
                              } else {
                                handleRsvp(event.id, "maybe");
                              }
                            }}
                            disabled={isLoading}
                            style={{
                              flex: 1,
                              padding: "10px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              color: currentStatus === "maybe" ? "white" : "#f59e0b",
                              backgroundColor:
                                currentStatus === "maybe" ? "#f59e0b" : "white",
                              border: `2px solid #f59e0b`,
                              borderRadius: 8,
                              cursor: isLoading ? "not-allowed" : "pointer",
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >
                            {currentStatus === "maybe" ? "✓ Maybe" : "Maybe"}
                          </button>

                          <button
                            onClick={() => {
                              if (currentStatus === "declined") {
                                handleRemoveRsvp(event.id);
                              } else {
                                handleRsvp(event.id, "declined");
                              }
                            }}
                            disabled={isLoading}
                            style={{
                              flex: 1,
                              padding: "10px 16px",
                              fontSize: 14,
                              fontWeight: 600,
                              color: currentStatus === "declined" ? "white" : "#ef4444",
                              backgroundColor:
                                currentStatus === "declined" ? "#ef4444" : "white",
                              border: `2px solid #ef4444`,
                              borderRadius: 8,
                              cursor: isLoading ? "not-allowed" : "pointer",
                              opacity: isLoading ? 0.6 : 1,
                            }}
                          >
                            {currentStatus === "declined" ? "✓ Can't go" : "Can't go"}
                          </button>
                        </div>

                        {/* Add to Calendar button */}
                        <button
                          onClick={() => downloadICS(event)}
                          style={{
                            width: "100%",
                            marginTop: 12,
                            padding: "10px 16px",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#6b7280",
                            backgroundColor: "white",
                            border: "2px solid #e5e7eb",
                            borderRadius: 8,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                          }}
                          title="Download .ics file to add to your calendar"
                        >
                          <Download size={16} />
                          Add to Calendar
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
