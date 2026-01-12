// Test page to demonstrate auto-join functionality
import { useState, useEffect } from 'react';
import { updateMyProfile, signupUser, getMyProfile, CURRENT_UID, API_BASE_URL } from '../lib/api';
import { listGroups } from '../lib/groups';
import type { Group } from '../types/group';
import axios from 'axios';

/* Neighborhood Creation Form Component */
interface CreateNeighborhoodFormProps {
  suggestedName: string;
  existingGroups: Group[];
  userCity: string;
  userState: string;
  userZip: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function CreateNeighborhoodForm({ suggestedName, existingGroups, userCity, userState, userZip, onSuccess, onCancel }: CreateNeighborhoodFormProps) {
  const [neighborhoodName, setNeighborhoodName] = useState(suggestedName);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [managementCompany, setManagementCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [boardContact, setBoardContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amenityOptions = ['Pool', 'Clubhouse', 'Tennis Courts', 'Gym', 'Playground', 'Park'];

  const toggleAmenity = (amenity: string) => {
    setAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleCreate = async () => {
    if (!neighborhoodName.trim()) {
      setError('Neighborhood name is required');
      return;
    }

    // Check for duplicate neighborhood name in same location
    const duplicateNeighborhood = existingGroups.find(g => {
      const sameName = g.name.toLowerCase() === neighborhoodName.trim().toLowerCase();
      const isSubdivision = g.metadata?.neighborhood_type === 'subdivision';
      
      // Check if in same location (city + state + zip)
      const sameLocation = 
        g.metadata?.city?.toLowerCase() === userCity.toLowerCase() &&
        g.metadata?.state?.toUpperCase() === userState.toUpperCase() &&
        g.metadata?.zip === userZip;
      
      return sameName && isSubdivision && sameLocation;
    });
    
    if (duplicateNeighborhood) {
      setError(`A neighborhood group named "${neighborhoodName}" already exists in ${userCity}, ${userState}. Please join the existing group instead.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create neighborhood group
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/groups`,
        {
          name: neighborhoodName,
          type: 'neighborhood',
          metadata: {
            neighborhood_type: 'subdivision',
            hoa_name: neighborhoodName,
            city: userCity,
            state: userState,
            zip: userZip,
            amenities: amenities.map(a => a.toLowerCase()),
            management_company: managementCompany,
            website: website,
            board_contact: boardContact
          }
        },
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );

      console.log('✅ Create response:', createResponse.data);
      const groupId = createResponse.data.group?.id || createResponse.data.id;

      if (!groupId) {
        throw new Error('No group ID returned from server');
      }

      // Auto-join the group (creator becomes admin)
      await axios.post(
        `${API_BASE_URL}/users/me/join-group/${groupId}`,
        {},
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );

      onSuccess();
    } catch (err: any) {
      console.error('❌ Error creating neighborhood:', err);
      console.error('❌ Error response:', err.response?.data);
      const errorMsg = err.response?.data?.detail || err.message || 'Failed to create neighborhood group';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      marginTop: 24, 
      padding: 24, 
      background: '#fff', 
      borderRadius: 12,
      border: '1px solid #d1d5db'
    }}>
      {/* Neighborhood Name */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 13, 
          fontWeight: 600, 
          marginBottom: 8, 
          color: '#374151' 
        }}>
          Neighborhood Name * <span style={{ fontWeight: 400, color: '#6b7280', fontSize: 12 }}>(confirm or edit)</span>
        </label>
        <input
          type="text"
          value={neighborhoodName}
          onChange={(e) => setNeighborhoodName(e.target.value)}
          placeholder="Willow Creek"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Amenities */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 13, 
          fontWeight: 600, 
          marginBottom: 8, 
          color: '#374151' 
        }}>
          Amenities (optional)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {amenityOptions.map(amenity => (
            <button
              key={amenity}
              type="button"
              onClick={() => toggleAmenity(amenity)}
              style={{
                padding: '8px 16px',
                background: amenities.includes(amenity) ? '#10b981' : '#f3f4f6',
                color: amenities.includes(amenity) ? '#fff' : '#6b7280',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      {/* Management Company */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 13, 
          fontWeight: 600, 
          marginBottom: 8, 
          color: '#374151' 
        }}>
          Management Company (optional)
        </label>
        <input
          type="text"
          value={managementCompany}
          onChange={(e) => setManagementCompany(e.target.value)}
          placeholder="ABC Management Co."
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Website */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 13, 
          fontWeight: 600, 
          marginBottom: 8, 
          color: '#374151' 
        }}>
          Website (optional)
        </label>
        <input
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://oakwoodhills.com"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Board Contact */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontSize: 13, 
          fontWeight: 600, 
          marginBottom: 8, 
          color: '#374151' 
        }}>
          Board Contact Email (optional)
        </label>
        <input
          type="email"
          value={boardContact}
          onChange={(e) => setBoardContact(e.target.value)}
          placeholder="board@oakwoodhills.com"
          style={{
            width: '100%',
            maxWidth: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: 8,
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {error && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: 8,
          color: '#991b1b',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={handleCreate}
          disabled={loading || !neighborhoodName.trim()}
          style={{
            flex: 1,
            padding: '12px',
            background: loading || !neighborhoodName.trim() ? '#e5e7eb' : '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: loading || !neighborhoodName.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Creating...' : 'Create Neighborhood Group'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: '#f3f4f6',
            color: '#6b7280',
            border: 'none',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* Neighborhood Admin Dashboard Component */
interface NeighborhoodAdminDashboardProps {
  neighborhoodGroups: Group[];
  onRefresh: () => void;
}

function NeighborhoodAdminDashboard({ neighborhoodGroups, onRefresh }: NeighborhoodAdminDashboardProps) {
  const [pendingMembers, setPendingMembers] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  useEffect(() => {
    // Fetch pending members for all neighborhood groups
    const fetchPendingMembers = async () => {
      setLoading(true);
      const pending: Record<string, any[]> = {};
      
      for (const group of neighborhoodGroups) {
        try {
          const response = await axios.get(
            `${API_BASE_URL}/groups/${group.id}/pending-members`,
            {
              headers: {
                'X-Uid': CURRENT_UID,
                'X-Email': `${CURRENT_UID}@example.com`
              }
            }
          );
          pending[group.id] = response.data.pending_members || [];
        } catch (err) {
          console.error(`Error fetching pending members for ${group.name}:`, err);
          pending[group.id] = [];
        }
      }
      
      setPendingMembers(pending);
      setLoading(false);
    };

    if (neighborhoodGroups.length > 0) {
      fetchPendingMembers();
      setSelectedGroup(neighborhoodGroups[0].id);
    }
  }, [neighborhoodGroups]);

  const handleVerifyMember = async (groupId: string, userId: string, approve: boolean) => {
    try {
      await axios.post(
        `${API_BASE_URL}/groups/${groupId}/verify-member`,
        { user_id: userId, approve },
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );
      
      // Refresh pending members
      const response = await axios.get(
        `${API_BASE_URL}/groups/${groupId}/pending-members`,
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );
      
      setPendingMembers(prev => ({
        ...prev,
        [groupId]: response.data.pending_members || []
      }));
      
      onRefresh();
    } catch (err) {
      console.error('Error verifying member:', err);
    }
  };

  if (neighborhoodGroups.length === 0) return null;

  const selectedGroupData = neighborhoodGroups.find(g => g.id === selectedGroup);
  const currentPending = selectedGroup ? (pendingMembers[selectedGroup] || []) : [];
  
  return (
    <div style={{ 
      background: '#fff7ed', 
      borderRadius: 16, 
      padding: 32,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      marginBottom: 24,
      border: '2px solid #fed7aa'
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
        👑 Neighborhood Admin Dashboard
      </h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
        Review and approve pending members for your neighborhood groups.
      </p>

      {/* Group Selector */}
      {neighborhoodGroups.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <label style={{ 
            display: 'block', 
            fontSize: 13, 
            fontWeight: 600, 
            marginBottom: 8, 
            color: '#374151' 
          }}>
            Select HOA Group
          </label>
          <select
            value={selectedGroup || ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              background: '#fff'
            }}
          >
            {neighborhoodGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name} ({(pendingMembers[group.id] || []).length} pending)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pending Members List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
          Loading pending members...
        </div>
      ) : currentPending.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16, color: '#374151' }}>
            No pending members
          </div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>
            All members in {selectedGroupData?.name} are verified!
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {currentPending.map((member: any) => (
            <div
              key={member.user_id}
              style={{
                padding: 20,
                border: '1px solid #fed7aa',
                borderRadius: 12,
                background: '#ffffff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16, color: '#111827', marginBottom: 8 }}>
                  User: {member.user_id.substring(0, 8)}...
                </div>
                
                <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                  Joined: {new Date(member.joined_at).toLocaleDateString()}
                </div>
                
                <div style={{
                  padding: '6px 12px',
                  background: member.verification_status === 'pending' ? '#fef3c7' : '#dbeafe',
                  color: member.verification_status === 'pending' ? '#92400e' : '#1e40af',
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'inline-block'
                }}>
                  {member.verification_status === 'pending' ? '⏳ Pending' : `👥 Vouched (${member.vouch_count} vouches)`}
                </div>
                
                {member.note && (
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#6b7280'
                  }}>
                    📝 Note: {member.note}
                  </div>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginLeft: 16 }}>
                <button
                  onClick={() => handleVerifyMember(selectedGroup!, member.user_id, true)}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                >
                  ✓ Approve
                </button>
                
                <button
                  onClick={() => handleVerifyMember(selectedGroup!, member.user_id, false)}
                  style={{
                    padding: '10px 20px',
                    background: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TestAutoJoin() {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Portland');
  const [state, setState] = useState('OR');
  const [zip, setZip] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lat, setLat] = useState('45.5231');
  const [lng, setLng] = useState('-122.6765');
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [hoaNameHint, setHoaNameHint] = useState<string | null>(null);
  const [showCreateHOA, setShowCreateHOA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [seeded, setSeeded] = useState(false);

  // Seed test groups on component mount
  useEffect(() => {
    const seedGroups = async () => {
      try {
        await axios.post(`${API_BASE_URL}/dev/seed-test-groups`);
        setSeeded(true);
      } catch (err) {
        console.error('Failed to seed test groups:', err);
      }
    };
    seedGroups();
  }, []);

  const handleUpdateAddress = async () => {
    setLoading(true);
    setMessage('');
    setSuggestedGroups([]);
    
    try {
      // First, ensure user profile exists
      try {
        await getMyProfile();
      } catch {
        // User doesn't exist, create them
        await signupUser({
          uid: CURRENT_UID,
          email: `${CURRENT_UID}@example.com`,
          first_name: 'Test',
          last_name: 'User',
          visibility: 'public'
        });
      }
      
      // In real app, backend would geocode the address
      // For demo, we use preset lat/lng
      await updateMyProfile({
        address,
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
      
      setMessage('✅ Address updated! Checking for matching neighborhoods...');
      
      // Wait a moment then fetch suggested groups
      setTimeout(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/users/me/suggested-groups`, {
            headers: {
              'X-Uid': CURRENT_UID,
              'X-Email': `${CURRENT_UID}@example.com`
            }
          });
          
          console.log('🔍 Backend response:', response.data);
          
          const suggested = response.data.suggested_groups || [];
          const hintedHoaName = response.data.hoa_name_hint || null;
          
          console.log('✨ HOA Name Hint:', hintedHoaName);
          console.log('📋 Suggested Groups:', suggested);
          console.log('🏘️ Groups with metadata:', suggested.map(g => ({
            name: g.name,
            type: g.metadata?.neighborhood_type,
            metadata: g.metadata
          })));
          
          setSuggestedGroups(suggested);
          setHoaNameHint(hintedHoaName);
          
          if (suggested.length > 0) {
            setMessage(`✨ Found ${suggested.length} matching neighborhood group(s)! Click "Join" to connect.`);
          } else if (hintedHoaName) {
            setMessage(`✨ Looks like you're in ${hintedHoaName}! Create your HOA group below.`);
          } else {
            setMessage('✅ Address updated, but no matching neighborhood groups found.');
          }
          
          // Also refresh current groups
          const { groups } = await listGroups({ type: 'neighborhood' });
          const myMemberGroups = groups.filter(group => 
            group.members?.some(member => member.user_id === CURRENT_UID)
          );
          setMyGroups(myMemberGroups);
        } catch (err) {
          console.error('Error fetching suggested groups:', err);
          setMessage('❌ Error fetching suggested groups');
        }
      }, 500);
      
    } catch (err) {
      setMessage(`❌ Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      await axios.post(
        `${API_BASE_URL}/users/me/join-group/${groupId}`,
        {},
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );
      
      // Remove from suggested groups
      setSuggestedGroups(prev => prev.filter(g => g.id !== groupId));
      
      // Refresh my groups list
      const { groups } = await listGroups({ type: 'neighborhood' });
      const myMemberGroups = groups.filter(group => 
        group.members?.some(member => member.user_id === CURRENT_UID)
      );
      setMyGroups(myMemberGroups);
      
      setMessage(`✅ Successfully joined ${groupName}!`);
    } catch (err) {
      console.error('Error joining group:', err);
      setMessage(`❌ Error joining ${groupName}`);
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    try {
      await axios.delete(
        `${API_BASE_URL}/users/me/leave-group/${groupId}`,
        {
          headers: {
            'X-Uid': CURRENT_UID,
            'X-Email': `${CURRENT_UID}@example.com`
          }
        }
      );
      
      // Refresh my groups list
      const { groups } = await listGroups({ type: 'neighborhood' });
      const myMemberGroups = groups.filter(group => 
        group.members?.some(member => member.user_id === CURRENT_UID)
      );
      setMyGroups(myMemberGroups);
      
      setMessage(`✅ Successfully left ${groupName}`);
    } catch (err) {
      console.error('Error leaving group:', err);
      setMessage(`❌ Error leaving ${groupName}`);
    }
  };

  const presetAddresses = [
    { name: 'Riverside Apartments', address: '123 River Street, Apt 4B', city: 'Portland', state: 'OR', zip: '97201', lat: '45.5231', lng: '-122.6765' },
    { name: 'Downtown Lofts', address: '456 Main Street, Unit 301', city: 'Portland', state: 'OR', zip: '97202', lat: '45.5240', lng: '-122.6750' },
    { name: 'Oakwood Hills', address: '789 Oakwood Hills Dr', city: 'Portland', state: 'OR', zip: '97203', lat: '45.5300', lng: '-122.6900' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ 
        background: '#ffffff', 
        borderBottom: '1px solid #e5e7eb',
        padding: '24px 0'
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Test Neighborhood Group Suggestions
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', marginTop: 8, marginBottom: 0 }}>
            Update your address to get suggested neighborhood groups to join
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>
        {/* Preset addresses */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 12, color: '#374151' }}>
            Quick Test Addresses:
          </label>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {presetAddresses.map(preset => (
              <button
                key={preset.name}
                onClick={() => {
                  setAddress(preset.address);
                  setCity(preset.city);
                  setState(preset.state);
                  setZip(preset.zip);
                  setLat(preset.lat);
                  setLng(preset.lng);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#374151',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: 16, 
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 24
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: '#111827' }}>
            Update Address
          </h2>
          
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
              Street Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 River Street, Apt 4B"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Portland"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                State
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                placeholder="OR"
                maxLength={2}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  textTransform: 'uppercase',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                ZIP
              </label>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="97201"
                maxLength={5}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              />
            </div>
          </div>

          {/* Advanced: Show lat/lng for testing */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              marginBottom: showAdvanced ? 16 : 0,
              padding: '8px 12px',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 8,
              fontSize: 12,
              color: '#6b7280',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#374151'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
          >
            {showAdvanced ? '▼' : '▶'} Advanced: Lat/Lng (for testing geographic matching)
          </button>

          {showAdvanced && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: 16, 
              marginBottom: 20, 
              padding: 16, 
              background: '#f9fafb', 
              borderRadius: 8,
              border: '1px solid #e5e7eb'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  Latitude
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: '#ffffff'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
                  Longitude
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: 8,
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    background: '#ffffff'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleUpdateAddress}
            disabled={loading || !address}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !address ? '#e5e7eb' : '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 15,
              cursor: loading || !address ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (!loading && address) {
                e.currentTarget.style.background = '#059669';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && address) {
                e.currentTarget.style.background = '#10b981';
              }
            }}
          >
            {loading ? '⏳ Updating...' : '🔍 Find Matching Neighborhoods'}
          </button>

          {message && (
            <div style={{
              marginTop: 16,
              padding: 16,
              background: message.startsWith('❌') ? '#fef2f2' : '#f0fdf4',
              border: `2px solid ${message.startsWith('❌') ? '#fecaca' : '#86efac'}`,
              borderRadius: 12,
              color: message.startsWith('❌') ? '#991b1b' : '#166534',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ fontSize: 20 }}>{message.startsWith('❌') ? '❌' : '✅'}</span>
              <span>{message.replace('✅ ', '').replace('❌ ', '')}</span>
            </div>
          )}
        </div>

        {/* Suggested Groups */}
        {suggestedGroups.length > 0 && (() => {
          // Separate subdivisions from open neighborhoods
          const subdivisions = suggestedGroups.filter(g => 
            g.metadata?.neighborhood_type === 'subdivision'
          );
          const openNeighborhoods = suggestedGroups.filter(g => 
            g.metadata?.neighborhood_type === 'open_neighborhood'
          );

          return (
            <>
              {/* Subdivision Groups (Primary) */}
              {subdivisions.length > 0 && (
                <div style={{ 
                  background: '#fffbeb', 
                  borderRadius: 16, 
                  padding: 32,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  marginBottom: 24,
                  border: '2px solid #fcd34d'
                }}>
                  <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
                    ✨ Your Neighborhood
                  </h2>
                  <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                    We found {subdivisions.length} subdivision{subdivisions.length > 1 ? 's' : ''} that match your address. Click "Join" to connect with your neighbors!
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {subdivisions.map((group: any) => (
                <div
                  key={group.id}
                  style={{
                    padding: 20,
                    border: '1px solid #fde68a',
                    borderRadius: 12,
                    background: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: '#111827', marginBottom: 8 }}>
                      {group.name}
                    </div>
                    
                    <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 8 }}>
                      👥 {group.member_count} members · 🏘️ {group.metadata?.neighborhood_type || 'neighborhood'}
                    </div>
                    
                    {group.metadata?.building_address && (
                      <div style={{ 
                        fontSize: 13, 
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        📍 {group.metadata.building_address}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleJoinGroup(group.id, group.name)}
                    style={{
                      padding: '10px 24px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    Join Group
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Open Neighborhood Groups (Secondary/Less Prominent) */}
        {openNeighborhoods.length > 0 && (
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: 16, 
            padding: 24,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            marginBottom: 24,
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#6b7280' }}>
              📍 Also nearby (broader areas)
            </h3>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
              These open neighborhoods include anyone within a radius
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {openNeighborhoods.map((group: any) => (
                <div
                  key={group.id}
                  style={{
                    padding: 16,
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#ffffff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 15, color: '#6b7280', marginBottom: 6 }}>
                      {group.name}
                    </div>
                    
                    <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>
                      👥 {group.member_count} members
                    </div>
                    
                    {group.metadata?.building_address && (
                      <div style={{ 
                        fontSize: 12, 
                        color: '#d1d5db',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        📍 {group.metadata.building_address}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleJoinGroup(group.id, group.name)}
                    style={{
                      padding: '8px 20px',
                      background: '#6b7280',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 500,
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#6b7280'}
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  })()}

        {/* Create HOA Group - Show if we have an HOA name hint */}
        {hoaNameHint && (() => {
          // Check if we have subdivisions that already match the hint
          const subdivisions = suggestedGroups.filter(g => 
            g.metadata?.neighborhood_type === 'subdivision'
          );
          const hasMatchingSubdivision = subdivisions.length > 0;

          return (
            <div style={{ 
              background: '#f0fdf4', 
              borderRadius: 16, 
              padding: 32,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: 24,
              border: '2px solid #86efac'
            }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: '#111827' }}>
                {hasMatchingSubdivision ? "🏘️ Don't see your neighborhood?" : "🏘️ Create Your Neighborhood Group"}
              </h2>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
                {hasMatchingSubdivision ? (
                  <>If the groups above don't match, you can create a new one. We suggest <strong>{hoaNameHint}</strong> based on your address, but you can <strong>confirm or edit</strong> the name below.</>
                ) : (
                  <>We detected you might be in <strong>{hoaNameHint}</strong>. You can <strong>confirm or edit</strong> the name below to create a group for your neighborhood!</>
                )}
            </p>
            
            <button
              onClick={() => setShowCreateHOA(!showCreateHOA)}
              style={{
                width: '100%',
                padding: '14px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
            >
              {showCreateHOA ? '✕ Cancel' : '+ Create Neighborhood Group'}
            </button>

            {showCreateHOA && (
              <CreateNeighborhoodForm
                suggestedName={hoaNameHint}
                existingGroups={myGroups}
                userCity={city}
                userState={state}
                userZip={zip}
                onSuccess={() => {
                  setShowCreateHOA(false);
                  setMessage('✅ Neighborhood group created successfully!');
                  // Refresh groups
                  listGroups({ type: 'neighborhood' }).then(({ groups }) => {
                    const myMemberGroups = groups.filter(group => 
                      group.members?.some(member => member.user_id === CURRENT_UID)
                    );
                    setMyGroups(myMemberGroups);
                  });
                }}
                onCancel={() => setShowCreateHOA(false)}
              />
            )}
          </div>
          );
        })()}

        {/* My Groups */}
        <div style={{ 
          background: '#ffffff', 
          borderRadius: 16, 
          padding: 32,
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: 24
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111827' }}>
              🏘️ My Neighborhood Groups
            </h2>
            {/* Show duplicate warning if there are duplicate group names */}
            {(() => {
              const groupNames = myGroups.map(g => g.name.toLowerCase());
              const hasDuplicates = groupNames.length !== new Set(groupNames).size;
              return hasDuplicates && (
                <div style={{
                  padding: '6px 12px',
                  background: '#fef3c7',
                  border: '1px solid #fcd34d',
                  borderRadius: 8,
                  fontSize: 12,
                  color: '#92400e',
                  fontWeight: 500
                }}>
                  ⚠️ Duplicate groups detected - Leave extra groups to clean up
                </div>
              );
            })()}
          </div>
          
          {myGroups.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏡</div>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 16, color: '#374151' }}>
                No groups yet
              </div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>
                Update your address above to auto-join matching neighborhoods.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Deduplicate groups by ID */}
              {Array.from(new Map(myGroups.map(g => [g.id, g])).values()).map(group => {
                // Find current user's membership to check verification status
                const myMembership = group.members?.find(m => m.user_id === CURRENT_UID);
                const verificationStatus = myMembership?.verification_status || 'admin_verified';
                const isSubdivision = group.metadata?.neighborhood_type === 'subdivision';
                const isAdmin = myMembership?.role === 'admin';
                
                return (
                <div
                  key={group.id}
                  style={{
                    padding: 20,
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    background: '#f9fafb',
                    transition: 'all 0.2s',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 18, color: '#111827' }}>
                        {group.name}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{
                          padding: '4px 10px',
                          background: '#eff6ff',
                          color: '#1e40af',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: 'capitalize'
                        }}>
                          {group.type}
                        </span>
                        
                        {/* Verification Status Badge for Subdivisions */}
                        {isSubdivision && (
                          <span style={{
                            padding: '4px 10px',
                            background: verificationStatus === 'pending' ? '#fef3c7' 
                                     : verificationStatus === 'neighbor_vouched' ? '#dbeafe'
                                     : '#d1fae5',
                            color: verificationStatus === 'pending' ? '#92400e'
                                  : verificationStatus === 'neighbor_vouched' ? '#1e40af'
                                  : '#065f46',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            {verificationStatus === 'pending' ? '⏳ Pending'
                           : verificationStatus === 'neighbor_vouched' ? '👥 Vouched'
                           : '✓ Verified'}
                          </span>
                        )}
                        
                        {/* Admin Badge */}
                        {isAdmin && (
                          <span style={{
                            padding: '4px 10px',
                            background: '#fef3c7',
                            color: '#92400e',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            👑 Admin
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span>👥 {group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                      <span>•</span>
                      <span>🏘️ {group.metadata.neighborhood_type === 'subdivision' ? 'Subdivision' : group.metadata.neighborhood_type?.replace('_', ' ')}</span>
                    </div>
                    
                    {group.metadata.building_address && (
                      <div style={{ 
                        fontSize: 13, 
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        📍 {group.metadata.building_address}
                      </div>
                    )}
                    
                    {/* Verification Message for Pending Subdivision Members */}
                    {isSubdivision && verificationStatus === 'pending' && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: 8,
                        fontSize: 13,
                        color: '#92400e'
                      }}>
                        ⏳ Your membership is pending verification. Ask 2 verified neighbors to vouch for you, or wait for admin approval.
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <button
                      onClick={() => {
                        if (confirm(`Report "${group.name}" for incorrect information or inappropriate content?`)) {
                          alert('Thank you for your report. Our team will review it shortly.');
                          // TODO: Implement actual reporting endpoint
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fff7ed';
                        e.currentTarget.style.color = '#ea580c';
                        e.currentTarget.style.borderColor = '#fed7aa';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      🚩 Report
                    </button>
                    
                    <button
                      onClick={() => handleLeaveGroup(group.id, group.name)}
                      style={{
                        padding: '8px 16px',
                        background: 'transparent',
                        color: '#6b7280',
                        border: '1px solid #e5e7eb',
                        borderRadius: 8,
                        fontWeight: 500,
                        fontSize: 13,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#fef2f2';
                        e.currentTarget.style.color = '#dc2626';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#6b7280';
                        e.currentTarget.style.borderColor = '#e5e7eb';
                      }}
                    >
                      Leave
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Neighborhood Admin Dashboard - Show if user is admin of any neighborhood groups */}
        {(() => {
          const uniqueGroups = Array.from(new Map(myGroups.map(g => [g.id, g])).values());
          return uniqueGroups.some(g => g.metadata?.neighborhood_type === 'subdivision' && g.members?.find(m => m.user_id === CURRENT_UID)?.role === 'admin');
        })() && (
          <NeighborhoodAdminDashboard 
            neighborhoodGroups={Array.from(new Map(myGroups.map(g => [g.id, g])).values()).filter(g => 
              g.metadata?.neighborhood_type === 'subdivision' && 
              g.members?.find(m => m.user_id === CURRENT_UID)?.role === 'admin'
            )}
            onRefresh={() => {
              listGroups({ type: 'neighborhood' }).then(({ groups }) => {
                const myMemberGroups = groups.filter(group => 
                  group.members?.some(member => member.user_id === CURRENT_UID)
                );
                setMyGroups(myMemberGroups);
              });
            }}
          />
        )}

        {/* Info */}
        <div style={{ 
          padding: 24, 
          background: '#eff6ff', 
          border: '1px solid #bfdbfe', 
          borderRadius: 12
        }}>
          <div style={{ 
            fontWeight: 600, 
            marginBottom: 12, 
            color: '#1e40af',
            fontSize: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            💡 How Neighborhood Group Suggestions Work
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: 20, 
            color: '#1e40af', 
            fontSize: 14,
            lineHeight: 1.6
          }}>
            <li style={{ marginBottom: 8 }}>When you update your address, we automatically search for matching neighborhood groups</li>
            <li style={{ marginBottom: 8 }}><strong>Open neighborhoods</strong>: Radius-based (within 0.5 miles of center point)</li>
            <li style={{ marginBottom: 8 }}><strong>Subdivisions</strong>: Name match in address (e.g., "Willow Creek")</li>
            <li style={{ marginBottom: 8 }}><strong>Apartment complexes</strong>: Exact address match (e.g., "123 River Street")</li>
            <li>We'll suggest matching groups - you choose which ones to join!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
