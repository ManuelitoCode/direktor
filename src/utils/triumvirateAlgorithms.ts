import { PlayerWithRank, PairingDisplay, Team, TriumvirateConfig } from '../types/database';

/**
 * Generates pairings for Triumvirate Mode tournaments
 * 
 * @param players List of players with rankings
 * @param teams List of teams
 * @param currentRound Current tournament round
 * @param config Triumvirate configuration
 * @param previousPairings Previous pairings to avoid rematches
 * @returns Generated pairings
 */
export function generateTriumviratePairings(
  players: PlayerWithRank[],
  teams: Team[],
  currentRound: number,
  config: TriumvirateConfig,
  previousPairings: Array<{ team1: string; team2: string }> = []
): PairingDisplay[] {
  // Determine which phase we're in
  const isPhase1 = currentRound <= config.phase1_rounds;
  
  if (isPhase1) {
    return generatePhase1Pairings(players, teams, currentRound, config, previousPairings);
  } else {
    return generatePhase2Pairings(players, teams, currentRound, config, previousPairings);
  }
}

/**
 * Generates pairings for Phase 1 of Triumvirate Mode
 * Teams play against teams from different groups
 */
function generatePhase1Pairings(
  players: PlayerWithRank[],
  teams: Team[],
  currentRound: number,
  config: TriumvirateConfig,
  previousPairings: Array<{ team1: string; team2: string }> = []
): PairingDisplay[] {
  const pairings: PairingDisplay[] = [];
  let tableNumber = 1;
  
  // Group teams by their triumvirate group
  const teamsByGroup = new Map<string, Team[]>();
  teams.forEach(team => {
    if (!team.triumvirate_group) return;
    
    if (!teamsByGroup.has(team.triumvirate_group)) {
      teamsByGroup.set(team.triumvirate_group, []);
    }
    teamsByGroup.get(team.triumvirate_group)!.push(team);
  });
  
  // Group players by team
  const playersByTeam = new Map<string, PlayerWithRank[]>();
  players.forEach(player => {
    if (!player.team_name) return;
    
    if (!playersByTeam.has(player.team_name)) {
      playersByTeam.set(player.team_name, []);
    }
    playersByTeam.get(player.team_name)!.push(player);
  });
  
  // Generate cross-group matchups for this round
  const matchups = generateCrossGroupMatchups(
    Array.from(teamsByGroup.entries()),
    currentRound,
    previousPairings
  );
  
  // Create pairings for each matchup
  for (const { team1, team2 } of matchups) {
    const team1Players = playersByTeam.get(team1) || [];
    const team2Players = playersByTeam.get(team2) || [];
    
    // Create pairings between players from each team
    for (let i = 0; i < Math.min(team1Players.length, team2Players.length); i++) {
      const player1 = team1Players[i];
      const player2 = team2Players[i];
      
      if (!player1 || !player2) continue;
      
      // Determine first move
      const firstMovePlayerId = determineFirstMove(player1, player2, tableNumber);
      
      pairings.push({
        table_number: tableNumber,
        player1,
        player2,
        first_move_player_id: firstMovePlayerId,
        player1_gibsonized: false,
        player2_gibsonized: false
      });
      
      tableNumber++;
    }
  }
  
  return pairings;
}

/**
 * Generates pairings for Phase 2 of Triumvirate Mode
 * Teams play against teams within their new group
 */
function generatePhase2Pairings(
  players: PlayerWithRank[],
  teams: Team[],
  currentRound: number,
  config: TriumvirateConfig,
  previousPairings: Array<{ team1: string; team2: string }> = []
): PairingDisplay[] {
  const pairings: PairingDisplay[] = [];
  let tableNumber = 1;
  
  // Adjust round number for Phase 2 (starts at 1 within Phase 2)
  const phase2Round = currentRound - config.phase1_rounds;
  
  // Group teams by their Phase 2 group
  const teamsByGroup = new Map<string, Team[]>();
  teams.forEach(team => {
    if (!team.triumvirate_group) return;
    
    if (!teamsByGroup.has(team.triumvirate_group)) {
      teamsByGroup.set(team.triumvirate_group, []);
    }
    teamsByGroup.get(team.triumvirate_group)!.push(team);
  });
  
  // Group players by team
  const playersByTeam = new Map<string, PlayerWithRank[]>();
  players.forEach(player => {
    if (!player.team_name) return;
    
    if (!playersByTeam.has(player.team_name)) {
      playersByTeam.set(player.team_name, []);
    }
    playersByTeam.get(player.team_name)!.push(player);
  });
  
  // Generate within-group matchups for this round
  const matchups = generateWithinGroupMatchups(
    Array.from(teamsByGroup.entries()),
    phase2Round,
    previousPairings
  );
  
  // Create pairings for each matchup
  for (const { team1, team2 } of matchups) {
    const team1Players = playersByTeam.get(team1) || [];
    const team2Players = playersByTeam.get(team2) || [];
    
    // Create pairings between players from each team
    for (let i = 0; i < Math.min(team1Players.length, team2Players.length); i++) {
      const player1 = team1Players[i];
      const player2 = team2Players[i];
      
      if (!player1 || !player2) continue;
      
      // Determine first move
      const firstMovePlayerId = determineFirstMove(player1, player2, tableNumber);
      
      pairings.push({
        table_number: tableNumber,
        player1,
        player2,
        first_move_player_id: firstMovePlayerId,
        player1_gibsonized: false,
        player2_gibsonized: false
      });
      
      tableNumber++;
    }
  }
  
  return pairings;
}

/**
 * Generates cross-group matchups for Phase 1
 */
function generateCrossGroupMatchups(
  groupedTeams: Array<[string, Team[]]>,
  currentRound: number,
  previousPairings: Array<{ team1: string; team2: string }> = []
): Array<{ team1: string; team2: string }> {
  const matchups: Array<{ team1: string; team2: string }> = [];
  
  // Create a flat list of all teams
  const allTeams = groupedTeams.flatMap(([_, teams]) => teams);
  
  // Create a map of team name to group
  const teamToGroup = new Map<string, string>();
  groupedTeams.forEach(([groupName, teams]) => {
    teams.forEach(team => {
      teamToGroup.set(team.name, groupName);
    });
  });
  
  // Create a map to track how many times each team has played
  const teamPlayCount = new Map<string, number>();
  allTeams.forEach(team => {
    teamPlayCount.set(team.name, 0);
  });
  
  // Create a map to track which teams have played each other
  const teamPairings = new Map<string, Set<string>>();
  allTeams.forEach(team => {
    teamPairings.set(team.name, new Set<string>());
  });
  
  // Add previous pairings to the tracking map
  previousPairings.forEach(({ team1, team2 }) => {
    if (teamPairings.has(team1)) {
      teamPairings.get(team1)!.add(team2);
    }
    if (teamPairings.has(team2)) {
      teamPairings.get(team2)!.add(team1);
    }
  });
  
  // Shuffle teams to ensure random pairings
  const shuffledTeams = [...allTeams].sort(() => Math.random() - 0.5);
  
  // Create pairings for this round
  const pairedTeams = new Set<string>();
  
  for (const team1 of shuffledTeams) {
    if (pairedTeams.has(team1.name)) continue;
    
    // Find a valid opponent
    for (const team2 of shuffledTeams) {
      if (
        team1.name === team2.name || // Same team
        pairedTeams.has(team2.name) || // Already paired
        teamToGroup.get(team1.name) === teamToGroup.get(team2.name) || // Same group
        teamPairings.get(team1.name)?.has(team2.name) // Already played
      ) {
        continue;
      }
      
      // Valid pairing found
      matchups.push({ team1: team1.name, team2: team2.name });
      pairedTeams.add(team1.name);
      pairedTeams.add(team2.name);
      
      // Update tracking maps
      teamPlayCount.set(team1.name, (teamPlayCount.get(team1.name) || 0) + 1);
      teamPlayCount.set(team2.name, (teamPlayCount.get(team2.name) || 0) + 1);
      teamPairings.get(team1.name)!.add(team2.name);
      teamPairings.get(team2.name)!.add(team1.name);
      
      break;
    }
  }
  
  return matchups;
}

/**
 * Generates within-group matchups for Phase 2
 */
function generateWithinGroupMatchups(
  groupedTeams: Array<[string, Team[]]>,
  phase2Round: number,
  previousPairings: Array<{ team1: string; team2: string }> = []
): Array<{ team1: string; team2: string }> {
  const matchups: Array<{ team1: string; team2: string }> = [];
  
  // Process each group separately
  for (const [groupName, teams] of groupedTeams) {
    if (teams.length < 2) continue;
    
    // Create a round-robin schedule for this group
    const schedule = generateRoundRobinSchedule(teams.map(t => t.name));
    
    // Get matchups for the current round (modulo the number of rounds in the schedule)
    const roundIndex = (phase2Round - 1) % schedule.length;
    const roundMatchups = schedule[roundIndex];
    
    // Add matchups to the result
    matchups.push(...roundMatchups);
  }
  
  return matchups;
}

