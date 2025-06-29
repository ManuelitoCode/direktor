import React from 'react';

interface WinProbabilityBadgeProps {
  playerRating: number;
  opponentRating: number;
  className?: string;
}

const WinProbabilityBadge: React.FC<WinProbabilityBadgeProps> = ({
  playerRating,
  opponentRating,
  className = ''
}) => {
  // Calculate win probability using Elo formula
  const calculateWinProbability = (ratingA: number, ratingB: number): number => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };
  
  const probability = calculateWinProbability(playerRating, opponentRating);
  const probabilityPercentage = Math.round(probability * 100);
  
  // Determine if ratings are too close to call
  const ratingDifference = Math.abs(playerRating - opponentRating);
  const isTooClose = ratingDifference <= 20;
  
  // Determine color based on probability
  const getColorClass = () => {
    if (isTooClose) return 'text-gray-400';
    if (probabilityPercentage >= 70) return 'text-green-400';
    if (probabilityPercentage >= 55) return 'text-yellow-400';
    return 'text-red-400';
  };
  
  return (
    <span className={`text-xs font-jetbrains ${getColorClass()} ${className}`}>
      {isTooClose ? (
        "Even match"
      ) : (
        `${probabilityPercentage}% win`
      )}
    </span>
  );
};

export default WinProbabilityBadge;