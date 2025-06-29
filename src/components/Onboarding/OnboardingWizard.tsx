import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { get, set } from 'idb-keyval';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'right' | 'bottom' | 'left';
}

const OnboardingWizard: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  const steps: OnboardingStep[] = [
    {
      id: 'create-tournament',
      title: 'Create a Tournament',
      description: 'Start here to create a new tournament. You can set up team or individual tournaments.',
      targetSelector: '[data-onboarding="create-tournament"]',
      position: 'right'
    },
    {
      id: 'my-tournaments',
      title: 'View Your Tournaments',
      description: 'Access all your tournaments here, both active and completed.',
      targetSelector: '[data-onboarding="my-tournaments"]',
      position: 'right'
    },
    {
      id: 'profile-settings',
      title: 'Profile Settings',
      description: 'Customize your profile and account settings.',
      targetSelector: '[data-onboarding="profile-settings"]',
      position: 'left'
    }
  ];

  useEffect(() => {
    // Check if user has completed onboarding
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await get('onboarding-completed');
      
      // If onboarding has not been completed, show the onboarding wizard
      if (onboardingCompleted === undefined) {
        setHasCompletedOnboarding(false);
        setIsVisible(true);
      } else {
        setHasCompletedOnboarding(true);
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await set('onboarding-completed', true);
      setHasCompletedOnboarding(true);
      setIsVisible(false);
    } catch (err) {
      console.error('Error saving onboarding status:', err);
    }
  };

  const skipOnboarding = async () => {
    try {
      await set('onboarding-completed', true);
      setHasCompletedOnboarding(true);
      setIsVisible(false);
    } catch (err) {
      console.error('Error saving onboarding status:', err);
    }
  };

  // If onboarding is completed or not visible, don't render anything
  if (hasCompletedOnboarding || !isVisible) {
    return null;
  }

  const currentStep = steps[currentStepIndex];
  
  // Find target element position
  const targetElement = document.querySelector(currentStep.targetSelector);
  if (!targetElement) {
    // If target element not found, skip to next step or complete onboarding
    setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        completeOnboarding();
      }
    }, 500);
    return null;
  }

  const targetRect = targetElement.getBoundingClientRect();
  
  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {};
  
  switch (currentStep.position) {
    case 'top':
      tooltipStyle = {
        bottom: `${window.innerHeight - targetRect.top + 10}px`,
        left: `${targetRect.left + targetRect.width / 2 - 150}px`,
      };
      break;
    case 'right':
      tooltipStyle = {
        left: `${targetRect.right + 10}px`,
        top: `${targetRect.top + targetRect.height / 2 - 75}px`,
      };
      break;
    case 'bottom':
      tooltipStyle = {
        top: `${targetRect.bottom + 10}px`,
        left: `${targetRect.left + targetRect.width / 2 - 150}px`,
      };
      break;
    case 'left':
      tooltipStyle = {
        right: `${window.innerWidth - targetRect.left + 10}px`,
        top: `${targetRect.top + targetRect.height / 2 - 75}px`,
      };
      break;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Highlight overlay */}
      <div className="absolute inset-0 bg-black/70 pointer-events-auto">
        {/* Cutout for target element */}
        <div 
          className="absolute bg-transparent border-2 border-blue-500 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
          }}
        />
      </div>
      
      {/* Tooltip */}
      <div 
        className="absolute w-300 max-w-xs bg-gray-900/95 backdrop-blur-lg border border-blue-500/50 rounded-lg p-4 shadow-xl pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-white font-orbitron">
            {currentStep.title}
          </h3>
          <button 
            onClick={skipOnboarding}
            className="text-gray-400 hover:text-white transition-colors duration-200"
            aria-label="Skip onboarding"
          >
            <X size={18} />
          </button>
        </div>
        
        <p className="text-gray-300 font-jetbrains text-sm mb-4">
          {currentStep.description}
        </p>
        
        <div className="flex justify-between items-center">
          <div className="flex space-x-1">
            {steps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentStepIndex ? 'bg-blue-500' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={handleNextStep}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
          >
            {currentStepIndex === steps.length - 1 ? (
              <>
                <Check size={16} />
                Finish
              </>
            ) : (
              <>
                Next
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;