/**
 * Generates a round-robin schedule for a list of teams
 */
function generateRoundRobinSchedule(teams: string[]): Array<Array<{ team1: string; team2: string }>> {
  const schedule: Array<Array<{ team1: string; team2: string }>> = [];
  const teamCount = teams.length;
  
  if (teamCount % 2 === 1) {
    // Add a "bye" team for odd number of teams
    teams.push('BYE');
  }
  
  const totalRounds = teams.length - 1;
  const teamsForScheduling = [...teams]; // Create a copy to manipulate
  
  for (let round = 0; round < totalRounds; round++) {
    const roundMatchups: Array<{ team1: string; team2: string }> = [];
    
    for (let i = 0; i < teamsForScheduling.length / 2; i++) {
      const team1Index = i;
      const team2Index = teamsForScheduling.length - 1 - i;
      
      const team1 = teamsForScheduling[team1Index];
      const team2 = teamsForScheduling[team2Index];
      
      // Skip if one team is "BYE"
      if (team1 !== 'BYE' && team2 !== 'BYE') {
        roundMatchups.push({ team1, team2 });
      }
    }
    
    schedule.push(roundMatchups);
    
    // Rotate teams (keep first team fixed, rotate others)
    if (teamsForScheduling.length > 2) {
      const lastTeam = teamsForScheduling.pop()!;
      teamsForScheduling.splice(1, 0, lastTeam);
    }
  }
  
  return schedule;
}

/**
 * Determines which player goes first
 */
function determineFirstMove(
  player1: PlayerWithRank,
  player2: PlayerWithRank,
  tableNumber: number
): string {
  // Player with fewer previous starts goes first
  if (player1.previous_starts < player2.previous_starts) {
    return player1.id!;
  } else if (player2.previous_starts < player1.previous_starts) {
    return player2.id!;
  } else {
    // If equal starts, alternate by table number
    return tableNumber % 2 === 1 ? player1.id! : player2.id!;
  }
}

/**
 * Initializes Triumvirate groups for Phase 1
 * Randomly assigns teams to 6 groups (A-F)
 */
export function initializeTriumvirateGroups(
  teams: Team[],
  config: TriumvirateConfig
): Team[] {
  // Shuffle teams for random assignment
  const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
  
  // Assign teams to groups
  const groupNames = ['A', 'B', 'C', 'D', 'E', 'F'];
  const teamsPerGroup = config.teams_per_group;
  
  const updatedTeams = shuffledTeams.map((team, index) => {
    const groupIndex = Math.floor(index / teamsPerGroup);
    const groupName = groupNames[groupIndex % groupNames.length];
    
    return {
      ...team,
      triumvirate_group: groupName,
      triumvirate_position: 0, // Will be calculated after Phase 1
      phase1_wins: 0,
      phase1_spread: 0,
      phase1_individual_wins: 0
    };
  });
  
  return updatedTeams;
}

/**
 * Calculates Phase 1 standings and assigns teams to Phase 2 groups
 */
export function calculatePhase1Standings(
  teams: Team[],
  results: any[],
  pairings: any[]
): Team[] {
  // Group teams by their Phase 1 group
  const teamsByGroup = new Map<string, Team[]>();
  teams.forEach(team => {
    if (!team.triumvirate_group) return;
    
    if (!teamsByGroup.has(team.triumvirate_group)) {
      teamsByGroup.set(team.triumvirate_group, []);
    }
    teamsByGroup.get(team.triumvirate_group)!.push(team);
  });
  
  // Calculate team statistics
  const teamStats = calculateTeamStats(teams, results, pairings);
  
  // Update team statistics
  const updatedTeams = teams.map(team => {
    const stats = teamStats.get(team.name);
    if (!stats) return team;
    
    return {
      ...team,
      phase1_wins: stats.wins,
      phase1_spread: stats.spread,
      phase1_individual_wins: stats.individualWins
    };
  });
  
  // Calculate standings within each group
  const phase2Groups: Team[] = [];
  
  for (const [groupName, groupTeams] of teamsByGroup.entries()) {
    // Sort teams by wins, then spread, then individual wins
    const sortedTeams = [...groupTeams].sort((a, b) => {
      const aStats = teamStats.get(a.name);
      const bStats = teamStats.get(b.name);
      
      if (!aStats || !bStats) return 0;
      
      if (aStats.wins !== bStats.wins) return bStats.wins - aStats.wins;
      if (aStats.spread !== bStats.spread) return bStats.spread - aStats.spread;
      return bStats.individualWins - aStats.individualWins;
    });
    
    // Assign positions within group
    sortedTeams.forEach((team, index) => {
      phase2Groups.push({
        ...team,
        triumvirate_position: index + 1
      });
    });
  }
  
  // Assign Phase 2 groups based on position
  const phase2GroupNames = ['A', 'B', 'C', 'D', 'E', 'F'];
  
  return phase2Groups.map(team => {
    if (!team.triumvirate_position) return team;
    
    // Assign to new group based on position (all 1st place teams go to Group A, etc.)
    const newGroupName = phase2GroupNames[team.triumvirate_position - 1];
    
    return {
      ...team,
      triumvirate_group: newGroupName
    };
  });
}

