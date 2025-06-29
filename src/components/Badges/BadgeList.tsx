import React from 'react';
import { Badge } from '../../types/database';
import BadgeIcon from './BadgeIcon';

interface BadgeListProps {
  badges: Badge[];
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
  emptyMessage?: string;
}

const BadgeList: React.FC<BadgeListProps> = ({ 
  badges, 
  size = 'md', 
  showTooltip = true,
  className = '',
  emptyMessage = 'No badges earned yet'
}) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="text-center py-4 text-gray-400 font-jetbrains text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {badges.map((badge) => (
        <BadgeIcon 
          key={badge.id} 
          badge={badge.badge_type!} 
          size={size} 
          showTooltip={showTooltip} 
        />
      ))}
    </div>
  );
};

export default BadgeList;