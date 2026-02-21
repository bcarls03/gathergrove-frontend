// src/pages/OnboardingPrivacy.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOnboardingState, setOnboardingState } from "../lib/onboarding";
import { Eye, Lock, MapPin, Search, Users, Heart, Home } from "lucide-react";
import { OnboardingLayout } from "../components/OnboardingLayout";
import { createHousehold, updateMyProfile, getMyHousehold, type Kid as APIKid, type GGHousehold } from "../lib/api";
import HouseholdCard from "../components/HouseholdCard";

// Helper: Calculate current age from birth year/month
function calculateAge(birthYear: number, birthMonth: number): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // JS months are 0-indexed
  
  let age = currentYear - birthYear;
  
  // If birthday hasn't happened yet this year, subtract 1
  if (currentMonth < birthMonth) {
    age -= 1;
  }
  
  return Math.max(0, age); // Ensure non-negative
}

// Helper: Convert age to age range for backward compatibility
function getAgeRange(age: number): "0-2" | "3-5" | "6-8" | "9-12" | "13-17" | "18+" {
  if (age <= 2) return "0-2";
  if (age <= 5) return "3-5";
  if (age <= 8) return "6-8";
  if (age <= 12) return "9-12";
  if (age <= 17) return "13-17";
  return "18+";
}

