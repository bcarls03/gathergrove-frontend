import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { updateMyProfile } from '../lib/api';

// Google Maps type declarations
declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: {
              types?: string[];
              componentRestrictions?: { country: string };
              fields?: string[];
            }
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => PlaceResult;
          };
        };
      };
    };
  }
}

// Google Places Autocomplete types
interface PlaceResult {
  formatted_address?: string;
  geometry?: {
    location: {
      lat(): number;
      lng(): number;
    };
  };
  address_components?: Array<{
    types: string[];
    long_name: string;
    short_name: string;
  }>;
}

export default function OnboardingAddress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const loadGoogleMaps = async () => {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      console.log('🗺️ Google Maps API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
      
      if (!apiKey) {
        setError('Google Maps API key is not configured');
        return;
      }

      // Check if Google Maps is already loaded
      if (window.google?.maps?.places) {
        console.log('✅ Google Maps already loaded');
        initializeAutocomplete();
        return;
      }

      // Load Google Maps script
      console.log('📥 Loading Google Maps script...');
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ Google Maps loaded successfully');
        initializeAutocomplete();
      };
      script.onerror = (e) => {
        console.error('❌ Failed to load Google Maps:', e);
        setError('Failed to load Google Maps. Please check your API key.');
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) {
      console.warn('⚠️ Cannot initialize autocomplete:', {
        hasInput: !!inputRef.current,
        hasGoogle: !!window.google,
        hasMaps: !!window.google?.maps,
        hasPlaces: !!window.google?.maps?.places,
      });
      return;
    }

    console.log('🔧 Initializing Google Places Autocomplete...');

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' }, // Restrict to US addresses
      fields: ['formatted_address', 'geometry', 'address_components'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace() as PlaceResult;
      console.log('📍 Place selected:', place);
      handlePlaceSelected(place);
    });

    autocompleteRef.current = autocomplete;
    console.log('✅ Autocomplete initialized successfully');
  };

  const handlePlaceSelected = async (place: PlaceResult) => {
    if (!place.geometry?.location) {
      setError('Please select a valid address from the dropdown');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      // Update user profile with approximate location
      await updateMyProfile({
        lat,
        lng,
        address: place.formatted_address || undefined,
      });

      // Navigate to Step 3: Household Type (V15 flow)
      navigate('/onboarding/household');
    } catch (err) {
      console.error('Failed to save address:', err);
      setError('Failed to save your location. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = () => {
    // Navigate to home but warn about no discovery
    navigate('/onboarding/skipped-address');
  };

  return (
    <OnboardingLayout currentStep="household">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">
            Where do you live?
          </h1>
          <p className="text-lg text-gray-600">
            We'll show you neighbors nearby
          </p>
        </motion.div>

        {/* Address Input Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-6"
        >
          <div className="mb-6">
            <label 
              htmlFor="address" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Street Address
            </label>
            <input
              ref={inputRef}
              id="address"
              type="text"
              placeholder="Start typing your address..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-base"
              disabled={loading}
              onFocus={() => {
                console.log('🎯 Input focused');
                if (!window.google?.maps?.places) {
                  console.warn('⚠️ Google Maps not loaded yet');
                }
              }}
            />
            {error && (
              <p className="text-red-600 text-sm mt-2">{error}</p>
            )}
          </div>

          {/* Privacy Notice */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <span className="text-xl mr-3 flex-shrink-0">🔒</span>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  <strong className="font-semibold">We protect your privacy.</strong>
                  {' '}We'll show you neighbors nearby—never your exact address. 
                  Your approximate location is hidden from others.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Skip Option */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center"
        >
          <button
            onClick={handleSkip}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors disabled:opacity-50"
          >
            I'll add this later
          </button>
          <p className="text-xs text-gray-500 mt-2">
            (You won't appear in neighborhood discovery without an address)
          </p>
        </motion.div>

        {/* Loading State */}
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-xl p-6 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                <p className="text-gray-700 font-medium">Saving your location...</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </OnboardingLayout>
  );
}
