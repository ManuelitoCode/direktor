import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Badge, BadgeType } from '../types/database';
import { useAuditLog } from './useAuditLog';

export function useBadgeTypes() {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBadgeTypes = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('badge_types')
          .select('*')
          .order('name');

        if (error) throw error;
        setBadgeTypes(data || []);
      } catch (err: any) {
        console.error('Error fetching badge types:', err);
        setError(err.message || 'Failed to load badge types');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBadgeTypes();
  }, []);

  return { badgeTypes, isLoading, error };
}

export function usePlayerBadges(playerId: string) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayerBadges = async () => {
      if (!playerId) return;
      
      try {
        setIsLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('badges')
          .select(`
            *,
            badge_type:badge_types(*)
          `)
          .eq('player_id', playerId)
          .order('awarded_at', { ascending: false });

        if (error) throw error;
        setBadges(data || []);
      } catch (err: any) {
        console.error('Error fetching player badges:', err);
        setError(err.message || 'Failed to load badges');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerBadges();
  }, [playerId]);

  return { badges, isLoading, error };
}

export function useAwardBadge() {
  const [isAwarding, setIsAwarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logAction } = useAuditLog();

  const awardBadge = async (
    playerId: string,
    tournamentId: string,
    badgeTypeId: string
  ): Promise<boolean> => {
    try {
      setIsAwarding(true);
      setError(null);

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
      if (existingBadge) {
        return true;
      }

      // Award the badge
      const { error: insertError } = await supabase
        .from('badges')
        .insert([{
          player_id: playerId,
          tournament_id: tournamentId,
          badge_type_id: badgeTypeId
        }]);

      if (insertError) throw insertError;

      // Log badge award
      logAction({
        action: 'badge_awarded',
        details: {
          player_id: playerId,
          tournament_id: tournamentId,
          badge_type_id: badgeTypeId
        }
      });

      return true;
    } catch (err: any) {
      console.error('Error awarding badge:', err);
      setError(err.message || 'Failed to award badge');
      return false;
    } finally {
      setIsAwarding(false);
    }
  };

  return { awardBadge, isAwarding, error };
}

