import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';

export function useOnboarding() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      setIsLoading(true);
      const onboardingCompleted = await get('onboarding-completed');
      setHasCompletedOnboarding(!!onboardingCompleted);
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      // Default to completed if there's an error
      setHasCompletedOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      await set('onboarding-completed', true);
      setHasCompletedOnboarding(true);
    } catch (err) {
      console.error('Error saving onboarding status:', err);
    }
  };

  const resetOnboarding = async () => {
    try {
      await set('onboarding-completed', false);
      setHasCompletedOnboarding(false);
    } catch (err) {
      console.error('Error resetting onboarding status:', err);
    }
  };

  return {
    hasCompletedOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding
  };
}