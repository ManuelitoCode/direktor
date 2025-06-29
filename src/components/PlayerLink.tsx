import React from 'react';
import { Link } from 'react-router-dom';

interface PlayerLinkProps {
  playerId: string;
  playerName: string;
  className?: string;
  children?: React.ReactNode;
}

const PlayerLink: React.FC<PlayerLinkProps> = ({ 
  playerId, 
  playerName, 
  className = '',
  children
}) => {
  if (!playerId || playerId === 'bye') {
    return <span className={className}>{children || playerName}</span>;
  }
  
  return (
    <Link
      to={`/players/${playerId}`}
      className={`hover:text-blue-300 hover:underline transition-colors duration-200 ${className}`}
      aria-label={`View profile for ${playerName}`}
    >
      {children || playerName}
    </Link>
  );
};

export default PlayerLink;