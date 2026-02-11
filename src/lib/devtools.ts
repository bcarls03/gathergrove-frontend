/**
 * Dev Tools - Database Reset Utility
 * 
 * Quick developer tool to reset the backend database during testing.
 * Only works in development mode with fake database.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Reset the development database (clears all test data)
 * Only works when backend is running with SKIP_FIREBASE_INIT=1
 */
export async function resetDevDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${API_URL}/dev/reset-db`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to reset database');
    }

    const data = await response.json();
    return {
      success: true,
      message: data.message || 'Database reset successfully',
    };
  } catch (error) {
    console.error('Failed to reset dev database:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clear all local storage (onboarding state, etc.)
 */
export function clearLocalStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}

/**
 * Full reset: Backend + Frontend
 * Call this before each onboarding test run
 */
export async function fullReset(): Promise<void> {
  console.log('🔄 Starting full reset...');
  
  // 1. Reset backend
  const result = await resetDevDatabase();
  if (result.success) {
    console.log('✅ Backend cleared:', result.message);
  } else {
    console.warn('⚠️ Backend reset failed:', result.message);
  }
  
  // 2. Clear frontend
  clearLocalStorage();
  console.log('✅ Frontend storage cleared');
  
  // 3. Reload page with allowAutoSkip state
  // Note: Using query param since window.location.href can't pass React Router state
  console.log('🔄 Reloading page...');
  window.location.href = '/onboarding/access?autoskip=1';
}

// Make available in browser console for quick testing
if (import.meta.env.DEV) {
  (window as any).devTools = {
    resetDevDatabase,
    clearLocalStorage,
    fullReset,
  };
  console.log('🛠️ Dev tools available: window.devTools.fullReset()');
}
