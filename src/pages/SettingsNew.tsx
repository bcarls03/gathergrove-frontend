// src/pages/SettingsNew.tsx
import { useEffect, useState } from "react";
import { User, Mail, Home, UsersRound, Link as LinkIcon, Unlink, Save, Baby, UserRound, Heart, Plus, X, Search } from "lucide-react";
import { motion } from "framer-motion";
import {
  getMyProfile,
  updateMyProfile,
  getMyHousehold,
  createHousehold,
  updateMyHousehold,
  unlinkFromHousehold,
  type UserProfile,
  type UserVisibility,
  type Household,
  type HouseholdType,
  type HouseholdCreate,
  type HouseholdUpdate,
} from "../lib/api";
import { HOUSEHOLD_TYPE_META, type HouseholdType as HouseholdTypeLabel } from "../components/filters/householdMeta";

// Mapping from API snake_case to display labels
const HOUSEHOLD_TYPE_LABEL: Record<HouseholdType, HouseholdTypeLabel> = {
  family_with_kids: "Family with Kids",
  empty_nesters: "Empty Nesters",
  singles_couples: "Singles/Couples",
};

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 24,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  width: "100%",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  color: "#111827",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const buttonStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 8,
  border: "none",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export default function SettingsNew() {
  // User Profile State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [visibility, setVisibility] = useState<UserVisibility>("neighbors");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Household State
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdName, setHouseholdName] = useState("");
  const [householdType, setHouseholdType] = useState<HouseholdType | "">("");
  const [householdLoading, setHouseholdLoading] = useState(true);
  const [householdSaving, setHouseholdSaving] = useState(false);

  // Kids State
  type Kid = {
    id: string;
    birthMonth: string;
    birthYear: string;
    gender: string;
  };
  const [kids, setKids] = useState<Kid[]>([]);

  // Interests State
  const [interests, setInterests] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]); // Start with all collapsed
  const [interestSearch, setInterestSearch] = useState(""); // Search state
  
  // Curated list of family-friendly interests organized by category
  const INTEREST_CATEGORIES = {
    'Active & Outdoors': [
      'Hiking & Trails',
      'Running & Jogging',
      'Cycling & Biking',
      'Swimming & Water Sports',
      'Yoga & Pilates',
      'Camping & Nature',
      'Rock Climbing',
      'Winter Sports',
      'Fishing',
      'Birdwatching',
    ],
    'Sports & Recreation': [
      'Golf',
      'Tennis',
      'Pickleball',
      'Basketball',
      'Soccer',
      'Volleyball',
      'Softball & Baseball',
      'Bowling',
      'Disc Golf',
      'Table Tennis & Pool',
    ],
    'Creative & Arts': [
      'Arts & Crafts',
      'Photography',
      'Music & Instruments',
      'Dance',
      'Writing & Journaling',
      'Painting & Drawing',
      'Pottery & Ceramics',
      'Woodworking',
    ],
    'Home & DIY': [
      'Cooking & Baking',
      'Grilling & BBQ',
      'Gardening',
      'DIY & Home Improvement',
      'Interior Design',
      'Home Organization',
    ],
    'Kids & Family': [
      'Parenting & Childcare',
      'Playdates & Activities',
      'School Involvement',
      'Family Game Nights',
    ],
    'Pets & Animals': [
      'Dog Walking',
      'Pet Care & Training',
      'Animal Rescue & Volunteering',
    ],
    'Food, Drink & Social': [
      'Coffee & Cafés',
      'Wine & Wine Tasting',
      'Craft Beer & Breweries',
      'Cocktails & Mixology',
      'Foodie & Restaurants',
      'Farmers Markets',
      'Trivia Nights',
      'Book Clubs',
    ],
    'Entertainment & Games': [
      'Movies & TV',
      'Board Games',
      'Card Games & Poker',
      'Fantasy Sports',
      'Sports Watching & Tailgating',
      'Tabletop RPGs',
      'Video Games',
      'Puzzles',
      'Reading & Books',
      'Live Music & Concerts',
      'Podcasts',
    ],
    'Learning & Wellness': [
      'Mental Health & Mindfulness',
      'Language Learning',
      'Sustainable Living',
      'Cooking Classes',
      'Technology & Coding',
      'History & Culture',
      'Fitness & Nutrition',
    ],
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  // Toggle interest selection
  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const saveInterests = async () => {
    // TODO: Save interests to backend
    console.log("Saving interests:", interests);
    setSuccess("Interests saved successfully!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadHousehold();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await getMyProfile();
      setProfile(data);
      setFirstName(data.first_name);
      setLastName(data.last_name);
      setEmail(data.email);
      setVisibility(data.visibility || "neighbors");
    } catch (err: any) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const loadHousehold = async () => {
    try {
      const data = await getMyHousehold();
      if (data) {
        console.log("📦 Loaded household:", data);
        console.log("📦 Household type:", data.household_type);
        setHousehold(data);
        setHouseholdName(data.name);
        setHouseholdType(data.household_type || "");
        console.log("📦 Set householdType state to:", data.household_type || "");
      }
    } catch (err: any) {
      console.error("Failed to load household:", err);
      // 404 is expected if user has no household
    } finally {
      setHouseholdLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateMyProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        visibility,
      });
      setProfile(updated);
      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!householdName.trim() || !householdType) return;

    setHouseholdSaving(true);
    setError(null);
    setSuccess(null);

    const payload: HouseholdCreate = {
      name: householdName.trim(),
      household_type: householdType as HouseholdType,
    };

    try {
      const created = await createHousehold(payload);
      setHousehold(created);
      setSuccess("Household created successfully!");
      // Reload profile to get updated household_id
      await loadProfile();
    } catch (err: any) {
      // If user is already linked to a household, try unlinking first
      if (err?.message?.includes("already linked to household")) {
        try {
          console.log("User already linked, unlinking first...");
          await unlinkFromHousehold();
          // Now try creating again
          const created = await createHousehold(payload);
          setHousehold(created);
          setSuccess("Household created successfully!");
          await loadProfile();
        } catch (retryErr: any) {
          setError(retryErr?.message || "Failed to create household after unlinking");
        }
      } else {
        setError(err?.message || "Failed to create household");
      }
    } finally {
      setHouseholdSaving(false);
    }
  };

  const handleUpdateHousehold = async () => {
    if (!household || !householdName.trim()) return;

    setHouseholdSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: HouseholdUpdate = {
        name: householdName.trim(),
        household_type: householdType || null,
      };
      const updated = await updateMyHousehold(payload);
      setHousehold(updated);
      setSuccess("Household updated successfully!");
    } catch (err: any) {
      setError(err?.message || "Failed to update household");
    } finally {
      setHouseholdSaving(false);
    }
  };

  const handleUnlinkHousehold = async () => {
    if (!confirm("Are you sure you want to leave this household?")) return;

    setHouseholdSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await unlinkFromHousehold();
      setHousehold(null);
      setHouseholdName("");
      setHouseholdType("");
      setSuccess("Left household successfully!");
      // Reload profile to get updated household_id (null)
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || "Failed to leave household");
    } finally {
      setHouseholdSaving(false);
    }
  };

  if (profileLoading || householdLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="gg-page page-header-wrapper" style={{ paddingBottom: 80 }}>
      <h1 className="page-header-title">Me</h1>
      <p className="page-header-subtitle">
        Your household, privacy, and account settings
      </p>

      {/* Success/Error Messages */}
      {success && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            color: "#166534",
            marginBottom: 16,
          }}
        >
          {success}
        </div>
      )}
      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: "#fee2e2",
            border: "1px solid #fecaca",
            color: "#991b1b",
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 1: USER PROFILE */}
      {/* =================================================================== */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <User size={20} />
          Your Profile
        </h2>

        <div style={{ display: "grid", gap: 16 }}>
          {/* First Name */}
          <div>
            <label htmlFor="firstName" style={labelStyle}>
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="lastName" style={labelStyle}>
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" style={labelStyle}>
              <Mail size={14} style={{ display: "inline", marginRight: 4 }} />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Visibility */}
          <div>
            <label htmlFor="visibility" style={labelStyle}>
              Profile Visibility
            </label>
            <select
              id="visibility"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as UserVisibility)}
              style={inputStyle}
            >
              <option value="private">Private (only me)</option>
              <option value="neighbors">Neighbors (default)</option>
              <option value="public">Public (everyone)</option>
            </select>
            <p style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              Who can see your profile in the directory
            </p>
          </div>

          {/* Save Profile Button */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSaveProfile}
            disabled={profileSaving}
            style={{
              ...buttonStyle,
              background: "#10b981",
              color: "#ffffff",
              opacity: profileSaving ? 0.6 : 1,
            }}
          >
            <Save size={16} />
            {profileSaving ? "Saving..." : "Save Profile"}
          </motion.button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SECTION 2: HOUSEHOLD */}
      {/* =================================================================== */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Home size={20} />
          Household
        </h2>

        {!household ? (
          // No household - show creation form
          <div>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
              You're not part of a household yet. Create one below.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {/* Household Name */}
              <div>
                <label htmlFor="householdName" style={labelStyle}>
                  Household Name
                </label>
                <input
                  id="householdName"
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="The Smith Family"
                  style={inputStyle}
                />
              </div>

              {/* Household Type */}
              <div>
                <label htmlFor="householdType" style={labelStyle}>
                  Household Type
                </label>
                <select
                  id="householdType"
                  value={householdType}
                  onChange={(e) => setHouseholdType(e.target.value as HouseholdType)}
                  style={inputStyle}
                >
                  <option value="">Select type</option>
                  <option value="family_with_kids">Family with Kids</option>
                  <option value="empty_nesters">Empty Nesters</option>
                  <option value="singles_couples">Singles/Couples</option>
                </select>
                
                {/* Visual Preview of Selected Type */}
                {householdType && (() => {
                  const label = HOUSEHOLD_TYPE_LABEL[householdType];
                  const meta = HOUSEHOLD_TYPE_META[label];
                  const Icon = meta.Icon;
                  
                  return (
                    <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: meta.iconBg,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Icon size={18} color={meta.iconColor} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>
                          {label}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Create Button */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateHousehold}
                disabled={householdSaving || !householdName.trim() || !householdType}
                style={{
                  ...buttonStyle,
                  background: householdName.trim() && householdType ? "#10b981" : "#d1d5db",
                  color: "#ffffff",
                  opacity: householdSaving ? 0.6 : 1,
                  cursor: householdName.trim() && householdType ? "pointer" : "not-allowed",
                }}
              >
                <Home size={16} />
                {householdSaving ? "Creating..." : "Create Household"}
              </motion.button>
            </div>
          </div>
        ) : (
          // Has household - show edit form
          <div>
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LinkIcon size={16} style={{ color: "#10b981" }} />
              <span style={{ fontSize: 13, color: "#166534" }}>
                You're part of: <strong>{household.name}</strong>
              </span>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {/* Household Name */}
              <div>
                <label htmlFor="householdNameEdit" style={labelStyle}>
                  Household Name
                </label>
                <input
                  id="householdNameEdit"
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Household Type - Card Based Selection */}
              <div>
                <label style={labelStyle}>Household Type</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                  {/* Family with Kids */}
                  <button
                    type="button"
                    onClick={() => setHouseholdType("family_with_kids")}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: householdType === "family_with_kids" ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: householdType === "family_with_kids" ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <UsersRound size={24} color="#334155" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                        Family with Kids
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Household with children at home
                      </div>
                    </div>
                  </button>

                  {/* Empty Nesters */}
                  <button
                    type="button"
                    onClick={() => setHouseholdType("empty_nesters")}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: householdType === "empty_nesters" ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: householdType === "empty_nesters" ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <Home size={24} color="#334155" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                        Empty Nesters
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Children have moved out
                      </div>
                    </div>
                  </button>

                  {/* Singles/Couples */}
                  <button
                    type="button"
                    onClick={() => setHouseholdType("singles_couples")}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: householdType === "singles_couples" ? "2px solid #10b981" : "2px solid #e5e7eb",
                      background: householdType === "singles_couples" ? "#f0fdf4" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "#f1f5f9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <UserRound size={24} color="#334155" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 2 }}>
                        Singles/Couples
                      </div>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>
                        Household without children
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Member Count */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <UsersRound size={16} style={{ color: "#6b7280" }} />
                  <span style={{ fontSize: 13, color: "#6b7280" }}>
                    Members: {household.member_uids?.length || 1}
                  </span>
                </div>
              </div>

              {/* Link to Advanced Household Management */}
              <div
                style={{
                  padding: 12,
                  borderRadius: 8,
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  marginBottom: 8,
                }}
              >
                <a
                  href="/settings/household"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#667eea",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <UsersRound size={16} />
                    Manage Members & Invites
                  </span>
                  <span>→</span>
                </a>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "grid", gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpdateHousehold}
                  disabled={householdSaving || !householdName.trim()}
                  style={{
                    ...buttonStyle,
                    background: "#10b981",
                    color: "#ffffff",
                    opacity: householdSaving ? 0.6 : 1,
                  }}
                >
                  <Save size={16} />
                  {householdSaving ? "Saving..." : "Save Changes"}
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUnlinkHousehold}
                  disabled={householdSaving}
                  style={{
                    ...buttonStyle,
                    background: "#ffffff",
                    color: "#ef4444",
                    border: "1px solid #fecaca",
                    opacity: householdSaving ? 0.6 : 1,
                  }}
                >
                  <Unlink size={16} />
                  Leave Household
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SECTION 3: KIDS */}
      {/* =================================================================== */}
      {(() => {
        const shouldShow = household && householdType === "family_with_kids";
        console.log("🧒 Kids section check:", { household: !!household, householdType, shouldShow });
        return shouldShow;
      })() && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Baby size={20} />
            Children
          </h2>

          <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
            Add your children to help find families with kids of similar ages. No names or photos needed.
          </p>

          {kids.map((kid, index) => (
            <div key={kid.id} style={{ 
              padding: 20, 
              borderRadius: 16, 
              border: "2px solid #e5e7eb", 
              marginBottom: 16,
              background: "#ffffff",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>Child {index + 1}</span>
                {kids.length > 1 && (
                  <button
                    onClick={() => setKids(kids.filter(k => k.id !== kid.id))}
                    style={{
                      padding: 4,
                      border: "none",
                      background: "transparent",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Birth Year */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6 }}>
                  Birth Year *
                </label>
                <select
                  value={kid.birthYear}
                  onChange={(e) => {
                    const updated = [...kids];
                    updated[index].birthYear = e.target.value;
                    setKids(updated);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 26 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={year}>{year}</option>;
                  })}
                </select>
              </div>

              {/* Birth Month */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6 }}>
                  Birth Month *
                </label>
                <select
                  value={kid.birthMonth}
                  onChange={(e) => {
                    const updated = [...kids];
                    updated[index].birthMonth = e.target.value;
                    setKids(updated);
                  }}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "2px solid #e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select month</option>
                  {[
                    { value: "1", label: "January" },
                    { value: "2", label: "February" },
                    { value: "3", label: "March" },
                    { value: "4", label: "April" },
                    { value: "5", label: "May" },
                    { value: "6", label: "June" },
                    { value: "7", label: "July" },
                    { value: "8", label: "August" },
                    { value: "9", label: "September" },
                    { value: "10", label: "October" },
                    { value: "11", label: "November" },
                    { value: "12", label: "December" },
                  ].map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Gender - Button Toggles */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#6b7280", marginBottom: 6 }}>
                  Gender (optional)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "prefer_not_to_say", label: "Prefer not to say" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        const updated = [...kids];
                        updated[index].gender = option.value;
                        setKids(updated);
                      }}
                      style={{
                        flex: 1,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: kid.gender === option.value ? "2px solid #10b981" : "2px solid #e5e7eb",
                        background: kid.gender === option.value ? "#f0fdf4" : "#ffffff",
                        fontSize: 13,
                        fontWeight: kid.gender === option.value ? 600 : 500,
                        color: kid.gender === option.value ? "#10b981" : "#6b7280",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setKids([...kids, { 
              id: crypto.randomUUID(), 
              birthMonth: "", 
              birthYear: "", 
              gender: "" 
            }])}
            style={{
              ...buttonStyle,
              background: "#f3f4f6",
              color: "#374151",
              border: "2px solid #e5e7eb",
              marginBottom: 16,
            }}
          >
            <Plus size={16} />
            Add Child
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={async () => {
              // TODO: Save kids to backend
              console.log("Saving kids:", kids);
              setSuccess("Children saved successfully!");
              setTimeout(() => setSuccess(null), 3000);
            }}
            style={{
              ...buttonStyle,
              background: "#10b981",
              color: "#ffffff",
            }}
          >
            <Save size={16} />
            Save Children
          </motion.button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SECTION 4: INTERESTS */}
      {/* =================================================================== */}
      <div style={cardStyle}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Heart size={20} />
          Interests
        </h2>

        <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>
          Select your hobbies and interests to connect with like-minded neighbors.
        </p>

        {/* Search Bar */}
        <div style={{ marginBottom: 16, position: "relative" }}>
          <Search
            size={18}
            color="#9ca3af"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search interests (e.g., hiking, cooking, yoga)..."
            value={interestSearch}
            onChange={(e) => setInterestSearch(e.target.value)}
            style={{
              ...inputStyle,
              paddingLeft: 40,
            }}
          />
        </div>

        {/* Selected count - Dynamic with names */}
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: interests.length > 0 ? "#f0fdf4" : "#f9fafb",
          borderRadius: 8,
          border: interests.length > 0 ? "2px solid #d1fae5" : "2px solid #e5e7eb",
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: interests.length > 0 ? "#059669" : "#6b7280" }}>
            {interests.length === 0 && "0 interests selected"}
            {interests.length === 1 && `1 interest: ${interests[0]}`}
            {interests.length === 2 && `2 interests: ${interests.join(", ")}`}
            {interests.length === 3 && `3 interests: ${interests.join(", ")}`}
            {interests.length > 3 && 
              `${interests.length} interests: ${interests.slice(0, 3).join(", ")}, and ${interests.length - 3} more`
            }
          </div>
        </div>

        {/* Categorized Interest Selection */}
        <div style={{ marginBottom: 16 }}>
          {Object.entries(INTEREST_CATEGORIES).map(([category, categoryInterests]) => {
            // Filter interests based on search
            const filteredInterests = interestSearch.trim()
              ? categoryInterests.filter(interest =>
                  interest.toLowerCase().includes(interestSearch.toLowerCase())
                )
              : categoryInterests;

            // Hide category if search has no matches
            if (interestSearch.trim() && filteredInterests.length === 0) {
              return null;
            }

            // Auto-expand when searching, otherwise use state
            const isExpanded = interestSearch.trim() || expandedCategories.includes(category);
            const selectedInCategory = filteredInterests.filter(i => interests.includes(i)).length;
            
            return (
              <div key={category} style={{ marginBottom: 12 }}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: isExpanded ? "#f0fdf4" : "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#111827",
                    transition: "all 0.2s",
                  }}
                >
                  <span>{category}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {selectedInCategory > 0 && (
                      <span style={{
                        fontSize: 12,
                        color: "#059669",
                        background: "#d1fae5",
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontWeight: 500,
                      }}>
                        {selectedInCategory}
                      </span>
                    )}
                    <span style={{ 
                      fontSize: 16, 
                      color: "#6b7280",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      display: "inline-block",
                    }}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* Category Interests (Collapsible) */}
                {isExpanded && (
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", 
                    gap: 8, 
                    marginTop: 8,
                    paddingLeft: 8,
                  }}>
                    {filteredInterests.map((interest) => {
                      const isSelected = interests.includes(interest);
                      return (
                        <motion.button
                          key={interest}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => toggleInterest(interest)}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 8,
                            border: isSelected ? "2px solid #10b981" : "2px solid #e5e7eb",
                            background: isSelected ? "#d1fae5" : "#ffffff",
                            color: isSelected ? "#065f46" : "#374151",
                            fontSize: 13,
                            fontWeight: isSelected ? 600 : 500,
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>{interest}</span>
                          {isSelected && (
                            <div style={{
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "#10b981",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#ffffff",
                              fontSize: 11,
                            }}>
                              ✓
                            </div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={saveInterests}
          style={{
            ...buttonStyle,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            width: "100%",
            justifyContent: "center",
          }}
        >
          <Save size={16} />
          Save Interests
        </motion.button>
      </div>

      {/* Profile Info */}
      <div
        style={{
          marginTop: 24,
          padding: 16,
          borderRadius: 8,
          background: "#f9fafb",
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        <p>
          <strong>Your UID:</strong> {profile?.uid}
        </p>
        {profile?.household_id && (
          <p style={{ marginTop: 4 }}>
            <strong>Household ID:</strong> {profile.household_id}
          </p>
        )}
      </div>
    </div>
  );
}
