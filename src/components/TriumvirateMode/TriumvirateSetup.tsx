import React, { useState, useEffect } from 'react';
import { Users, Trophy, Calendar, AlertTriangle, Check, RefreshCw, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Team, Tournament, TriumvirateConfig } from '../../types/database';
import { initializeTriumvirateGroups, createDefaultTriumvirateConfig } from '../../utils/triumvirateAlgorithms';
import { useAuditLog } from '../../hooks/useAuditLog';

interface TriumvirateSetupProps {
  tournamentId: string;
  tournament: Tournament;
  onSetupComplete: () => void;
}

const TriumvirateSetup: React.FC<TriumvirateSetupProps> = ({
  tournamentId,
  tournament,
  onSetupComplete
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [config, setConfig] = useState<TriumvirateConfig>(
    tournament.triumvirate_config || createDefaultTriumvirateConfig()
  );
  
  const { logAction } = useAuditLog();

  useEffect(() => {
    loadTeams();
  }, [tournamentId]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (err: any) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeGroups = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Validate team count
      if (teams.length !== config.total_teams) {
        setError(`Triumvirate mode requires exactly ${config.total_teams} teams. You currently have ${teams.length} teams.`);
        return;
      }
      
      // Initialize groups
      const updatedTeams = initializeTriumvirateGroups(teams, config);
      
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
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({
          triumvirate_config: config,
          triumvirate_mode: true,
          triumvirate_phase: 1,
          rounds: config.total_rounds
        })
        .eq('id', tournamentId);
        
      if (tournamentError) throw tournamentError;
      
      // Initialize triumvirate phases
      await supabase
        .from('triumvirate_phases')
        .insert([
          {
            tournament_id: tournamentId,
            phase_number: 1,
            start_round: 1,
            end_round: config.phase1_rounds,
            is_completed: false
          },
          {
            tournament_id: tournamentId,
            phase_number: 2,
            start_round: config.phase1_rounds + 1,
            end_round: config.total_rounds,
            is_completed: false
          }
        ]);
      
      // Initialize triumvirate groups
      const groupNames = ['A', 'B', 'C', 'D', 'E', 'F'];
      const phase1Groups = groupNames.map(name => ({
        tournament_id: tournamentId,
        group_name: name,
        phase: 1
      }));
      
      const phase2Groups = groupNames.map(name => ({
        tournament_id: tournamentId,
        group_name: name,
        phase: 2
      }));
      
      await supabase
        .from('triumvirate_groups')
        .insert([...phase1Groups, ...phase2Groups]);
      
      // Log action
      logAction({
        action: 'triumvirate_groups_initialized',
        details: {
          tournament_id: tournamentId,
          team_count: teams.length,
          group_count: groupNames.length
        }
      });
      
      // Reload teams
      await loadTeams();
      
      // Show success message
      setSuccess('Triumvirate groups initialized successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
      // Notify parent component
      onSetupComplete();
    } catch (err: any) {
      console.error('Error initializing Triumvirate groups:', err);
      setError('Failed to initialize groups: ' + err.message);
      
      // Log error
      logAction({
        action: 'triumvirate_groups_initialization_error',
        details: {
          tournament_id: tournamentId,
          error: err.message
        }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderTeamGroups = () => {
    // Group teams by triumvirate group
    const teamsByGroup = new Map<string, Team[]>();
    
    teams.forEach(team => {
      if (!team.triumvirate_group) return;
      
      if (!teamsByGroup.has(team.triumvirate_group)) {
        teamsByGroup.set(team.triumvirate_group, []);
      }
      
      teamsByGroup.get(team.triumvirate_group)!.push(team);
    });
    
    if (teamsByGroup.size === 0) {
      return (
        <div className="text-center py-8 text-gray-400 font-jetbrains">
          No groups initialized yet. Click "Initialize Groups" to begin.
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from(teamsByGroup.entries()).map(([groupName, groupTeams]) => (
          <div key={groupName} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white font-orbitron mb-3 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                {groupName}
              </div>
              <span>Group {groupName}</span>
            </h3>
            
            <div className="space-y-2">
              {groupTeams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-2 bg-gray-700/50 rounded-lg">
                  <span className="text-white font-jetbrains">{team.name}</span>
                  {team.triumvirate_position > 0 && (
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full border border-blue-500/50">
                      Position: {team.triumvirate_position}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-blue-400" />
          Triumvirate Mode Setup
        </h2>
        
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
        
        {/* Configuration Summary */}
        <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-300 font-orbitron mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Tournament Structure
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-400 mb-1">Total Teams</div>
              <div className="text-white font-bold">{config.total_teams}</div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-400 mb-1">Total Rounds</div>
              <div className="text-white font-bold">{config.total_rounds}</div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-400 mb-1">Phase 1 Rounds</div>
              <div className="text-white font-bold">{config.phase1_rounds}</div>
            </div>
            
            <div className="bg-gray-800/50 p-3 rounded-lg">
              <div className="text-gray-400 mb-1">Phase 2 Rounds</div>
              <div className="text-white font-bold">{config.phase2_rounds}</div>
            </div>
          </div>
        </div>
        
        {/* Team Count Warning */}
        {teams.length !== config.total_teams && (
          <div className="mb-6 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 font-jetbrains text-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <div>
                <p className="font-medium mb-1">Team Count Mismatch</p>
                <p>Triumvirate mode requires exactly {config.total_teams} teams. You currently have {teams.length} teams.</p>
                {teams.length < config.total_teams ? (
                  <p className="mt-1">Please add {config.total_teams - teams.length} more teams before initializing groups.</p>
                ) : (
                  <p className="mt-1">Please remove {teams.length - config.total_teams} teams before initializing groups.</p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Initialize Button */}
        <div className="flex justify-end">
          <button
            onClick={handleInitializeGroups}
            disabled={isSaving || teams.length !== config.total_teams}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
          >
            {isSaving ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Save size={16} />
                Initialize Triumvirate Groups
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Team Groups */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-purple-400" />
          Team Groups
        </h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          renderTeamGroups()
        )}
      </div>
    </div>
  );
};

export default TriumvirateSetup;