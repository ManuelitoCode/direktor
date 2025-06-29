import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface FloatingActionButtonProps {
  actions: Array<{
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
  }>;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Action buttons */}
      <div className={`flex flex-col-reverse items-end space-y-2 space-y-reverse mb-2 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-gray-800/90 backdrop-blur-sm text-white rounded-lg shadow-lg border border-gray-700/50 hover:bg-gray-700/90 transition-all duration-200 group"
              style={{ 
                transitionDelay: `${(actions.length - index) * 50}ms`,
                transform: isOpen ? 'scale(1)' : 'scale(0.5)',
                opacity: isOpen ? 1 : 0
              }}
            >
              <span className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-full group-hover:bg-blue-500 transition-colors duration-200">
                <Icon size={18} />
              </span>
              <span className="font-jetbrains">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main button */}
      <button
        onClick={toggleOpen}
        className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-all duration-300 ${
          isOpen 
            ? 'bg-red-600 hover:bg-red-700 rotate-45' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        <Plus size={24} className="text-white" />
      </button>
    </div>
  );
};

export default FloatingActionButton;