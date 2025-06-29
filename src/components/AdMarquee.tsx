import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Ad } from '../types/database';
import { Wifi, WifiOff } from 'lucide-react';
import './AdMarquee.css';

const AdMarquee: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [userCountry, setUserCountry] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Detect user's country and fetch ads
    detectUserCountry();
    fetchAds();
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Set up ad rotation
  useEffect(() => {
    if (filteredAds.length <= 1) return;
    
    const rotationInterval = setInterval(() => {
      setCurrentAdIndex(prevIndex => 
        prevIndex >= filteredAds.length - 1 ? 0 : prevIndex + 1
      );
    }, 8000); // Rotate every 8 seconds
    
    return () => clearInterval(rotationInterval);
  }, [ads]);

  const detectUserCountry = async () => {
    try {
      // Check if country is stored in user profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('country')
          .eq('id', user.id)
          .single();
          
        if (profile?.country) {
          setUserCountry(profile.country);
          return;
        }
      }
      
      // Fallback to browser language for demo purposes
      const browserLang = navigator.language || 'en-US';
      const countryCode = browserLang.split('-')[1];
      if (countryCode && countryCode.length === 2) {
        setUserCountry(countryCode);
      }
    } catch (err) {
      console.error('Error detecting country:', err);
    }
  };

  const fetchAds = async () => {
    try {
      setIsLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true)
        .lte('start_date', today)
        .gte('end_date', today)
        .order('priority', { ascending: true, nullsLast: true });
        
      if (error) throw error;
      
      setAds(data || []);
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter ads based on country targeting
  const filteredAds = ads.filter(ad => {
    // If ad has no country targeting, show to everyone
    if (!ad.countries || ad.countries.length === 0) {
      return true;
    }
    
    // If we couldn't detect user's country, show global ads only
    if (!userCountry) {
      return false;
    }
    
    // Show if user's country is in the ad's target countries
    return ad.countries.includes(userCountry);
  });

  // Default message when no ads are available
  const defaultMessage = "Welcome to Direktor! Sign in to continue your session or Sign up for a free account to start managing tournaments.";

  // Handle sign in/up clicks from default message
  const handleSignIn = () => {
    navigate('/auth/signin');
  };

  const handleSignUp = () => {
    navigate('/auth/signup');
  };
  
  // Handle ad click
  const handleAdClick = (url?: string) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (isLoading) {
    return null; // Don't show anything while loading
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/80 to-purple-900/80 text-white py-2 overflow-hidden border-b border-blue-500/30">
      <div className="marquee-container relative">
        {filteredAds.length > 0 ? (
          <div className="flex items-center justify-center">
            <div 
              className={`px-4 whitespace-nowrap overflow-hidden text-ellipsis ${
                filteredAds[currentAdIndex]?.url ? 'cursor-pointer hover:text-blue-300 transition-colors duration-200' : ''
              }`}
              onClick={() => filteredAds[currentAdIndex]?.url && handleAdClick(filteredAds[currentAdIndex].url)}
            >
              <div className="marquee-content">
                {filteredAds[currentAdIndex]?.text}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <span className="px-4">
              {defaultMessage.split('Sign in').map((part, i, arr) => {
                if (i === 0) {
                  return (
                    <React.Fragment key={i}>
                      {part}
                      <button 
                        onClick={handleSignIn}
                        className="text-blue-300 hover:text-blue-200 hover:underline mx-1 font-medium"
                      >
                        Sign in
                      </button>
                    </React.Fragment>
                  );
                } else if (i === arr.length - 1) {
                  return (
                    <React.Fragment key={i}>
                      {part.split('Sign up').map((subpart, j, subarr) => {
                        if (j === 0) {
                          return (
                            <React.Fragment key={j}>
                              {subpart}
                              <button 
                                onClick={handleSignUp}
                                className="text-green-300 hover:text-green-200 hover:underline mx-1 font-medium"
                              >
                                Sign up
                              </button>
                            </React.Fragment>
                          );
                        }
                        return subpart;
                      })}
                    </React.Fragment>
                  );
                }
                return part;
              })}
            </span>
          </div>
        )}
        
        {/* Connection indicator */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          {isOnline ? (
            <Wifi size={16} className="text-green-400" />
          ) : (
            <WifiOff size={16} className="text-yellow-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdMarquee;