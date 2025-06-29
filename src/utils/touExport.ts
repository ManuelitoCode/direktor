import { supabase } from '../lib/supabase';
import { Player, Tournament, Result } from '../types/database';

/**
 * Generates a .TOU file for rating systems like WESPA or NASPA
 * 
 * @param tournamentId The ID of the tournament
 * @param tournament The tournament object
 * @returns A string containing the .TOU file content
 */
export async function generateTouFile(tournamentId: string, tournament: Tournament): Promise<string> {
  try {
    // Load all players
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('rating', { ascending: false });

    if (playersError) throw playersError;
    if (!players || players.length === 0) {
      throw new Error('No players found for this tournament');
    }

    // Load all results
    const { data: results, error: resultsError } = await supabase
      .from('results')
      .select(`
        *,
        pairing:pairings!results_pairing_id_fkey(
          player1_id,
          player2_id,
          round_number,
          player1_rank,
          player2_rank
        )
      `)
      .eq('tournament_id', tournamentId);

    if (resultsError) throw resultsError;
    if (!results || results.length === 0) {
      throw new Error('No results found for this tournament');
    }

    // Calculate player standings and results
    const playerResults = calculatePlayerResults(players, results);
    
    // Generate TOU file content
    return formatTouFile(tournament, playerResults);
  } catch (error) {
    console.error('Error generating TOU file:', error);
    throw error;
  }
}

/**
 * Calculates player results and standings
 */
function calculatePlayerResults(players: Player[], results: any[]): any[] {
  // Create a map of player IDs to their index in the players array
  const playerMap = new Map<string, number>();
  players.forEach((player, index) => {
    playerMap.set(player.id!, index + 1); // 1-based index for player numbers
  });

  // Initialize player results
  const playerResults = players.map(player => {
    return {
      id: player.id,
      name: player.name,
      rating: player.rating,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      spread: 0,
      roundResults: Array(10).fill(null) // Pre-allocate for up to 10 rounds
    };
  });

  // Process results
  results.forEach(result => {
    const pairing = result.pairing;
    if (!pairing) return;

    const roundIndex = pairing.round_number - 1;
    
    // Process player 1
    const player1Index = playerResults.findIndex(p => p.id === pairing.player1_id);
    if (player1Index !== -1) {
      const player1 = playerResults[player1Index];
      const player2Number = playerMap.get(pairing.player2_id) || 0;
      
      // Store round result
      player1.roundResults[roundIndex] = {
        opponentNumber: player2Number,
        score: result.player1_score,
        opponentScore: result.player2_score,
        spread: result.player1_score - result.player2_score,
        opponentRating: players.find(p => p.id === pairing.player2_id)?.rating || 0
      };
      
      // Update statistics
      if (result.player1_score > result.player2_score) {
        player1.wins++;
        player1.points++;
      } else if (result.player1_score < result.player2_score) {
        player1.losses++;
      } else {
        player1.draws++;
        player1.points += 0.5;
      }
      
      player1.spread += (result.player1_score - result.player2_score);
    }
    
    // Process player 2
    const player2Index = playerResults.findIndex(p => p.id === pairing.player2_id);
    if (player2Index !== -1) {
      const player2 = playerResults[player2Index];
      const player1Number = playerMap.get(pairing.player1_id) || 0;
      
      // Store round result
      player2.roundResults[roundIndex] = {
        opponentNumber: player1Number,
        score: result.player2_score,
        opponentScore: result.player1_score,
        spread: result.player2_score - result.player1_score,
        opponentRating: players.find(p => p.id === pairing.player1_id)?.rating || 0
      };
      
      // Update statistics
      if (result.player2_score > result.player1_score) {
        player2.wins++;
        player2.points++;
      } else if (result.player2_score < result.player1_score) {
        player2.losses++;
      } else {
        player2.draws++;
        player2.points += 0.5;
      }
      
      player2.spread += (result.player2_score - result.player1_score);
    }
  });

  // Sort by points, then spread, then rating
  playerResults.sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.spread !== b.spread) return b.spread - a.spread;
    return b.rating - a.rating;
  });

  return playerResults;
}

/**
 * Formats the TOU file content
 */
function formatTouFile(tournament: Tournament, playerResults: any[]): string {
  let touContent = '';
  
  // Format date as DD.MM.YYYY
  const tournamentDate = tournament.date 
    ? new Date(tournament.date)
    : new Date();
    
  const formattedDate = `${tournamentDate.getDate().toString().padStart(2, '0')}.${
    (tournamentDate.getMonth() + 1).toString().padStart(2, '0')}.${
    tournamentDate.getFullYear()}`;
  
  // Header line
  touContent += `*M${formattedDate} ${tournament.name}\n`;
  
  // Section line
  touContent += '*A\n';
  
  // Player lines
  playerResults.forEach((player, index) => {
    // Start with player name (padded to 30 characters)
    let line = player.name.padEnd(30, ' ');
    
    // Add round results
    for (let i = 0; i < player.roundResults.length; i++) {
      const result = player.roundResults[i];
      if (!result) continue;
      
      // Format: Score OpponentNumber Score +/- OpponentRating
      const spread = result.spread;
      const spreadSign = spread > 0 ? '+' : spread < 0 ? '-' : ' ';
      const spreadValue = Math.abs(spread);
      
      line += `${result.score.toString().padStart(4, ' ')} `;
      line += `${result.opponentNumber.toString().padStart(3, ' ')} `;
      line += `${result.opponentScore.toString().padStart(4, ' ')} `;
      line += `${spreadSign}${spreadValue.toString().padStart(3, ' ')} `;
      line += `${result.opponentRating.toString().padStart(4, ' ')} `;
    }
    
    touContent += `${line.trimEnd()}\n`;
  });
  
  // End of file marker
  touContent += '*** END OF FILE ***\n';
  
  return touContent;
}