// src/pages/PublicRSVP.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, User, CheckCircle, XCircle } from "lucide-react";
import {
  getPublicEvent,
  submitPublicRSVP,
  type PublicEventView,
  type RSVPStatus,
} from "../lib/api";

export default function PublicRSVP() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<PublicEventView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<RSVPStatus | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    getPublicEvent(token)
      .then((data) => {
        setEvent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load event:", err);
        setError(err.message || "Failed to load event details");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async () => {
    if (!selectedStatus || !token) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitPublicRSVP(token, {
        status: selectedStatus,
        guest_name: guestName.trim() || undefined,
        guest_email: guestEmail.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error("Failed to submit RSVP:", err);
      setError(err.message || "Failed to submit RSVP");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return null;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "neighborhood":
        return "#3b82f6"; // blue
      case "playdate":
        return "#ec4899"; // pink
      case "help":
        return "#f59e0b"; // amber
      case "pet":
        return "#8b5cf6"; // purple
      case "food":
        return "#10b981"; // green
      case "celebrations":
        return "#f43f5e"; // rose
      case "sports":
        return "#06b6d4"; // cyan
      default:
        return "#6b7280"; // gray
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 20,
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div
            style={{
              width: 48,
              height: 48,
              border: "4px solid rgba(255,255,255,0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 18 }}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <XCircle size={64} color="#ef4444" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            Invitation Not Found
          </h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            {error || "This invitation link is invalid or has expired."}
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: "#667eea",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go to GatherGrove
          </button>
        </motion.div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            background: "white",
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle size={64} color="#10b981" style={{ margin: "0 auto 16px" }} />
          </motion.div>
          <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
            RSVP Submitted!
          </h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            {selectedStatus === "going" && "See you there! 🎉"}
            {selectedStatus === "maybe" && "Thanks for letting us know!"}
            {selectedStatus === "cant" && "Thanks for responding!"}
          </p>

          <div
            style={{
              background: "#f3f4f6",
              borderRadius: 12,
              padding: 20,
              marginBottom: 24,
            }}
          >
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>
              Want to discover more local events?
            </p>
            <button
              onClick={() => navigate("/onboarding/access")}
              style={{
                width: "100%",
                padding: "12px 24px",
                background: "#667eea",
                color: "white",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Join GatherGrove
            </button>
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: "transparent",
              color: "#6b7280",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Change Response
          </button>
        </motion.div>
      </div>
    );
  }

  const startDate = formatDate(event.start_at);
  const startTime = formatTime(event.start_at);
  const categoryColor = getCategoryColor(event.category);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "white",
          borderRadius: 16,
          maxWidth: 500,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: categoryColor,
            padding: 24,
            color: "white",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              opacity: 0.9,
              marginBottom: 8,
            }}
          >
            You're Invited
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 0 }}>
            {event.title}
          </h1>
        </div>

        {/* Event Details */}
        <div style={{ padding: 24 }}>
          {event.details && (
            <p
              style={{
                color: "#374151",
                fontSize: 16,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              {event.details}
            </p>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {event.host_name && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <User size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>Hosted by</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#374151" }}>
                    {event.host_name}
                  </div>
                </div>
              </div>
            )}

            {(startDate || startTime) && (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Calendar size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>When</div>
                  <div style={{ fontSize: 16, fontWeight: 500, color: "#374151" }}>
                    {startDate}
                    {startTime && ` at ${startTime}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RSVP Status Buttons */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Will you attend?
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["going", "maybe", "cant"] as RSVPStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: selectedStatus === status ? categoryColor : "#f3f4f6",
                    color: selectedStatus === status ? "white" : "#374151",
                    border: selectedStatus === status ? "2px solid " + categoryColor : "2px solid #e5e7eb",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {status === "going" && "✓ Going"}
                  {status === "maybe" && "? Maybe"}
                  {status === "cant" && "✗ Can't Go"}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Guest Info */}
          {selectedStatus && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{ marginBottom: 24 }}
            >
              <label
                htmlFor="guest-name"
                style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
              >
                Your Name (Optional)
              </label>
              <input
                id="guest-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                  marginBottom: 12,
                }}
              />

              <label
                htmlFor="guest-email"
                style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8 }}
              >
                Your Email (Optional)
              </label>
              <input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: 8,
                  fontSize: 16,
                }}
              />
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                background: "#fee2e2",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                color: "#dc2626",
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedStatus || submitting}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: selectedStatus ? categoryColor : "#d1d5db",
              color: "white",
              border: "none",
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: selectedStatus ? "pointer" : "not-allowed",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Submitting..." : "Submit RSVP"}
          </button>

          {/* Footer */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: "1px solid #e5e7eb",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: 12, color: "#9ca3af", marginBottom: 8 }}>
              Powered by{" "}
              <a
                href="/"
                style={{ color: categoryColor, textDecoration: "none", fontWeight: 600 }}
              >
                GatherGrove
              </a>
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af" }}>
              Connecting neighbors, one event at a time
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
