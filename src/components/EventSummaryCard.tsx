// src/components/EventSummaryCard.tsx

interface EventSummaryCardProps {
  title: string;
  hostedByLabel?: string;
  timeLabel: string;
  location?: string;
  details?: string;
  categoryLabel?: string;
  isHappeningNow?: boolean;
}

export default function EventSummaryCard({
  title,
  hostedByLabel,
  timeLabel,
  location,
  details,
  categoryLabel,
  isHappeningNow = false,
}: EventSummaryCardProps) {
  return (
    <div>
      {/* Happening Now Badge */}
      {isHappeningNow && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "4px 10px",
          background: "#ecfdf5",
          borderRadius: "6px",
          marginBottom: "18px",
        }}>
          <span style={{
            fontSize: "11px",
            fontWeight: "600",
            color: "#059669",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}>
            ⚡ Happening Now
          </span>
        </div>
      )}

      {/* Event Title */}
      <h2 style={{
        fontSize: "24px",
        fontWeight: "700",
        color: "#111827",
        marginBottom: "16px",
        lineHeight: "1.3",
      }}>
        {title}
      </h2>

      {/* Event Meta Info */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
        {/* Hosted By */}
        {hostedByLabel && hostedByLabel.trim() && (
          <div style={{
            fontSize: "14px",
            fontWeight: "500",
            color: "#6b7280",
          }}>
            Hosted by {hostedByLabel}
          </div>
        )}

        {/* Category */}
        {categoryLabel && (
          <div style={{
            fontSize: "14px",
            fontWeight: "500",
            color: "#6b7280",
          }}>
            {categoryLabel}
          </div>
        )}

        {/* Time */}
        <div style={{
          fontSize: "14px",
          fontWeight: "500",
          color: "#6b7280",
        }}>
          🕐 {timeLabel}
        </div>

        {/* Location */}
        {location && location.trim() && (
          <div style={{
            fontSize: "14px",
            fontWeight: "500",
            color: "#6b7280",
          }}>
            📍 {location.trim()}
          </div>
        )}
      </div>

      {/* Event Details */}
      {details && details.trim() && (
        <div style={{
          padding: "16px",
          background: "#fafafa",
          borderRadius: "8px",
          marginBottom: "24px",
        }}>
          <p style={{
            fontSize: "15px",
            color: "#6b7280",
            lineHeight: "1.6",
            margin: "0",
            whiteSpace: "pre-wrap",
          }}>
            {details.trim()}
          </p>
        </div>
      )}
    </div>
  );
}