/**
 * Calculates team statistics for Triumvirate mode
 */
function calculateTeamStats(
  teams: Team[],
  results: any[],
  pairings: any[]
): Map<string, { wins: number; spread: number; individualWins: number }> {
  const teamStats = new Map<string, { wins: number; spread: number; individualWins: number }>();
  
  // Initialize stats for all teams
  teams.forEach(team => {
    teamStats.set(team.name, { wins: 0, spread: 0, individualWins: 0 });
  });
  
  // Group results by team matchup
  const teamMatchups = new Map<string, Array<{ result: any; pairing: any }>>();
  
  // Process all results
  for (const result of results) {
    const pairing = pairings.find(p => p.id === result.pairing_id);
    if (!pairing) continue;
    
    // Find teams for both players
    const player1Team = teams.find(t => t.id === pairing.player1_id)?.team_name;
    const player2Team = teams.find(t => t.id === pairing.player2_id)?.team_name;
    
    if (!player1Team || !player2Team) continue;
    
    // Create a unique key for this team matchup
    const matchupKey = [player1Team, player2Team].sort().join('_vs_');
    
    if (!teamMatchups.has(matchupKey)) {
      teamMatchups.set(matchupKey, []);
    }
    
    teamMatchups.get(matchupKey)!.push({ result, pairing });
    
    // Update individual win stats
    if (result.player1_score > result.player2_score) {
      const team1Stats = teamStats.get(player1Team);
      if (team1Stats) {
        team1Stats.individualWins++;
      }
    } else if (result.player2_score > result.player1_score) {
      const team2Stats = teamStats.get(player2Team);
      if (team2Stats) {
        team2Stats.individualWins++;
      }
    }
    
    // Update spread stats
    const team1Stats = teamStats.get(player1Team);
    const team2Stats = teamStats.get(player2Team);
    
    if (team1Stats) {
      team1Stats.spread += result.player1_score - result.player2_score;
    }
    
    if (team2Stats) {
      team2Stats.spread += result.player2_score - result.player1_score;
    }
  }
  
  // Calculate team wins based on matchups
  for (const [matchupKey, matchResults] of teamMatchups.entries()) {
    const [team1Name, team2Name] = matchupKey.split('_vs_');
    
    // Count wins for each team in this matchup
    let team1Wins = 0;
    let team2Wins = 0;
    
    for (const { result, pairing } of matchResults) {
      const player1Team = teams.find(t => t.id === pairing.player1_id)?.team_name;
      const player2Team = teams.find(t => t.id === pairing.player2_id)?.team_name;
      
      if (result.player1_score > result.player2_score) {
        if (player1Team === team1Name) team1Wins++;
        else if (player1Team === team2Name) team2Wins++;
      } else if (result.player2_score > result.player1_score) {
        if (player2Team === team1Name) team1Wins++;
        else if (player2Team === team2Name) team2Wins++;
      }
    }
    
    // Determine the winner of the matchup
    if (team1Wins > team2Wins) {
      const stats = teamStats.get(team1Name);
      if (stats) stats.wins++;
    } else if (team2Wins > team1Wins) {
      const stats = teamStats.get(team2Name);
      if (stats) stats.wins++;
    }
    // If tied, no team gets a win
  }
  
  return teamStats;
}

/**
 * Checks if a tournament is ready to advance to Phase 2
 */
export function isReadyForPhase2(
  currentRound: number,
  config: TriumvirateConfig
): boolean {
  return currentRound >= config.phase1_rounds && !config.phase1_completed;
}

/**
 * Creates default Triumvirate configuration
 */
export function createDefaultTriumvirateConfig(): TriumvirateConfig {
  return {
    total_teams: 36,
    total_rounds: 30,
    phase1_rounds: 15,
    phase2_rounds: 15,
    groups_per_phase: 6,
    teams_per_group: 6,
    current_phase: 1,
    phase1_completed: false
  };
}