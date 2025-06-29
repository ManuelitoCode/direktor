import React, { useState } from 'react';
import { Trophy, ArrowRight, RefreshCw, AlertTriangle, Check, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Team, Tournament, TriumvirateConfig } from '../../types/database';
import { calculatePhase1Standings } from '../../utils/triumvirateAlgorithms';
import { useAuditLog } from '../../hooks/useAuditLog';

interface TriumviratePhaseTransitionProps {
  tournamentId: string;
  tournament: Tournament;
  teams: Team[];
  results: any[];
  pairings: any[];
  onTransitionComplete: () => void;
}

const TriumviratePhaseTransition: React.FC<TriumviratePhaseTransitionProps> = ({
  tournamentId,
  tournament,
  teams,
  results,
  pairings,
  onTransitionComplete
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { logAction } = useAuditLog();
  
  const config = tournament.triumvirate_config as TriumvirateConfig;

  const handleStartPhase2 = async () => {
    try {
      setIsTransitioning(true);
      setError(null);
      
      // Calculate Phase 1 standings and assign teams to Phase 2 groups
      const updatedTeams = calculatePhase1Standings(teams, results, pairings);
      
      // Update teams in database
      for (const team of updatedTeams) {
        const { error } = await supabase
          .from('teams')
          .update({
            triumvirate_group: team.triumvirate_group,
            triumvirate_position: team.triumvirate_position,
            phase1_wins: team.phase1_wins,
            phase1_spread: team.phase1_spread,
            phase1_individual_wins: team.phase1_individual_wins
          })
          .eq('id', team.id);
          
        if (error) throw error;
      }
      
      // Update tournament config
      const updatedConfig: TriumvirateConfig = {
        ...config,
        current_phase: 2,
        phase1_completed: true
      };
      
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          triumvirate_config: updatedConfig,
          triumvirate_phase: 2
        })
        .eq('id', tournamentId);
        
      if (tournamentError) throw tournamentError;
      
      // Mark Phase 1 as completed
      const { error: phaseError } = await supabase
        .from('triumvirate_phases')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('tournament_id', tournamentId)
        .eq('phase_number', 1);
        
      if (phaseError) throw phaseError;
      
      // Log action
      logAction({
        action: 'triumvirate_phase2_started',
        details: {
          tournament_id: tournamentId,
          team_count: teams.length
        }
      });
      
      // Show success message
      setSuccess('Phase 2 started successfully! Teams have been regrouped based on Phase 1 standings.');
      
      // Notify parent component
      setTimeout(() => {
        onTransitionComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error starting Phase 2:', err);
      setError('Failed to start Phase 2: ' + err.message);
      
      // Log error
      logAction({
        action: 'triumvirate_phase2_start_error',
        details: {
          tournament_id: tournamentId,
          error: err.message
        }
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trophy className="w-10 h-10 text-white" />
        </div>
        
        <h2 className="text-3xl font-bold text-white font-orbitron mb-4">
          Phase 1 Complete!
        </h2>
        
        <p className="text-xl text-blue-300 font-jetbrains mb-6">
          Ready to start Phase 2 of the Triumvirate Tournament
        </p>
        
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
      </div>
      
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mb-6 bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-green-300 font-jetbrains text-sm">
          <div className="flex items-center gap-2">
            <Check size={16} />
            <span>{success}</span>
          </div>
        </div>
      )}
      
      {/* Phase Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white font-orbitron mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Phase 1 Summary
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Rounds Completed:</span>
              <span className="text-white font-bold">{config.phase1_rounds}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Teams Participating:</span>
              <span className="text-white font-bold">{teams.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Groups:</span>
              <span className="text-white font-bold">{config.groups_per_phase}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white font-orbitron mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            Phase 2 Preview
          </h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Upcoming Rounds:</span>
              <span className="text-white font-bold">{config.phase2_rounds}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">New Groups:</span>
              <span className="text-white font-bold">{config.groups_per_phase}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Teams Per Group:</span>
              <span className="text-white font-bold">{config.teams_per_group}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Phase 2 Explanation */}
      <div className="mb-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-blue-300 font-orbitron mb-3">
          What Happens in Phase 2?
        </h3>
        
        <ul className="space-y-2 text-gray-300 font-jetbrains text-sm">
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-xs">1</span>
            </div>
            <span>Teams will be regrouped based on their Phase 1 standings</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-xs">2</span>
            </div>
            <span>All 1st place teams will form Group A, 2nd place teams Group B, and so on</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-xs">3</span>
            </div>
            <span>Teams will play others in their new group 3 times each</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="w-5 h-5 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-blue-400 text-xs">4</span>
            </div>
            <span>All statistics from Phase 1 will carry forward</span>
          </li>
        </ul>
      </div>
      
      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStartPhase2}
          disabled={isTransitioning}
          className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-jetbrains font-medium text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:from-gray-600 disabled:to-gray-700"
        >
          {isTransitioning ? (
            <>
              <RefreshCw size={20} className="animate-spin" />
              Starting Phase 2...
            </>
          ) : (
            <>
              <ArrowRight size={20} />
              Start Phase 2
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default TriumviratePhaseTransition;