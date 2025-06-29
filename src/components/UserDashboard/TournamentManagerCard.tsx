import React from 'react';
import { Plus, Eye, History, Trophy, ArrowRight } from 'lucide-react';

interface TournamentManagerCardProps {
  onNewTournament: () => void;
  onViewTournaments: () => void;
  onTournamentHistory: () => void;
  hasExistingTournaments?: boolean;
}

const TournamentManagerCard: React.FC<TournamentManagerCardProps> = ({
  onNewTournament,
  onViewTournaments,
  onTournamentHistory,
  hasExistingTournaments = false
}) => {
  return (
    <div className="bg-gray-900/50 border border-cyan-500/30 rounded-2xl p-8 backdrop-blur-lg hover:bg-gray-800/50 hover:border-cyan-400/50 transition-all duration-300 group focus:outline-none focus:ring-4 focus:ring-cyan-500/50 focus:border-cyan-400"
      tabIndex={0}
      role="region"
      aria-label="Tournament Management - Access tournament creation, management, and history"
      style={{
        boxShadow: '0 0 30px rgba(34, 211, 238, 0.2)'
      }}
    >
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        
        <h3 className="text-2xl font-bold text-white font-orbitron mb-2 group-hover:text-cyan-300 transition-colors duration-300">
          Tournament Manager
        </h3>
        
        <p className="text-gray-400 font-jetbrains mb-6 leading-relaxed">
          Create, manage and view your tournaments
        </p>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={onNewTournament}
          className="w-full flex items-center justify-between px-4 py-3 bg-cyan-600/20 border border-cyan-500/50 rounded-lg text-cyan-300 hover:bg-cyan-600/30 hover:text-white hover:border-cyan-400 transition-all duration-200 font-jetbrains font-medium"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            <span>Create New Tournament</span>
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        <button
          onClick={onViewTournaments}
          className="w-full flex items-center justify-between px-4 py-3 bg-blue-600/20 border border-blue-500/50 rounded-lg text-blue-300 hover:bg-blue-600/30 hover:text-white hover:border-blue-400 transition-all duration-200 font-jetbrains font-medium"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            <span>{hasExistingTournaments ? 'View Active Tournaments' : 'View Tournaments'}</span>
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>

        <button
          onClick={onTournamentHistory}
          className="w-full flex items-center justify-between px-4 py-3 bg-purple-600/20 border border-purple-500/50 rounded-lg text-purple-300 hover:bg-purple-600/30 hover:text-white hover:border-purple-400 transition-all duration-200 font-jetbrains font-medium"
        >
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <span>Tournament History</span>
          </div>
          <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </div>
    </div>
  );
};

export default TournamentManagerCard;