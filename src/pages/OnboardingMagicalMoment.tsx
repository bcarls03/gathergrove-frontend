import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OnboardingLayout } from '../components/OnboardingLayout';

interface LocationState {
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

export default function OnboardingMagicalMoment() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  
  const [loading, setLoading] = useState(true);
  const [cityState, setCityState] = useState('');

  useEffect(() => {
    if (!state?.lat || !state?.lng) {
      // No location provided, redirect to address entry
      navigate('/onboarding/address');
      return;
    }

    // Set city/state display
    if (state.city && state.state) {
      setCityState(`${state.city}, ${state.state}`);
    }

    // Simulate loading for better UX
    setTimeout(() => {
      setLoading(false);
      
      // Auto-redirect to HOME after 8 seconds (onboarding complete!)
      setTimeout(() => {
        navigate('/');
      }, 8000);
    }, 1500);
  }, []);

  // For now, show a welcoming message
  // TODO: Implement backend endpoint GET /api/people/count?lat=X&lng=Y&radius=2
  const getMessage = () => {
    if (loading) {
      return {
        emoji: '🔍',
        title: 'Discovering your neighborhood...',
        subtitle: 'Finding families near you',
        cta: null,
      };
    }

    // Welcome message (we'll implement density-adaptive messaging later)
    return {
      emoji: '🎉',
      title: 'Welcome to GatherGrove!',
      subtitle: cityState 
        ? `Get ready to discover families in ${cityState}` 
        : 'Get ready to discover families near you',
      cta: 'Start Exploring',
    };
  };

  const message = getMessage();

  const handleContinue = () => {
    navigate('/');
  };

  return (
    <OnboardingLayout currentStep="preview">
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        {/* Progress Indicator - Step 3 of 3 */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#10b981' }} />
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#10b981' }} />
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#10b981' }} />
        </div>

        {/* Emoji Animation */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: 'spring', 
            stiffness: 200, 
            damping: 15,
            duration: 0.6 
          }}
          className="text-8xl mb-8"
        >
          {message.emoji}
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight"
        >
          {message.title}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xl text-gray-600 mb-12"
        >
          {message.subtitle}
        </motion.p>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </motion.div>
        )}

        {/* CTA Button (only show when not loading) */}
        {!loading && message.cta && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <button
              onClick={handleContinue}
              className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
            >
              {message.cta}
            </button>
            <p className="text-sm text-gray-500 mt-4">
              or wait a moment to continue automatically...
            </p>
          </motion.div>
        )}

        {/* Contextual Next Steps */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          >
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-2xl mb-3">👋</div>
              <h3 className="font-semibold text-gray-900 mb-2">Browse Profiles</h3>
              <p className="text-sm text-gray-600">
                See who's nearby and send connection requests
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-2xl mb-3">📅</div>
              <h3 className="font-semibold text-gray-900 mb-2">Create Events</h3>
              <p className="text-sm text-gray-600">
                Host gatherings and invite your neighbors
              </p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="text-2xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Start Chatting</h3>
              <p className="text-sm text-gray-600">
                Message families you'd like to get to know
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </OnboardingLayout>
  );
}
