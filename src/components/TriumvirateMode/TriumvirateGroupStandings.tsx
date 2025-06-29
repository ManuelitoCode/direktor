import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Filter, Search, X, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Team, Tournament, TriumvirateConfig } from '../../types/database';
import TeamLogo from '../TeamLogo';

interface TriumvirateGroupStandingsProps {
  tournamentId: string;
  tournament: Tournament;
}

interface GroupStanding {
  team: Team;
  wins: number;
  losses: number;
  draws: number;
  spread: number;
  individualWins: number;
  rank: number;
}

const TriumvirateGroupStandings: React.FC<TriumvirateGroupStandingsProps> = ({
  tournamentId,
  tournament
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [pairings, setPairings] = useState<any[]>([]);
  const [groupStandings, setGroupStandings] = useState<Map<string, GroupStanding[]>>(new Map());
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const config = tournament.triumvirate_config as TriumvirateConfig || {};
  const currentPhase = config.current_phase || 1;

  useEffect(() => {
    loadData();
  }, [tournamentId, currentPhase]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load results
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (resultsError) throw resultsError;
      setResults(resultsData || []);

      // Load pairings
      const { data: pairingsData, error: pairingsError } = await supabase
        .from('pairings')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (pairingsError) throw pairingsError;
      setPairings(pairingsData || []);

      // Calculate standings
      calculateStandings(teamsData || [], resultsData || [], pairingsData || []);
    } catch (err: any) {
      console.error('Error loading Triumvirate standings:', err);
      setError('Failed to load standings: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStandings = (teams: Team[], results: any[], pairings: any[]) => {
    // Group teams by their triumvirate group
    const teamsByGroup = new Map<string, Team[]>();
    
    teams.forEach(team => {
      if (!team.triumvirate_group) return;
      
      if (!teamsByGroup.has(team.triumvirate_group)) {
        teamsByGroup.set(team.triumvirate_group, []);
      }
      
      teamsByGroup.get(team.triumvirate_group)!.push(team);
    });
    
    // Calculate standings for each group
    const standings = new Map<string, GroupStanding[]>();
    
    for (const [groupName, groupTeams] of teamsByGroup.entries()) {
      const groupStandings: GroupStanding[] = groupTeams.map(team => {
        // Calculate team statistics
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let spread = 0;
        let individualWins = 0;
        
        // Use Phase 1 stats if available
        if (currentPhase === 2 && team.phase1_wins !== undefined) {
          wins = team.phase1_wins;
          spread = team.phase1_spread || 0;
          individualWins = team.phase1_individual_wins || 0;
        }
        
        // Calculate additional stats from results
        // This would need to be expanded for a full implementation
        
        return {
          team,
          wins,
          losses,
          draws,
          spread,
          individualWins,
          rank: 0 // Will be assigned after sorting
        };
      });
      
      // Sort by wins, then spread, then individual wins
      groupStandings.sort((a, b) => {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.spread !== b.spread) return b.spread - a.spread;
        return b.individualWins - a.individualWins;
      });
      
      // Assign ranks
      groupStandings.forEach((standing, index) => {
        standing.rank = index + 1;
      });
      
      standings.set(groupName, groupStandings);
    }
    
    setGroupStandings(standings);
    
    // Set default selected group if none selected
    if (selectedGroup === 'all' && standings.size > 0) {
      setSelectedGroup(Array.from(standings.keys())[0]);
    }
  };

  const exportStandings = () => {
    // Prepare CSV data
    const headers = ['Group', 'Rank', 'Team', 'W-L-D', 'Spread', 'Individual Wins'];
    const rows: string[][] = [];
    
    for (const [groupName, standings] of groupStandings.entries()) {
      for (const standing of standings) {
        rows.push([
          groupName,
          standing.rank.toString(),
          standing.team.name,
          `${standing.wins}-${standing.losses}-${standing.draws}`,
          standing.spread.toString(),
          standing.individualWins.toString()
        ]);
      }
    }
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Triumvirate_Phase${currentPhase}_Standings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStandings = () => {
    if (selectedGroup === 'all') {
      // Combine all groups
      const allStandings: GroupStanding[] = [];
      for (const standings of groupStandings.values()) {
        allStandings.push(...standings);
      }
      return allStandings;
    }
    
    return groupStandings.get(selectedGroup) || [];
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
        {/* Group Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="all">All Groups</option>
            {Array.from(groupStandings.keys()).sort().map(group => (
              <option key={group} value={group}>
                Group {group}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search teams..."
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

        {/* Export Button */}
        <button
          onClick={exportStandings}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}

      {/* Phase Indicator */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 text-center">
        <h3 className="text-lg font-bold text-blue-300 font-orbitron">
          Phase {currentPhase} Standings
        </h3>
        <p className="text-gray-300 font-jetbrains text-sm mt-1">
          {currentPhase === 1 
            ? "Teams are competing in their initial groups" 
            : "Teams are competing in their final placement groups"}
        </p>
      </div>

      {/* Standings Table */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            {selectedGroup === 'all' ? 'All Groups' : `Group ${selectedGroup}`} Standings
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Group</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rank</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Team</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">W-L-D</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Spread</th>
                <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Individual Wins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredStandings()
                .filter(standing => 
                  standing.team.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((standing) => (
                  <tr 
                    key={standing.team.id} 
                    className="hover:bg-gray-800/30 transition-colors duration-200"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center justify-center text-blue-400 font-bold text-sm">
                          {standing.team.triumvirate_group}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getRankIcon(standing.rank)}
                        <span className="text-lg font-bold font-orbitron text-white">
                          #{standing.rank}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <TeamLogo 
                          team={standing.team} 
                          teamName={standing.team.name} 
                          size="sm" 
                          showFlag={true}
                        />
                        <span className="text-white font-medium">
                          {standing.team.name}
                        </span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="font-mono text-sm text-white">
                        <span className="text-green-400">{standing.wins}</span>-
                        <span className="text-red-400">{standing.losses}</span>-
                        <span className="text-yellow-400">{standing.draws}</span>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono text-sm ${
                        standing.spread > 0 ? 'text-green-400' : 
                        standing.spread < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {standing.spread > 0 ? '+' : ''}{standing.spread}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <span className="text-purple-400 font-mono text-sm">
                        {standing.individualWins}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        
        {filteredStandings().length === 0 && (
          <div className="text-center py-12 text-gray-400 font-jetbrains">
            {searchQuery ? 'No teams match your search' : 'No standings available'}
          </div>
        )}
      </div>
    </div>
  );
};

export default TriumvirateGroupStandings;