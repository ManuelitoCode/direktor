import React from 'react';
import { Trophy, Download, BarChart3, Plus, Medal, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import BadgeList from '../Badges/BadgeList';

interface TournamentCompleteSummaryProps {
  tournamentId: string;
  tournamentName: string;
  winnerName: string;
  winnerTeam?: string;
  finalScore?: string;
  badges?: any[];
  onExportTou: () => void;
  onViewStats: () => void;
  onCreateNew: () => void;
}

const TournamentCompleteSummary: React.FC<TournamentCompleteSummaryProps> = ({
  tournamentId,
  tournamentName,
  winnerName,
  winnerTeam,
  finalScore,
  badges = [],
  onExportTou,
  onViewStats,
  onCreateNew
}) => {
  return (
    <div className="bg-gray-900/50 border-2 border-green-500/30 rounded-2xl p-8 backdrop-blur-lg">
      <div className="text-center mb-8">
        <div className="inline-block p-4 bg-green-500/20 rounded-full mb-4">
          <Trophy className="w-16 h-16 text-green-400" />
        </div>
        
        <h2 className="text-3xl font-bold text-white font-orbitron mb-2">
          Tournament Complete!
        </h2>
        
        <p className="text-xl text-green-400 font-jetbrains">
          {tournamentName} has been successfully completed
        </p>
      </div>
      
      {/* Champion Section */}
      <div className="bg-gradient-to-r from-yellow-900/20 to-amber-900/20 border border-yellow-500/30 rounded-xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Medal className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-yellow-300 font-orbitron">
            Tournament Champion
          </h3>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="text-2xl font-bold text-white font-orbitron mb-1">
              {winnerName}
            </div>
            
            {winnerTeam && (
              <div className="text-purple-400 font-jetbrains">
                Team: {winnerTeam}
              </div>
            )}
            
            {finalScore && (
              <div className="text-gray-300 font-jetbrains mt-2">
                Final Score: {finalScore}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-400" />
            <Star className="w-10 h-10 text-yellow-400" />
            <Star className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>
      
      {/* Badges Awarded */}
      {badges && badges.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Medal className="w-6 h-6 text-blue-400" />
            <h3 className="text-xl font-bold text-blue-300 font-orbitron">
              Badges Awarded
            </h3>
          </div>
          
          <BadgeList badges={badges} size="md" />
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={onExportTou}
          className="flex flex-col items-center gap-2 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl hover:bg-blue-900/30 transition-all duration-200"
        >
          <Download className="w-8 h-8 text-blue-400" />
          <span className="text-blue-300 font-jetbrains">Export .TOU File</span>
        </button>
        
        <button
          onClick={onViewStats}
          className="flex flex-col items-center gap-2 p-4 bg-purple-900/20 border border-purple-500/30 rounded-xl hover:bg-purple-900/30 transition-all duration-200"
        >
          <BarChart3 className="w-8 h-8 text-purple-400" />
          <span className="text-purple-300 font-jetbrains">View Statistics</span>
        </button>
        
        <button
          onClick={onCreateNew}
          className="flex flex-col items-center gap-2 p-4 bg-green-900/20 border border-green-500/30 rounded-xl hover:bg-green-900/30 transition-all duration-200"
        >
          <Plus className="w-8 h-8 text-green-400" />
          <span className="text-green-300 font-jetbrains">Create New Tournament</span>
        </button>
      </div>
      
      {/* Public Link */}
      <div className="text-center">
        <p className="text-gray-400 font-jetbrains mb-2">
          View complete tournament results:
        </p>
        <Link
          to={`/tournaments/${tournamentId}`}
          target="_blank"
          className="text-blue-400 hover:text-blue-300 font-jetbrains underline"
        >
          View Public Tournament Page
        </Link>
      </div>
    </div>
  );
};

export default TournamentCompleteSummary;