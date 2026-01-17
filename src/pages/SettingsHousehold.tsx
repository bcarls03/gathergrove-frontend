// src/pages/SettingsHousehold.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Home, 
  Users, 
  Mail, 
  Copy, 
  Check, 
  UserPlus, 
  LogOut,
  Crown,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getMyProfile, 
  getMyHousehold, 
  linkToHousehold, 
  unlinkFromHousehold,
  type Household as ApiHousehold
} from "../lib/api";

type HouseholdMember = {
  uid: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  isAdmin?: boolean;
};

export default function SettingsHousehold() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [household, setHousehold] = useState<ApiHousehold | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadHouseholdData();
  }, []);

  const loadHouseholdData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const profile = await getMyProfile();
      
      if (profile.household_id) {
        const householdData = await getMyHousehold();
        
        if (householdData) {
          setHousehold(householdData);
          
          // TODO: Fetch member details from backend
          // For now, just show UIDs
          const memberList: HouseholdMember[] = (householdData.member_uids || []).map((uid: string) => ({
            uid,
            isAdmin: false, // TODO: Add admin_uid to backend Household model
          }));
          setMembers(memberList);
        }
      }
    } catch (err: any) {
      console.error("Error loading household:", err);
      setError(err?.message || "Failed to load household data");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!household) return;
    
    // Create shareable invite link
    const inviteUrl = `${window.location.origin}/invite/${household.id}`;
    navigator.clipboard.writeText(inviteUrl);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinHousehold = async () => {
    if (!joinCode.trim() || joining) return;
    
    setJoining(true);
    setError(null);
    
    try {
      await linkToHousehold(joinCode.trim());
      setSuccess("Successfully joined household!");
      setShowJoinModal(false);
      setJoinCode("");
      
      // Reload household data
      setTimeout(() => {
        loadHouseholdData();
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to join household");
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!confirm("Are you sure you want to leave this household? This cannot be undone.")) {
      return;
    }
    
    try {
      await unlinkFromHousehold();
      setSuccess("Left household successfully");
      setHousehold(null);
      setMembers([]);
      
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "Failed to leave household");
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{
              width: 48,
              height: 48,
              border: '4px solid #e5e7eb',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              margin: '0 auto 16px',
            }} />
            <p style={{ color: '#6b7280', fontSize: 14 }}>Loading household...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: 800,
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
          <button
            onClick={() => navigate('/settings')}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 20px',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
            }}
          >
            ← Back to Settings
          </button>
        </div>

        {/* Flash Messages */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <AlertCircle size={20} color="#dc2626" />
              <span style={{ color: '#dc2626', fontSize: 14 }}>{error}</span>
            </motion.div>
          )}
          
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                background: '#d1fae5',
                border: '1px solid #6ee7b7',
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Check size={20} color="#059669" />
              <span style={{ color: '#059669', fontSize: 14 }}>{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        {household ? (
          <>
            {/* Household Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'white',
                borderRadius: 16,
                padding: 32,
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Home size={32} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                    {household.name}
                  </h1>
                  {household.household_type && (
                    <p style={{ fontSize: 14, color: '#6b7280' }}>
                      {household.household_type.replace(/_/g, ' ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Members Section */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={20} />
                  Members ({members.length})
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {members.map((member) => (
                    <div
                      key={member.uid}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 16,
                        background: '#f9fafb',
                        borderRadius: 12,
                        border: '1px solid #e5e7eb',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          fontWeight: 600,
                          color: '#1e40af',
                        }}>
                          {member.firstName?.[0] || member.email?.[0] || '?'}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                            {member.firstName && member.lastName 
                              ? `${member.firstName} ${member.lastName}`
                              : member.email || member.uid}
                          </div>
                          {member.email && (
                            <div style={{ fontSize: 12, color: '#6b7280' }}>{member.email}</div>
                          )}
                        </div>
                      </div>
                      
                      {member.isAdmin && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: '#fef3c7',
                          border: '1px solid #fcd34d',
                          borderRadius: 8,
                          padding: '4px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: '#92400e',
                        }}>
                          <Crown size={14} />
                          Admin
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowInviteModal(true)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '14px 24px',
                    color: 'white',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                  }}
                >
                  <UserPlus size={18} />
                  Invite Another Adult
                </button>

                <button
                  onClick={handleLeaveHousehold}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    background: 'white',
                    border: '2px solid #ef4444',
                    borderRadius: 12,
                    padding: '14px 24px',
                    color: '#ef4444',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <LogOut size={18} />
                  Leave Household
                </button>
              </div>
            </motion.div>
          </>
        ) : (
          /* No Household - Show Join Option */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 48,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}>
              <Home size={40} color="#6b7280" />
            </div>
            
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
              No Household Yet
            </h2>
            <p style={{ fontSize: 16, color: '#6b7280', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              You're not currently part of a household. Create one during onboarding or join an existing household using an invite code.
            </p>

            <button
              onClick={() => setShowJoinModal(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 12,
                padding: '16px 32px',
                color: 'white',
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
              }}
            >
              <UserPlus size={20} />
              Join a Household
            </button>
          </motion.div>
        )}

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && household && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: 32,
                  maxWidth: 500,
                  width: '100%',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <Mail size={32} color="#1e40af" />
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 12 }}>
                  Invite to Household
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 32 }}>
                  Share this invite code with another adult to add them to your household
                </p>

                <div style={{
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 24,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: 600 }}>
                    HOUSEHOLD INVITE CODE
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: 'monospace', letterSpacing: 2 }}>
                    {household.id}
                  </div>
                </div>

                <button
                  onClick={handleCopyInviteLink}
                  style={{
                    width: '100%',
                    background: copied ? '#10b981' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '16px',
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 16,
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? (
                    <>
                      <Check size={20} />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy size={20} />
                      Copy Invite Link
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowInviteModal(false)}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  Close
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Join Household Modal */}
        <AnimatePresence>
          {showJoinModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJoinModal(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 24,
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'white',
                  borderRadius: 20,
                  padding: 32,
                  maxWidth: 500,
                  width: '100%',
                  boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 24px',
                }}>
                  <UserPlus size={32} color="#1e40af" />
                </div>

                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: 12 }}>
                  Join a Household
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 }}>
                  Enter the invite code shared by another household member
                </p>

                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter household ID..."
                  style={{
                    width: '100%',
                    padding: '16px',
                    fontSize: 16,
                    border: '2px solid #e5e7eb',
                    borderRadius: 12,
                    marginBottom: 24,
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    letterSpacing: 1,
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && joinCode.trim()) {
                      handleJoinHousehold();
                    }
                  }}
                />

                <button
                  onClick={handleJoinHousehold}
                  disabled={!joinCode.trim() || joining}
                  style={{
                    width: '100%',
                    background: !joinCode.trim() || joining 
                      ? '#e5e7eb' 
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: 12,
                    padding: '16px',
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: !joinCode.trim() || joining ? 'not-allowed' : 'pointer',
                    marginBottom: 16,
                    opacity: !joinCode.trim() || joining ? 0.6 : 1,
                  }}
                >
                  {joining ? 'Joining...' : 'Join Household'}
                </button>

                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setError(null);
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    color: '#6b7280',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '8px',
                  }}
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
