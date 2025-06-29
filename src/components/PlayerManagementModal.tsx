import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, UserX, Save, Search, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Player, Team } from '../types/database';
import { parsePlayerInput } from '../utils/playerParser';
import TeamLogo from './TeamLogo';

interface PlayerManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  mode: 'add' | 'remove' | 'pause';
  onComplete: () => void;
  teamMode: boolean;
}

const PlayerManagementModal: React.FC<PlayerManagementModalProps> = ({
  isOpen,
  onClose,
  tournamentId,
  mode,
  onComplete,
  teamMode
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newPlayerInput, setNewPlayerInput] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, tournamentId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (playersError) throw playersError;
      setPlayers(playersData || []);

      // Load teams if in team mode
      if (teamMode) {
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .eq('tournament_id', tournamentId);

        if (teamsError) throw teamsError;
        setTeams(teamsData || []);
      }
    } catch (err: any) {
      console.error('Error loading player data:', err);
      setError('Failed to load player data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayerInput.trim()) {
      setError('Please enter player information');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Parse player input
      const parsedPlayers = parsePlayerInput(newPlayerInput, teamMode);
      const validPlayers = parsedPlayers.filter(p => p.isValid);

      if (validPlayers.length === 0) {
        setError('No valid players to add. Please check the format.');
        setIsSaving(false);
        return;
      }

      // Prepare players for insertion
      const playersToInsert = validPlayers.map(player => ({
        name: player.name,
        rating: player.rating,
        tournament_id: tournamentId,
        team_name: teamMode ? player.team_name : undefined,
        status: 'active'
      }));

      // Insert players
      const { error: insertError } = await supabase
        .from('players')
        .insert(playersToInsert);

      if (insertError) throw insertError;

      // Show success message
      setSuccess(`Successfully added ${validPlayers.length} player${validPlayers.length !== 1 ? 's' : ''}`);
      setNewPlayerInput('');
      
      // Reload players
      await loadData();
      
      // Call completion callback
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error adding players:', err);
      setError(err.message || 'Failed to add players');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemovePlayers = async () => {
    if (selectedPlayers.length === 0) {
      setError('Please select players to remove');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Delete selected players
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .in('id', selectedPlayers);

      if (deleteError) throw deleteError;

      // Show success message
      setSuccess(`Successfully removed ${selectedPlayers.length} player${selectedPlayers.length !== 1 ? 's' : ''}`);
      setSelectedPlayers([]);
      
      // Reload players
      await loadData();
      
      // Call completion callback
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error removing players:', err);
      setError(err.message || 'Failed to remove players');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePausePlayers = async () => {
    if (selectedPlayers.length === 0) {
      setError('Please select players to pause');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Update player status to paused
      const { error: updateError } = await supabase
        .from('players')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          paused_reason: pauseReason || null
        })
        .in('id', selectedPlayers);

      if (updateError) throw updateError;

      // Show success message
      setSuccess(`Successfully paused ${selectedPlayers.length} player${selectedPlayers.length !== 1 ? 's' : ''}`);
      setSelectedPlayers([]);
      setPauseReason('');
      
      // Reload players
      await loadData();
      
      // Call completion callback
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error pausing players:', err);
      setError(err.message || 'Failed to pause players');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlayerSelection = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const filteredPlayers = players.filter(player => {
    // For pause mode, only show active players
    if (mode === 'pause' && player.status === 'paused') {
      return false;
    }
    
    // For all modes, apply search filter
    return player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (player.team_name && player.team_name.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const getModalTitle = () => {
    switch (mode) {
      case 'add': return 'Add Players';
      case 'remove': return 'Remove Players';
      case 'pause': return 'Pause Player Participation';
    }
  };

  const getModalIcon = () => {
    switch (mode) {
      case 'add': return <UserPlus className="w-6 h-6 text-white" />;
      case 'remove': return <UserMinus className="w-6 h-6 text-white" />;
      case 'pause': return <UserX className="w-6 h-6 text-white" />;
    }
  };

  const getModalColor = () => {
    switch (mode) {
      case 'add': return 'from-green-900/30 to-blue-900/30 border-green-500/30';
      case 'remove': return 'from-red-900/30 to-purple-900/30 border-red-500/30';
      case 'pause': return 'from-yellow-900/30 to-orange-900/30 border-yellow-500/30';
    }
  };

  const getActionButtonColor = () => {
    switch (mode) {
      case 'add': return 'bg-green-600 hover:bg-green-700';
      case 'remove': return 'bg-red-600 hover:bg-red-700';
      case 'pause': return 'bg-yellow-600 hover:bg-yellow-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/95 backdrop-blur-lg border-2 border-blue-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b-2 border-blue-500/30 bg-gradient-to-r ${getModalColor()}`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              {getModalIcon()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                {getModalTitle()}
              </h2>
              <p className="text-blue-300 font-jetbrains">
                {mode === 'add' 
                  ? 'Add new players to the tournament' 
                  : mode === 'remove'
                  ? 'Remove players from the tournament'
                  : 'Temporarily pause player participation'}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
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

          {/* Add Player Form */}
          {mode === 'add' && (
            <div className="mb-6">
              <label className="block text-white text-lg font-medium mb-4 font-jetbrains">
                {teamMode ? 'Enter Player Details (Name, Rating, Team):' : 'Enter Player Details (Name, Rating):'}
              </label>
              
              <div className="relative">
                <textarea
                  value={newPlayerInput}
                  onChange={(e) => setNewPlayerInput(e.target.value)}
                  placeholder={teamMode 
                    ? "Samuel, 2000 ; ; team Team A\nAnikoh, 1500 ; ; team Team A" 
                    : "Jane Doe, 1752\nAhmed Musa, 1640"}
                  className="w-full h-64 bg-gray-800/50 border-2 border-gray-600 rounded-xl px-6 py-4 text-white font-jetbrains text-sm leading-relaxed resize-none focus:border-blue-500 focus:outline-none transition-colors duration-300 backdrop-blur-sm placeholder-gray-500"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                />
              </div>

              <div className="mt-4">
                <button
                  onClick={handleAddPlayer}
                  disabled={isSaving || !newPlayerInput.trim()}
                  className={`flex items-center justify-center gap-2 px-6 py-3 ${getActionButtonColor()} text-white rounded-lg font-jetbrains font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding Players...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Add Players
                    </>
                  )}
                </button>
              </div>
              
              <div className="mt-4 text-sm text-gray-400 font-jetbrains">
                <p>Format: {teamMode 
                  ? "Name, Rating ; ; team TeamName (one player per line)" 
                  : "Name, Rating (one player per line)"}</p>
              </div>
            </div>
          )}

          {/* Player Selection (for Remove/Pause) */}
          {(mode === 'remove' || mode === 'pause') && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-white text-lg font-medium font-jetbrains">
                  {mode === 'remove' ? 'Select Players to Remove:' : 'Select Players to Pause:'}
                </label>
                
                <div className="relative max-w-xs w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="block w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-jetbrains"
                  />
                </div>
              </div>
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-y-auto max-h-96">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                ) : filteredPlayers.length > 0 ? (
                  <div className="divide-y divide-gray-700">
                    {filteredPlayers.map(player => (
                      <div 
                        key={player.id}
                        className={`flex items-center justify-between p-4 hover:bg-gray-700/30 transition-colors duration-200 cursor-pointer ${
                          selectedPlayers.includes(player.id!) ? 'bg-blue-900/30 border-l-4 border-blue-500' : ''
                        }`}
                        onClick={() => handleTogglePlayerSelection(player.id!)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md border ${
                            selectedPlayers.includes(player.id!) 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-gray-500'
                          } flex items-center justify-center`}>
                            {selectedPlayers.includes(player.id!) && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          
                          <div>
                            <div className="text-white font-medium">
                              {player.name}
                              {player.status === 'paused' && (
                                <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full">
                                  Paused
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-400 font-jetbrains">Rating: {player.rating}</div>
                          </div>
                        </div>
                        
                        {teamMode && player.team_name && (
                          <div className="flex items-center gap-2">
                            <TeamLogo 
                              team={teams.find(t => t.name === player.team_name)} 
                              teamName={player.team_name} 
                              size="xs" 
                              showFlag={false}
                            />
                            <span className="text-sm text-gray-300">{player.team_name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 font-jetbrains">
                    {searchQuery ? 'No players match your search' : 'No players found'}
                  </div>
                )}
              </div>
              
              {/* Pause Reason Input (only for pause mode) */}
              {mode === 'pause' && (
                <div className="mt-4">
                  <label className="block text-white text-sm font-medium mb-2 font-jetbrains">
                    Reason for Pausing (Optional):
                  </label>
                  <textarea
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    placeholder="Enter reason for pausing player participation..."
                    className="w-full h-24 bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white font-jetbrains text-sm resize-none focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  />
                </div>
              )}
              
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-400 font-jetbrains">
                  {selectedPlayers.length} player{selectedPlayers.length !== 1 ? 's' : ''} selected
                </div>
                
                <button
                  onClick={mode === 'remove' ? handleRemovePlayers : handlePausePlayers}
                  disabled={isSaving || selectedPlayers.length === 0}
                  className={`flex items-center justify-center gap-2 px-6 py-3 ${getActionButtonColor()} text-white rounded-lg font-jetbrains font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {mode === 'remove' ? 'Removing...' : 'Pausing...'}
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {mode === 'remove' ? 'Remove Selected' : 'Pause Selected'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Warning for Remove */}
          {mode === 'remove' && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Warning: This action cannot be undone</p>
                  <p>Removing players will delete all their data including game results. This may affect tournament standings and pairings.</p>
                </div>
              </div>
            </div>
          )}

          {/* Info for Pause */}
          {mode === 'pause' && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 text-yellow-300 font-jetbrains text-sm">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Pausing Player Participation</p>
                  <p>Paused players will not be included in future pairings but their previous results will be preserved. You can unpause players later if needed.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerManagementModal;