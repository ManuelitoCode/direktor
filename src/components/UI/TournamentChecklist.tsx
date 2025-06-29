import React from 'react';
import { Check, X } from 'lucide-react';

export interface ChecklistStep {
  id: string;
  label: string;
  completed: boolean;
  current: boolean;
  disabled: boolean;
}

interface TournamentChecklistProps {
  steps: ChecklistStep[];
  onStepClick?: (stepId: string) => void;
  orientation?: 'vertical' | 'horizontal';
}

const TournamentChecklist: React.FC<TournamentChecklistProps> = ({
  steps,
  onStepClick,
  orientation = 'vertical'
}) => {
  const handleStepClick = (step: ChecklistStep) => {
    if (step.disabled) return;
    if (onStepClick) {
      onStepClick(step.id);
    }
  };

  if (orientation === 'horizontal') {
    return (
      <div className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div 
                className={`relative flex flex-col items-center ${
                  step.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
                onClick={() => handleStepClick(step)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step.completed 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : step.current
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-600 text-gray-400'
                }`}>
                  {step.completed ? (
                    <Check size={18} />
                  ) : (
                    <span className="font-bold">{index + 1}</span>
                  )}
                </div>
                <span className={`text-xs mt-2 font-jetbrains text-center ${
                  step.current ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>
              
              {/* Connector Line (except for last item) */}
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  steps.slice(0, index + 1).every(s => s.completed)
                    ? 'bg-green-500'
                    : 'bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-gray-900/50 border border-gray-700 rounded-xl p-4 backdrop-blur-sm">
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={`flex items-center p-2 rounded-lg ${
              step.current ? 'bg-blue-900/20 border border-blue-500/30' : ''
            } ${step.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-800/50'}`}
            onClick={() => handleStepClick(step)}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              step.completed 
                ? 'bg-green-500 border-green-500 text-white' 
                : step.current
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'bg-gray-800 border-gray-600 text-gray-400'
            }`}>
              {step.completed ? (
                <Check size={16} />
              ) : (
                <span className="font-bold text-sm">{index + 1}</span>
              )}
            </div>
            <span className={`ml-3 font-jetbrains ${
              step.current ? 'text-blue-400' : 'text-gray-300'
            }`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TournamentChecklist;