import React, { useState, useEffect, Suspense } from 'react';
import { Plus, FolderOpen, LogOut, Settings, Share2, QrCode } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import ParticleBackground from './components/ParticleBackground';
import Button from './components/Button';
import PlayerRegistration from './components/PlayerRegistration';
import RoundManager from './components/RoundManager';
import ScoreEntry from './components/ScoreEntry';
import Standings from './components/Standings';
import AdminPanel from './components/AdminPanel';
import AuthForm from './components/AuthForm';
import HomePage from './components/HomePage';
import AuthenticatedDashboard from './components/AuthenticatedDashboard';
import TournamentSetupModal from './components/TournamentSetupModal';
import TournamentResume from './components/TournamentResume';
import PublicTournamentView from './components/PublicTournamentView';
import TournamentControlCenter from './components/TournamentControlCenter';
import DirectorsLeaderboard from './components/DirectorsLeaderboard';
import { supabase } from './lib/supabase';
import { useTournamentProgress } from './hooks/useTournamentProgress';
import { useAuditLog } from './hooks/useAuditLog';
import type { User } from '@supabase/supabase-js';
import { HelpFAQPage } from './components/Help';

// Lazy-loaded components
const ProjectionMode = React.lazy(() => import('./components/ProjectionMode'));
const QRCodeModal = React.lazy(() => import('./components/QRCodeModal'));
const Statistics = React.lazy(() => import('./components/Statistics/Statistics'));
const PlayerProfile = React.lazy(() => import('./components/PlayerProfile'));
const PlayerLeaderboard = React.lazy(() => import('./components/PlayerLeaderboard'));

type Screen = 'home' | 'dashboard' | 'resume' | 'player-registration' | 'round-manager' | 'score-entry' | 'standings' | 'admin-panel';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode;
  user: User | null;
  loading: boolean;
}

function ProtectedRoute({ children, user, loading }: ProtectedRouteProps) {
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/signin" replace />;
  }

  return <>{children}</>;
}

// Statistics Route Component
function StatisticsRoute() {
  const { tournamentId, slug } = useParams<{ tournamentId?: string; slug?: string }>();
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <Statistics tournamentId={tournamentId} isPublic={true} />
    </Suspense>
  );
}

// Player Profile Route Component
function PlayerProfileRoute() {
  const { playerId } = useParams<{ playerId: string }>();
  
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PlayerProfile />
    </Suspense>
  );
}

// Player Leaderboard Route Component
function PlayerLeaderboardRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <PlayerLeaderboard />
    </Suspense>
  );
}

// Public Tournament Route Component
function PublicTournamentRoute() {
  return <PublicTournamentView />;
}

// Projection Mode Route Component
function ProjectionModeRoute() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <ProjectionMode />
    </Suspense>
  );
}

// Help Route Component
function HelpRoute() {
  return <HelpFAQPage />;
}

// Auth Route Component
function AuthRoute() {
  const navigate = useNavigate();
  const { mode } = useParams<{ mode?: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        navigate('/dashboard');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        navigate('/dashboard');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return <AuthForm onAuthSuccess={() => navigate('/dashboard')} initialMode={mode === 'signup' ? 'signup' : 'signin'} />;
}

// Dashboard Route Component
function DashboardRoute() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate('/auth/signin');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth/signin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <ProtectedRoute user={user} loading={loading}>
      {user && <AuthenticatedDashboard user={user} />}
    </ProtectedRoute>
  );
}

// Tournament Control Center Route Component
function TournamentControlCenterRoute() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (!session?.user) {
        navigate('/auth/signin');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate('/auth/signin');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <ProtectedRoute user={user} loading={loading}>
      <TournamentControlCenter />
    </ProtectedRoute>
  );
}

// Directors Leaderboard Route Component
function DirectorsLeaderboardRoute() {
  return <DirectorsLeaderboard />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Home page is now the public landing page */}
        <Route path="/" element={<HomePage />} />
        
        <Route path="/auth" element={<Navigate to="/auth/signin" replace />} />
        <Route path="/auth/:mode" element={<AuthRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        <Route path="/admin" element={<DashboardRoute />} />
        <Route path="/profile" element={<DashboardRoute />} />
        <Route path="/new-tournament" element={<DashboardRoute />} />
        <Route path="/tournaments" element={<DashboardRoute />} />
        <Route path="/history" element={<DashboardRoute />} />
        <Route path="/help" element={<HelpRoute />} />
        <Route path="/tournament/:tournamentId/dashboard" element={<TournamentControlCenterRoute />} />
        <Route path="/t/:tournamentId" element={<PublicTournamentRoute />} />
        <Route path="/tournaments/:slug" element={<PublicTournamentRoute />} />
        <Route path="/t/:tournamentId/statistics" element={<StatisticsRoute />} />
        <Route path="/tournaments/:slug/statistics" element={<StatisticsRoute />} />
        <Route path="/statistics" element={<StatisticsRoute />} />
        <Route path="/projector/:tournamentId/:divisionId" element={<ProjectionModeRoute />} />
        <Route path="/leaderboard/directors" element={<DirectorsLeaderboardRoute />} />
        <Route path="/leaderboard/players" element={<PlayerLeaderboardRoute />} />
        <Route path="/players/:playerId" element={<PlayerProfileRoute />} />
        
        {/* Fallback route - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}