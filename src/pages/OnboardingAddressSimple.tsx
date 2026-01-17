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

  const handleSubmit = async () => {
    if (!city || !state || !zip) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    // Mock geocoding for now (replace with actual service)
    const lat = 39.8283;
    const lng = -98.5795;

    try {
      await updateMyProfile({
        address,
        lat,
        lng,
      });

      // Navigate to Step 3: Household (NOT magical-moment)
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

  const handleSkipConfirm = () => {
    setShowSkipModal(false);
    navigate('/onboarding/household'); // Continue to next step without address
  };

  const handleSkipCancel = () => {
    setShowSkipModal(false);
  };

  return (
    <OnboardingLayout currentStep="household">
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
          <p style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.5 }}>
            City + ZIP place you in Nearby discovery.<br />Street address helps match your neighborhood (optional).
          </p>
        </motion.div>

        {/* Clean form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {/* Street Address - Modern with shadow + microcopy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              id="address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address (optional)"
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
          />
          <p style={{ 
            fontSize: 13, 
            color: '#6b7280', 
            margin: 0,
            paddingLeft: 4,
          }}>
            Used only to suggest your verified neighborhood. Never shown to others.
          </p>
          </div>

          {/* City - Modern with shadow */}
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City *"
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

          {/* State & ZIP - Side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input
              id="state"
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              placeholder="State *"
              maxLength={2}
              style={{
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
            
            <input
              id="zip"
              type="text"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="ZIP *"
              maxLength={5}
              style={{
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
