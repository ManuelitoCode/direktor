import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, BarChart3, Users, Plus } from 'lucide-react';
import DashboardLayout from './UI/DashboardLayout';
import TournamentSetupModal from './TournamentSetupModal';
import DraftManager from './TournamentDrafts/DraftManager';
import DraftRecoveryDialog from './TournamentDrafts/DraftRecoveryDialog';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import { useOnboarding } from '../hooks/useOnboarding';
import { useTournamentDraftSystem } from '../hooks/useTournamentDraftSystem';
import UserProfileCard from './UserProfileCard';
import ProfileEditor from './ProfileEditor';
import AdMarquee from './AdMarquee';

// Lazy-loaded components
const TournamentResume = React.lazy(() => import('./TournamentResume'));

interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  full_name?: string;
  avatar_url?: string;
  country?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

interface AuthenticatedDashboardProps {
  user: User;
}

const AuthenticatedDashboard: React.FC<AuthenticatedDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'dashboard' | 'profile' | 'tournaments' | 'history' | 'new-tournament' | 'resume-tournament'>('dashboard');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [hasExistingTournaments, setHasExistingTournaments] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const { hasCompletedOnboarding, resetOnboarding } = useOnboarding();
  const { 
    drafts, 
    isLoading: isDraftsLoading, 
    loadDraft, 
    deleteDraft, 
    renameDraft,
    checkForExistingDrafts
  } = useTournamentDraftSystem();
  
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

  useEffect(() => {
    loadUserProfile();
    checkExistingTournaments();
    checkForDrafts();
  }, [user.id]);
  
  const checkForDrafts = async () => {
    try {
      const existingDrafts = await checkForExistingDrafts();
      if (existingDrafts.length > 0) {
        setShowDraftRecovery(true);
      }
    } catch (err) {
      console.warn('Failed to check for drafts:', err);
      // Don't show error for drafts check failure
    }
  };

  const testSupabaseConnection = async (): Promise<boolean> => {
    try {
      // First check if environment variables are set
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing. Please check your environment variables.');
      }

      // Test basic connectivity with a simple query
      const { data, error } = await supabase
        .from('tournaments')
        .select('id')
        .limit(1);

      if (error) {
        throw error;
      }

      return true;
    } catch (err: any) {
      console.error('Supabase connection test failed:', err);
      
      // Provide specific error messages based on error type
      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        throw new Error('Unable to connect to the database. Please check your internet connection and try again.');
      } else if (err.message?.includes('Invalid API key')) {
        throw new Error('Database authentication failed. Please check your configuration.');
      } else if (err.message?.includes('CORS')) {
        throw new Error('Cross-origin request blocked. Please check your browser settings or try a different browser.');
      } else if (err.message?.includes('configuration missing')) {
        throw new Error(err.message);
      } else {
        throw new Error(`Database connection failed: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const checkExistingTournaments = async () => {
    try {
      setConnectionError(null);
      
      // Test connection first
      await testSupabaseConnection();

      // If connection is successful, check for tournaments
      const { data, error } = await supabase
        .from('tournaments')
        .select('id')
        .eq('director_id', user.id)
        .limit(1);

      if (error) {
        throw error;
      }
      
      setHasExistingTournaments((data || []).length > 0);
    } catch (err: any) {
      console.error('Error checking existing tournaments:', err);
      setConnectionError(err.message);
    }
  };

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Test connection first
      await testSupabaseConnection();

      // First, try to get existing profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (profileData) {
        // Profile exists, use it
        setProfile(profileData);
      } else {
        // Profile doesn't exist, create it using upsert to handle race conditions
        const newProfile = {
          id: user.id,
          username: user.email || '',
          nickname: '',
          full_name: '',
          country: '',
          bio: '',
          avatar_url: null
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .upsert([newProfile], { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (createError) {
          console.error('Profile creation error:', createError);
          throw createError;
        }

        setProfile(createdProfile);
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Tournament navigation handlers
  const handleNewTournament = () => {
    setShowTournamentModal(true);
    setSelectedDraftId(null);
  };

  const handleViewTournaments = () => {
    if (hasExistingTournaments) {
      setActiveSection('resume-tournament');
    } else {
      setActiveSection('tournaments');
    }
  };

  const handleTournamentHistory = () => {
    setActiveSection('history');
  };

  const handleTournamentCreated = async (tournamentId: string) => {
    setShowTournamentModal(false);
    
    // Check if this is a team tournament
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('team_mode')
      .eq('id', tournamentId)
      .single();
      
    if (tournament && tournament.team_mode) {
      // For team tournaments, navigate to player registration first
      navigate(`/tournament/${tournamentId}/dashboard`);
    } else {
      // For individual tournaments, go directly to the tournament dashboard
      navigate(`/tournament/${tournamentId}/dashboard`);
    }
  };

  const handleResumeTournament = (tournamentId: string, currentRound: number) => {
    // Navigate to the tournament control center
    navigate(`/tournament/${tournamentId}/dashboard`);
  };
  
  const handleResumeDraft = (draftId: string) => {
    setSelectedDraftId(draftId);
    setShowTournamentModal(true);
    setShowDraftRecovery(false);
  };
  
  const handleDiscardDraft = async (draftId: string) => {
    return await deleteDraft(draftId);
  };

  const handleRetryConnection = async () => {
    setConnectionError(null);
    setError(null);
    await Promise.all([
      checkExistingTournaments(),
      loadUserProfile()
    ]);
  };

  const handleEditProfile = () => {
    setShowProfileModal(true);
  };

  // FAB actions
  const fabActions = [
    {
      label: 'New Tournament',
      icon: Trophy,
      onClick: handleNewTournament
    },
    {
      label: 'View Tournaments',
      icon: BarChart3,
      onClick: handleViewTournaments
    },
    {
      label: 'Player Leaderboard',
      icon: Users,
      onClick: () => navigate('/leaderboard/players')
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Render dashboard content
  if (activeSection === 'dashboard') {
    return (
      <>
        {/* Ad Marquee */}
        <AdMarquee />
        
        <DashboardLayout 
          title="Welcome Back" 
          subtitle={profile?.full_name || profile?.username || user.email}
          fabActions={fabActions}
        >
          {/* Draft Recovery Dialog */}
          <DraftRecoveryDialog
            isOpen={showDraftRecovery}
            onClose={() => setShowDraftRecovery(false)}
            drafts={drafts}
            onResumeDraft={handleResumeDraft}
            onDiscardDraft={handleDiscardDraft}
            onRenameDraft={renameDraft}
            isLoading={isDraftsLoading}
          />
          
          {/* Connection Error Message */}
          {connectionError && (
            <div className="max-w-4xl mx-auto w-full mb-8">
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Connection Error</span>
                </div>
                <p className="mb-3">{connectionError}</p>
                <div className="space-y-2">
                  <button
                    onClick={handleRetryConnection}
                    className="px-3 py-1 bg-red-600/20 border border-red-500/50 rounded text-red-200 hover:bg-red-600/30 transition-colors duration-200 mr-2"
                  >
                    Retry Connection
                  </button>
                  <div className="text-xs text-red-400 mt-2">
                    <p>Troubleshooting tips:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Check your internet connection</li>
                      <li>Try refreshing the page</li>
                      <li>Disable browser extensions that might block requests</li>
                      <li>Try using a different browser or incognito mode</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="max-w-4xl mx-auto w-full mb-8">
              <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 font-jetbrains text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold">Profile Error</span>
                </div>
                <p>{error}</p>
                <button
                  onClick={handleRetryConnection}
                  className="mt-2 px-3 py-1 bg-yellow-600/20 border border-yellow-500/50 rounded text-yellow-200 hover:bg-yellow-600/30 transition-colors duration-200"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {/* Draft Manager */}
          <DraftManager
            onCreateNew={handleNewTournament}
            showRecoveryPrompt={false}
          />

          {/* Dashboard Cards */}
          <div className="fade-up fade-up-delay-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Tournament Card */}
            <div 
              className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 cursor-pointer"
              onClick={handleNewTournament}
              data-onboarding="create-tournament"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white font-orbitron">Create Tournament</h3>
              </div>
              <p className="text-gray-300 font-jetbrains mb-4">
                Start a new tournament with customizable settings for teams, divisions, and pairing systems.
              </p>
              <div className="text-blue-400 font-jetbrains text-sm">
                Click to get started →
              </div>
            </div>
            
            {/* User Profile Card */}
            <UserProfileCard 
              profile={profile}
              userEmail={user.email || ''}
              onEditProfile={handleEditProfile}
            />
          </div>

          {/* Tournament Setup Modal */}
          <TournamentSetupModal
            isOpen={showTournamentModal}
            onClose={() => setShowTournamentModal(false)}
            onSuccess={handleTournamentCreated}
            draftId={selectedDraftId || undefined}
          />
          
          {/* Profile Editor Modal */}
          <ProfileEditor
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            userId={user.id}
            userEmail={user.email || ''}
            onProfileUpdated={loadUserProfile}
          />
          
          {/* Reset Onboarding Button (for testing) */}
          <div className="mt-8 text-center">
            <button
              onClick={resetOnboarding}
              className="text-gray-500 hover:text-gray-400 text-xs font-jetbrains"
            >
              Reset Onboarding
            </button>
          </div>
        </DashboardLayout>
      </>
    );
  }

  // Resume Tournament View
  if (activeSection === 'resume-tournament') {
    return (
      <>
        {/* Ad Marquee */}
        <AdMarquee />
        
        <DashboardLayout 
          title="Your Tournaments" 
          subtitle="Resume or manage your tournaments"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          }>
            <TournamentResume
              onNewTournament={handleNewTournament}
              onResumeTournament={handleResumeTournament}
            />
          </Suspense>
        </DashboardLayout>
      </>
    );
  }

  // Fallback for other sections
  return (
    <>
      {/* Ad Marquee */}
      <AdMarquee />
      
      <DashboardLayout 
        title="Dashboard" 
        subtitle="Your tournament management hub"
      >
        <div className="text-center py-12">
          <p className="text-gray-400 font-jetbrains">
            This section is under development
          </p>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AuthenticatedDashboard;