import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Trophy, BarChart3, Settings, Share2, QrCode, Eye, AlertTriangle, UserPlus, ChevronRight } from 'lucide-react';
import { supabase, testSupabaseConnection, handleSupabaseError } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { ChecklistStep } from './UI/TournamentChecklist';
import TournamentChecklist from './UI/TournamentChecklist';
import FloatingActionButton from './UI/FloatingActionButton';
import Sidebar from './Navigation/Sidebar';
import TeamStandings from './TeamStandings';
import TriumviratePhaseIndicator from './TriumvirateMode/TriumviratePhaseIndicator';
import TriumvirateGroupStandings from './TriumvirateMode/TriumvirateGroupStandings';
import TriumvirateSetup from './TriumvirateMode/TriumvirateSetup';
import TriumvirateTeamImport from './TriumvirateMode/TriumvirateTeamImport';
import TriumviratePhaseTransition from './TriumvirateMode/TriumviratePhaseTransition';
import { isReadyForPhase2 } from '../utils/triumvirateAlgorithms';

// Lazy-loaded components
const RoundManager = React.lazy(() => import('./RoundManager'));
const ScoreEntry = React.lazy(() => import('./ScoreEntry'));
const Standings = React.lazy(() => import('./Standings'));
const AdminPanel = React.lazy(() => import('./AdminPanel'));
const QRCodeModal = React.lazy(() => import('./QRCodeModal'));
const Statistics = React.lazy(() => import('./Statistics/Statistics'));
const PlayerRoster = React.lazy(() => import('./PlayerRoster'));
const AddPlayerModal = React.lazy(() => import('./AddPlayerModal'));
const PlayerRegistration = React.lazy(() => import('./PlayerRegistration'));
const TournamentCompleteSummary = React.lazy(() => import('./UI/TournamentCompleteSummary'));

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_round: number;
  rounds: number;
  team_mode: boolean;
  slug: string;
  public_sharing_enabled: boolean;
  triumvirate_mode?: boolean;
  triumvirate_phase?: number;
  triumvirate_config?: any;
}

type ActiveTab = 'players' | 'rounds' | 'scores' | 'standings' | 'admin' | 'statistics' | 'registration' | 'summary' | 'triumvirate';