export function useBadgeAwardLogic() {
  const { awardBadge } = useAwardBadge();
  const { logAction } = useAuditLog();

  const analyzeTournamentForBadges = async (tournamentId: string): Promise<void> => {
    try {
      // Load badge types
      const { data: badgeTypes, error: badgeTypesError } = await supabase
        .from('badge_types')
        .select('*');

      if (badgeTypesError) throw badgeTypesError;

      // Load players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (playersError) throw playersError;

      // Load results
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

      // Calculate player stats
      const playerStats = new Map();
      
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
          upsetWins: []
        });
      });

      // Process results
      results.forEach(result => {
        const pairing = result.pairing;
        if (!pairing) return;

        // Process player 1
        const player1Stats = playerStats.get(pairing.player1_id);
        if (player1Stats) {
          player1Stats.gamesPlayed++;
          
          // Update highest score
          player1Stats.highestScore = Math.max(player1Stats.highestScore, result.player1_score);
          
          // Calculate spread
          const spread = result.player1_score - result.player2_score;
          player1Stats.totalSpread += spread;
          
          // Update highest spread
          if (spread > player1Stats.highestSpread) {
            player1Stats.highestSpread = spread;
          }
          
          // Update win/loss record
          if (spread > 0) {
            player1Stats.wins++;
            player1Stats.consecutiveWins++;
            player1Stats.maxConsecutiveWins = Math.max(player1Stats.maxConsecutiveWins, player1Stats.consecutiveWins);
            
            // Check for upset win
            const player2 = players.find(p => p.id === pairing.player2_id);
            if (player2 && player2.rating - player1Stats.rating >= 200) {
              player1Stats.upsetWins.push({
                opponentId: player2.id,
                opponentRating: player2.rating,
                ratingDiff: player2.rating - player1Stats.rating
              });
            }
          } else if (spread < 0) {
            player1Stats.losses++;
            player1Stats.consecutiveWins = 0;
          } else {
            player1Stats.draws++;
            player1Stats.consecutiveWins = 0;
          }
        }

        // Process player 2
        const player2Stats = playerStats.get(pairing.player2_id);
        if (player2Stats) {
          player2Stats.gamesPlayed++;
          
          // Update highest score
          player2Stats.highestScore = Math.max(player2Stats.highestScore, result.player2_score);
          
          // Calculate spread
          const spread = result.player2_score - result.player1_score;
          player2Stats.totalSpread += spread;
          
          // Update highest spread
          if (spread > player2Stats.highestSpread) {
            player2Stats.highestSpread = spread;
          }
          
          // Update win/loss record
          if (spread > 0) {
            player2Stats.wins++;
            player2Stats.consecutiveWins++;
            player2Stats.maxConsecutiveWins = Math.max(player2Stats.maxConsecutiveWins, player2Stats.consecutiveWins);
            
            // Check for upset win
            const player1 = players.find(p => p.id === pairing.player1_id);
            if (player1 && player1.rating - player2Stats.rating >= 200) {
              player2Stats.upsetWins.push({
                opponentId: player1.id,
                opponentRating: player1.rating,
                ratingDiff: player1.rating - player2Stats.rating
              });
            }
          } else if (spread < 0) {
            player2Stats.losses++;
            player2Stats.consecutiveWins = 0;
          } else {
            player2Stats.draws++;
            player2Stats.consecutiveWins = 0;
          }
        }
      });

      // Calculate final standings
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

      // Find highest spread in tournament
      const highestSpreadGame = results.reduce((highest, result) => {
        const spread = Math.abs(result.player1_score - result.player2_score);
        return spread > highest.spread ? { spread, result } : highest;
      }, { spread: 0, result: null });

      // Award badges
      for (const player of standings) {
        // Flawless Record
        if (player.wins >= 3 && player.losses === 0 && player.draws === 0) {
          const flawlessBadge = badgeTypes.find(b => b.name === 'Flawless Record');
          if (flawlessBadge) {
            await awardBadge(player.id, tournamentId, flawlessBadge.id);
          }
        }

        // Biggest Win
        if (highestSpreadGame.result) {
          const highestSpreadResult = highestSpreadGame.result;
          const isPlayer1Winner = highestSpreadResult.player1_score > highestSpreadResult.player2_score;
          const winnerId = isPlayer1Winner 
            ? highestSpreadResult.pairing.player1_id 
            : highestSpreadResult.pairing.player2_id;
          
          if (winnerId === player.id) {
            const biggestWinBadge = badgeTypes.find(b => b.name === 'Biggest Win');
            if (biggestWinBadge) {
              await awardBadge(player.id, tournamentId, biggestWinBadge.id);
            }
          }
        }

        // Best Underdog
        if (player.upsetWins.length > 0) {
          const bestUnderdogBadge = badgeTypes.find(b => b.name === 'Best Underdog');
          if (bestUnderdogBadge) {
            await awardBadge(player.id, tournamentId, bestUnderdogBadge.id);
          }
        }

        // Winning Streak
        if (player.maxConsecutiveWins >= 3) {
          const winningStreakBadge = badgeTypes.find(b => b.name === 'Winning Streak');
          if (winningStreakBadge) {
            await awardBadge(player.id, tournamentId, winningStreakBadge.id);
          }
        }

        // Comeback King
        if (player.rank <= 3 && player.losses > 0) {
          const comebackBadge = badgeTypes.find(b => b.name === 'Comeback King');
          if (comebackBadge) {
            await awardBadge(player.id, tournamentId, comebackBadge.id);
          }
        }

        // High Scorer
        if (player.highestScore >= 500) {
          const highScorerBadge = badgeTypes.find(b => b.name === 'High Scorer');
          if (highScorerBadge) {
            await awardBadge(player.id, tournamentId, highScorerBadge.id);
          }
        }

        // Tournament Champion
        if (player.rank === 1) {
          const championBadge = badgeTypes.find(b => b.name === 'Tournament Champion');
          if (championBadge) {
            await awardBadge(player.id, tournamentId, championBadge.id);
          }
        }

        // First Tournament
        const firstTournamentBadge = badgeTypes.find(b => b.name === 'First Tournament');
        if (firstTournamentBadge) {
          await awardBadge(player.id, tournamentId, firstTournamentBadge.id);
        }
      }

      // Log badge analysis completion
      logAction({
        action: 'tournament_badge_analysis_completed',
        details: {
          tournament_id: tournamentId,
          players_analyzed: players.length,
          badges_considered: badgeTypes.length
        }
      });

    } catch (err: any) {
      console.error('Error analyzing tournament for badges:', err);
      logAction({
        action: 'tournament_badge_analysis_error',
        details: {
          tournament_id: tournamentId,
          error: err.message
        }
      });
    }
  };

  return { analyzeTournamentForBadges };
}