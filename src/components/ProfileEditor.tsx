import React, { useState, useEffect, useRef } from 'react';
import { User, Upload, Save, X, Check, AlertTriangle, Globe, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuditLog } from '../hooks/useAuditLog';
import ReactCountryFlag from 'react-country-flag';

interface ProfileEditorProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  onProfileUpdated: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  avatar_url?: string;
  full_name?: string;
  country?: string;
  bio?: string;
  created_at?: string;
  updated_at?: string;
}

const COUNTRY_CODES: Record<string, string> = {
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

const ProfileEditor: React.FC<ProfileEditorProps> = ({
  isOpen,
  onClose,
  userId,
  userEmail,
  onProfileUpdated
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    full_name: '',
    country: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
    }
  }, [isOpen, userId]);

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, try to get existing profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results gracefully

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        throw profileError;
      }

      if (profileData) {
        // Profile exists, use it
        setProfile(profileData);
        setFormData({
          username: profileData.username || userEmail || '',
          nickname: profileData.nickname || '',
          full_name: profileData.full_name || '',
          country: profileData.country || '',
          bio: profileData.bio || ''
        });
      } else {
        // Profile doesn't exist, create it using upsert to handle race conditions
        const newProfile = {
          id: userId,
          username: userEmail || '',
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
        setFormData({
          username: createdProfile.username || '',
          nickname: createdProfile.nickname || '',
          full_name: createdProfile.full_name || '',
          country: createdProfile.country || '',
          bio: createdProfile.bio || ''
        });
      }
    } catch (err: any) {
      console.error('Error loading user profile:', err);
      
      // Provide more specific error messages
      if (err.message?.includes('Failed to fetch')) {
        setError('Unable to connect to the database. Please check your internet connection and try again.');
      } else if (err.message?.includes('CORS')) {
        setError('Database configuration error. Please contact support.');
      } else {
        setError(`Failed to load user profile: ${err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async () => {
    if (!fileInputRef.current?.files?.length) return;
    
    const file = fileInputRef.current.files[0];
    setIsUploading(true);
    setError(null);

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select an image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      
      // Log action
      logAction({
        action: 'profile_avatar_updated',
        details: {
          user_id: userId
        }
      });
      
      setSuccess('Avatar updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      
      if (err.message?.includes('Failed to fetch')) {
        setError('Unable to upload avatar. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'Failed to upload avatar');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: formData.username.trim(),
          nickname: formData.nickname.trim() || null,
          full_name: formData.full_name.trim() || null,
          country: formData.country || null,
          bio: formData.bio.trim() || null
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log action
      logAction({
        action: 'profile_updated',
        details: {
          user_id: userId
        }
      });
      
      setSuccess('Profile updated successfully!');
      setTimeout(() => {
        setSuccess(null);
        onClose();
        onProfileUpdated();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error updating profile:', err);
      
      if (err.message?.includes('Failed to fetch')) {
        setError('Unable to save profile. Please check your internet connection and try again.');
      } else {
        setError(`Failed to update profile: ${err.message || 'Unknown error occurred'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gray-900/95 backdrop-blur-lg border-2 border-blue-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-blue-500/30 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                Edit Profile
              </h2>
              <p className="text-blue-300 font-jetbrains">
                Customize your personal information
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Error/Success Messages */}
              {error && (
                <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                  </div>
                </div>
              )}
              
              {success && (
                <div className="mb-6 bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-green-300 font-jetbrains text-sm">
                  <div className="flex items-center gap-2">
                    <Check size={16} />
                    <span>{success}</span>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Avatar Section */}
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center">
                    <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center overflow-hidden mb-4 relative group">
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
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                        onClick={triggerFileInput}
                      >
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    
                    <button
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploading ? 'Uploading...' : 'Change Avatar'}
                    </button>
                  </div>
                </div>
                
                {/* Form Fields */}
                <div className="md:col-span-2 space-y-4">
                  {/* Username */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  {/* Nickname */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                      Nickname
                    </label>
                    <input
                      type="text"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                      placeholder="Enter nickname (optional)"
                    />
                  </div>
                  
                  {/* Country */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                      Country
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Globe className="h-5 w-5 text-gray-400" />
                      </div>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300 appearance-none"
                      >
                        <option value="">Select your country</option>
                        {Object.entries(COUNTRY_CODES).map(([code, name]) => (
                          <option key={code} value={code}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Bio */}
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300 resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end gap-4 mt-8">
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains transition-all duration-200"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;