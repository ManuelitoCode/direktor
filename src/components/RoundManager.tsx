import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trophy, Save, RefreshCw, AlertTriangle, ChevronDown, Eye, Download, Trash2, Check, X } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import Button from './Button';
import { supabase, handleSupabaseError, retrySupabaseOperation } from '../lib/supabase';
import { useAuditLog } from '../hooks/useAuditLog';
import { useTournamentProgress } from '../hooks/useTournamentProgress';
import { Tournament, Player, PlayerWithRank, PairingDisplay, PairingFormat } from '../types/database';
import { generatePairings } from '../utils/pairingAlgorithms';
import PairingsManager from './PairingsManager';
import PlayerRoster from './PlayerRoster';
import WinProbabilityBadge from './WinProbabilityBadge';
import PrintablePairings from './PrintablePairings';

interface RoundManagerProps {
  onBack: () => void;
  onNext: () => void;
  tournamentId: string;
  currentRound?: number;
  maxRounds?: number;
  tournament?: Tournament;
  onTournamentUpdate?: () => Promise<void>;
}

const RoundManager: React.FC<RoundManagerProps> = ({ 
  onBack, 
  onNext, 
  tournamentId,
  currentRound: propCurrentRound,
  maxRounds: propMaxRounds,
  tournament: propsTournament,
  onTournamentUpdate
}) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersWithRank, setPlayersWithRank] = useState<PlayerWithRank[]>([]);
  const [pairings, setPairings] = useState<PairingDisplay[]>([]);
  const [previousPairings, setPreviousPairings] = useState<Array<{ player1_id: string; player2_id: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(propCurrentRound || 1);
  const [maxRounds, setMaxRounds] = useState<number>(propMaxRounds || 7);
  const [selectedRound, setSelectedRound] = useState<number>(propCurrentRound || 1);
  const [selectedPairingSystem, setSelectedPairingSystem] = useState<PairingFormat>('swiss');
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [activeTab, setActiveTab] = useState<'pairings' | 'players' | 'all-pairings'>('pairings');
  const [pairingsLocked, setPairingsLocked] = useState(false);
  const [unpairingRound, setUnpairingRound] = useState<number | null>(null);
  const [roundStatuses, setRoundStatuses] = useState<Array<{round: number, status: 'unpaired' | 'paired' | 'in-progress' | 'completed'}>>([]);
  const [basePairingRound, setBasePairingRound] = useState<number>(0); // 0 means use ratings, otherwise use standings from that round
  const [showPrintableView, setShowPrintableView] = useState(false);
  const [confirmUnpair, setConfirmUnpair] = useState<number | null>(null);
  
  const { logAction } = useAuditLog();
  const { setTournamentRound } = useTournamentProgress();
  const pairingsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  useEffect(() => {
    // If tournament is provided via props, use it
    if (propsTournament) {
      setTournament(propsTournament);
      setSelectedPairingSystem(propsTournament.pairing_system as PairingFormat || 'swiss');
      setCurrentRound(propsTournament.current_round || 1);
      setMaxRounds(propsTournament.rounds || 7);
      setSelectedRound(propsTournament.current_round || 1);
    }
  }, [propsTournament]);

  useEffect(() => {
    if (propCurrentRound !== undefined && propCurrentRound !== currentRound) {
      setCurrentRound(propCurrentRound);
      setSelectedRound(propCurrentRound);
    }
  }, [propCurrentRound]);

  useEffect(() => {
    if (propMaxRounds !== undefined && propMaxRounds !== maxRounds) {
      setMaxRounds(propMaxRounds);
    }
  }, [propMaxRounds]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load tournament if not provided via props
      if (!propsTournament) {
        const tournamentData = await retrySupabaseOperation(async () => {
          const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .single();

          if (error) throw error;
          return data;
        });

        setTournament(tournamentData);
        setSelectedPairingSystem(tournamentData.pairing_system as PairingFormat || 'swiss');
        setCurrentRound(tournamentData.current_round || 1);
        setMaxRounds(tournamentData.rounds || 7);
        setSelectedRound(tournamentData.current_round || 1);
      }

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

      // Load round statuses
      await loadRoundStatuses();

      // Check if current round is already paired
      await checkRoundPairingStatus(selectedRound);

      // Calculate player standings for current round
      await calculatePlayerStandings();
      
      // Log round manager access
      logAction({
        action: 'round_manager_accessed',
        details: {
          tournament_id: tournamentId,
          current_round: selectedRound
        }
      });
    } catch (err: any) {
      console.error('Error loading round manager data:', err);
      setError(handleSupabaseError(err, 'loading round data'));
      
      // Log error
      logAction({
        action: 'round_manager_load_error',
        details: {
          tournament_id: tournamentId,
          error: String(err)
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoundStatuses = async () => {
    try {
      // Load all pairings grouped by round
      const pairingsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('pairings')
          .select('round_number, id')
          .eq('tournament_id', tournamentId);

        if (error) throw error;
        return data || [];
      });

      // Group pairings by round
      const pairingsByRound: Record<number, string[]> = {};
      pairingsData.forEach(pairing => {
        if (!pairingsByRound[pairing.round_number]) {
          pairingsByRound[pairing.round_number] = [];
        }
        pairingsByRound[pairing.round_number].push(pairing.id);
      });

      // Load all results
      const resultsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('results')
          .select('round_number, pairing_id')
          .eq('tournament_id', tournamentId);

        if (error) throw error;
        return data || [];
      });

      // Group results by round
      const resultsByRound: Record<number, string[]> = {};
      resultsData.forEach(result => {
        if (!resultsByRound[result.round_number]) {
          resultsByRound[result.round_number] = [];
        }
        resultsByRound[result.round_number].push(result.pairing_id);
      });

      // Create round statuses
      const statuses: Array<{round: number, status: 'unpaired' | 'paired' | 'in-progress' | 'completed'}> = [];
      for (let round = 1; round <= (maxRounds || 7); round++) {
        const pairingsForRound = pairingsByRound[round] || [];
        const resultsForRound = resultsByRound[round] || [];
        
        let status: 'unpaired' | 'paired' | 'in-progress' | 'completed';
        if (pairingsForRound.length === 0) {
          status = 'unpaired';
        } else if (resultsForRound.length === 0) {
          status = 'paired';
        } else if (resultsForRound.length < pairingsForRound.length) {
          status = 'in-progress';
        } else {
          status = 'completed';
        }

        statuses.push({ round, status });
      }

      setRoundStatuses(statuses);
    } catch (err: any) {
      console.error('Error loading round statuses:', err);
      throw err;
    }
  };

  const checkRoundPairingStatus = async (round: number) => {
    try {
      const { data, error } = await supabase
        .from('pairings')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('round_number', round);

      if (error) throw error;
      
      const isLocked = data && data.length > 0;
      setPairingsLocked(isLocked);
      
      // If round is already paired, load those pairings
      if (isLocked) {
        const { data: pairingsData, error: pairingsError } = await supabase
          .from('pairings')
          .select(`
            *,
            player1:players!pairings_player1_id_fkey(id, name, rating),
            player2:players!pairings_player2_id_fkey(id, name, rating)
          `)
          .eq('tournament_id', tournamentId)
          .eq('round_number', round)
          .order('table_number');

        if (pairingsError) throw pairingsError;
        
        // Convert to PairingDisplay format
        const displayPairings: PairingDisplay[] = pairingsData.map(p => ({
          table_number: p.table_number,
          player1: {
            ...p.player1,
            rank: p.player1_rank,
            previous_starts: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            spread: 0,
            is_gibsonized: p.player1_gibsonized || false
          },
          player2: {
            ...p.player2,
            rank: p.player2_rank,
            previous_starts: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            spread: 0,
            is_gibsonized: p.player2_gibsonized || false
          },
          first_move_player_id: p.first_move_player_id,
          player1_gibsonized: p.player1_gibsonized || false,
          player2_gibsonized: p.player2_gibsonized || false
        }));
        
        setPairings(displayPairings);
      }

      // Load previous pairings for rematch avoidance
      const { data: previousPairingsData, error: previousError } = await supabase
        .from('pairings')
        .select('player1_id, player2_id')
        .eq('tournament_id', tournamentId)
        .lt('round_number', round);

      if (previousError) throw previousError;
      setPreviousPairings(previousPairingsData || []);

    } catch (err: any) {
      console.error('Error checking round pairing status:', err);
      throw err;
    }
  };

  const calculatePlayerStandings = async () => {
    try {
      // Load all results for previous rounds
      const resultsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('results')
          .select(`
            *,
            pairing:pairings!results_pairing_id_fkey(
              player1_id,
              player2_id,
              round_number
            )
          `)
          .eq('tournament_id', tournamentId)
          .lt('round_number', selectedRound);

        if (error) throw error;
        return data || [];
      });

      // Calculate standings for each player
      const playersWithStats = players.map(player => {
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let spread = 0;
        let previous_starts = 0;

        // Process each result
        resultsData.forEach(result => {
          const pairing = result.pairing;
          if (!pairing) return;

          const isPlayer1 = pairing.player1_id === player.id;
          const isPlayer2 = pairing.player2_id === player.id;

          if (!isPlayer1 && !isPlayer2) return;

          // Count first moves
          if (isPlayer1) {
            previous_starts++;
          }

          const playerScore = isPlayer1 ? result.player1_score : result.player2_score;
          const opponentScore = isPlayer1 ? result.player2_score : result.player1_score;

          spread += playerScore - opponentScore;

          if (playerScore > opponentScore) {
            wins++;
          } else if (playerScore < opponentScore) {
            losses++;
          } else {
            draws++;
          }
        });

        const points = wins + (draws * 0.5);

        return {
          ...player,
          rank: 0, // Will be assigned after sorting
          previous_starts,
          wins,
          losses,
          draws,
          points,
          spread,
          is_gibsonized: false // Will be calculated by the pairing algorithm
        };
      });

      // Filter out inactive players
      const activePlayers = playersWithStats.filter(p => 
        p.participation_status === 'active' || !p.participation_status
      );

      // Sort by points, then spread, then rating
      activePlayers.sort((a, b) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.spread !== b.spread) return b.spread - a.spread;
        return b.rating - a.rating;
      });

      // Assign ranks
      activePlayers.forEach((player, index) => {
        player.rank = index + 1;
      });

      setPlayersWithRank(activePlayers);

      // Generate pairings if this is a new round
      if (!pairingsLocked && activePlayers.length > 0) {
        generateRoundPairings(activePlayers);
      }
    } catch (err: any) {
      console.error('Error calculating player standings:', err);
      setError(handleSupabaseError(err, 'calculating standings'));
    }
  };

  const generateRoundPairings = (players: PlayerWithRank[]) => {
    try {
      // Generate pairings using the selected system
      const generatedPairings = generatePairings(
        players,
        selectedPairingSystem,
        avoidRematches,
        previousPairings,
        selectedRound,
        maxRounds
      );

      setPairings(generatedPairings);
      
      // Log pairing generation
      logAction({
        action: 'pairings_generated',
        details: {
          tournament_id: tournamentId,
          round: selectedRound,
          pairing_system: selectedPairingSystem,
          player_count: players.length,
          pairing_count: generatedPairings.length
        }
      });
    } catch (err: any) {
      console.error('Error generating pairings:', err);
      setError(`Failed to generate pairings: ${err.message}`);
      
      // Log error
      logAction({
        action: 'pairings_generation_error',
        details: {
          tournament_id: tournamentId,
          round: selectedRound,
          pairing_system: selectedPairingSystem,
          error: err.message
        }
      });
    }
  };

  const handleGeneratePairings = () => {
    setIsGenerating(true);
    setError(null);

    try {
      generateRoundPairings(playersWithRank);
      
      // Log pairing generation
      logAction({
        action: 'pairings_generated_manually',
        details: {
          tournament_id: tournamentId,
          round: selectedRound,
          pairing_system: selectedPairingSystem,
          avoid_rematches: avoidRematches,
          base_pairing_round: basePairingRound
        }
      });
    } catch (err: any) {
      console.error('Error generating pairings:', err);
      setError(`Failed to generate pairings: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePairingSystemChange = (system: PairingFormat) => {
    setSelectedPairingSystem(system);
    
    // Regenerate pairings with new system
    if (!pairingsLocked) {
      setIsGenerating(true);
      
      setTimeout(() => {
        try {
          generateRoundPairings(playersWithRank);
          
          // Log pairing system change
          logAction({
            action: 'pairing_system_changed',
            details: {
              tournament_id: tournamentId,
              round: selectedRound,
              pairing_system: system,
              avoid_rematches: avoidRematches,
              base_pairing_round: basePairingRound
            }
          });
        } catch (err: any) {
          console.error('Error generating pairings with new system:', err);
          setError(`Failed to generate pairings: ${err.message}`);
        } finally {
          setIsGenerating(false);
        }
      }, 100);
    }
  };

  const handleBasePairingRoundChange = (round: number) => {
    setBasePairingRound(round);
    
    // Regenerate pairings with new base round
    if (!pairingsLocked) {
      setIsGenerating(true);
      
      setTimeout(() => {
        try {
          // Here we would need to load standings from the selected base round
          // For now, we'll just use current standings
          generateRoundPairings(playersWithRank);
          
          // Log base round change
          logAction({
            action: 'base_pairing_round_changed',
            details: {
              tournament_id: tournamentId,
              round: selectedRound,
              base_round: round,
              pairing_system: selectedPairingSystem
            }
          });
        } catch (err: any) {
          console.error('Error generating pairings with new base round:', err);
          setError(`Failed to generate pairings: ${err.message}`);
        } finally {
          setIsGenerating(false);
        }
      }, 100);
    }
  };

  const handleRoundChange = async (round: number) => {
    setSelectedRound(round);
    
    // Check if this round is already paired
    try {
      await checkRoundPairingStatus(round);
      
      // If round is not paired, recalculate standings for this round
      if (!pairingsLocked) {
        await calculatePlayerStandings();
      }
      
      // Log round change
      logAction({
        action: 'round_selection_changed',
        details: {
          tournament_id: tournamentId,
          previous_round: selectedRound,
          new_round: round
        }
      });
    } catch (err: any) {
      console.error('Error checking round pairings:', err);
      setError(handleSupabaseError(err, 'checking round status'));
    }
  };

  const handleLockPairings = async () => {
    if (pairings.length === 0) {
      setError('No pairings to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Prepare pairings data for insertion
      const pairingsToInsert = pairings.map(pairing => ({
        round_number: selectedRound,
        tournament_id: tournamentId,
        table_number: pairing.table_number,
        player1_id: pairing.player1.id!,
        player2_id: pairing.player2.id!,
        player1_rank: pairing.player1.rank,
        player2_rank: pairing.player2.rank,
        first_move_player_id: pairing.first_move_player_id,
        player1_gibsonized: pairing.player1_gibsonized || false,
        player2_gibsonized: pairing.player2_gibsonized || false
      }));

      // Insert pairings
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('pairings')
          .insert(pairingsToInsert);

        if (error) throw error;
      });

      // Update tournament current round if needed
      if (selectedRound > (tournament?.current_round || 1)) {
        await setTournamentRound(tournamentId, selectedRound);
        
        if (tournament) {
          setTournament({
            ...tournament,
            current_round: selectedRound
          });
          
          setCurrentRound(selectedRound);
        }
        
        // Call parent update if provided
        if (onTournamentUpdate) {
          await onTournamentUpdate();
        }
      }

      // Update round statuses
      await loadRoundStatuses();

      // Lock pairings in UI
      setPairingsLocked(true);
      
      // Log pairings saved
      logAction({
        action: 'pairings_saved',
        details: {
          tournament_id: tournamentId,
          round: selectedRound,
          pairing_count: pairings.length,
          pairing_system: selectedPairingSystem,
          base_pairing_round: basePairingRound
        }
      });

      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-jetbrains text-sm border border-green-500/50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Round ${selectedRound} pairings saved successfully
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Error saving pairings:', err);
      setError(handleSupabaseError(err, 'saving pairings'));
      
      // Log error
      logAction({
        action: 'pairings_save_error',
        details: {
          tournament_id: tournamentId,
          round: selectedRound,
          error: String(err)
        }
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpairRound = async (round: number) => {
    if (confirmUnpair !== round) {
      setConfirmUnpair(round);
      setTimeout(() => setConfirmUnpair(null), 3000);
      return;
    }
    
    setUnpairingRound(round);
    setConfirmUnpair(null);
    
    try {
      // Delete results for this round first
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('results')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('round_number', round);

        if (error) throw error;
      });

      // Then delete pairings
      await retrySupabaseOperation(async () => {
        const { error } = await supabase
          .from('pairings')
          .delete()
          .eq('tournament_id', tournamentId)
          .eq('round_number', round);

        if (error) throw error;
      });
      
      // Update tournament current round if needed
      if (round === currentRound && round > 1) {
        await setTournamentRound(tournamentId, round - 1);
        
        if (tournament) {
          setTournament({
            ...tournament,
            current_round: round - 1
          });
          
          setCurrentRound(round - 1);
        }
        
        // Call parent update if provided
        if (onTournamentUpdate) {
          await onTournamentUpdate();
        }
      }
      
      // If the unpaired round is the currently selected round, unlock pairings
      if (round === selectedRound) {
        setPairingsLocked(false);
        await calculatePlayerStandings(); // Regenerate pairings
      }
      
      // Update round statuses
      await loadRoundStatuses();
      
      // Log unpair action
      logAction({
        action: 'round_unpaired',
        details: {
          tournament_id: tournamentId,
          round: round
        }
      });
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-jetbrains text-sm border border-green-500/50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          Round ${round} has been unpaired successfully
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
    } catch (err: any) {
      console.error('Error handling unpair round:', err);
      setError(handleSupabaseError(err, 'updating round after unpair'));
      
      // Log error
      logAction({
        action: 'round_unpair_error',
        details: {
          tournament_id: tournamentId,
          round: round,
          error: String(err)
        }
      });
    } finally {
      setUnpairingRound(null);
    }
  };

  const exportPairings = () => {
    if (pairings.length === 0) return;

    const headers = ['Table', 'Player 1', 'Rating', 'Rank', 'Player 2', 'Rating', 'Rank', 'First Move'];
    const rows = pairings.map(pairing => [
      pairing.table_number.toString(),
      pairing.player1.name,
      pairing.player1.rating.toString(),
      pairing.player1.rank.toString(),
      pairing.player2.name,
      pairing.player2.rating.toString(),
      pairing.player2.rank.toString(),
      pairing.first_move_player_id === pairing.player1.id ? pairing.player1.name : pairing.player2.name
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Round_${selectedRound}_Pairings.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    // Log export
    logAction({
      action: 'pairings_exported',
      details: {
        tournament_id: tournamentId,
        round: selectedRound,
        format: 'csv'
      }
    });
  };

  // Get available rounds for base pairing
  const getAvailableBasePairingRounds = () => {
    const completedRounds = roundStatuses
      .filter(status => status.status === 'completed' && status.round < selectedRound)
      .map(status => status.round);
    
    // Always include Round 0 (ratings-based)
    return [0, ...completedRounds];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-jetbrains">Back</span>
            </button>
            <div className="flex items-center gap-2 text-blue-400">
              <Trophy size={24} />
              <span className="font-jetbrains text-sm">Round Manager</span>
            </div>
          </div>

          <h1 className="glitch-text fade-up text-4xl md:text-6xl font-bold mb-4 text-white font-orbitron tracking-wider"
              data-text="ROUND MANAGER">
            ROUND MANAGER
          </h1>
          
          {tournament && (
            <p className="fade-up fade-up-delay-1 text-xl md:text-2xl text-blue-400 mb-4 font-medium">
              {tournament.name}
            </p>
          )}
          
          <div className="fade-up fade-up-delay-3 w-24 h-1 bg-gradient-to-r from-blue-500 to-green-500 mx-auto rounded-full"></div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-6xl mx-auto w-full mb-6">
          <div className="flex space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('pairings')}
              className={`flex items-center gap-2 px-4 py-3 font-jetbrains text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeTab === 'pairings'
                  ? 'text-blue-400 border-blue-500 bg-blue-500/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
              }`}
            >
              <Trophy size={16} />
              Current Round Pairings
            </button>
            
            <button
              onClick={() => setActiveTab('all-pairings')}
              className={`flex items-center gap-2 px-4 py-3 font-jetbrains text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeTab === 'all-pairings'
                  ? 'text-green-400 border-green-500 bg-green-500/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
              }`}
            >
              <Trophy size={16} />
              All Rounds
            </button>
            
            <button
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-2 px-4 py-3 font-jetbrains text-sm font-medium transition-all duration-200 border-b-2 whitespace-nowrap ${
                activeTab === 'players'
                  ? 'text-purple-400 border-purple-500 bg-purple-500/10'
                  : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
              }`}
            >
              <Trophy size={16} />
              Player Roster
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="max-w-6xl mx-auto w-full mb-6">
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 max-w-6xl mx-auto w-full mb-8">
          {/* Current Round Pairings Tab */}
          {activeTab === 'pairings' && (
            <div className="space-y-6">
              {/* Round Selection and Controls */}
              <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white font-orbitron mb-2">
                      Round {selectedRound} Pairings
                    </h2>
                    <p className="text-gray-400 font-jetbrains text-sm">
                      {pairingsLocked 
                        ? 'Pairings are locked and saved' 
                        : 'Generate and save pairings for this round'}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Round Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-jetbrains text-sm">Round:</span>
                      <div className="relative">
                        <select
                          value={selectedRound}
                          onChange={(e) => handleRoundChange(parseInt(e.target.value))}
                          className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none appearance-none pr-8"
                          disabled={isGenerating || isSaving}
                        >
                          {/* Show "Round 0" option for first round seeding */}
                          {currentRound === 1 && (
                            <option value={0}>Round 0 (Seeding)</option>
                          )}
                          
                          {/* Generate options for all rounds */}
                          {Array.from({ length: maxRounds }, (_, i) => i + 1).map(round => {
                            // Find round status
                            const roundStatus = roundStatuses.find(s => s.round === round);
                            const isCompleted = roundStatus?.status === 'completed';
                            const isPaired = roundStatus?.status === 'paired' || roundStatus?.status === 'in-progress';
                            
                            // Only show unpaired rounds as active options
                            // Show completed rounds with strikethrough
                            // Hide paired but incomplete rounds
                            return (
                              <option 
                                key={round} 
                                value={round}
                                disabled={isPaired && !isCompleted}
                                className={isCompleted ? 'line-through' : ''}
                              >
                                Round {round}{isCompleted ? ' (Completed)' : isPaired ? ' (In Progress)' : ''}
                              </option>
                            );
                          })}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      </div>
                    </div>
                    
                    {/* Base Pairing Round Selector - only if not locked */}
                    {!pairingsLocked && selectedRound > 1 && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-jetbrains text-sm">Base On:</span>
                        <div className="relative">
                          <select
                            value={basePairingRound}
                            onChange={(e) => handleBasePairingRoundChange(parseInt(e.target.value))}
                            className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none appearance-none pr-8"
                            disabled={isGenerating || isSaving || pairingsLocked}
                          >
                            <option value={0}>Ratings (Round 0)</option>
                            {getAvailableBasePairingRounds().filter(r => r > 0).map(round => (
                              <option key={round} value={round}>
                                Round {round} Standings
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>
                    )}
                    
                    {/* Pairing System Selector - only if not locked */}
                    {!pairingsLocked && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-jetbrains text-sm">System:</span>
                        <div className="relative">
                          <select
                            value={selectedPairingSystem}
                            onChange={(e) => handlePairingSystemChange(e.target.value as PairingFormat)}
                            className="bg-gray-800/50 border border-gray-600 rounded-lg px-3 py-2 text-white font-jetbrains focus:border-blue-500 focus:outline-none appearance-none pr-8"
                            disabled={isGenerating || isSaving || pairingsLocked}
                          >
                            <option value="swiss">Swiss</option>
                            <option value="fonte-swiss">Fonte-Swiss</option>
                            <option value="king-of-hill">King of the Hill</option>
                            <option value="round-robin">Round Robin</option>
                            <option value="quartile">Quartile</option>
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                        </div>
                      </div>
                    )}
                    
                    {/* Avoid Rematches Toggle - only if not locked */}
                    {!pairingsLocked && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-jetbrains text-sm">Avoid Rematches:</span>
                        <button
                          onClick={() => setAvoidRematches(!avoidRematches)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                            avoidRematches ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                          disabled={isGenerating || isSaving || pairingsLocked}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                              avoidRematches ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                    
                    {/* Print Button - only if pairings exist */}
                    {pairings.length > 0 && (
                      <button
                        onClick={() => setShowPrintableView(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
                      >
                        <Eye size={16} />
                        Print View
                      </button>
                    )}
                    
                    {/* Export Button - only if pairings exist */}
                    {pairings.length > 0 && (
                      <button
                        onClick={exportPairings}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
                      >
                        <Download size={16} />
                        Export CSV
                      </button>
                    )}
                    
                    {/* Generate Button - only if not locked */}
                    {!pairingsLocked && (
                      <button
                        onClick={handleGeneratePairings}
                        disabled={isGenerating || isSaving}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw size={16} className="animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <RefreshCw size={16} />
                            Generate
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Round Status */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-3 h-3 rounded-full ${pairingsLocked ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm font-jetbrains text-gray-300">
                    {pairingsLocked ? 'Pairings are locked and saved' : 'Pairings are not yet saved'}
                  </span>
                </div>

                {/* Player Count */}
                <div className="text-sm text-gray-400 font-jetbrains">
                  {players.length} players • {pairings.length} pairings
                </div>
              </div>

              {/* Pairings Table */}
              <div ref={pairingsContainerRef} className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="p-6 border-b border-gray-700">
                  <h2 className="text-xl font-bold text-white font-orbitron flex items-center gap-2">
                    <Trophy size={24} />
                    Round {selectedRound} Pairings
                  </h2>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Table</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player 1</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player 2</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">First Move</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {pairings.map((pairing) => (
                        <tr key={pairing.table_number} className="bg-gray-900/30 hover:bg-gray-800/30 transition-colors duration-200">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono font-bold">
                            {pairing.table_number}
                          </td>
                          
                          {/* Player 1 */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {pairing.player1_gibsonized && (
                                <div className="w-3 h-3 bg-purple-500 rounded-full" title="Gibsonized"></div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {pairing.player1.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-400 font-jetbrains">
                                    #{pairing.player1.rank} • {pairing.player1.rating}
                                  </div>
                                  <WinProbabilityBadge 
                                    playerRating={pairing.player1.rating} 
                                    opponentRating={pairing.player2.rating}
                                    className="ml-2"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* Player 2 */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {pairing.player2_gibsonized && (
                                <div className="w-3 h-3 bg-purple-500 rounded-full" title="Gibsonized"></div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-white">
                                  {pairing.player2.name}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-400 font-jetbrains">
                                    #{pairing.player2.rank} • {pairing.player2.rating}
                                  </div>
                                  <WinProbabilityBadge 
                                    playerRating={pairing.player2.rating} 
                                    opponentRating={pairing.player1.rating}
                                    className="ml-2"
                                  />
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          {/* First Move */}
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                              <span className="text-sm text-gray-300 font-jetbrains">
                                {pairing.first_move_player_id === pairing.player1.id ? pairing.player1.name : pairing.player2.name}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {pairings.length === 0 && (
                  <div className="text-center py-12 text-gray-400 font-jetbrains">
                    No pairings generated yet. Click "Generate" to create pairings.
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {!pairingsLocked && pairings.length > 0 && (
                  <Button
                    icon={Save}
                    label={isSaving ? 'Saving Pairings...' : 'Save Pairings & Lock'}
                    onClick={handleLockPairings}
                    variant="green"
                    className="max-w-md"
                    disabled={isSaving || isGenerating}
                  />
                )}
                
                {pairingsLocked && (
                  <Button
                    icon={Trophy}
                    label="Continue to Score Entry"
                    onClick={onNext}
                    variant="blue"
                    className="max-w-md"
                  />
                )}
              </div>
            </div>
          )}

          {/* All Rounds Tab */}
          {activeTab === 'all-pairings' && (
            <PairingsManager
              tournamentId={tournamentId}
              currentRound={currentRound}
              maxRounds={maxRounds}
              onUnpairRound={handleUnpairRound}
            />
          )}

          {/* Player Roster Tab */}
          {activeTab === 'players' && (
            <PlayerRoster
              tournamentId={tournamentId}
              teamMode={tournament?.team_mode || false}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="fade-up text-center mt-auto">
          <p className="text-gray-500 text-sm font-light tracking-wider">
            {pairingsLocked 
              ? 'Pairings are locked. Proceed to score entry when ready.' 
              : 'Generate and save pairings for this round'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </footer>
      </div>

      {/* Printable Pairings View */}
      {showPrintableView && tournament && (
        <PrintablePairings
          isOpen={showPrintableView}
          onClose={() => setShowPrintableView(false)}
          tournamentName={tournament.name}
          currentRound={selectedRound}
          pairings={pairings}
        />
      )}

      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-br-full blur-xl"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-500/20 to-transparent rounded-tl-full blur-xl"></div>
    </div>
  );
};

export default RoundManager;