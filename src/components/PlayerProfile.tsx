import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Trophy, Medal, Calendar, MapPin, Edit3, Save, X, ExternalLink, BarChart3 } from 'lucide-react';
import ParticleBackground from './ParticleBackground';
import BadgeList from './Badges/BadgeList';
import { usePlayerProfile, usePlayerTournamentHistory } from '../hooks/usePlayerProfile';
import { supabase } from '../lib/supabase';

const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  
  const { 
    player, 
    profile, 
    badges, 
    tournaments, 
    stats, 
    isLoading, 
    error,
    updatePlayerProfile
  } = usePlayerProfile(playerId || '');
  
  const { 
    tournamentHistory, 
    isLoading: isHistoryLoading 
  } = usePlayerTournamentHistory(playerId || '');
  
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    
    // Set initial bio text when profile loads
    if (profile) {
      setBioText(profile.bio || '');
    }
  }, [profile]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    const success = await updatePlayerProfile({
      bio: bioText
    });
    
    if (success) {
      setIsEditing(false);
    }
    
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setBioText(profile?.bio || '');
    setIsEditing(false);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-400 mb-4 font-orbitron">Error</h1>
          <p className="text-gray-300 mb-8">{error || 'Player not found'}</p>
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains transition-all duration-200 mx-auto"
          >
            <ArrowLeft size={16} />
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative overflow-hidden">
      <ParticleBackground />
      
      <div className="relative z-10 min-h-screen flex flex-col px-4 py-8">
        {/* Navigation */}
        <div className="max-w-6xl mx-auto w-full mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
            >
              <ArrowLeft size={20} />
              <span className="font-jetbrains">← Back</span>
            </button>
          </div>
        </div>

        {/* Player Header */}
        <div className="max-w-6xl mx-auto w-full mb-8">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-2 border-blue-500/30 rounded-2xl p-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              {/* Avatar */}
              <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={player.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-16 h-16 text-white" />
                )}
              </div>
              
              {/* Player Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl font-bold text-white font-orbitron mb-2">
                  {player.name}
                </h1>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-4 text-lg text-gray-300">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <span className="font-jetbrains">Rating: {player.rating}</span>
                  </div>
                  
                  {player.team_name && (
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span className="font-jetbrains">Team: {player.team_name}</span>
                    </div>
                  )}
                  
                  {tournaments[0]?.date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-400" />
                      <span className="font-jetbrains">
                        Tournament: {formatDate(tournaments[0]?.date)}
                      </span>
                    </div>
                  )}
                  
                  {tournaments[0]?.venue && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-green-400" />
                      <span className="font-jetbrains">{tournaments[0]?.venue}</span>
                    </div>
                  )}
                </div>
                
                {/* Bio */}
                <div className="mb-4">
                  {isEditing ? (
                    <div>
                      <textarea
                        value={bioText}
                        onChange={(e) => setBioText(e.target.value)}
                        className="w-full h-32 bg-gray-800/50 border border-gray-600 rounded-lg px-4 py-2 text-white font-jetbrains text-sm resize-none focus:border-blue-500 focus:outline-none transition-colors duration-300"
                        placeholder="Write a short bio..."
                      />
                      
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                        >
                          <X size={14} />
                          Cancel
                        </button>
                        
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                        >
                          {isSaving ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save size={14} />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <p className="text-gray-300 font-jetbrains">
                        {profile?.bio || 'No bio available'}
                      </p>
                      
                      {isAuthenticated && (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="absolute top-0 right-0 p-2 text-gray-400 hover:text-white transition-colors duration-200"
                          title="Edit bio"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="max-w-6xl mx-auto w-full mb-8">
          <div className="bg-gray-900/50 border border-yellow-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-400" />
              Badges & Achievements
            </h2>
            
            <BadgeList 
              badges={badges} 
              size="md" 
              showTooltip={true}
              emptyMessage="No badges earned yet. Complete tournaments to earn badges!"
            />
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-6xl mx-auto w-full mb-8">
          <div className="bg-gray-900/50 border border-blue-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-400" />
              Performance Statistics
            </h2>
            
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white font-orbitron">
                    {stats.totalGames}
                  </div>
                  <div className="text-gray-400 text-sm">Games Played</div>
                </div>
                
                <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400 font-orbitron">
                    {stats.wins}-{stats.losses}-{stats.draws}
                  </div>
                  <div className="text-gray-400 text-sm">W-L-D Record</div>
                </div>
                
                <div className="bg-gray-800/50 border border-purple-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400 font-orbitron">
                    {stats.averageSpread > 0 ? '+' : ''}{Math.round(stats.averageSpread)}
                  </div>
                  <div className="text-gray-400 text-sm">Avg. Spread</div>
                </div>
                
                <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-cyan-400 font-orbitron">
                    {Math.round(stats.averageScore)}
                  </div>
                  <div className="text-gray-400 text-sm">Avg. Score</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 font-jetbrains">
                No statistics available
              </div>
            )}
          </div>
        </div>

        {/* Tournament History */}
        <div className="max-w-6xl mx-auto w-full mb-8">
          <div className="bg-gray-900/50 border border-purple-500/30 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-purple-400" />
              Tournament History
            </h2>
            
            {isHistoryLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : tournamentHistory.length > 0 ? (
              <div className="space-y-4">
                {tournamentHistory.map((entry, index) => (
                  <div 
                    key={entry.tournament.id}
                    className="bg-gray-800/50 border border-gray-700 hover:border-purple-500/50 rounded-lg p-4 transition-colors duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-white font-orbitron mb-1">
                          {entry.tournament.name}
                        </h3>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                          {entry.tournament.date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(entry.tournament.date)}</span>
                            </div>
                          )}
                          
                          {entry.tournament.venue && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{entry.tournament.venue}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-white font-orbitron">
                            {entry.stats.wins}-{entry.stats.losses}-{entry.stats.draws}
                          </div>
                          <div className="text-xs text-gray-400">Record</div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`text-lg font-bold font-orbitron ${
                            entry.stats.totalSpread > 0 ? 'text-green-400' : 
                            entry.stats.totalSpread < 0 ? 'text-red-400' : 'text-gray-400'
                          }`}>
                            {entry.stats.totalSpread > 0 ? '+' : ''}{entry.stats.totalSpread}
                          </div>
                          <div className="text-xs text-gray-400">Spread</div>
                        </div>
                        
                        {entry.stats.badgesEarned > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-yellow-400 font-orbitron">
                              {entry.stats.badgesEarned}
                            </div>
                            <div className="text-xs text-gray-400">Badges</div>
                          </div>
                        )}
                        
                        <a
                          href={`/tournaments/${entry.tournament.slug || entry.tournament.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1 bg-purple-600/20 border border-purple-500/50 text-purple-400 hover:bg-purple-600/30 hover:text-white rounded-lg text-xs font-jetbrains transition-all duration-200"
                        >
                          <ExternalLink size={12} />
                          View Tournament
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 font-jetbrains">
                No tournament history available
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-auto">
          <p className="text-gray-500 text-sm font-light tracking-wider">
            Player Profile • Powered by Direktor
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PlayerProfile;