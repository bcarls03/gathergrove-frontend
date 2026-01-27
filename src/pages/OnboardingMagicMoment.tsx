// src/pages/OnboardingMagicMoment.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingState } from "../lib/onboarding";
import { Sparkles, Users } from "lucide-react";
import { OnboardingLayout } from "../components/OnboardingLayout";

// Mock blurred household for preview
type BlurredHousehold = {
  id: string;
  type: "family" | "couple" | "empty_nester";
  kidsAges?: number[];
  distance: number; // in miles
};

function OnboardingMagicMomentInner() {
  const navigate = useNavigate();
  const state = getOnboardingState();
  const [loading, setLoading] = useState(true);
  const [households, setHouseholds] = useState<BlurredHousehold[]>([]);

  // Simulate fetching nearby households (in production, call API)
  useEffect(() => {
    const fetchNearbyHouseholds = async () => {
      // TODO: Replace with real API call: GET /api/discovery/nearby
      // For now, generate mock data based on user's household type
      
      await new Promise(resolve => setTimeout(resolve, 800)); // Simulate loading

      const isFamily = state.intendedHouseholdType === "family_with_kids";
      
      // Generate 3-5 mock households
      const mockHouseholds: BlurredHousehold[] = [
        {
          id: "1",
          type: "family",
          kidsAges: [5, 8],
          distance: 0.3,
        },
        {
          id: "2",
          type: "family",
          kidsAges: [3],
          distance: 0.5,
        },
        {
          id: "3",
          type: "couple",
          distance: 0.7,
        },
        {
          id: "4",
          type: "family",
          kidsAges: [7, 10],
          distance: 0.9,
        },
        {
          id: "5",
          type: "empty_nester",
          distance: 1.2,
        },
      ];

      // Filter to show relevant households (families see more families)
      const filtered = isFamily
        ? mockHouseholds.filter(h => h.type === "family" || Math.random() > 0.5)
        : mockHouseholds;

      setHouseholds(filtered.slice(0, 5));
      setLoading(false);
    };

    fetchNearbyHouseholds();
  }, [state.intendedHouseholdType]);

  const handleBrowseNeighbors = () => {
    // Primary CTA: Go to browse neighbors page
    navigate("/discovery");
  };

  // Generate dynamic headline based on data
  const familiesCount = households.filter(h => h.type === "family").length;
  const totalCount = households.length;
  const isFamily = state.intendedHouseholdType === "family_with_kids";

  // If all shown households are families, say "families with kids"
  // Otherwise, say "households" to be accurate
  const headline = isFamily && familiesCount > 0 && familiesCount === totalCount
    ? `We found ${familiesCount} ${familiesCount === 1 ? 'family' : 'families'} with kids near you`
    : `We found ${totalCount} ${totalCount === 1 ? 'household' : 'households'} near you`;

  // Generate household description
  const getHouseholdDescription = (household: BlurredHousehold): string => {
    if (household.type === "family" && household.kidsAges && household.kidsAges.length > 0) {
      const ageStr = household.kidsAges.length === 1
        ? `a ${household.kidsAges[0]}-year-old`
        : `kids ages ${household.kidsAges.join(", ")}`;
      return `A family with ${ageStr}`;
    } else if (household.type === "couple") {
      return "A couple";
    } else if (household.type === "empty_nester") {
      return "Empty nesters";
    }
    return "A household";
  };

  if (loading) {
    return (
      <OnboardingLayout currentStep="magic">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 24px 48px' }}>
          <div style={{ width: '100%', maxWidth: 560, textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <Sparkles size={32} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: "#111827", marginBottom: 12 }}>
              Finding neighbors near you...
            </h2>
            <p style={{ fontSize: 15, color: "#6b7280" }}>
              This will just take a moment
            </p>

            <style>{`
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
              }
            `}</style>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  return (
    <OnboardingLayout currentStep="magic">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 24px 48px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          {/* Success Icon + Headline */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 12px 24px rgba(16, 185, 129, 0.3)",
              }}
            >
              <Sparkles size={40} color="#ffffff" strokeWidth={2.5} />
            </div>
            
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 12,
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
              }}
            >
              {headline}
            </h1>
            
            {households.length > 0 && (
              <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 4 }}>
                {households.length} {households.length === 1 ? 'household' : 'households'} within a 5-minute walk
              </p>
            )}
          </div>

      {/* Blurred Household Cards */}
      <div style={{ marginBottom: 32 }}>
        {households.map((household, index) => (
          <div
            key={household.id}
            style={{
              marginBottom: 12,
              padding: 20,
              borderRadius: 16,
              background: "linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)",
              border: "2px solid #e5e7eb",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Blur overlay effect */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(249, 250, 251, 0.4)",
                backdropFilter: "blur(2px)",
                pointerEvents: "none",
              }}
            />

            {/* Avatar placeholder */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                position: "relative",
                zIndex: 1,
              }}
            >
              <Users size={28} color="#3b82f6" />
            </div>

            {/* Content */}
            <div style={{ flex: 1, position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#111827", marginBottom: 4 }}>
                {getHouseholdDescription(household)}
              </div>
              <div style={{ fontSize: 14, color: "#6b7280" }}>
                ~{household.distance} {household.distance === 1 ? 'mile' : 'miles'} away
              </div>
            </div>

            {/* Number badge */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: "#6b7280",
                position: "relative",
                zIndex: 1,
              }}
            >
              {index + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Info Card */}
      <div
        style={{
          marginBottom: 28,
          padding: 16,
          borderRadius: 12,
          background: "#f0fdf4",
          border: "1px solid #d1fae5",
          display: "flex",
          alignItems: "start",
          gap: 12,
        }}
      >
        <Sparkles size={20} color="#059669" style={{ marginTop: 2, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: "#065f46", lineHeight: 1.6 }}>
          <strong style={{ color: "#047857" }}>You're all set!</strong> Click 'Browse neighbors' below to see full profiles and start connecting.
        </div>
      </div>

      {/* Primary CTA: Browse Neighbors */}
      <button
        type="button"
        onClick={handleBrowseNeighbors}
        style={{
          width: "100%",
          padding: "16px 24px",
          borderRadius: 999,
          border: "none",
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 16,
          cursor: "pointer",
          boxShadow: "0 10px 18px rgba(5, 150, 105, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.4)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 10px 18px rgba(5, 150, 105, 0.35)";
        }}
      >
        <Users size={20} />
        Browse neighbors
      </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// Named export used by App.tsx
export function OnboardingMagicMoment() {
  return <OnboardingMagicMomentInner />;
}

// Default export
export default OnboardingMagicMoment;
