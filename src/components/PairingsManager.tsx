import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, X, Download, AlertTriangle, RefreshCw, Trash2, Check, Eye, EyeOff } from 'lucide-react';
import { supabase, handleSupabaseError, retrySupabaseOperation } from '../lib/supabase';
import { Tournament, PairingWithPlayers, Result } from '../types/database';
import WinProbabilityBadge from './WinProbabilityBadge';

interface PairingsManagerProps {
  tournamentId: string;
  currentRound: number;
  maxRounds: number;
  onUnpairRound?: (round: number) => Promise<void>;
}

interface RoundStatus {
  round: number;
  status: 'unpaired' | 'paired' | 'in-progress' | 'completed';
  pairingsCount: number;
  resultsCount: number;
}

const PairingsManager: React.FC<PairingsManagerProps> = ({
  tournamentId,
  currentRound,
  maxRounds,
  onUnpairRound
}) => {
  const [roundStatuses, setRoundStatuses] = useState<RoundStatus[]>([]);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [roundPairings, setRoundPairings] = useState<Record<number, PairingWithPlayers[]>>({});
  const [roundResults, setRoundResults] = useState<Record<number, Result[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUnpairing, setIsUnpairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unpairConfirmRound, setUnpairConfirmRound] = useState<number | null>(null);
  const [showCompletedPairings, setShowCompletedPairings] = useState(true);

  useEffect(() => {
    loadRoundStatuses();
  }, [tournamentId, currentRound]);

  useEffect(() => {
    if (expandedRound !== null) {
      loadRoundPairings(expandedRound);
    }
  }, [expandedRound]);

  const loadRoundStatuses = async () => {
    try {
      setIsLoading(true);
      setError(null);

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
      const statuses: RoundStatus[] = [];
      for (let round = 1; round <= maxRounds; round++) {
        const pairingsForRound = pairingsByRound[round] || [];
        const resultsForRound = resultsByRound[round] || [];
        
        let status: RoundStatus['status'];
        if (pairingsForRound.length === 0) {
          status = 'unpaired';
        } else if (resultsForRound.length === 0) {
          status = 'paired';
        } else if (resultsForRound.length < pairingsForRound.length) {
          status = 'in-progress';
        } else {
          status = 'completed';
        }

        statuses.push({
          round,
          status,
          pairingsCount: pairingsForRound.length,
          resultsCount: resultsForRound.length
        });
      }

      setRoundStatuses(statuses);

      // Auto-expand current round if it has pairings
      const currentRoundStatus = statuses.find(s => s.round === currentRound);
      if (currentRoundStatus && currentRoundStatus.status !== 'unpaired') {
        setExpandedRound(currentRound);
      }
    } catch (err: any) {
      console.error('Error loading round statuses:', err);
      setError(handleSupabaseError(err, 'loading round data'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadRoundPairings = async (round: number) => {
    try {
      // Check if we already have this round's pairings
      if (roundPairings[round] && roundPairings[round].length > 0) {
        return;
      }

      // Load pairings with player details
      const pairingsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('pairings')
          .select(`
            *,
            player1:players!pairings_player1_id_fkey(id, name, rating),
            player2:players!pairings_player2_id_fkey(id, name, rating)
          `)
          .eq('tournament_id', tournamentId)
          .eq('round_number', round)
          .order('table_number');

        if (error) throw error;
        return data || [];
      });

      // Load results for this round
      const resultsData = await retrySupabaseOperation(async () => {
        const { data, error } = await supabase
          .from('results')
          .select('*')
          .eq('tournament_id', tournamentId)
          .eq('round_number', round);

        if (error) throw error;
        return data || [];
      });

      setRoundPairings(prev => ({ ...prev, [round]: pairingsData }));
      setRoundResults(prev => ({ ...prev, [round]: resultsData }));
    } catch (err: any) {
      console.error(`Error loading round ${round} pairings:`, err);
      setError(handleSupabaseError(err, 'loading pairings'));
    }
  };

  const handleToggleRound = (round: number) => {
    setExpandedRound(expandedRound === round ? null : round);
  };

  const handleUnpairRound = async (round: number) => {
    if (unpairConfirmRound !== round) {
      setUnpairConfirmRound(round);
      setTimeout(() => setUnpairConfirmRound(null), 3000);
      return;
    }

    try {
      setIsUnpairing(true);
      setError(null);

      // Check if this is the most recent round with pairings
      const pairedRounds = roundStatuses
        .filter(s => s.status !== 'unpaired')
        .map(s => s.round)
        .sort((a, b) => b - a);

      if (pairedRounds.length === 0 || pairedRounds[0] !== round) {
        throw new Error('Only the most recent round can be unpaired');
      }

      // Check if round has completed results
      const roundStatus = roundStatuses.find(s => s.round === round);
      if (roundStatus?.status === 'completed') {
        throw new Error('Completed rounds cannot be unpaired');
      }

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

      // Update local state
      setRoundPairings(prev => {
        const updated = { ...prev };
        delete updated[round];
        return updated;
      });
      
      setRoundResults(prev => {
        const updated = { ...prev };
        delete updated[round];
        return updated;
      });

      // Update round statuses
      const updatedStatuses = roundStatuses.map(status => {
        if (status.round === round) {
          return { ...status, status: 'unpaired', pairingsCount: 0, resultsCount: 0 };
        }
        return status;
      });
      
      setRoundStatuses(updatedStatuses);
      setUnpairConfirmRound(null);
      setExpandedRound(null);

      // Call parent callback if provided
      if (onUnpairRound) {
        await onUnpairRound(round);
      }

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
      console.error('Error unpairing round:', err);
      setError(typeof err === 'string' ? err : err.message || 'Failed to unpair round');
    } finally {
      setIsUnpairing(false);
    }
  };

  const exportRoundPairings = (round: number) => {
    const pairings = roundPairings[round] || [];
    if (pairings.length === 0) return;

    const headers = ['Table', 'Player 1', 'Rating', 'Player 2', 'Rating', 'First Move'];
    const rows = pairings.map(pairing => [
      pairing.table_number.toString(),
      pairing.player1.name,
      pairing.player1.rating.toString(),
      pairing.player2.name,
      pairing.player2.rating.toString(),
      pairing.first_move_player_id === pairing.player1_id ? pairing.player1.name : pairing.player2.name
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Round_${round}_Pairings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: RoundStatus['status']) => {
    switch (status) {
      case 'unpaired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100/10 text-gray-300 border border-gray-500/30">
            Unpaired
          </span>
        );
      case 'paired':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100/10 text-blue-300 border border-blue-500/30">
            Paired
          </span>
        );
      case 'in-progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100/10 text-yellow-300 border border-yellow-500/30">
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100/10 text-green-300 border border-green-500/30">
            Completed
          </span>
        );
    }
  };

  const getResultForPairing = (pairingId: string, round: number): Result | undefined => {
    const results = roundResults[round] || [];
    return results.find(r => r.pairing_id === pairingId);
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
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}

      {/* Toggle for completed pairings */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCompletedPairings(!showCompletedPairings)}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 font-jetbrains text-sm"
        >
          {showCompletedPairings ? (
            <>
              <EyeOff className="h-4 w-4" />
              Hide Completed Rounds
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Show Completed Rounds
            </>
          )}
        </button>
      </div>

      {/* Round Accordion */}
      <div className="space-y-4">
        {roundStatuses
          .filter(status => showCompletedPairings || status.status !== 'completed')
          .map((status) => (
            <div 
              key={status.round}
              className={`bg-gray-900/50 border rounded-xl overflow-hidden transition-all duration-300 ${
                status.status === 'unpaired' 
                  ? 'border-gray-700' 
                  : status.status === 'paired'
                  ? 'border-blue-500/50'
                  : status.status === 'in-progress'
                  ? 'border-yellow-500/50'
                  : 'border-green-500/50'
              }`}
            >
              {/* Round Header */}
              <div 
                className={`flex items-center justify-between p-4 cursor-pointer ${
                  status.status === 'unpaired' 
                    ? 'hover:bg-gray-800/30' 
                    : status.status === 'paired'
                    ? 'hover:bg-blue-900/20'
                    : status.status === 'in-progress'
                    ? 'hover:bg-yellow-900/20'
                    : 'hover:bg-green-900/20'
                }`}
                onClick={() => status.status !== 'unpaired' && handleToggleRound(status.round)}
              >
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-bold font-orbitron ${
                    status.status === 'unpaired' 
                      ? 'text-gray-400' 
                      : status.status === 'paired'
                      ? 'text-blue-400'
                      : status.status === 'in-progress'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                  }`}>
                    Round {status.round}
                  </div>
                  <div>
                    {getStatusBadge(status.status)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Round Stats */}
                  <div className="text-sm text-gray-400 font-jetbrains">
                    {status.pairingsCount > 0 ? (
                      <>
                        {status.resultsCount}/{status.pairingsCount} results
                      </>
                    ) : (
                      'No pairings'
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {status.status !== 'unpaired' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportRoundPairings(status.round);
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
                          title="Export Pairings"
                        >
                          <Download className="h-4 w-4" />
                        </button>

                        {/* Unpair Button - only for most recent round that's not completed */}
                        {status.status !== 'completed' && 
                         status.round === Math.max(...roundStatuses.filter(s => s.status !== 'unpaired').map(s => s.round)) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnpairRound(status.round);
                            }}
                            className={`p-1 rounded transition-colors duration-200 ${
                              unpairConfirmRound === status.round
                                ? 'bg-red-600/30 text-red-300 animate-pulse'
                                : 'text-gray-400 hover:text-red-400'
                            }`}
                            title={unpairConfirmRound === status.round ? 'Click again to confirm' : 'Unpair Round'}
                            disabled={isUnpairing}
                          >
                            {isUnpairing && unpairConfirmRound === status.round ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </>
                    )}

                    {/* Expand/Collapse Button */}
                    {status.status !== 'unpaired' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRound(status.round);
                        }}
                        className="p-1 text-gray-400 hover:text-white transition-colors duration-200"
                      >
                        {expandedRound === status.round ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Round Content */}
              {expandedRound === status.round && (
                <div className="border-t border-gray-700 p-4">
                  {/* Pairings Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Table</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player 1</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Score</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Score</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player 2</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">First Move</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {(roundPairings[status.round] || []).map((pairing) => {
                          const result = getResultForPairing(pairing.id!, status.round);
                          return (
                            <tr key={pairing.id} className="hover:bg-gray-800/30 transition-colors duration-200">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-white font-mono">
                                {pairing.table_number}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {pairing.player1.name}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-400 font-jetbrains">
                                      Rating: {pairing.player1.rating}
                                    </div>
                                    <WinProbabilityBadge 
                                      playerRating={pairing.player1.rating} 
                                      opponentRating={pairing.player2.rating}
                                      className="ml-2"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="text-lg font-bold text-white font-mono">
                                  {result ? result.player1_score : '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="text-lg font-bold text-white font-mono">
                                  {result ? result.player2_score : '—'}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-white">
                                    {pairing.player2.name}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div className="text-xs text-gray-400 font-jetbrains">
                                      Rating: {pairing.player2.rating}
                                    </div>
                                    <WinProbabilityBadge 
                                      playerRating={pairing.player2.rating} 
                                      opponentRating={pairing.player1.rating}
                                      className="ml-2"
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {pairing.first_move_player_id === pairing.player1_id
                                    ? pairing.player1.name.split(' ')[0]
                                    : pairing.player2.name.split(' ')[0]}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {result ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100/10 text-green-300 border border-green-500/30">
                                    <Check className="h-3 w-3 mr-1" />
                                    Completed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100/10 text-yellow-300 border border-yellow-500/30">
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* No Pairings Message */}
                  {(!roundPairings[status.round] || roundPairings[status.round].length === 0) && (
                    <div className="text-center py-8 text-gray-400 font-jetbrains">
                      No pairings found for this round
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* No Rounds Message */}
      {roundStatuses.length === 0 && (
        <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white font-orbitron mb-2">No Rounds Found</h3>
          <p className="text-gray-400 font-jetbrains">
            No rounds have been created for this tournament yet.
          </p>
        </div>
      )}
    </div>
  );
};

export default PairingsManager;