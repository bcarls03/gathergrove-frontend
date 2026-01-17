// src/pages/SettingsNew.tsx
import { useEffect, useState } from "react";
import { User, Mail, Home, Users, Link as LinkIcon, Unlink, Save } from "lucide-react";
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

const cardStyle: React.CSSProperties = {
  marginTop: 16,
  padding: 24,
  borderRadius: 16,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
        setHousehold(data);
        setHouseholdName(data.name);
        setHouseholdType(data.household_type || "");
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

    try {
      const payload: HouseholdCreate = {
        name: householdName.trim(),
        household_type: householdType as HouseholdType,
      };
      const created = await createHousehold(payload);
      setHousehold(created);
      setSuccess("Household created successfully!");
      // Reload profile to get updated household_id
      await loadProfile();
    } catch (err: any) {
      setError(err?.message || "Failed to create household");
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
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Settings</h1>
      <p style={{ fontSize: 15, color: "#6b7280", marginBottom: 24 }}>
        Manage your profile and household
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

              {/* Household Type */}
              <div>
                <label htmlFor="householdTypeEdit" style={labelStyle}>
                  Household Type
                </label>
                <select
                  id="householdTypeEdit"
                  value={householdType}
                  onChange={(e) => setHouseholdType(e.target.value as HouseholdType)}
                  style={inputStyle}
                >
                  <option value="">Select type</option>
                  <option value="family_with_kids">Family with Kids</option>
                  <option value="empty_nesters">Empty Nesters</option>
                  <option value="singles_couples">Singles/Couples</option>
                </select>
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
                  <Users size={16} style={{ color: "#6b7280" }} />
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
                    <Users size={16} />
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
