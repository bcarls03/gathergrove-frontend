import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { updateMyProfile } from '../lib/api';

export default function OnboardingAddressSimple() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);
  
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [zipValidating, setZipValidating] = useState(false);

  // Google Geocoding API - Validate ZIP and get coordinates
  const geocodeZip = async (zipCode: string) => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode},USA&key=${apiKey}`
      );
      const data = await response.json();

      console.log('Google Geocoding Response:', data); // Debug log

      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;
        
        // Extract city and state from address components
        let geocodedCity = '';
        let geocodedState = '';

        for (const component of components) {
          if (component.types.includes('locality')) {
            geocodedCity = component.long_name;
          }
          if (component.types.includes('administrative_area_level_1')) {
            geocodedState = component.short_name;
          }
        }

        return {
          valid: true,
          city: geocodedCity,
          state: geocodedState,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        };
      }

      console.error('Geocoding failed:', data.status, data.error_message);
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  // Auto-fill city/state when ZIP is complete
  const handleZipChange = async (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 5);
    setZip(digits);
    setError(''); // Clear any previous errors

    // When ZIP is complete, validate and auto-fill
    if (digits.length === 5) {
      setZipValidating(true);
      const result = await geocodeZip(digits);
      setZipValidating(false);

      if (result) {
        // Auto-fill city and state
        setCity(result.city);
        setState(result.state);
      } else {
        setError(`ZIP code ${digits} not found. Please check and try again.`);
      }
    }
  };

  const handleSubmit = async () => {
    if (!city || !state || !zip) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate state is 2 letters
    if (!/^[A-Z]{2}$/.test(state)) {
      setError('State must be 2 letters (e.g., OH, CA, NY)');
      return;
    }

    // Validate ZIP code is 5 digits
    if (!/^\d{5}$/.test(zip)) {
      setError('ZIP code must be exactly 5 digits');
      return;
    }

    setLoading(true);
    setError('');

    // Get real coordinates from Google Geocoding
    const geocodeResult = await geocodeZip(zip);
    
    if (!geocodeResult) {
      setLoading(false);
      setError(`Unable to verify ZIP code ${zip}. Please check and try again.`);
      return;
    }

    const { lat, lng } = geocodeResult;

    try {
      await updateMyProfile({
        address,
        lat,
        lng,
      });

      // Navigate to Step 3: Household
      navigate('/onboarding/household', {
        state: { address, city, state, zip, lat, lng },
      });
    } catch (err) {
      console.warn('Address save failed, continuing anyway:', err);
      // Still navigate even if save fails
      navigate('/onboarding/household', {
        state: { address, city, state, zip, lat, lng },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkipClick = () => {
    setShowSkipModal(true);
  };

  const handleSkipConfirm = async () => {
    setShowSkipModal(false);
    try {
      await updateMyProfile({
        discovery_opt_in: false,
        visibility: "private",
      });
    } catch (err) {
      console.warn("Failed to save privacy settings, continuing anyway:", err);
    }
    navigate('/people'); // Browse without location
  };

  const handleSkipCancel = () => {
    setShowSkipModal(false);
  };

  return (
    <OnboardingLayout currentStep="address">
      <div className="max-w-md mx-auto px-6 py-12">
        {/* Clean, modern header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 32 }}
        >
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 12, letterSpacing: '-0.025em', lineHeight: 1.3 }}>
            Where should we connect you<br />with neighbors?
          </h1>
          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.5, marginBottom: 4 }}>
            Start by entering your <span style={{ color: '#10b981', fontWeight: 600 }}>ZIP code</span> below.
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.5 }}>
            We'll auto-fill your city and state.
          </p>
        </motion.div>

        {/* Clean form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16,
            maxWidth: '460px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          {/* ZIP Code - First, prominent with green accent */}
          <motion.div
            initial={{ scale: 0.98, boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)' }}
            animate={{ 
              scale: 1,
              boxShadow: [
                '0 2px 8px rgba(16, 185, 129, 0.15)',
                '0 4px 16px rgba(16, 185, 129, 0.35)',
                '0 2px 8px rgba(16, 185, 129, 0.15)',
              ]
            }}
            transition={{ 
              scale: { duration: 0.3, delay: 0.2 },
              boxShadow: { duration: 2, delay: 0.5, times: [0, 0.5, 1] }
            }}
            style={{ borderRadius: 16, maxWidth: '100%' }}
          >
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => handleZipChange(e.target.value)}
              placeholder={zipValidating ? "Validating..." : "Enter your ZIP code *"}
              maxLength={5}
              autoFocus
              style={{
                width: '100%',
                maxWidth: '100%',
                padding: '18px 22px',
                fontSize: 17,
                fontWeight: 500,
                border: `3px solid ${zipValidating ? '#10b981' : '#10b981'}`,
                borderRadius: 16,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.15)',
                backgroundColor: '#ffffff',
                opacity: zipValidating ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLInputElement;
                if (target !== document.activeElement && !zipValidating) {
                  target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                  target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLInputElement;
                if (target !== document.activeElement && !zipValidating) {
                  target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.15)';
                  target.style.transform = 'translateY(0)';
                }
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#059669';
                e.target.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.3)';
              }}
              onBlur={(e) => {
                if (!zipValidating) {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.15)';
                }
              }}
              disabled={loading}
              required
            />
          </motion.div>

          {/* City - Full width, auto-filled from ZIP */}
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City (auto-fills) *"
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: 16,
              border: '2px solid #e5e7eb',
              borderRadius: 16,
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              backgroundColor: '#ffffff',
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLInputElement;
              if (target !== document.activeElement) {
                target.style.borderColor = '#d1d5db';
                target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLInputElement;
              if (target !== document.activeElement) {
                target.style.borderColor = '#e5e7eb';
                target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            disabled={loading}
            required
          />

          {/* State - Full width, auto-filled from ZIP */}
          <input
            id="state"
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase())}
            placeholder="State (auto-fills) *"
            maxLength={2}
            style={{
              width: '100%',
              padding: '16px 20px',
              fontSize: 16,
              border: '2px solid #e5e7eb',
              borderRadius: 16,
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              backgroundColor: '#ffffff',
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLInputElement;
              if (target !== document.activeElement) {
                target.style.borderColor = '#d1d5db';
                target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
              }
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLInputElement;
              if (target !== document.activeElement) {
                target.style.borderColor = '#e5e7eb';
                target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#10b981';
              e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
            disabled={loading}
            required
          />

          {/* Street Address - Last, clearly optional, de-emphasized */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 16 }}>
            <p style={{ 
              fontSize: 14, 
              color: '#6b7280', 
              margin: 0,
              paddingLeft: 4,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <span style={{ color: '#10b981', fontSize: 16 }}>✓</span>
              <span><strong style={{ color: '#10b981' }}>Pro tip:</strong> Add your street address for better neighborhood matches</span>
            </p>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address (optional but recommended)"
              autoComplete="street-address"
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: 15,
                border: '2px solid #e5e7eb',
                borderRadius: 16,
                outline: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                backgroundColor: '#ffffff',
              }}
              onMouseEnter={(e) => {
                const target = e.target as HTMLInputElement;
                if (target !== document.activeElement) {
                  target.style.borderColor = '#d1d5db';
                  target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                const target = e.target as HTMLInputElement;
                if (target !== document.activeElement) {
                  target.style.borderColor = '#e5e7eb';
                  target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#10b981';
                e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }}
              disabled={loading}
            />
            <p style={{ 
              fontSize: 13, 
              color: '#9ca3af', 
              margin: 0,
              paddingLeft: 4,
            }}>
              Only used to match you with nearby neighbors. Never shown publicly.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #fecaca',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}
            >
              <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 500, margin: 0 }}>{error}</p>
            </motion.div>
          )}

          {/* Continue Button - Premium gradient */}
          <motion.button
            onClick={handleSubmit}
            disabled={loading || !city || !state || !zip}
            whileHover={{ scale: loading || !city || !state || !zip ? 1 : 1.02 }}
            whileTap={{ scale: loading || !city || !state || !zip ? 1 : 0.98 }}
            style={{
              width: '100%',
              marginTop: 24,
              padding: '16px 24px',
              borderRadius: 16,
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading || !city || !state || !zip ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              background: loading || !city || !state || !zip 
                ? '#e5e7eb'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: loading || !city || !state || !zip ? '#9ca3af' : '#ffffff',
              boxShadow: loading || !city || !state || !zip 
                ? '0 1px 3px rgba(0, 0, 0, 0.1)'
                : '0 8px 16px rgba(16, 185, 129, 0.3)',
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg style={{ marginRight: 12, width: 20, height: 20 }} className="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Continue'
            )}
          </motion.button>

          {/* Helper text for disabled button */}
          {(!city || !state || !zip) && !loading && (
            <p style={{ 
              fontSize: 13, 
              color: '#9ca3af', 
              textAlign: 'center',
              margin: '8px 0 0 0',
              fontStyle: 'italic',
            }}>
              Complete ZIP, City, and State to continue
            </p>
          )}

          {/* Privacy Notice - Premium card with shadow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #86efac',
              borderRadius: 16,
              padding: 20,
              marginTop: 24,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>🔒</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                  We protect your privacy
                </p>
                <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
                  We use City/ZIP to show nearby neighbors. Street address is optional and only helps confirm your neighborhood. We never show exact addresses—only approximate distance (~0.3 miles).
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Skip Option - Modern sleek design */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          style={{ textAlign: 'center', marginTop: 24 }}
        >
          <button
            onClick={handleSkipClick}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
              border: '1px solid #d1d5db',
              borderRadius: 12,
              padding: '12px 24px',
              color: '#4b5563',
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)';
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#1f2937';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#4b5563';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }
            }}
          >
            <Search size={16} strokeWidth={2.5} />
            <span>Continue without discovery</span>
          </button>
        </motion.div>

        {/* Skip Warning Modal - Modern design */}
        {showSkipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              zIndex: 50,
              backdropFilter: 'blur(4px)',
            }}
            onClick={handleSkipCancel}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.3 }}
              style={{
                background: '#ffffff',
                borderRadius: 24,
                padding: 32,
                maxWidth: 420,
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon & Header */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Search size={32} strokeWidth={2} />
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 8, letterSpacing: '-0.02em' }}>
                  Browse without location?
                </h3>
                <p style={{ fontSize: 15, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                  You can browse neighbors, but you won't appear in discovery or receive connection requests until you add a location later.
                </p>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <button
                  onClick={handleSkipCancel}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: 12,
                    color: '#ffffff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                  }}
                >
                  Add location
                </button>
                <button
                  onClick={handleSkipConfirm}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: 12,
                    color: '#6b7280',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  Browse without location
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </OnboardingLayout>
  );
}