function OnboardingPrivacyInner() {
  const navigate = useNavigate();
  const state = getOnboardingState();
  
  // Default: visible to nearby neighbors (ON)
  const [isVisible, setIsVisible] = useState(state.visibleToNeighbors ?? true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);

    try {
      // Save visibility preference
      setOnboardingState({
        visibleToNeighbors: isVisible,
      });

      // Try to update user profile with discovery preference
      // (non-blocking - continue even if this fails)
      try {
        await updateMyProfile({
          discovery_opt_in: isVisible,
          visibility: isVisible ? "neighbors" : "private",
        });
      } catch (profileErr) {
        console.warn("Profile update failed, but continuing:", profileErr);
        // Don't block - profile updates are nice-to-have
      }

      // Create household if user provided household type and doesn't already have one
      // (Note: OnboardingKids may have already updated the household if one existed)
      if (state.intendedHouseholdType) {
        // Check if household already exists
        // During initial onboarding, skip API call to avoid 404 noise
        const existingHousehold = state.householdCreated ? await getMyHousehold() : null;
        
        if (!existingHousehold) {
          // Generate household name with proper fallbacks
          // Priority: lastName > firstName > email prefix > "Household"
          let baseName = state.lastName;
          if (!baseName && state.firstName) {
            baseName = state.firstName;
          }
          if (!baseName && state.email) {
            baseName = state.email.split("@")[0];
          }
          if (!baseName) {
            baseName = "Household";
          }
          
          const householdName = `The ${baseName} Family`;
          
          // Map onboarding kids to API format with exact age in years
          let apiKids: APIKid[] | null = null;
          if (state.kids && state.kids.length > 0) {
            apiKids = state.kids.map((k) => {
              const age = k.age_years ?? (k.birthYear && k.birthMonth 
                ? calculateAge(k.birthYear, k.birthMonth)
                : 0);
              const ageRange = k.age_range ?? getAgeRange(age);
              
              return {
                age_years: age,
                age_range: ageRange,
                gender: k.gender || null,
                available_for_babysitting: k.canBabysit || false,
              };
            });
          }
          
          try {
            await createHousehold({
              name: householdName,
              household_type: state.intendedHouseholdType,
              kids: apiKids,
            });
            // Mark household as created to avoid 404s in future onboarding steps
            setOnboardingState({ householdCreated: true });
          } catch (householdErr: any) {
            // If already linked to a household, that's okay - just continue
            if (householdErr?.message?.includes("already linked to household")) {
              console.log("User already has a household, continuing to magic moment");
              setOnboardingState({ householdCreated: true });
            } else {
              // For other errors, throw to outer catch block
              throw householdErr;
            }
          }
        } else {
          console.log("Household already exists, skipping creation");
          setOnboardingState({ householdCreated: true });
        }
      }

      // Navigate to Step 6: Magic Moment (discovery reveal)
      navigate("/onboarding/magic-moment");
    } catch (err: any) {
      console.error("Error completing onboarding:", err);
      setError(err?.message || "Failed to create your household. Please try again.");
      setLoading(false);
    }
  };

  const handleBrowseFirst = async () => {
    setLoading(true);
    setError(null);

    try {
      // V16: Allow users to browse without creating a household
      // If user is already linked to a household, just navigate to discovery
      // (they can unlink later from settings if desired)
      
      try {
        await updateMyProfile({
          discovery_opt_in: false,
          visibility: "private",
        });
      } catch (profileErr) {
        console.warn("Profile update failed, but continuing to browse:", profileErr);
      }

      // Save state to indicate user chose to browse first
      setOnboardingState({
        visibleToNeighbors: false,
        skipHousehold: true,
      });

      // Navigate directly to Discovery page (browse mode)
      navigate("/discovery");
    } catch (err: any) {
      console.error("Error saving preferences:", err);
      // Even if save fails, let them browse
      navigate("/discovery");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    // Go back to kids screen if family, otherwise household selection
    if (hasKids) {
      navigate("/onboarding/kids");
    } else {
      navigate("/onboarding/household");
    }
  };

  // Determine if user has kids based on household type
  const hasKids = state.intendedHouseholdType === "family_with_kids";
  
  // Get household display name (use last name or fallback)
  // In production, OAuth providers will give us real names
  // In dev (Firebase Auth Emulator), we'll see generic names like "Google User"
  const householdName = state.lastName || (state.firstName ? state.firstName : "Your");
  
  // Format kids ages for display
  const kidsAges = state.kids?.map(kid => {
    if (kid.birthYear && kid.birthMonth) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
      
      let age = currentYear - kid.birthYear;
      
      // If birthday hasn't happened yet this year, subtract 1
      if (currentMonth < kid.birthMonth) {
        age = age - 1;
      }
      
      return age;
    } else if (kid.birthYear) {
      // If we only have birth year, assume mid-year birthday
      const currentYear = new Date().getFullYear();
      return currentYear - kid.birthYear;
    }
    // Fallback to age range midpoint
    const ageRangeMap: Record<string, number> = {
      "0-2": 1,
      "3-5": 4,
      "6-8": 7,
      "9-12": 10,
      "13-17": 15,
      "18+": 18,
    };
    return ageRangeMap[kid.age_range] || 5;
  }).filter(age => age > 0) || [];
  
  // Get household type display text
  const getHouseholdTypeText = () => {
    if (state.intendedHouseholdType === "family_with_kids") return "Family with Kids";
    if (state.intendedHouseholdType === "empty_nesters") return "Empty Nesters";
    if (state.intendedHouseholdType === "singles_couples") return "Singles/Couples";
    return "Household";
  };

  // Convert onboarding state to GGHousehold format for HouseholdCard
  const previewHousehold: GGHousehold = {
    lastName: state.lastName || state.firstName || "Your",
    adultNames: [state.firstName || "You"].filter(Boolean),
    householdType: state.intendedHouseholdType || "singles_couples",
    kids: state.kids?.map(kid => ({
      birthYear: kid.birthYear || null,
      birthMonth: kid.birthMonth || null,
      sex: (kid as any).sex ?? (kid as any).gender ?? null,
      awayAtCollege: (kid as any).awayAtCollege ?? (kid as any).away ?? false,
      canBabysit: (kid as any).canBabysit ?? false,
    })) || [],
    location_precision: "zipcode",
    neighborhood: "Your Neighborhood",
  };

  // Helper functions for HouseholdCard
  const getHouseholdTypeIcon = (type?: string) => {
    switch (type) {
      case 'family_with_kids':
      case 'family':
        return <Users size={16} />;
      case 'couple':
        return <Heart size={16} />;
      case 'single_parent':
      case 'single':
      case 'individual':
        return <Home size={16} />;
      default:
        return <Users size={16} />;
    }
  };

  const getHouseholdTypeColor = (type?: string) => {
    switch (type) {
      case 'family_with_kids':
      case 'family':
        return '#3b82f6';
      case 'couple':
        return '#ec4899';
      case 'single_parent':
      case 'single':
      case 'individual':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getHouseholdTypeLabel = (type?: string) => {
    switch (type) {
      case 'family_with_kids':
      case 'single_parent':
        return 'Family with Kids';
      case 'couple':
      case 'single':
      case 'individual':
        return 'Singles/Couples';
      default:
        return 'Household';
    }
  };

  const getDistanceText = () => null;
  
  const normalizeKidGender = (sex?: string | null) => {
    const s = (sex || "").trim().toLowerCase();
    if (!s) return null;
    if (s === "girl" || s === "female" || s === "f") return "girl";
    if (s === "boy" || s === "male" || s === "m") return "boy";
    return null;
  };

  const getGenderSuffix = (sex?: string | null) => {
    const s = (sex || "").trim().toLowerCase();
    if (s === "female" || s === "girl" || s === "f") return "Girl";
    if (s === "male" || s === "boy" || s === "m") return "Boy";
    return "";
  };

  const isAgeInFilterRange = () => true;

  return (
    <OnboardingLayout currentStep="privacy">
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 24px 48px' }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#111827",
                marginBottom: 12,
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
                whiteSpace: "nowrap",
              }}
            >
              Review how neighbors will see you
            </h1>
            <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.5, whiteSpace: "nowrap" }}>
              This is how your household will appear to others in GatherGrove.
            </p>
          </div>

          {/* Household Preview Card */}
          <div style={{ marginBottom: 24 }}>
            <HouseholdCard
              household={previewHousehold}
              householdName={householdName}
              connected={false}
              activeTab="nearby"
              isAgeInFilterRange={isAgeInFilterRange}
              kidsGenderFilter="all"
              normalizeKidGender={normalizeKidGender}
              getGenderSuffix={getGenderSuffix}
              getDistanceText={getDistanceText}
              getHouseholdTypeColor={getHouseholdTypeColor}
              getHouseholdTypeIcon={getHouseholdTypeIcon}
              getHouseholdTypeLabel={getHouseholdTypeLabel}
              kidsAges={kidsAges}
              variant="preview"
            />
          </div>

          {/* Two-Column Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Visible Column */}
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: "#f0fdf4",
                border: "2px solid #d1fae5",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Eye size={20} color="#059669" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#065f46", margin: 0 }}>
                  Visible to Neighbors
                </h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "#047857", fontSize: 13, lineHeight: 1.8 }}>
                <li>Name</li>
                <li>Approx. Distance</li>
                <li>Household Type</li>
              </ul>
            </div>

            {/* Never Shared Column */}
            <div
              style={{
                padding: 20,
                borderRadius: 16,
                background: "#fef2f2",
                border: "2px solid #fecaca",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Lock size={20} color="#dc2626" />
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#991b1b", margin: 0 }}>
                  Never Shared
                </h3>
              </div>
              <ul style={{ margin: 0, paddingLeft: 20, color: "#b91c1c", fontSize: 13, lineHeight: 1.8 }}>
                <li>Exact Address</li>
                <li>Kid's Names/Photos</li>
                <li>Email/Phone</li>
              </ul>
            </div>
          </div>

          {/* Visibility Toggle */}
          <div
            style={{
              marginBottom: 24,
              padding: 20,
              borderRadius: 16,
              background: "#ffffff",
              border: "2px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setIsVisible(!isVisible)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: isVisible ? "#f0fdf4" : "#f3f4f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  <MapPin size={24} color={isVisible ? "#10b981" : "#6b7280"} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                    Visible in Discovery
                  </div>
                  <div style={{ fontSize: 13, color: "#6b7280" }}>
                    {isVisible
                      ? "Recommended to meet neighbors"
                      : "You won't appear in discovery"}
                  </div>
                </div>
              </div>

              {/* Toggle Switch */}
              <div
                style={{
                  width: 52,
                  height: 32,
                  borderRadius: 16,
                  background: isVisible ? "#10b981" : "#d1d5db",
                  position: "relative",
                  transition: "background 0.2s ease",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    left: isVisible ? 24 : 4,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "#ffffff",
                    transition: "left 0.2s ease",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 16,
                borderRadius: 12,
                background: "#fef2f2",
                border: "2px solid #fecaca",
                color: "#dc2626",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 20px",
                borderRadius: 999,
                border: "none",
                background: loading 
                  ? "#d1d5db" 
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 16,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading 
                  ? "none" 
                  : "0 10px 18px rgba(5, 150, 105, 0.35)",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                opacity: loading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 24px rgba(5, 150, 105, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 18px rgba(5, 150, 105, 0.35)";
                }
              }}
            >
              {loading ? "Creating your household..." : "Everything looks good"}
            </button>

            <button
              type="button"
              onClick={handleEdit}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#ffffff";
                }
              }}
            >
              ✏️ Edit Profile
            </button>

            {/* V16: Browse First Option - Skip household creation */}
            <button
              type="button"
              onClick={handleBrowseFirst}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 20px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                color: "#6b7280",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                opacity: loading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#d1d5db";
                  e.currentTarget.style.background = "#f9fafb";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#ffffff";
                }
              }}
            >
              <Search size={16} strokeWidth={2.5} />
              <span>Browse without household (for now)</span>
            </button>
          </div>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// Named export used by App.tsx
export function OnboardingPrivacy() {
  return <OnboardingPrivacyInner />;
}

// Default export
export default OnboardingPrivacy;