const TournamentControlCenter: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<User | null>(null);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('players');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddPlayerModal, setShowAddPlayerModal] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasRegisteredPlayers, setHasRegisteredPlayers] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<{name: string, team?: string} | null>(null);
  const [checklistSteps, setChecklistSteps] = useState<ChecklistStep[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showPhaseTransition, setShowPhaseTransition] = useState(false);
  const [teams, setTeams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [pairings, setPairings] = useState<any[]>([]);

  useEffect(() => {
    initializeComponent();
    
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [tournamentId]);

  useEffect(() => {
    // Update checklist steps when tournament data changes
    if (tournament) {
      updateChecklistSteps();
    }
  }, [tournament, hasRegisteredPlayers, activeTab]);

  const initializeComponent = async () => {
    try {
      setLoading(true);
      setError(null);
      setConnectionError(null);

      // Test Supabase connection first
      const connectionTest = await testSupabaseConnection();
      if (!connectionTest.success) {
        setConnectionError(`Database connection failed: ${connectionTest.error}`);
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(handleSupabaseError(sessionError, 'session check'));
      }

      if (!session?.user) {
        navigate('/auth/signin');
        return;
      }

      setUser(session.user);

      // Load tournament data
      await loadTournament();

    } catch (err: any) {
      console.error('Error initializing tournament control center:', err);
      setError(err.message || 'Failed to initialize tournament control center');
    } finally {
      setLoading(false);
    }
  };

  const loadTournament = async () => {
    if (!tournamentId) {
      setError('Tournament ID is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

      if (error) {
        throw new Error(handleSupabaseError(error, 'tournament fetch'));
      }

      if (!data) {
        setError('Tournament not found');
        return;
      }

      setTournament(data);
      
      // If tournament is triumvirate mode, load teams, results, and pairings
      if (data.triumvirate_mode) {
        await loadTriumvirateData();
        
        // Check if ready for Phase 2
        if (data.triumvirate_phase === 1 && 
            data.triumvirate_config && 
            isReadyForPhase2(data.current_round, data.triumvirate_config)) {
          setShowPhaseTransition(true);
        }
      }
      
      // Check if tournament is completed and load winner
      if (data.status === 'completed') {
        await loadTournamentWinner();
      }
      
      // Check if there are registered players
      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('tournament_id', tournamentId)
        .limit(1);
        
      if (!playersError && existingPlayers && existingPlayers.length > 0) {
        setHasRegisteredPlayers(true);
      } else {
        // If no players and this is a team tournament, start with registration tab
        if (data.team_mode) {
          setActiveTab('registration');
        }
      }
    } catch (err: any) {
      console.error('Error loading tournament:', err);
      setError(err.message || 'Failed to load tournament');
    }
  };

  const loadTriumvirateData = async () => {
    try {
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
    } catch (err) {
      console.error('Error loading triumvirate data:', err);
    }
  };

  const loadTournamentWinner = async () => {
    try {
      // Get the player with rank 1 from the final standings
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

      // Get all players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (playersError) throw playersError;

      // Calculate standings
      const playerStats = new Map();
      
      players.forEach(player => {
        playerStats.set(player.id, {
          id: player.id,
          name: player.name,
          team_name: player.team_name,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          spread: 0
        });
      });

      // Process results
      results.forEach(result => {
        const pairing = result.pairing;
        if (!pairing) return;

        // Process player 1
        const player1Stats = playerStats.get(pairing.player1_id);
        if (player1Stats) {
          const spread = result.player1_score - result.player2_score;
          player1Stats.spread += spread;
          
          if (spread > 0) {
            player1Stats.wins++;
            player1Stats.points++;
          } else if (spread < 0) {
            player1Stats.losses++;
          } else {
            player1Stats.draws++;
            player1Stats.points += 0.5;
          }
        }

        // Process player 2
        const player2Stats = playerStats.get(pairing.player2_id);
        if (player2Stats) {
          const spread = result.player2_score - result.player1_score;
          player2Stats.spread += spread;
          
          if (spread > 0) {
            player2Stats.wins++;
            player2Stats.points++;
          } else if (spread < 0) {
            player2Stats.losses++;
          } else {
            player2Stats.draws++;
            player2Stats.points += 0.5;
          }
        }
      });

      // Sort by points, then spread
      const standings = Array.from(playerStats.values())
        .sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points;
          return b.spread - a.spread;
        });

      // Get winner
      if (standings.length > 0) {
        setTournamentWinner({
          name: standings[0].name,
          team: standings[0].team_name
        });
        
        // If tournament is completed, show summary tab
        if (tournament?.status === 'completed') {
          setActiveTab('summary');
        }
      }
    } catch (err) {
      console.error('Error loading tournament winner:', err);
    }
  };

  const updateChecklistSteps = () => {
    if (!tournament) return;
    
    const steps: ChecklistStep[] = [
      {
        id: 'basic-info',
        label: 'Basic Info',
        completed: true, // Always completed since tournament exists
        current: false,
        disabled: false
      },
      {
        id: 'register-players',
        label: 'Register Players',
        completed: hasRegisteredPlayers,
        current: activeTab === 'registration' || activeTab === 'players',
        disabled: false
      }
    ];
    
    // Add triumvirate setup step if needed
    if (tournament.triumvirate_mode) {
      steps.push({
        id: 'triumvirate-setup',
        label: 'Triumvirate Setup',
        completed: tournament.triumvirate_phase === 2 || teams.length >= 36,
        current: activeTab === 'triumvirate',
        disabled: !hasRegisteredPlayers
      });
    }
    
    // Add remaining steps
    steps.push(
      {
        id: 'pair-rounds',
        label: 'Pair Rounds',
        completed: tournament.current_round > 1,
        current: activeTab === 'rounds',
        disabled: !hasRegisteredPlayers
      },
      {
        id: 'enter-scores',
        label: 'Enter Scores',
        completed: tournament.status === 'completed',
        current: activeTab === 'scores',
        disabled: !hasRegisteredPlayers || tournament.current_round <= 1
      },
      {
        id: 'view-standings',
        label: 'View Standings',
        completed: tournament.status === 'completed',
        current: activeTab === 'standings',
        disabled: !hasRegisteredPlayers || tournament.current_round <= 1
      }
    );
    
    setChecklistSteps(steps);
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  const handleViewPublic = () => {
    if (tournament?.slug) {
      window.open(`/tournaments/${tournament.slug}`, '_blank');
    } else {
      window.open(`/t/${tournamentId}`, '_blank');
    }
  };

  const handleShowQR = () => {
    setShowQRModal(true);
  };

  const handleAddPlayer = () => {
    setShowAddPlayerModal(true);
  };

  const handlePlayerAdded = () => {
    setShowAddPlayerModal(false);
    setHasRegisteredPlayers(true);
    // Refresh player roster if needed
    if (activeTab === 'players') {
      // The PlayerRoster component will handle its own refresh
    }
  };

  const retryConnection = async () => {
    setConnectionError(null);
    await initializeComponent();
  };

  const handleChecklistStepClick = (stepId: string) => {
    switch (stepId) {
      case 'basic-info':
        setActiveTab('admin');
        break;
      case 'register-players':
        setActiveTab(tournament?.team_mode && !hasRegisteredPlayers ? 'registration' : 'players');
        break;
      case 'triumvirate-setup':
        setActiveTab('triumvirate');
        break;
      case 'pair-rounds':
        setActiveTab('rounds');
        break;
      case 'enter-scores':
        setActiveTab('scores');
        break;
      case 'view-standings':
        setActiveTab('standings');
        break;
    }
  };

  // Navigation handlers for PlayerRegistration
  const handlePlayerRegistrationBack = () => {
    navigate('/dashboard');
  };

  const handlePlayerRegistrationNext = () => {
    setHasRegisteredPlayers(true);
    setActiveTab('rounds');
  };

  const handleExportTou = () => {
    // This will be implemented in the AdminPanel component
  };

  const handleViewStats = () => {
    setActiveTab('statistics');
  };

  const handleCreateNew = () => {
    navigate('/new-tournament');
  };
  
  const handleTriumvirateSetupComplete = () => {
    loadTriumvirateData();
  };
  
  const handleTriumvirateTeamImportComplete = () => {
    loadTriumvirateData();
    setHasRegisteredPlayers(true);
  };
  
  const handleStartPhase2 = () => {
    setShowPhaseTransition(true);
  };
  
  const handlePhaseTransitionComplete = () => {
    setShowPhaseTransition(false);
    loadTournament();
  };

  // FAB actions based on current tab
  const getFabActions = () => {
    const actions = [];
    
    if (activeTab === 'players') {
      actions.push({
        label: 'Add Player',
        icon: UserPlus,
        onClick: handleAddPlayer
      });
    }
    
    if (activeTab === 'rounds' && hasRegisteredPlayers) {
      actions.push({
        label: 'Enter Scores',
        icon: BarChart3,
        onClick: () => setActiveTab('scores')
      });
    }
    
    if (activeTab === 'scores') {
      actions.push({
        label: 'View Standings',
        icon: Trophy,
        onClick: () => setActiveTab('standings')
      });
    }
    
    if (tournament?.status === 'completed') {
      actions.push({
        label: 'Export .TOU File',
        icon: Trophy,
        onClick: handleExportTou
      });
    }
    
    return actions;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 font-jetbrains">Loading tournament...</p>
        </div>
      </div>
    );
  }

  // Connection Error Screen
  if (connectionError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-yellow-300 mb-2 font-orbitron">Connection Issue</h2>
            <p className="text-yellow-200 mb-4 font-jetbrains text-sm">{connectionError}</p>
            <div className="space-y-3">
              <button
                onClick={retryConnection}
                className="w-full px-4 py-2 bg-yellow-600/20 border border-yellow-500/50 rounded text-yellow-200 hover:bg-yellow-600/30 transition-colors duration-200 font-jetbrains"
              >
                Retry Connection
              </button>
              <button
                onClick={handleBack}
                className="w-full px-4 py-2 bg-gray-600/20 border border-gray-500/50 rounded text-gray-300 hover:bg-gray-600/30 transition-colors duration-200 font-jetbrains"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-300 mb-2 font-orbitron">Error</h2>
            <p className="text-red-200 mb-4 font-jetbrains text-sm">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-red-600/20 border border-red-500/50 rounded text-red-200 hover:bg-red-600/30 transition-colors duration-200 font-jetbrains"
              >
                Reload Page
              </button>
              <button
                onClick={handleBack}
                className="w-full px-4 py-2 bg-gray-600/20 border border-gray-500/50 rounded text-gray-300 hover:bg-gray-600/30 transition-colors duration-200 font-jetbrains"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 font-jetbrains">Tournament not found</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-gray-600/20 border border-gray-500/50 rounded text-gray-300 hover:bg-gray-600/30 transition-colors duration-200 font-jetbrains"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Team tournament with no players - force registration
  if (tournament.team_mode && !hasRegisteredPlayers) {
    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <div className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50"
                >
                  <ArrowLeft size={18} />
                  <span className="font-jetbrains text-sm">Back</span>
                </button>
                
                <div>
                  <h1 className="text-2xl font-bold text-white font-orbitron">{tournament.name}</h1>
                  <p className="text-gray-400 font-jetbrains text-sm">
                    {tournament.triumvirate_mode ? 'Triumvirate Tournament' : 'Team Tournament'} • Registration Required
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Checklist */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <TournamentChecklist 
            steps={checklistSteps}
            onStepClick={handleChecklistStepClick}
            orientation="horizontal"
          />
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold text-yellow-300 font-orbitron">
                {tournament.triumvirate_mode ? 'Triumvirate' : 'Team'} Player Registration Required
              </h2>
            </div>
            <p className="text-gray-300 font-jetbrains mb-4">
              Before you can access the tournament control center, you need to register players for each team.
              {tournament.triumvirate_mode && ' Triumvirate mode requires exactly 36 teams with an equal number of players per team.'}
            </p>
            <p className="text-yellow-200 font-jetbrains text-sm">
              Please complete the registration process below to continue.
            </p>
          </div>
          
          {tournament.triumvirate_mode ? (
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
              <TriumvirateTeamImport 
                tournamentId={tournamentId!}
                onImportComplete={handleTriumvirateTeamImportComplete}
              />
            </Suspense>
          ) : (
            <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
              <PlayerRegistration 
                tournamentId={tournamentId!} 
                onBack={handlePlayerRegistrationBack}
                onNext={handlePlayerRegistrationNext}
              />
            </Suspense>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'players' as ActiveTab, label: 'Players', icon: Users },
    { id: 'rounds' as ActiveTab, label: 'Rounds', icon: Trophy },
    { id: 'scores' as ActiveTab, label: 'Scores', icon: BarChart3 },
    { id: 'standings' as ActiveTab, label: 'Standings', icon: Trophy },
    { id: 'statistics' as ActiveTab, label: 'Statistics', icon: BarChart3 },
    { id: 'admin' as ActiveTab, label: 'Settings', icon: Settings },
  ];
  
  // Add Triumvirate tab if needed
  if (tournament.triumvirate_mode) {
    tabs.splice(1, 0, { id: 'triumvirate' as ActiveTab, label: 'Triumvirate', icon: Users });
  }

  const renderTabContent = () => {
    const commonProps = {
      tournamentId: tournamentId!,
      tournament,
      onTournamentUpdate: loadTournament
    };

    switch (activeTab) {
      case 'registration':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <PlayerRegistration 
              tournamentId={tournamentId!} 
              onBack={handleBack}
              onNext={() => setActiveTab('rounds')}
            />
          </Suspense>
        );
      case 'players':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <div className="space-y-6">
              {/* Add Player Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleAddPlayer}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
                >
                  <UserPlus size={16} />
                  Add Player
                </button>
              </div>
              
              {tournament.team_mode ? (
                <TeamStandings tournamentId={tournamentId!} />
              ) : (
                <PlayerRoster 
                  tournamentId={tournamentId!} 
                  teamMode={tournament.team_mode}
                />
              )}
            </div>
          </Suspense>
        );
      case 'triumvirate':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <div className="space-y-6">
              {/* Phase Transition Modal */}
              {showPhaseTransition && (
                <TriumviratePhaseTransition
                  tournamentId={tournamentId!}
                  tournament={tournament}
                  teams={teams}
                  results={results}
                  pairings={pairings}
                  onTransitionComplete={handlePhaseTransitionComplete}
                />
              )}
              
              {/* Phase Indicator */}
              {!showPhaseTransition && (
                <TriumviratePhaseIndicator 
                  tournament={tournament}
                  onStartPhase2={handleStartPhase2}
                />
              )}
              
              {/* Group Standings */}
              {!showPhaseTransition && teams.length > 0 && (
                <TriumvirateGroupStandings
                  tournamentId={tournamentId!}
                  tournament={tournament}
                />
              )}
              
              {/* Triumvirate Setup */}
              {!showPhaseTransition && teams.length === 0 && (
                <TriumvirateSetup
                  tournamentId={tournamentId!}
                  tournament={tournament}
                  onSetupComplete={handleTriumvirateSetupComplete}
                />
              )}
            </div>
          </Suspense>
        );
      case 'rounds':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <RoundManager 
              {...commonProps}
              currentRound={tournament.current_round}
              maxRounds={tournament.rounds}
              onBack={() => setActiveTab('players')}
              onNext={() => setActiveTab('scores')}
              teams={teams}
              triumvirateConfig={tournament.triumvirate_config}
            />
          </Suspense>
        );
      case 'scores':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <ScoreEntry 
              {...commonProps}
              currentRound={tournament.current_round}
              onBack={() => setActiveTab('rounds')}
              onNext={() => setActiveTab('standings')}
            />
          </Suspense>
        );
      case 'standings':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <Standings 
              {...commonProps}
              currentRound={tournament.current_round}
              maxRounds={tournament.rounds}
              onBack={() => setActiveTab('scores')}
              onNextRound={() => {
                loadTournament();
                setActiveTab('rounds');
              }}
            />
          </Suspense>
        );
      case 'statistics':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <Statistics tournamentId={tournamentId} />
          </Suspense>
        );
      case 'admin':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <AdminPanel {...commonProps} />
          </Suspense>
        );
      case 'summary':
        return (
          <Suspense fallback={<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
            <TournamentCompleteSummary 
              tournamentId={tournamentId!}
              tournamentName={tournament.name}
              winnerName={tournamentWinner?.name || 'Unknown'}
              winnerTeam={tournamentWinner?.team}
              onExportTou={handleExportTou}
              onViewStats={handleViewStats}
              onCreateNew={handleCreateNew}
            />
          </Suspense>
        );
      default:
        return <div className="text-center py-12 text-gray-400">Select a tab to get started</div>;
    }
  };

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Header */}
        <div className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg text-gray-300 hover:text-white transition-all duration-200 border border-gray-700/50"
                >
                  <ArrowLeft size={18} />
                  <span className="font-jetbrains text-sm">Back</span>
                </button>
                
                <div>
                  <h1 className="text-2xl font-bold text-white font-orbitron">{tournament.name}</h1>
                  <p className="text-gray-400 font-jetbrains text-sm">
                    Round {tournament.current_round} of {tournament.rounds} • {tournament.status}
                    {tournament.triumvirate_mode && tournament.triumvirate_phase && 
                     ` • Phase ${tournament.triumvirate_phase}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {tournament.public_sharing_enabled && (
                  <>
                    <button
                      onClick={handleViewPublic}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
                    >
                      <Eye size={16} />
                      View Public
                    </button>
                    
                    <button
                      onClick={handleShowQR}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-400 hover:bg-purple-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
                    >
                      <QrCode size={16} />
                      QR Code
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Checklist */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <TournamentChecklist 
            steps={checklistSteps}
            onStepClick={handleChecklistStepClick}
            orientation="horizontal"
          />
        </div>

        {/* Navigation Tabs */}
        <div className="bg-gray-900/30 backdrop-blur-lg border-b border-gray-800/50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                // Skip the summary tab in the navigation
                if (tab.id === 'summary') return null;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-jetbrains text-sm font-medium transition-all duration-300 border-b-2 whitespace-nowrap ${
                      isActive
                        ? 'text-white border-[#6366F1] bg-[#2A2D3E]'
                        : 'text-gray-400 border-transparent hover:text-white hover:border-gray-600'
                    }`}
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 py-6">
          {renderTabContent()}
        </div>

        {/* QR Code Modal */}
        {showQRModal && (
          <Suspense fallback={null}>
            <QRCodeModal
              isOpen={showQRModal}
              onClose={() => setShowQRModal(false)}
              tournamentId={tournamentId!}
              tournamentName={tournament.name}
            />
          </Suspense>
        )}

        {/* Add Player Modal */}
        {showAddPlayerModal && (
          <Suspense fallback={null}>
            <AddPlayerModal
              isOpen={showAddPlayerModal}
              onClose={() => setShowAddPlayerModal(false)}
              onPlayerAdded={handlePlayerAdded}
              tournamentId={tournamentId!}
              teamMode={tournament.team_mode}
            />
          </Suspense>
        )}

        {/* Floating Action Button */}
        <FloatingActionButton actions={getFabActions()} />
      </div>
    </div>
  );
};

export default TournamentControlCenter;