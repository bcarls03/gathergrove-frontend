// src/pages/ProfileSettings.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Home, Users, Heart, Camera } from "lucide-react";
import { motion } from "framer-motion";
import type { Group, HouseholdMetadata } from "../types/group";

export default function ProfileSettings() {
  const navigate = useNavigate();

  // Personal Info State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email] = useState(""); // Read-only, from login
  const [photo] = useState<string | null>(null); // Upload coming soon

  // Household State
  const [householdType, setHouseholdType] = useState<'family' | 'singles' | 'empty-nesters' | null>(null);
  const [householdName, setHouseholdName] = useState("");

  // Invite State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  // Kids State (for families)
  type KidForm = {
    id: string;
    birthMonth: string; // "1".."12"
    birthYear: string; // "2018"
    gender: string; // "Male" | "Female" | "Prefer not to say"
    awayAtCollege: boolean; // lives away from home
    canBabysit: boolean; // can help with babysitting / parent helper
  };
  
  const [children, setChildren] = useState<KidForm[]>([]);

  // Interests State
  const [adultInterests, setAdultInterests] = useState<string[]>([]);
  const [childInterests, setChildInterests] = useState<string[]>([]);

  // Privacy State
  const [visibility, setVisibility] = useState<'neighbors' | 'private' | 'public'>('neighbors');

  // UI State
  const [activeSection, setActiveSection] = useState<'personal' | 'household' | 'interests' | 'privacy'>('personal');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user data on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    // TODO: Fetch user profile from API
    // For now, load from localStorage or use dummy data
    console.log("Loading user profile...");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Build user profile data
      const userProfile = {
        first_name: firstName,
        last_name: lastName,
        email,
        interests: [...adultInterests, ...childInterests],
        visibility,
      };

      console.log("Saving user profile...", userProfile);

      // If household data exists, create a Group object (not hardcoded household entity)
      if (householdType) {
        const householdGroup: Group = {
          id: crypto.randomUUID(), // Generate unique ID
          type: 'household', // ✅ Universal group type
          name: householdName || `${lastName} Family`,
          members: [
            {
              user_id: email || 'current-user-id', // TODO: Replace with real user ID from auth
              role: 'admin',
              joined_at: new Date().toISOString(),
            }
          ],
          metadata: {
            // Household-specific data stored in flexible metadata field
            household_type: householdType,
            children: children.map(c => ({
              birth_month: Number(c.birthMonth),
              birth_year: Number(c.birthYear),
              gender: c.gender,
              away_at_college: c.awayAtCollege,
              can_babysit: c.canBabysit,
            })),
          } as HouseholdMetadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("Creating household group...", householdGroup);

        // TODO: Save to universal groups API
        // await api.post('/api/groups', householdGroup);
        
        // Temporary: Save to localStorage for demo
        localStorage.setItem('user_household_group', JSON.stringify(householdGroup));
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Save household data to localStorage (temporary until backend is ready)
      if (householdType) {
        localStorage.setItem('user_household_type', householdType);
      }
      if (children.length > 0) {
        localStorage.setItem('user_has_children', 'true');
      } else {
        localStorage.removeItem('user_has_children');
      }

      // Show success message based on what was saved
      if (householdType && children.length > 0) {
        const shouldNavigate = window.confirm(
          "✨ Profile saved! Your household info is complete.\n\n" +
          "Ready to discover families near you?\n\n" +
          "Click OK to see nearby families, or Cancel to stay here."
        );
        if (shouldNavigate) {
          navigate('/discovery');
        }
      } else if (householdType) {
        alert("✅ Profile saved! Add children (if applicable) to unlock more connections.");
      } else {
        alert("✅ Profile saved! Add your household type to start discovering neighbors.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Helper constants and functions for kids
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const currentYear = new Date().getFullYear();
  const YEARS = Array.from({ length: 26 }, (_, i) => String(currentYear - i)); // 0-25 years old

  const computeAgeFromKid = (kid: KidForm): number | null => {
    if (!kid.birthYear) return null;
    const yearNum = Number(kid.birthYear);
    if (Number.isNaN(yearNum)) return null;

    const today = new Date();
    let age = today.getFullYear() - yearNum;

    if (kid.birthMonth) {
      const monthNum = Number(kid.birthMonth);
      if (!Number.isNaN(monthNum)) {
        const hasHadBirthdayThisYear =
          today.getMonth() + 1 > monthNum ||
          (today.getMonth() + 1 === monthNum && today.getDate() >= 1);
        if (!hasHadBirthdayThisYear) {
          age -= 1;
        }
      }
    }

    if (age < 0) age = 0;
    return age;
  };

  const buildChildPreview = (kid: KidForm): string => {
    if (!kid.birthMonth || !kid.birthYear) return "";

    const month = Number(kid.birthMonth);
    const year = Number(kid.birthYear);
    if (!month || !year) return "";

    const today = new Date();
    let age = today.getFullYear() - year;
    const hasHadBirthdayThisYear =
      today.getMonth() + 1 > month ||
      (today.getMonth() + 1 === month && today.getDate() >= 1);
    if (!hasHadBirthdayThisYear) age -= 1;
    if (age < 0) age = 0;

    const parts: string[] = [`Age ${age}`];

    if (kid.gender === "Male" || kid.gender === "Female") {
      parts.push(kid.gender);
    } else if (kid.gender === "Prefer not to say") {
      parts.push("(gender hidden)");
    }

    if (kid.awayAtCollege) parts.push("Lives away from home");
    if (kid.canBabysit) parts.push("Babysitting helper");

    return parts.join(" · ");
  };

  const addChild = () => {
    setChildren([
      ...children,
      {
        id: crypto.randomUUID(),
        birthMonth: '',
        birthYear: '',
        gender: '',
        awayAtCollege: false,
        canBabysit: false,
      }
    ]);
  };

  const removeChild = (id: string) => {
    setChildren(children.filter(c => c.id !== id));
  };

  const updateChild = (id: string, field: keyof Omit<KidForm, 'id'>, value: string | boolean) => {
    setChildren(children.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleSendInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setInviteStatus("Please enter a valid email address");
      return;
    }

    try {
      // TODO: Replace with real API call
      console.log("Sending invite to:", inviteEmail);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, just show success
      setInviteStatus(`✅ Invitation sent to ${inviteEmail}!`);
      setInviteEmail("");
      
      // TODO: Actual API call would be:
      // await api.post('/api/households/invites', {
      //   email: inviteEmail,
      //   household_id: currentHouseholdId,
      // });
      
    } catch (err: any) {
      setInviteStatus(`❌ Failed to send invite: ${err.message}`);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f9fafb',
      paddingBottom: 80 
    }}>
      {/* Header */}
      <div style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        position: 'sticky',
        top: 57, // Height of top nav bar
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ 
          maxWidth: 800, 
          margin: '0 auto', 
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#374151',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            ← Back to Home
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Profile Settings
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: saving ? '#d1d5db' : '#10b981',
              color: '#ffffff',
              fontSize: 14,
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Sticky Tabs Container */}
      <div style={{
        position: 'sticky',
        top: 130, // Height of top nav (57px) + header (73px)
        zIndex: 9,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          {/* Section Tabs */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderBottom: '2px solid #e5e7eb',
          }}>
          {[
            { id: 'personal', label: 'Personal Info', icon: User },
            { id: 'household', label: 'Household', icon: Home },
            { id: 'interests', label: 'Interests', icon: Heart },
            { id: 'privacy', label: 'Privacy', icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id as any)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                color: activeSection === id ? '#10b981' : '#6b7280',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                borderBottom: activeSection === id ? '3px solid #10b981' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Error Message */}
        {error && (
          <div style={{
            padding: 16,
            borderRadius: 12,
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            fontSize: 14,
            marginBottom: 24,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Personal Info Section */}
        {activeSection === 'personal' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              padding: 32,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#111827' }}>
                Personal Information
              </h2>

              {/* Profile Photo */}
              <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <div style={{
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: photo ? `url(${photo})` : '#e5e7eb',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '4px solid #f3f4f6',
                }}>
                  {!photo && <Camera size={32} color="#9ca3af" />}
                </div>
                <button
                  onClick={() => alert("Photo upload would trigger here")}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    background: '#ffffff',
                    color: '#374151',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Upload Photo
                </button>
              </div>

              {/* Name Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sarah"
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  Email *
                  <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginLeft: 8 }}>
                    (from your account)
                  </span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={true}
                  placeholder="you@example.com"
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid #d1d5db',
                    fontSize: 14,
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'not-allowed',
                  }}
                />
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 6, marginBottom: 0 }}>
                  This is your login email and cannot be changed
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Household Section */}
        {activeSection === 'household' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              padding: 32,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
                Household Information
              </h2>

              {/* Discovery Context Card */}
              {!householdType && (
                <div style={{ 
                  padding: 16, 
                  background: '#eff6ff',
                  borderRadius: 12, 
                  marginBottom: 24,
                  border: '1px solid #dbeafe'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>
                    🔍 Why add household info?
                  </div>
                  <div style={{ fontSize: 13, color: '#1e3a8a', lineHeight: 1.6 }}>
                    Help neighbors find you for playdates, carpools, and events. 
                    You'll discover families with similar interests nearby.
                  </div>
                </div>
              )}

              {/* Household Type Selection */}
              <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                  Household Type
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { 
                      value: 'family', 
                      icon: Users, 
                      iconBg: '#DBEAFE',
                      label: 'Family with Kids',
                      subtitle: 'Household with children at home.'
                    },
                    { 
                      value: 'singles', 
                      icon: Heart, 
                      iconBg: '#EDE9FE',
                      label: 'Singles/Couples',
                      subtitle: 'Household without children.'
                    },
                    { 
                      value: 'empty-nesters', 
                      icon: Home, 
                      iconBg: '#FEF3C7',
                      label: 'Empty Nesters',
                      subtitle: 'Children have moved out.'
                    },
                  ].map(({ value, icon: Icon, iconBg, label, subtitle }) => {
                    const active = householdType === value;
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => setHouseholdType(value as any)}
                        whileTap={{ scale: 0.98 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.1, ease: 'easeOut' }}
                        style={{
                          textAlign: 'left',
                          padding: '10px 14px',
                          borderRadius: 14,
                          border: active
                            ? '1px solid rgba(16,185,129,.7)'
                            : '1px solid #e5e7eb',
                          background: active ? '#ecfdf5' : '#f9fafb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                          boxShadow: active
                            ? '0 8px 18px rgba(16,185,129,0.20)'
                            : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 12,
                              background: iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon size={18} />
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                              {label}
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                              {subtitle}
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* What You'll Unlock Card */}
              {householdType === 'family' && (
                <div style={{ 
                  marginBottom: 32,
                  padding: 16, 
                  background: '#f0fdf4', 
                  borderRadius: 12,
                  border: '1px solid #d1fae5'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#047857', marginBottom: 8 }}>
                    🎉 You'll unlock:
                  </div>
                  <ul style={{ fontSize: 13, color: '#065f46', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                    <li>Playdate events with families nearby</li>
                    <li>School carpool connections</li>
                    <li>Parent helper network</li>
                  </ul>
                </div>
              )}

              {householdType === 'singles' && (
                <div style={{ 
                  marginBottom: 32,
                  padding: 16, 
                  background: '#faf5ff', 
                  borderRadius: 12,
                  border: '1px solid #e9d5ff'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', marginBottom: 8 }}>
                    🎉 You'll unlock:
                  </div>
                  <ul style={{ fontSize: 13, color: '#6b21a8', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                    <li>Social events and game nights</li>
                    <li>Dinner clubs and happy hours</li>
                    <li>Sports and outdoor activities</li>
                  </ul>
                </div>
              )}

              {householdType === 'empty-nesters' && (
                <div style={{ 
                  marginBottom: 32,
                  padding: 16, 
                  background: '#fffbeb', 
                  borderRadius: 12,
                  border: '1px solid #fde68a'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#b45309', marginBottom: 8 }}>
                    🎉 You'll unlock:
                  </div>
                  <ul style={{ fontSize: 13, color: '#92400e', margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                    <li>Book clubs and garden tours</li>
                    <li>Travel and adventure groups</li>
                    <li>Wine tastings and cultural events</li>
                  </ul>
                </div>
              )}

              {/* Household Name */}
              {householdType && (
                <div style={{ marginBottom: 32 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                    Household Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="The Smith Family"
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 8,
                      border: '1px solid #d1d5db',
                      fontSize: 14,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Invite Family Members Section */}
              {householdType && (
                <div style={{ marginBottom: 32, padding: 20, background: '#f0fdf4', borderRadius: 12, border: '1px solid #d1fae5' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: '#065f46' }}>
                    👥 Invite Family Members
                  </h3>
                  <p style={{ fontSize: 13, color: '#047857', marginBottom: 16 }}>
                    Invite your spouse, partner, or other household members to join
                  </p>
                  
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="email"
                      placeholder="Enter email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      style={{
                        flex: 1,
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid #d1d5db',
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleSendInvite}
                      disabled={!inviteEmail || !inviteEmail.includes('@')}
                      style={{
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: !inviteEmail || !inviteEmail.includes('@') ? '#d1d5db' : '#10b981',
                        color: '#ffffff',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: !inviteEmail || !inviteEmail.includes('@') ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Send Invite
                    </button>
                  </div>
                  
                  {inviteStatus && (
                    <div style={{
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 8,
                      background: inviteStatus.includes('sent') || inviteStatus.includes('✅') ? '#d1fae5' : '#fee2e2',
                      color: inviteStatus.includes('sent') || inviteStatus.includes('✅') ? '#065f46' : '#991b1b',
                      fontSize: 13,
                    }}>
                      {inviteStatus}
                    </div>
                  )}
                </div>
              )}

              {/* Kids Section (Only for Families) */}
              {householdType === 'family' && (
                <div>
                  <div style={{ 
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#374151',
                  }}>
                    Children in your home
                  </div>

                  {children.map((child, index) => {
                    const preview = buildChildPreview(child);
                    const age = computeAgeFromKid(child);

                    return (
                      <div
                        key={child.id}
                        style={{
                          borderRadius: 14,
                          border: '1px solid #e5e7eb',
                          padding: 12,
                          marginBottom: 8,
                          background: '#f9fafb',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 8,
                          fontSize: 12,
                          color: '#4b5563',
                        }}>
                          <span>Child {index + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeChild(child.id)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              fontSize: 12,
                              color: '#6b7280',
                              cursor: 'pointer',
                            }}
                          >
                            Remove
                          </button>
                        </div>

                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1.2fr 1fr 1.2fr',
                          gap: 8,
                        }}>
                          <select
                            value={child.birthMonth}
                            onChange={(e) => updateChild(child.id, 'birthMonth', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderColor: '#d1d5db',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              background: '#ffffff',
                            }}
                          >
                            <option value="">Month</option>
                            {MONTHS.map((m, idx) => (
                              <option key={m} value={idx + 1}>
                                {m}
                              </option>
                            ))}
                          </select>

                          <select
                            value={child.birthYear}
                            onChange={(e) => updateChild(child.id, 'birthYear', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderColor: '#d1d5db',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              background: '#ffffff',
                            }}
                          >
                            <option value="">Year</option>
                            {YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>

                          <select
                            value={child.gender}
                            onChange={(e) => updateChild(child.id, 'gender', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              borderRadius: 10,
                              borderWidth: 1,
                              borderStyle: 'solid',
                              borderColor: '#d1d5db',
                              fontSize: 13,
                              boxSizing: 'border-box',
                              background: '#ffffff',
                            }}
                          >
                            <option value="">Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Prefer not to say">Prefer not to say</option>
                          </select>
                        </div>

                        {preview && (
                          <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                            Preview: {preview}
                          </div>
                        )}

                        {age !== null && age >= 18 && (
                          <>
                            <label style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginTop: 8,
                              fontSize: 12,
                              color: '#374151',
                            }}>
                              <input
                                type="checkbox"
                                checked={child.awayAtCollege}
                                onChange={(e) => updateChild(child.id, 'awayAtCollege', e.target.checked)}
                              />
                              <span>Lives away from home (college, work, etc.)</span>
                            </label>
                            <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280' }}>
                              Use this if they're usually away for school or work, not just visiting.
                            </div>
                          </>
                        )}

                        {age !== null && age >= 13 && age <= 25 && (
                          <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 8,
                            fontSize: 12,
                            color: '#374151',
                          }}>
                            <input
                              type="checkbox"
                              checked={child.canBabysit}
                              onChange={(e) => updateChild(child.id, 'canBabysit', e.target.checked)}
                            />
                            <span>Can help with babysitting / parent helper</span>
                          </label>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addChild}
                    style={{
                      marginTop: 4,
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 14,
                      border: '1px dashed #cbd5e1',
                      background: '#f9fafb',
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#10b981',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Child
                  </button>

                  {/* Discovery Preview Card - Shows after adding kids */}
                  {children.length > 0 && children.some(c => c.birthMonth && c.birthYear) && (
                    <div style={{ 
                      marginTop: 16, 
                      padding: 16, 
                      background: '#eff6ff',
                      borderRadius: 12,
                      border: '1px solid #bfdbfe'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 8 }}>
                        ✨ Great! You can now discover:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#1e3a8a', lineHeight: 1.8 }}>
                        {children.filter(c => c.birthMonth && c.birthYear).map((child) => {
                          const age = computeAgeFromKid(child);
                          if (age === null) return null;
                          const ageRange = age <= 5 ? '0-5' : age <= 12 ? '6-12' : '13+';
                          return (
                            <li key={child.id}>
                              Families with kids ages {ageRange} (like yours)
                            </li>
                          );
                        }).filter(Boolean).slice(0, 2)}
                        <li>Playdate events in your neighborhood</li>
                        {children.some(c => {
                          const age = computeAgeFromKid(c);
                          return age !== null && age >= 13 && age <= 25 && c.canBabysit;
                        }) && <li>Parent helper connections</li>}
                      </ul>
                      <button
                        onClick={async () => {
                          // Auto-save before navigating to Discovery
                          await handleSave();
                          navigate('/discovery');
                        }}
                        style={{
                          marginTop: 12,
                          width: '100%',
                          padding: '10px 16px',
                          borderRadius: 8,
                          border: 'none',
                          background: '#3b82f6',
                          color: '#ffffff',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        See Nearby Families →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Interests Section */}
        {activeSection === 'interests' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              padding: 32,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: '#111827' }}>
                Interests
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                Help us suggest relevant events and connect you with like-minded neighbors
              </p>

              {/* Adult Interests */}
              <div style={{ marginBottom: 32 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                  Your Interests
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Sports', 'Outdoors', 'Food & Dining', 'Arts & Crafts', 'Gaming', 'Reading', 'Music', 'Gardening', 'Fitness', 'Travel'].map((interest) => (
                    <button
                      key={interest}
                      onClick={() => {
                        setAdultInterests(prev =>
                          prev.includes(interest)
                            ? prev.filter(i => i !== interest)
                            : [...prev, interest]
                        );
                      }}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 20,
                        border: adultInterests.includes(interest) ? '2px solid #10b981' : '2px solid #e5e7eb',
                        background: adultInterests.includes(interest) ? '#f0fdf4' : '#ffffff',
                        color: adultInterests.includes(interest) ? '#047857' : '#6b7280',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Child Interests (if family) */}
              {householdType === 'family' && children.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                    Kids' Interests
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {['Soccer', 'Basketball', 'Dance', 'Swimming', 'Art', 'Music', 'Theater', 'STEM', 'Reading', 'Video Games'].map((interest) => (
                      <button
                        key={interest}
                        onClick={() => {
                          setChildInterests(prev =>
                            prev.includes(interest)
                              ? prev.filter(i => i !== interest)
                              : [...prev, interest]
                          );
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: childInterests.includes(interest) ? '2px solid #10b981' : '2px solid #e5e7eb',
                          background: childInterests.includes(interest) ? '#f0fdf4' : '#ffffff',
                          color: childInterests.includes(interest) ? '#047857' : '#6b7280',
                          fontSize: 13,
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        {interest}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Privacy Section */}
        {activeSection === 'privacy' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div style={{ 
              background: '#ffffff', 
              borderRadius: 16, 
              padding: 32,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#111827' }}>
                Privacy Settings
              </h2>

              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
                Profile Visibility
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { value: 'neighbors', icon: '🏘️', label: 'Neighbors', desc: 'Visible to neighbors in your area—they can see your profile and reach out' },
                  { value: 'private', icon: '🔒', label: 'Private', desc: 'Only people you\'ve already connected with can see your profile' },
                  { value: 'public', icon: '🌍', label: 'Public', desc: 'Visible to everyone on GatherGrove (great for event organizers)' },
                ].map(({ value, icon, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => setVisibility(value as any)}
                    style={{
                      padding: 20,
                      borderRadius: 12,
                      border: visibility === value ? '2px solid #10b981' : '2px solid #e5e7eb',
                      background: visibility === value ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'start', gap: 12 }}>
                      <div style={{ fontSize: 24 }}>{icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                          {desc}
                        </div>
                      </div>
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: visibility === value ? '6px solid #10b981' : '2px solid #d1d5db',
                        flexShrink: 0,
                      }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
