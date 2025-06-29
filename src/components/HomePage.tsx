import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Zap, Users, Target, Star } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import AdMarquee from './AdMarquee';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Redirect to dashboard if already logged in
        navigate('/dashboard');
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = () => {
    navigate('/auth/signin');
  };

  const handleSignUp = () => {
    navigate('/auth/signup');
  };
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      
      // Show success toast
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg font-jetbrains text-sm border border-green-500/50';
      toast.innerHTML = `
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          You've been signed out. See you next time!
        </div>
      `;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        if (document.body.contains(toast)) {
          document.body.removeChild(toast);
        }
      }, 3000);
      
      // Redirect to landing page
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
      // Still redirect even if there's an error
      navigate('/');
    }
  };
  
  const handleViewAllDirectors = () => {
    navigate('/leaderboard/directors');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ad Marquee */}
      <AdMarquee />
      
      {/* Particle Background */}
      <ParticleBackground />
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-cyan-500/10"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Header with Auth Status */}
      <div className="relative z-10 w-full py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-end">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-gray-300 font-jetbrains text-sm">
                Welcome, {user.email}
              </span>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
              >
                My Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800/80 backdrop-blur-lg text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-gray-600/50 transition-all duration-200"
              >
                Sign Out
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Hero Section */}
        <div className="text-center max-w-6xl mx-auto">
          {/* Main Headline */}
          <h1 
            className="glitch-text fade-up text-5xl md:text-7xl lg:text-8xl font-bold mb-8 text-white font-orbitron tracking-wider leading-tight"
            data-text="Run World-Class Scrabble Tournaments — with Direktor."
            style={{
              textShadow: '0 0 30px rgba(59, 130, 246, 0.6), 0 0 60px rgba(59, 130, 246, 0.4), 0 0 90px rgba(59, 130, 246, 0.3)'
            }}
          >
            Run World-Class Scrabble Tournaments — with{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Direktor
            </span>.
          </h1>
          
          {/* Subheading */}
          <p className="fade-up fade-up-delay-1 text-2xl md:text-3xl lg:text-4xl text-gray-300 mb-12 font-jetbrains font-medium tracking-wide">
            Powerful. Professional. Effortless.
          </p>
          
          {/* Feature Highlights */}
          <div className="fade-up fade-up-delay-2 flex flex-wrap items-center justify-center gap-8 mb-16 text-lg text-blue-300">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              <span className="font-jetbrains">AI-Powered Pairings</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-green-400" />
              <span className="font-jetbrains">Live Standings</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-purple-400" />
              <span className="font-jetbrains">Gibsonization</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-6 h-6 text-cyan-400" />
              <span className="font-jetbrains">Professional Results</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="fade-up fade-up-delay-3 flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={handleSignIn}
              className="group relative overflow-hidden neon-glow border-2 border-blue-500 bg-blue-500/20 backdrop-blur-sm px-8 py-4 rounded-xl font-semibold text-lg tracking-wide text-blue-400 hover:text-white hover:bg-blue-500/30 transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex items-center justify-center gap-3 min-w-[200px] font-orbitron"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative z-10">Sign In</span>
            </button>
            
            <button
              onClick={handleSignUp}
              className="group relative overflow-hidden neon-glow-green border-2 border-green-500 bg-green-500/20 backdrop-blur-sm px-8 py-4 rounded-xl font-semibold text-lg tracking-wide text-green-400 hover:text-white hover:bg-green-500/30 transition-all duration-300 ease-out hover:scale-105 active:scale-95 flex items-center justify-center gap-3 min-w-[200px] font-orbitron"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <span className="relative z-10">Sign Up</span>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="fade-up fade-up-delay-5 mt-16 text-center">
          <p className="text-gray-500 text-lg font-jetbrains leading-relaxed max-w-3xl mx-auto">
            Join tournament directors worldwide who trust Direktor for their competitive Scrabble events. 
            Advanced algorithms, real-time updates, and professional-grade features — all in one platform.
          </p>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-4 h-4 bg-blue-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '0s' }}></div>
        <div className="absolute top-32 right-16 w-3 h-3 bg-cyan-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-40 left-20 w-2 h-2 bg-purple-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-10 w-5 h-5 bg-green-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 left-8 w-3 h-3 bg-yellow-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-8 w-4 h-4 bg-pink-500/40 rounded-full blur-sm animate-bounce" style={{ animationDelay: '2.5s' }}></div>
      </div>

      {/* Bottom Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none"></div>
      
      {/* Corner Accents */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-transparent rounded-br-full blur-xl"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-green-500/20 to-transparent rounded-tl-full blur-xl"></div>
    </div>
  );
};

export default HomePage;