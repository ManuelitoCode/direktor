import React from 'react';
import { 
  Trophy, TrendingUp, Zap, Activity, Crown, BarChart3, Award, CheckCircle, Flag, Users
} from 'lucide-react';
import { BadgeType } from '../../types/database';

interface BadgeIconProps {
  badge: BadgeType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ 
  badge, 
  size = 'md', 
  showTooltip = true,
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 p-1',
    sm: 'w-8 h-8 p-1.5',
    md: 'w-12 h-12 p-2',
    lg: 'w-16 h-16 p-3'
  };

  const getIconComponent = () => {
    switch (badge.icon) {
      case 'trophy':
        return <Trophy className="w-full h-full text-yellow-400" />;
      case 'trending-up':
        return <TrendingUp className="w-full h-full text-green-400" />;
      case 'zap':
        return <Zap className="w-full h-full text-purple-400" />;
      case 'activity':
        return <Activity className="w-full h-full text-blue-400" />;
      case 'crown':
        return <Crown className="w-full h-full text-yellow-400" />;
      case 'bar-chart-3':
        return <BarChart3 className="w-full h-full text-cyan-400" />;
      case 'award':
        return <Award className="w-full h-full text-yellow-400" />;
      case 'check-circle':
        return <CheckCircle className="w-full h-full text-green-400" />;
      case 'flag':
        return <Flag className="w-full h-full text-blue-400" />;
      case 'users':
        return <Users className="w-full h-full text-purple-400" />;
      default:
        return <Award className="w-full h-full text-blue-400" />;
    }
  };

  return (
    <div className="relative group">
      <div className={`${sizeClasses[size]} rounded-full bg-gray-800 border-2 border-gray-700 flex items-center justify-center ${className}`}>
        {getIconComponent()}
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-gray-900/95 text-white text-xs rounded-lg py-2 px-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 border border-gray-700">
          <div className="font-bold mb-1">{badge.name}</div>
          <div className="text-gray-300">{badge.description}</div>
        </div>
      )}
    </div>
  );
};

export default BadgeIcon;