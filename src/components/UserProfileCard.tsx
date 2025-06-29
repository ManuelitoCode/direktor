import React from 'react';
import { User, Edit3, Mail } from 'lucide-react';
import ReactCountryFlag from 'react-country-flag';

interface UserProfileCardProps {
  profile: {
    id: string;
    username: string;
    nickname?: string;
    full_name?: string;
    avatar_url?: string;
    country?: string;
    bio?: string;
  } | null;
  userEmail: string;
  onEditProfile: () => void;
}

// Map of country codes to full country names
const COUNTRY_NAMES: Record<string, string> = {
  'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'AU': 'Australia', 'NZ': 'New Zealand',
  'NG': 'Nigeria', 'GH': 'Ghana', 'KE': 'Kenya', 'ZA': 'South Africa', 'UG': 'Uganda',
  'IN': 'India', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'MY': 'Malaysia',
  'SG': 'Singapore', 'TH': 'Thailand', 'PH': 'Philippines', 'ID': 'Indonesia', 'VN': 'Vietnam',
  'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
  'BE': 'Belgium', 'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway',
  'DK': 'Denmark', 'FI': 'Finland', 'IE': 'Ireland', 'PT': 'Portugal', 'GR': 'Greece',
  'BR': 'Brazil', 'AR': 'Argentina', 'MX': 'Mexico', 'CL': 'Chile', 'CO': 'Colombia',
  'JP': 'Japan', 'KR': 'South Korea', 'CN': 'China', 'TW': 'Taiwan', 'HK': 'Hong Kong'
};

const UserProfileCard: React.FC<UserProfileCardProps> = ({ profile, userEmail, onEditProfile }) => {
  return (
    <div className="bg-gray-900/50 border border-purple-500/30 rounded-2xl p-8 backdrop-blur-lg hover:bg-gray-800/50 hover:border-purple-400/50 transition-all duration-300 group relative">
      <div className="flex flex-col items-center">
        {/* Profile Avatar */}
        <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden mb-6 relative group/avatar">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-16 h-16 text-white" />
          )}
          
          <div 
            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
            onClick={onEditProfile}
          >
            <Edit3 className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white font-orbitron mb-2">
            {profile?.full_name || profile?.username || userEmail}
          </h3>
          
          {profile?.nickname && (
            <p className="text-purple-300 font-jetbrains text-lg mb-2">
              "{profile.nickname}"
            </p>
          )}
          
          <div className="flex items-center justify-center gap-2 text-gray-400 font-jetbrains text-sm mb-2">
            <Mail className="w-4 h-4" />
            <span>{userEmail}</span>
          </div>
          
          {profile?.country && (
            <div className="flex items-center justify-center gap-2 text-gray-300 mt-3">
              <ReactCountryFlag 
                countryCode={profile.country} 
                svg 
                style={{
                  width: '1.5em',
                  height: '1.5em',
                }}
                title={`Flag: ${profile.country}`}
              />
              <span className="font-jetbrains text-sm">
                {COUNTRY_NAMES[profile.country]}
              </span>
            </div>
          )}
        </div>
        
        {/* Bio Section */}
        {profile?.bio && (
          <div className="w-full bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4">
            <p className="text-gray-300 font-jetbrains text-sm">
              {profile.bio}
            </p>
          </div>
        )}
        
        {/* Edit Button */}
        <button
          onClick={onEditProfile}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-400 hover:bg-purple-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
        >
          <Edit3 size={16} />
          Edit Profile
        </button>
      </div>
    </div>
  );
};

export default UserProfileCard;