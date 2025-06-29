import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowUp, ArrowDown, X, Download, User, Users, UserCheck, PauseCircle, Play, UserMinus } from 'lucide-react';
import { supabase, handleSupabaseError, retrySupabaseOperation } from '../lib/supabase';
import { Player, Division, Team } from '../types/database';
import TeamLogo from './TeamLogo';

interface PlayerRosterProps {
  tournamentId: string;
  teamMode?: boolean;
  onEditPlayer?: (player: Player) => void;
  onDeletePlayer?: (playerId: string) => void;
}

const PlayerRoster: React.FC<PlayerRosterProps> = ({
  tournamentId,
  teamMode = false,
  onEditPlayer,
  onDeletePlayer
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'rating'>('rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<string | null>(null);
  const [isStatusChangeConfirm, setIsStatusChangeConfirm] = useState<{playerId: string, status: string} | null>(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load players
      const playersData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('players')
          .select('*')
          .eq('tournament_id', tournamentId);

        if (error) throw error;
        return data || [];
      });

      setPlayers(playersData);

      // Load divisions
      const divisionsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('divisions')
          .select('*')
          .eq('tournament_id', tournamentId)
          .order('division_number');

        if (error && error.code !== 'PGRST116') {
          throw error;
        }
        return data || [];
      });

      setDivisions(divisionsData);

      // Load teams if in team mode
      if (teamMode) {
        const teamsData = await retrySupabaseOperation(async () => {
          const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('tournament_id', tournamentId)
            .order('name');

          if (error && error.code !== 'PGRST116') {
            throw error;
          }
          return data || [];
        });

        setTeams(teamsData);
      }
    } catch (err: any) {
      console.error('Error loading player roster data:', err);
      setError(handleSupabaseError(err, 'loading player data'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: 'name' | 'rating') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'rating' ? 'desc' : 'asc');
    }
  };

  const handleDeleteConfirm = async (playerId: string) => {
    if (isDeleteConfirmOpen === playerId) {
      try {
        await retrySupabaseOperation(async () => {
          const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', playerId);

          if (error) throw error;
        });

        // Remove player from local state
        setPlayers(players.filter(p => p.id !== playerId));
        setIsDeleteConfirmOpen(null);

        // Show success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-jetbrains text-sm border border-green-500/50';
        toast.innerHTML = `
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Player deleted successfully
          </div>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 3000);

        // Call parent callback if provided
        if (onDeletePlayer) {
          onDeletePlayer(playerId);
        }
      } catch (err: any) {
        console.error('Error deleting player:', err);
        setError(handleSupabaseError(err, 'deleting player'));
      }
    } else {
      setIsDeleteConfirmOpen(playerId);
      // Auto-close after 3 seconds
      setTimeout(() => {
        setIsDeleteConfirmOpen(null);
      }, 3000);
    }
  };

  const handleChangeParticipationStatus = async (playerId: string, newStatus: string) => {
    // Confirm status change if not already confirming
    if (!isStatusChangeConfirm || isStatusChangeConfirm.playerId !== playerId || isStatusChangeConfirm.status !== newStatus) {
      setIsStatusChangeConfirm({ playerId, status: newStatus });
      setTimeout(() => setIsStatusChangeConfirm(null), 3000);
      return;
    }

    try {
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('players')
          .update({ participation_status: newStatus })
          .eq('id', playerId);

        if (error) throw error;
      });

      // Update player in local state
      setPlayers(players.map(p => 
        p.id === playerId ? { ...p, participation_status: newStatus } : p
      ));
      
      setIsStatusChangeConfirm(null);

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-jetbrains text-sm border border-green-500/50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Player status updated successfully
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Error updating player status:', err);
      setError(handleSupabaseError(err, 'updating player status'));
    }
  };

  const exportPlayersCSV = () => {
    const headers = ['Name', 'Rating', 'Division', 'Team', 'Status'];
    const rows = filteredPlayers.map(player => [
      player.name,
      player.rating.toString(),
      getDivisionName(player),
      player.team_name || '',
      player.participation_status || 'active'
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Players_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDivisionName = (player: Player): string => {
    // In a real implementation, you would have a division_id field on the player
    // For now, we'll just return the first division name or "Main Division"
    return divisions.length > 0 ? divisions[0].name : 'Main Division';
  };

  const getStatusBadge = (status: string = 'active') => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100/10 text-green-300 border border-green-500/30">Active</span>;
      case 'paused':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100/10 text-yellow-300 border border-yellow-500/30">Paused</span>;
      case 'withdrawn':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100/10 text-red-300 border border-red-500/30">Withdrawn</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100/10 text-gray-300 border border-gray-500/30">{status}</span>;
    }
  };

  // Apply filters and sorting
  const filteredPlayers = players
    .filter(player => {
      // Search filter
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Division filter (would need division_id on player in real implementation)
      const matchesDivision = selectedDivision === 'all' || true;
      
      // Team filter
      const matchesTeam = selectedTeam === 'all' || player.team_name === selectedTeam;
      
      // Status filter
      const matchesStatus = selectedStatus === 'all' || 
        (player.participation_status || 'active') === selectedStatus;
      
      return matchesSearch && matchesDivision && matchesTeam && matchesStatus;
    })
    .sort((a, b) => {
      if (sortField === 'name') {
        return sortDirection === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        return sortDirection === 'asc'
          ? a.rating - b.rating
          : b.rating - a.rating;
      }
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/50 border border-gray-700 rounded-xl p-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search players..."
            className="block w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 font-jetbrains"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Division Filter */}
          {divisions.length > 1 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">All Divisions</option>
                {divisions.map(division => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Team Filter */}
          {teamMode && teams.length > 0 && (
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-gray-400" />
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
              >
                <option value="all">All Teams</option>
                {teams.map(team => (
                  <option key={team.id} value={team.name}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {/* Export Button */}
          <button
            onClick={exportPlayersCSV}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}

      {/* Players Table */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                  <button
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-white transition-colors duration-200"
                  >
                    Name
                    {sortField === 'name' && (
                      sortDirection === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                  <button
                    onClick={() => handleSort('rating')}
                    className="flex items-center gap-1 hover:text-white transition-colors duration-200"
                  >
                    Rating
                    {sortField === 'rating' && (
                      sortDirection === 'asc' ? 
                        <ArrowUp className="h-3 w-3" /> : 
                        <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                {divisions.length > 1 && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                    Division
                  </th>
                )}
                {teamMode && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                    Team
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-gray-800/30 transition-colors duration-200">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">{player.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-white font-mono">{player.rating}</div>
                  </td>
                  {divisions.length > 1 && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{getDivisionName(player)}</div>
                    </td>
                  )}
                  {teamMode && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      {player.team_name ? (
                        <div className="flex items-center gap-2">
                          <TeamLogo 
                            team={teams.find(t => t.name === player.team_name)} 
                            teamName={player.team_name} 
                            size="xs" 
                            showFlag={false}
                          />
                          <span className="text-sm text-gray-300">{player.team_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 italic">No team</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(player.participation_status)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Status Change Buttons */}
                      {(player.participation_status === 'active' || !player.participation_status) && (
                        <button
                          onClick={() => handleChangeParticipationStatus(player.id!, 'paused')}
                          className={`px-2 py-1 rounded text-xs font-jetbrains transition-all duration-200 ${
                            isStatusChangeConfirm?.playerId === player.id && isStatusChangeConfirm?.status === 'paused'
                              ? 'bg-yellow-600 text-white animate-pulse'
                              : 'bg-yellow-600/20 border border-yellow-500/50 text-yellow-400 hover:bg-yellow-600/30 hover:text-white'
                          }`}
                          title="Pause player participation"
                        >
                          <PauseCircle className="w-4 h-4" />
                        </button>
                      )}
                      
                      {player.participation_status === 'paused' && (
                        <button
                          onClick={() => handleChangeParticipationStatus(player.id!, 'active')}
                          className={`px-2 py-1 rounded text-xs font-jetbrains transition-all duration-200 ${
                            isStatusChangeConfirm?.playerId === player.id && isStatusChangeConfirm?.status === 'active'
                              ? 'bg-green-600 text-white animate-pulse'
                              : 'bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-white'
                          }`}
                          title="Resume player participation"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      
                      {player.participation_status !== 'withdrawn' && (
                        <button
                          onClick={() => handleChangeParticipationStatus(player.id!, 'withdrawn')}
                          className={`px-2 py-1 rounded text-xs font-jetbrains transition-all duration-200 ${
                            isStatusChangeConfirm?.playerId === player.id && isStatusChangeConfirm?.status === 'withdrawn'
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white'
                          }`}
                          title="Withdraw player from tournament"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Edit Button */}
                      {onEditPlayer && (
                        <button
                          onClick={() => onEditPlayer(player)}
                          className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded text-xs font-jetbrains transition-all duration-200"
                        >
                          Edit
                        </button>
                      )}
                      
                      {/* Delete Button */}
                      {onDeletePlayer && (
                        <button
                          onClick={() => handleDeleteConfirm(player.id!)}
                          className={`px-2 py-1 rounded text-xs font-jetbrains transition-all duration-200 ${
                            isDeleteConfirmOpen === player.id
                              ? 'bg-red-600 text-white animate-pulse'
                              : 'bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white'
                          }`}
                        >
                          {isDeleteConfirmOpen === player.id ? 'Confirm' : 'Delete'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-jetbrains">
            {searchQuery || selectedDivision !== 'all' || selectedTeam !== 'all' || selectedStatus !== 'all'
              ? 'No players match your search criteria'
              : 'No players registered yet'}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white font-orbitron">{players.length}</div>
          <div className="text-gray-400 text-sm">Total Players</div>
        </div>
        
        <div className="bg-gray-900/50 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400 font-orbitron">
            {players.filter(p => p.participation_status === 'active' || !p.participation_status).length}
          </div>
          <div className="text-gray-400 text-sm">Active Players</div>
        </div>
        
        <div className="bg-gray-900/50 border border-yellow-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400 font-orbitron">
            {players.filter(p => p.participation_status === 'paused').length}
          </div>
          <div className="text-gray-400 text-sm">Paused Players</div>
        </div>
        
        <div className="bg-gray-900/50 border border-red-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400 font-orbitron">
            {players.filter(p => p.participation_status === 'withdrawn').length}
          </div>
          <div className="text-gray-400 text-sm">Withdrawn Players</div>
        </div>
      </div>
    </div>
  );
};

export default PlayerRoster;