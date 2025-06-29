import React from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import { Tournament, TriumvirateConfig } from '../../types/database';
import { isReadyForPhase2 } from '../../utils/triumvirateAlgorithms';

interface TriumviratePhaseIndicatorProps {
  tournament: Tournament;
  onStartPhase2?: () => void;
}

const TriumviratePhaseIndicator: React.FC<TriumviratePhaseIndicatorProps> = ({
  tournament,
  onStartPhase2
}) => {
  const config = tournament.triumvirate_config as TriumvirateConfig || {};
  const currentPhase = config.current_phase || 1;
  const currentRound = tournament.current_round || 1;
  
  const isPhase1 = currentPhase === 1;
  const isPhase2 = currentPhase === 2;
  const canStartPhase2 = isReadyForPhase2(currentRound, config);
  
  const getPhase1Progress = () => {
    if (!config.phase1_rounds) return 0;
    return Math.min(100, (currentRound / config.phase1_rounds) * 100);
  };
  
  const getPhase2Progress = () => {
    if (!config.phase1_rounds || !config.phase2_rounds) return 0;
    const phase2Round = currentRound - config.phase1_rounds;
    return Math.min(100, (phase2Round / config.phase2_rounds) * 100);
  };
  
  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white font-orbitron mb-4 flex items-center gap-2">
        <Trophy className="w-6 h-6 text-blue-400" />
        Triumvirate Tournament Progress
      </h2>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Phase 1 */}
        <div className={`flex-1 ${isPhase1 ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-gray-800/50 border border-gray-700'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-bold font-orbitron ${isPhase1 ? 'text-blue-300' : 'text-gray-400'}`}>
              Phase 1
            </h3>
            
            {isPhase1 && (
              <div className="px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-blue-300 text-xs font-jetbrains">
                Active
              </div>
            )}
            
            {isPhase2 && (
              <div className="px-2 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-green-300 text-xs font-jetbrains">
                Completed
              </div>
            )}
          </div>
          
          <p className={`text-sm mb-3 ${isPhase1 ? 'text-gray-300' : 'text-gray-500'}`}>
            Cross-group play: Teams face opponents from different groups
          </p>
          
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className={isPhase1 ? 'text-gray-400' : 'text-gray-600'}>
              {isPhase1 ? `Round ${currentRound} of ${config.phase1_rounds}` : 'Complete'}
            </span>
            <span className={isPhase1 ? 'text-blue-400' : 'text-gray-600'}>
              {isPhase1 ? `${Math.round(getPhase1Progress())}%` : '100%'}
            </span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className={`${isPhase1 ? 'bg-blue-500' : 'bg-green-500'} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${isPhase1 ? getPhase1Progress() : 100}%` }}
            />
          </div>
        </div>
        
        {/* Phase 2 */}
        <div className={`flex-1 ${isPhase2 ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-gray-800/50 border border-gray-700'} rounded-lg p-4`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-lg font-bold font-orbitron ${isPhase2 ? 'text-purple-300' : 'text-gray-400'}`}>
              Phase 2
            </h3>
            
            {isPhase2 && (
              <div className="px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-purple-300 text-xs font-jetbrains">
                Active
              </div>
            )}
            
            {isPhase1 && !canStartPhase2 && (
              <div className="px-2 py-1 bg-gray-700 border border-gray-600 rounded-full text-gray-400 text-xs font-jetbrains">
                Locked
              </div>
            )}
            
            {isPhase1 && canStartPhase2 && (
              <div className="px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-yellow-300 text-xs font-jetbrains animate-pulse">
                Ready
              </div>
            )}
          </div>
          
          <p className={`text-sm mb-3 ${isPhase2 ? 'text-gray-300' : 'text-gray-500'}`}>
            Final placement: Teams compete within their assigned tier groups
          </p>
          
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className={isPhase2 ? 'text-gray-400' : 'text-gray-600'}>
              {isPhase2 
                ? `Round ${currentRound - config.phase1_rounds} of ${config.phase2_rounds}` 
                : 'Not Started'}
            </span>
            <span className={isPhase2 ? 'text-purple-400' : 'text-gray-600'}>
              {isPhase2 ? `${Math.round(getPhase2Progress())}%` : '0%'}
            </span>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${isPhase2 ? getPhase2Progress() : 0}%` }}
            />
          </div>
        </div>
      </div>
      
      {/* Start Phase 2 Button */}
      {isPhase1 && canStartPhase2 && onStartPhase2 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={onStartPhase2}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200 transform hover:scale-105"
          >
            <ArrowRight size={16} />
            Start Phase 2
          </button>
        </div>
      )}
    </div>
  );
};

export default TriumviratePhaseIndicator;