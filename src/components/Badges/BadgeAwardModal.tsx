import React, { useState, useEffect } from 'react';
import { X, Award, Check } from 'lucide-react';
import { Badge, BadgeType } from '../../types/database';
import BadgeIcon from './BadgeIcon';

interface BadgeAwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  badge: BadgeType;
  playerName: string;
}

const BadgeAwardModal: React.FC<BadgeAwardModalProps> = ({
  isOpen,
  onClose,
  badge,
  playerName
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Start animation
      setIsAnimating(true);
      
      // Auto-close after animation
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full max-w-md bg-gray-900/95 backdrop-blur-lg border-2 border-yellow-500/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500 ${
        isAnimating ? 'scale-110' : 'scale-100'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-yellow-500/30 bg-gradient-to-r from-yellow-900/30 to-orange-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                Badge Unlocked!
              </h2>
              <p className="text-yellow-300 font-jetbrains">
                {playerName} earned a new achievement
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col items-center justify-center">
            <div className={`mb-6 transition-all duration-500 ${
              isAnimating ? 'scale-125 rotate-12' : 'scale-100 rotate-0'
            }`}>
              <BadgeIcon badge={badge} size="lg" showTooltip={false} />
            </div>
            
            <h3 className="text-2xl font-bold text-yellow-400 font-orbitron mb-2 text-center">
              {badge.name}
            </h3>
            
            <p className="text-gray-300 font-jetbrains text-center mb-6">
              {badge.description}
            </p>
            
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
            >
              <Check size={16} />
              Awesome!
            </button>
          </div>
        </div>
        
        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {isAnimating && Array.from({ length: 30 }).map((_, i) => (
            <div 
              key={i}
              className="absolute w-3 h-3 bg-yellow-500 rounded-full opacity-0 animate-particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                '--tx': `${(Math.random() - 0.5) * 200}px`,
                '--ty': `${(Math.random() - 0.5) * 200}px`
              } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BadgeAwardModal;