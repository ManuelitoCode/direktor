import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Medal, Search, Filter, Download, X } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import BadgeIcon from './Badges/BadgeIcon';
import PlayerLink from './PlayerLink';
import { supabase } from '../lib/supabase';
import { Player, Badge, BadgeType } from '../types/database';

interface PlayerWithStats {
  id: string;
  name: string;
  rating: number;
  team_name?: string;
  tournaments_played: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  win_percentage: number;
  average_spread: number;
  highest_score: number;
  badges: Badge[];
  badge_count: number;
}

const PlayerLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerWithStats[]>([]);
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'wins' | 'badges'>('rating');
  const [filterBadge, setFilterBadge] = useState<string>('all');

  useEffect(() => {
    loadLeaderboardData();
  }, []);

  useEffect(() => {
    // Apply filters and sorting whenever the base data or filters change
    applyFiltersAndSort();
  }, [players, searchQuery, sortBy, filterBadge]);

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load badge types
      const { data: badgeTypesData, error: badgeTypesError } = await supabase
        .from('badge_types')
        .select('*')
        .order('name');

      if (badgeTypesError) throw badgeTypesError;
      setBadgeTypes(badgeTypesData || []);

      // Load all players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('rating', { ascending: false });

      if (playersError) throw playersError;

      // Load all badges
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select(`
          *,
          badge_type:badge_types(*)
        `);

      if (badgesError) throw badgesError;

      // Load all results for statistics
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          pairing:pairings!results_pairing_id_fkey(
            player1_id,
            player2_id
          )
        `);

      if (resultsError) throw resultsError;

      // Process player statistics
      const playerStats = new Map<string, PlayerWithStats>();

      // Initialize player stats
      playersData.forEach(player => {
        playerStats.set(player.id!, {
          id: player.id!,
          name: player.name,
          rating: player.rating,
          team_name: player.team_name,
          tournaments_played: 0,
          total_wins: 0,
          total_losses: 0,
          total_draws: 0,
          win_percentage: 0,
          average_spread: 0,
          highest_score: 0,
          badges: [],
          badge_count: 0
        });
      });

      // Add badges to players
      badgesData.forEach(badge => {
        const playerStat = playerStats.get(badge.player_id);
        if (playerStat) {
          playerStat.badges.push(badge);
          playerStat.badge_count++;
        }
      });

      // Process results for player statistics
      resultsData.forEach(result => {
        const pairing = result.pairing;
        if (!pairing) return;

        // Process player 1
        const player1Stat = playerStats.get(pairing.player1_id);
        if (player1Stat) {
          // Update highest score
          player1Stat.highest_score = Math.max(player1Stat.highest_score, result.player1_score);
          
          // Calculate spread
          const spread = result.player1_score - result.player2_score;
          
          // Update win/loss record
          if (spread > 0) {
            player1Stat.total_wins++;
          } else if (spread < 0) {
            player1Stat.total_losses++;
          } else {
            player1Stat.total_draws++;
          }
        }

        // Process player 2
        const player2Stat = playerStats.get(pairing.player2_id);
        if (player2Stat) {
          // Update highest score
          player2Stat.highest_score = Math.max(player2Stat.highest_score, result.player2_score);
          
          // Calculate spread
          const spread = result.player2_score - result.player1_score;
          
          // Update win/loss record
          if (spread > 0) {
            player2Stat.total_wins++;
          } else if (spread < 0) {
            player2Stat.total_losses++;
          } else {
            player2Stat.total_draws++;
          }
        }
      });

      // Calculate derived statistics
      playerStats.forEach(player => {
        const totalGames = player.total_wins + player.total_losses + player.total_draws;
        player.win_percentage = totalGames > 0 ? (player.total_wins / totalGames) * 100 : 0;
        
        // Count unique tournaments
        const tournamentIds = new Set(player.badges.map(b => b.tournament_id));
        player.tournaments_played = tournamentIds.size;
      });

      setPlayers(Array.from(playerStats.values()));
    } catch (err: any) {
      console.error('Error loading leaderboard data:', err);
      setError(err.message || 'Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...players];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (player.team_name && player.team_name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply badge filter
    if (filterBadge !== 'all') {
      filtered = filtered.filter(player => 
        player.badges.some(badge => badge.badge_type_id === filterBadge)
      );
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'wins':
        filtered.sort((a, b) => {
          if (b.total_wins !== a.total_wins) return b.total_wins - a.total_wins;
          return b.win_percentage - a.win_percentage;
        });
        break;
      case 'badges':
        filtered.sort((a, b) => {
          if (b.badge_count !== a.badge_count) return b.badge_count - a.badge_count;
          return b.rating - a.rating;
        });
        break;
    }
    
    setFilteredPlayers(filtered);
  };

  const handleBack = () => {
    navigate('/');
  };

  const exportLeaderboard = () => {
    const headers = ['Rank', 'Name', 'Rating', 'Team', 'Tournaments', 'W-L-D', 'Win %', 'Badges'];
    const rows = filteredPlayers.map((player, index) => [
      index + 1,
      player.name,
      player.rating,
      player.team_name || '',
      player.tournaments_played,
      `${player.total_wins}-${player.total_losses}-${player.total_draws}`,
      `${player.win_percentage.toFixed(1)}%`,
      player.badge_count
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Player_Leaderboard.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-jetbrains">← Back to Home</span>
            </button>
          </div>

          <h1 
            className="glitch-text fade-up text-4xl md:text-6xl font-bold mb-4 text-white font-orbitron tracking-wider"
            data-text="PLAYER LEADERBOARD"
            style={{
              textShadow: '0 0 30px rgba(59, 130, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.4), 0 0 90px rgba(59, 130, 246, 0.3)'
            }}
          >
            PLAYER LEADERBOARD
          </h1>
          
          <p className="fade-up fade-up-delay-1 text-xl md:text-2xl text-blue-400 mb-4 font-medium">
            Top players ranked by performance
          </p>
          
          <div className="fade-up fade-up-delay-3 w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
        </div>

        {/* Search and Filter Controls */}
        <div className="fade-up fade-up-delay-4 max-w-6xl mx-auto w-full mb-8">
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
              {/* Sort By */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'rating' | 'wins' | 'badges')}
                  className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="rating">Sort by Rating</option>
                  <option value="wins">Sort by Wins</option>
                  <option value="badges">Sort by Badges</option>
                </select>
              </div>

              {/* Badge Filter */}
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-gray-400" />
                <select
                  value={filterBadge}
                  onChange={(e) => setFilterBadge(e.target.value)}
                  className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="all">All Badges</option>
                  {badgeTypes.map(badge => (
                    <option key={badge.id} value={badge.id}>
                      {badge.name} Only
                    </option>
                  ))}
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={exportLeaderboard}
                className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-6xl mx-auto w-full mb-8">
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
              {error}
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="fade-up fade-up-delay-5 max-w-6xl mx-auto w-full mb-8">
          <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Player Rankings
              </h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rating</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">W-L-D</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Win %</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Tournaments</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Badges</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-jetbrains">
                        <div className="flex justify-center">
                          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      </td>
                    </tr>
                  ) : filteredPlayers.length > 0 ? (
                    filteredPlayers.map((player, index) => (
                      <tr 
                        key={player.id} 
                        className={`hover:bg-gray-800/30 transition-colors duration-200 ${
                          index < 3 ? 'bg-gradient-to-r from-yellow-900/10 to-transparent' : ''
                        }`}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getRankIcon(index + 1)}
                            <span className="text-lg font-bold font-orbitron text-white">
                              #{index + 1}
                            </span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 whitespace-nowrap">
                          <PlayerLink playerId={player.id} playerName={player.name}>
                            <div className="flex items-center gap-2 group">
                              <div className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors duration-200">
                                {player.name}
                              </div>
                              {player.team_name && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100/10 text-purple-300 border border-purple-500/30">
                                  {player.team_name}
                                </span>
                              )}
                            </div>
                          </PlayerLink>
                        </td>
                        
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="text-lg font-bold text-white font-mono">
                            {player.rating}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <div className="font-mono text-sm text-white">
                            <span className="text-green-400">{player.total_wins}</span>-
                            <span className="text-red-400">{player.total_losses}</span>-
                            <span className="text-yellow-400">{player.total_draws}</span>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="text-sm text-blue-400 font-mono">
                            {player.win_percentage.toFixed(1)}%
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="text-sm text-purple-400 font-mono">
                            {player.tournaments_played}
                          </span>
                        </td>
                        
                        <td className="px-4 py-4 text-center">
                          {player.badges.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {player.badges.slice(0, 3).map((badge, i) => (
                                <div key={i} className="-ml-1 first:ml-0">
                                  <BadgeIcon badge={badge.badge_type!} size="xs" />
                                </div>
                              ))}
                              {player.badges.length > 3 && (
                                <span className="text-xs text-gray-400 ml-1">
                                  +{player.badges.length - 3}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500">None</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-jetbrains">
                        {searchQuery || filterBadge !== 'all'
                          ? 'No players match your search criteria'
                          : 'No players found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="fade-up text-center mt-auto">
          <p className="text-gray-500 text-sm font-light tracking-wider">
            Player Leaderboard • Powered by Direktor
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PlayerLeaderboard;