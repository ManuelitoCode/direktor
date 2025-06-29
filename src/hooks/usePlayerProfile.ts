import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Player, PlayerProfile, Badge, Tournament, Result } from '../types/database';
import { useAuditLog } from './useAuditLog';

export function usePlayerProfile(playerId: string) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<{
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    averageSpread: number;
    highestScore: number;
    averageScore: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (playerId) {
      loadPlayerData();
    }
  }, [playerId]);

  const loadPlayerData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load player basic info
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .single();

      if (playerError) throw playerError;
      setPlayer(playerData);

      // Load player profile
      const { data: profileData, error: profileError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }
      setProfile(profileData);

      // Load badges with badge type info
      const { data: badgesData, error: badgesError } = await supabase
        .from('badges')
        .select(`
          *,
          badge_type:badge_types(*)
        `)
        .eq('player_id', playerId)
        .order('awarded_at', { ascending: false });

      if (badgesError) throw badgesError;
      setBadges(badgesData || []);

      // Load tournaments this player participated in
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', playerData.tournament_id);

      if (tournamentsError) throw tournamentsError;
      setTournaments(tournamentsData || []);

      // Load player results for statistics
      await calculatePlayerStats(playerId);

      // Log profile view
      logAction({
        action: 'player_profile_viewed',
        details: {
          player_id: playerId,
          player_name: playerData.name
        }
      });
    } catch (err: any) {
      console.error('Error loading player profile:', err);
      setError(err.message || 'Failed to load player profile');
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlayerStats = async (playerId: string) => {
    try {
      // Load all results for this player
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          pairing:pairings!results_pairing_id_fkey(
            player1_id,
            player2_id,
            round_number
          )
        `);

      if (resultsError) throw resultsError;

      // Filter results for this player
      const playerResults = (resultsData || []).filter(result => {
        const pairing = result.pairing;
        return pairing && (pairing.player1_id === playerId || pairing.player2_id === playerId);
      });

      // Calculate statistics
      let wins = 0;
      let losses = 0;
      let draws = 0;
      let totalSpread = 0;
      let totalScore = 0;
      let highestScore = 0;

      playerResults.forEach(result => {
        const pairing = result.pairing;
        if (!pairing) return;

        const isPlayer1 = pairing.player1_id === playerId;
        const playerScore = isPlayer1 ? result.player1_score : result.player2_score;
        const opponentScore = isPlayer1 ? result.player2_score : result.player1_score;
        const spread = playerScore - opponentScore;

        totalScore += playerScore;
        totalSpread += spread;
        highestScore = Math.max(highestScore, playerScore);

        if (spread > 0) {
          wins++;
        } else if (spread < 0) {
          losses++;
        } else {
          draws++;
        }
      });

      const totalGames = playerResults.length;
      const averageSpread = totalGames > 0 ? totalSpread / totalGames : 0;
      const averageScore = totalGames > 0 ? totalScore / totalGames : 0;

      setStats({
        totalGames,
        wins,
        losses,
        draws,
        averageSpread,
        highestScore,
        averageScore
      });
    } catch (err: any) {
      console.error('Error calculating player stats:', err);
    }
  };

  const updatePlayerProfile = async (profileData: Partial<PlayerProfile>): Promise<boolean> => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('player_profiles')
        .select('id')
        .eq('id', playerId)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('player_profiles')
          .update(profileData)
          .eq('id', playerId);

        if (updateError) throw updateError;
      } else {
        // Create new profile
        const { error: insertError } = await supabase
          .from('player_profiles')
          .insert([{
            id: playerId,
            ...profileData
          }]);

        if (insertError) throw insertError;
      }

      // Reload profile data
      const { data: updatedProfile, error: fetchError } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('id', playerId)
        .single();

      if (fetchError) throw fetchError;
      setProfile(updatedProfile);

      // Log profile update
      logAction({
        action: 'player_profile_updated',
        details: {
          player_id: playerId
        }
      });

      return true;
    } catch (err: any) {
      console.error('Error updating player profile:', err);
      setError(err.message || 'Failed to update profile');
      return false;
    }
  };

  return {
    player,
    profile,
    badges,
    tournaments,
    stats,
    isLoading,
    error,
    updatePlayerProfile
  };
}

export function usePlayerTournamentHistory(playerId: string) {
  const [tournamentHistory, setTournamentHistory] = useState<Array<{
    tournament: Tournament;
    stats: {
      wins: number;
      losses: number;
      draws: number;
      totalSpread: number;
      rank: number;
      badgesEarned: number;
    };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (playerId) {
      loadTournamentHistory();
    }
  }, [playerId]);

  const loadTournamentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get all tournaments this player participated in
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('tournament_id')
        .eq('id', playerId);

      if (playerError) throw playerError;

      if (!playerData || playerData.length === 0) {
        setTournamentHistory([]);
        return;
      }

      const tournamentIds = playerData.map(p => p.tournament_id);

      // Load tournament details
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds)
        .order('date', { ascending: false });

      if (tournamentsError) throw tournamentsError;

      // Load results for each tournament
      const history = await Promise.all(tournamentsData.map(async (tournament) => {
        // Get results for this player in this tournament
        const { data: resultsData, error: resultsError } = await supabase
          .from('results')
          .select(`
            *,
            pairing:pairings!results_pairing_id_fkey(
              player1_id,
              player2_id,
              round_number
            )
          `)
          .eq('tournament_id', tournament.id);

        if (resultsError) throw resultsError;

        // Filter results for this player
        const playerResults = (resultsData || []).filter(result => {
          const pairing = result.pairing;
          return pairing && (pairing.player1_id === playerId || pairing.player2_id === playerId);
        });

        // Calculate statistics
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let totalSpread = 0;

        playerResults.forEach(result => {
          const pairing = result.pairing;
          if (!pairing) return;

          const isPlayer1 = pairing.player1_id === playerId;
          const playerScore = isPlayer1 ? result.player1_score : result.player2_score;
          const opponentScore = isPlayer1 ? result.player2_score : result.player1_score;
          const spread = playerScore - opponentScore;

          totalSpread += spread;

          if (spread > 0) {
            wins++;
          } else if (spread < 0) {
            losses++;
          } else {
            draws++;
          }
        });

        // Get badges earned in this tournament
        const { data: badgesData, error: badgesError } = await supabase
          .from('badges')
          .select('id')
          .eq('player_id', playerId)
          .eq('tournament_id', tournament.id);

        if (badgesError) throw badgesError;

        // Calculate rank (simplified - would need all players' results for accurate ranking)
        // For now, we'll use a placeholder rank
        const rank = 0; // Placeholder

        return {
          tournament,
          stats: {
            wins,
            losses,
            draws,
            totalSpread,
            rank,
            badgesEarned: badgesData?.length || 0
          }
        };
      }));

      setTournamentHistory(history);
    } catch (err: any) {
      console.error('Error loading tournament history:', err);
      setError(err.message || 'Failed to load tournament history');
    } finally {
      setIsLoading(false);
    }
  };

  return { tournamentHistory, isLoading, error };
}