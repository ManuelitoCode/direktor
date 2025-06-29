import { supabase } from '../lib/supabase';
import { Player, Result, Pairing, BadgeType } from '../types/database';

// Function to award badges at the end of a tournament
export async function awardTournamentBadges(tournamentId: string): Promise<void> {
  try {
    console.log('Starting badge award process for tournament:', tournamentId);
    
    // Load badge types
    const { data: badgeTypes, error: badgeTypesError } = await supabase
      .from('badge_types')
      .select('*');

    if (badgeTypesError) throw badgeTypesError;
    
    if (!badgeTypes || badgeTypes.length === 0) {
      console.log('No badge types found, skipping badge awards');
      return;
    }

    // Load players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('tournament_id', tournamentId);

    if (playersError) throw playersError;
    
    if (!players || players.length === 0) {
      console.log('No players found for tournament, skipping badge awards');
      return;
    }

    // Load all results
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select(`
        *,
        pairing:pairings!results_pairing_id_fkey(
          player1_id,
          player2_id,
          round_number
        )
      `)
      .eq('tournament_id', tournamentId);

    if (resultsError) throw resultsError;
    
    if (!results || results.length === 0) {
      console.log('No results found for tournament, skipping badge awards');
      return;
    }

    // Calculate player statistics
    const playerStats = calculatePlayerStats(players, results);
    
    // Calculate tournament-wide statistics
    const tournamentStats = calculateTournamentStats(results);
    
    // Calculate final standings
    const standings = calculateStandings(playerStats);
    
    // Award badges based on achievements
    await awardBadgesBasedOnAchievements(
      tournamentId,
      badgeTypes,
      playerStats,
      tournamentStats,
      standings
    );
    
    console.log('Badge award process completed for tournament:', tournamentId);
  } catch (error) {
    console.error('Error awarding tournament badges:', error);
  }
}

// Calculate statistics for each player
function calculatePlayerStats(players: Player[], results: any[]): Map<string, any> {
  const playerStats = new Map();
  
  // Initialize player stats
  players.forEach(player => {
    playerStats.set(player.id, {
      id: player.id,
      name: player.name,
      rating: player.rating,
      wins: 0,
      losses: 0,
      draws: 0,
      totalSpread: 0,
      highestScore: 0,
      highestSpread: 0,
      consecutiveWins: 0,
      maxConsecutiveWins: 0,
      gamesPlayed: 0,
      upsetWins: [],
      roundResults: []
    });
  });
  
  // Process results
  results.forEach(result => {
    const pairing = result.pairing;
    if (!pairing) return;
    
    // Process player 1
    processPlayerResult(
      playerStats,
      pairing.player1_id,
      pairing.player2_id,
      result.player1_score,
      result.player2_score,
      pairing.round_number,
      players
    );
    
    // Process player 2
    processPlayerResult(
      playerStats,
      pairing.player2_id,
      pairing.player1_id,
      result.player2_score,
      result.player1_score,
      pairing.round_number,
      players
    );
  });
  
  return playerStats;
}

// Process a single player's result
function processPlayerResult(
  playerStats: Map<string, any>,
  playerId: string,
  opponentId: string,
  playerScore: number,
  opponentScore: number,
  roundNumber: number,
  allPlayers: Player[]
): void {
  const playerStat = playerStats.get(playerId);
  if (!playerStat) return;
  
  playerStat.gamesPlayed++;
  
  // Update highest score
  playerStat.highestScore = Math.max(playerStat.highestScore, playerScore);
  
  // Calculate spread
  const spread = playerScore - opponentScore;
  playerStat.totalSpread += spread;
  
  // Update highest spread
  if (spread > playerStat.highestSpread) {
    playerStat.highestSpread = spread;
  }
  
  // Store round result
  playerStat.roundResults.push({
    round: roundNumber,
    opponentId,
    playerScore,
    opponentScore,
    spread,
    result: spread > 0 ? 'win' : spread < 0 ? 'loss' : 'draw'
  });
  
  // Sort round results by round number
  playerStat.roundResults.sort((a: any, b: any) => a.round - b.round);
  
  // Update win/loss record
  if (spread > 0) {
    playerStat.wins++;
    playerStat.consecutiveWins++;
    playerStat.maxConsecutiveWins = Math.max(playerStat.maxConsecutiveWins, playerStat.consecutiveWins);
    
    // Check for upset win
    const opponent = allPlayers.find(p => p.id === opponentId);
    if (opponent && opponent.rating - playerStat.rating >= 200) {
      playerStat.upsetWins.push({
        opponentId,
        opponentRating: opponent.rating,
        ratingDiff: opponent.rating - playerStat.rating
      });
    }
  } else if (spread < 0) {
    playerStat.losses++;
    playerStat.consecutiveWins = 0;
  } else {
    playerStat.draws++;
    playerStat.consecutiveWins = 0;
  }
}

// Calculate tournament-wide statistics
function calculateTournamentStats(results: any[]): any {
  // Find highest score in tournament
  const highestScore = results.reduce((highest, result) => {
    return Math.max(highest, result.player1_score, result.player2_score);
  }, 0);
  
  // Find highest spread in tournament
  const highestSpreadGame = results.reduce((highest, result) => {
    const spread = Math.abs(result.player1_score - result.player2_score);
    return spread > highest.spread ? { spread, result } : highest;
  }, { spread: 0, result: null });
  
  return {
    highestScore,
    highestSpreadGame
  };
}

// Calculate final standings
function calculateStandings(playerStats: Map<string, any>): any[] {
  const standings = Array.from(playerStats.values())
    .map(player => {
      const points = player.wins + (player.draws * 0.5);
      return {
        ...player,
        points,
        rank: 0 // Will be assigned after sorting
      };
    })
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.totalSpread !== b.totalSpread) return b.totalSpread - a.totalSpread;
      return b.rating - a.rating;
    });

  // Assign ranks
  standings.forEach((player, index) => {
    player.rank = index + 1;
  });
  
  return standings;
}

// Award badges based on achievements
async function awardBadgesBasedOnAchievements(
  tournamentId: string,
  badgeTypes: BadgeType[],
  playerStats: Map<string, any>,
  tournamentStats: any,
  standings: any[]
): Promise<void> {
  // Helper function to find badge type by name
  const findBadgeType = (name: string): BadgeType | undefined => {
    return badgeTypes.find(b => b.name === name);
  };
  
  // Helper function to award badge
  const awardBadge = async (playerId: string, badgeTypeId: string): Promise<void> => {
    try {
      // Check if player already has this badge for this tournament
      const { data: existingBadge, error: checkError } = await supabase
        .from('badges')
        .select('id')
        .eq('player_id', playerId)
        .eq('tournament_id', tournamentId)
        .eq('badge_type_id', badgeTypeId)
        .maybeSingle();

      if (checkError) throw checkError;

      // If badge already exists, don't create a duplicate
      if (existingBadge) return;

      // Award the badge
      const { error: insertError } = await supabase
        .from('badges')
        .insert([{
          player_id: playerId,
          tournament_id: tournamentId,
          badge_type_id: badgeTypeId
        }]);

      if (insertError) throw insertError;
      
      console.log(`Badge awarded: ${badgeTypeId} to player ${playerId}`);
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  };
  
  // Process each player for badge awards
  for (const player of standings) {
    // Flawless Record
    if (player.wins >= 3 && player.losses === 0 && player.draws === 0) {
      const flawlessBadge = findBadgeType('Flawless Record');
      if (flawlessBadge) {
        await awardBadge(player.id, flawlessBadge.id);
      }
    }

    // Biggest Win
    if (tournamentStats.highestSpreadGame.result) {
      const highestSpreadResult = tournamentStats.highestSpreadGame.result;
      const isPlayer1Winner = highestSpreadResult.player1_score > highestSpreadResult.player2_score;
      const winnerId = isPlayer1Winner 
        ? highestSpreadResult.pairing.player1_id 
        : highestSpreadResult.pairing.player2_id;
      
      if (winnerId === player.id) {
        const biggestWinBadge = findBadgeType('Biggest Win');
        if (biggestWinBadge) {
          await awardBadge(player.id, biggestWinBadge.id);
        }
      }
    }

    // Best Underdog
    if (player.upsetWins.length > 0) {
      const bestUnderdogBadge = findBadgeType('Best Underdog');
      if (bestUnderdogBadge) {
        await awardBadge(player.id, bestUnderdogBadge.id);
      }
    }

    // Winning Streak
    if (player.maxConsecutiveWins >= 3) {
      const winningStreakBadge = findBadgeType('Winning Streak');
      if (winningStreakBadge) {
        await awardBadge(player.id, winningStreakBadge.id);
      }
    }

    // Comeback King
    if (player.rank <= 3 && player.losses > 0) {
      const comebackBadge = findBadgeType('Comeback King');
      if (comebackBadge) {
        await awardBadge(player.id, comebackBadge.id);
      }
    }

    // High Scorer
    if (player.highestScore >= 500) {
      const highScorerBadge = findBadgeType('High Scorer');
      if (highScorerBadge) {
        await awardBadge(player.id, highScorerBadge.id);
      }
    }

    // Tournament Champion
    if (player.rank === 1) {
      const championBadge = findBadgeType('Tournament Champion');
      if (championBadge) {
        await awardBadge(player.id, championBadge.id);
      }
    }

    // Perfect Spread
    const allPositiveSpreads = player.roundResults.every((result: any) => result.spread >= 0);
    if (player.gamesPlayed >= 3 && allPositiveSpreads) {
      const perfectSpreadBadge = findBadgeType('Perfect Spread');
      if (perfectSpreadBadge) {
        await awardBadge(player.id, perfectSpreadBadge.id);
      }
    }

    // First Tournament
    const firstTournamentBadge = findBadgeType('First Tournament');
    if (firstTournamentBadge) {
      await awardBadge(player.id, firstTournamentBadge.id);
    }
  }
}