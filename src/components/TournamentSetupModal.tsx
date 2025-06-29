import React, { useState, useEffect } from 'react';
import { X, Trophy, ArrowRight, ArrowLeft, Check, AlertTriangle, Users, Calendar, MapPin, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuditLog } from '../hooks/useAuditLog';
import { generateTournamentSlug } from '../utils/slugify';
import { createDefaultTriumvirateConfig } from '../utils/triumvirateAlgorithms';

interface TournamentSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tournamentId: string) => void;
  draftId?: string;
}

interface FormData {
  name: string;
  date: string;
  venue: string;
  rounds: number;
  divisions: number;
  teamMode: boolean;
  triumvirateMode: boolean;
}

const TournamentSetupModal: React.FC<TournamentSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  draftId
}) => {
  const [step, setStep] = useState<'basic' | 'pairing-method' | 'wizard' | 'manual-selection' | 'review'>('basic');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    date: new Date().toISOString().split('T')[0],
    venue: '',
    rounds: 7,
    divisions: 1,
    teamMode: false,
    triumvirateMode: false
  });
  const [pairingSystem, setPairingSystem] = useState<string>('swiss');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  
  const { logAction } = useAuditLog();

  useEffect(() => {
    if (isOpen && draftId) {
      loadDraft(draftId);
    } else if (isOpen) {
      // Reset form when opening without a draft
      setFormData({
        name: '',
        date: new Date().toISOString().split('T')[0],
        venue: '',
        rounds: 7,
        divisions: 1,
        teamMode: false,
        triumvirateMode: false
      });
      setStep('basic');
      setDraftLoaded(false);
    }
  }, [isOpen, draftId]);

  const loadDraft = async (draftId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('tournament_drafts')
        .select('*')
        .eq('id', draftId)
        .single();
        
      if (error) throw error;
      
      if (data && data.data) {
        // Restore form data from draft
        setFormData({
          name: data.data.name || '',
          date: data.data.date || new Date().toISOString().split('T')[0],
          venue: data.data.venue || '',
          rounds: data.data.rounds || 7,
          divisions: data.data.divisions || 1,
          teamMode: data.data.teamMode || false,
          triumvirateMode: data.data.triumvirateMode || false
        });
        
        setPairingSystem(data.data.pairingSystem || 'swiss');
        setStep(data.data.step || 'basic');
        setDraftLoaded(true);
        
        // Log draft loaded
        logAction({
          action: 'tournament_draft_loaded',
          details: {
            draft_id: draftId,
            draft_name: data.data.name || 'Untitled Tournament'
          }
        });
      }
    } catch (err: any) {
      console.error('Error loading draft:', err);
      setError('Failed to load draft: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'rounds' || name === 'divisions') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => {
      // If turning on triumvirateMode, also turn on teamMode and set rounds to 30
      if (name === 'triumvirateMode' && checked) {
        return { 
          ...prev, 
          [name]: checked, 
          teamMode: true,
          rounds: 30
        };
      }
      
      // If turning off teamMode, also turn off triumvirateMode
      if (name === 'teamMode' && !checked) {
        return { ...prev, [name]: checked, triumvirateMode: false };
      }
      
      return { ...prev, [name]: checked };
    });
  };

  const validateBasicInfo = (): boolean => {
    if (!formData.name.trim()) {
      setError('Tournament name is required');
      return false;
    }
    
    if (formData.rounds < 1) {
      setError('Tournament must have at least 1 round');
      return false;
    }
    
    if (formData.divisions < 1) {
      setError('Tournament must have at least 1 division');
      return false;
    }
    
    // If triumvirate mode is enabled, validate specific requirements
    if (formData.triumvirateMode) {
      if (formData.rounds !== 30) {
        setError('Triumvirate mode requires exactly 30 rounds');
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    setError(null);
    
    if (step === 'basic') {
      if (!validateBasicInfo()) return;
      
      // If triumvirate mode is enabled, skip to review
      if (formData.triumvirateMode) {
        setStep('review');
        return;
      }
      
      setStep('pairing-method');
    } else if (step === 'pairing-method') {
      setStep('review');
    }
  };

  const handleBack = () => {
    setError(null);
    
    if (step === 'pairing-method') {
      setStep('basic');
    } else if (step === 'review') {
      // If triumvirate mode is enabled, go back to basic
      if (formData.triumvirateMode) {
        setStep('basic');
        return;
      }
      
      setStep('pairing-method');
    }
  };

  const handleCreateTournament = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be signed in to create a tournament');
      }
      
      // Generate slug
      const slug = generateTournamentSlug(formData.name);
      
      // Create tournament
      const tournamentData: any = {
        name: formData.name,
        date: formData.date || null,
        venue: formData.venue || null,
        rounds: formData.rounds,
        divisions: formData.divisions,
        director_id: user.id,
        current_round: 1,
        status: 'setup',
        team_mode: formData.teamMode,
        pairing_system: pairingSystem,
        slug
      };
      
      // Add triumvirate mode fields if enabled
      if (formData.triumvirateMode) {
        tournamentData.triumvirate_mode = true;
        tournamentData.triumvirate_phase = 1;
        tournamentData.triumvirate_config = createDefaultTriumvirateConfig();
        tournamentData.pairing_system = 'triumvirate';
      }
      
      const { data: tournament, error: createError } = await supabase
        .from('tournaments')
        .insert([tournamentData])
        .select()
        .single();
        
      if (createError) throw createError;
      
      // Log tournament creation
      logAction({
        action: 'tournament_created',
        details: {
          tournament_id: tournament.id,
          tournament_name: tournament.name,
          team_mode: formData.teamMode,
          triumvirate_mode: formData.triumvirateMode,
          pairing_system: pairingSystem
        }
      });
      
      // If draft was used, mark it as completed
      if (draftId) {
        await supabase
          .from('tournament_drafts')
          .update({ status: 'completed' })
          .eq('id', draftId);
          
        // Log draft completion
        logAction({
          action: 'tournament_draft_completed',
          details: {
            draft_id: draftId,
            tournament_id: tournament.id
          }
        });
      }
      
      // Call success callback
      onSuccess(tournament.id);
    } catch (err: any) {
      console.error('Error creating tournament:', err);
      setError('Failed to create tournament: ' + err.message);
      
      // Log error
      logAction({
        action: 'tournament_creation_error',
        details: {
          error: err.message,
          form_data: { ...formData, pairingSystem }
        }
      });
    } finally {
      setIsLoading(false);
    }
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
      <div className="relative w-full max-w-3xl bg-gray-900/95 backdrop-blur-lg border-2 border-blue-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-blue-500/30 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                {draftLoaded ? 'Resume Tournament Setup' : 'Create New Tournament'}
              </h2>
              <p className="text-blue-300 font-jetbrains">
                {step === 'basic' && 'Basic Information'}
                {step === 'pairing-method' && 'Pairing Method'}
                {step === 'review' && 'Review & Create'}
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
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'basic' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
                }`}>
                  {step === 'basic' ? '1' : <Check size={16} />}
                </div>
                <span className={`text-sm font-jetbrains ${
                  step === 'basic' ? 'text-blue-400' : 'text-green-400'
                }`}>
                  Basic Info
                </span>
              </div>
              
              <div className="h-1 flex-1 mx-2 bg-gray-700">
                <div className={`h-full bg-blue-500 transition-all duration-300 ${
                  step === 'basic' ? 'w-0' : 'w-full'
                }`} />
              </div>
              
              {!formData.triumvirateMode && (
                <>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step === 'pairing-method' 
                        ? 'bg-blue-500 text-white' 
                        : step === 'review' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {step === 'pairing-method' ? '2' : step === 'review' ? <Check size={16} /> : '2'}
                    </div>
                    <span className={`text-sm font-jetbrains ${
                      step === 'pairing-method' 
                        ? 'text-blue-400' 
                        : step === 'review' 
                        ? 'text-green-400' 
                        : 'text-gray-400'
                    }`}>
                      Pairing Method
                    </span>
                  </div>
                  
                  <div className="h-1 flex-1 mx-2 bg-gray-700">
                    <div className={`h-full bg-blue-500 transition-all duration-300 ${
                      step === 'review' ? 'w-full' : 'w-0'
                    }`} />
                  </div>
                </>
              )}
              
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === 'review' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400'
                }`}>
                  {formData.triumvirateMode ? '2' : '3'}
                </div>
                <span className={`text-sm font-jetbrains ${
                  step === 'review' ? 'text-blue-400' : 'text-gray-400'
                }`}>
                  Review
                </span>
              </div>
            </div>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info Step */}
          {step === 'basic' && (
            <div className="space-y-6">
              {/* Tournament Name */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                  Tournament Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  placeholder="Enter tournament name"
                />
              </div>
              
              {/* Date & Venue */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                    Venue
                  </label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                    placeholder="Enter venue name"
                  />
                </div>
              </div>
              
              {/* Rounds & Divisions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                    Number of Rounds *
                  </label>
                  <input
                    type="number"
                    name="rounds"
                    value={formData.rounds}
                    onChange={handleInputChange}
                    min="1"
                    max="100"
                    disabled={formData.triumvirateMode}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300 disabled:bg-gray-700 disabled:text-gray-500"
                  />
                  {formData.triumvirateMode && (
                    <p className="mt-1 text-xs text-yellow-400 font-jetbrains">
                      Fixed at 30 rounds for Triumvirate Mode
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                    Number of Divisions *
                  </label>
                  <input
                    type="number"
                    name="divisions"
                    value={formData.divisions}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  />
                </div>
              </div>
              
              {/* Tournament Mode */}
              <div className="space-y-4">
                <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
                  Tournament Mode
                </label>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="teamMode"
                    name="teamMode"
                    checked={formData.teamMode}
                    onChange={(e) => handleCheckboxChange('teamMode', e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-offset-gray-800"
                  />
                  <label htmlFor="teamMode" className="text-white font-jetbrains">
                    Team Tournament
                  </label>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="triumvirateMode"
                    name="triumvirateMode"
                    checked={formData.triumvirateMode}
                    onChange={(e) => handleCheckboxChange('triumvirateMode', e.target.checked)}
                    disabled={!formData.teamMode}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-offset-gray-800 disabled:opacity-50"
                  />
                  <label 
                    htmlFor="triumvirateMode" 
                    className={`font-jetbrains ${formData.teamMode ? 'text-white' : 'text-gray-500'}`}
                  >
                    Triumvirate Mode (36 teams, 30 rounds, 2 phases)
                  </label>
                </div>
                
                {formData.triumvirateMode && (
                  <div className="mt-4 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-purple-300 font-medium font-jetbrains mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Triumvirate Mode Enabled
                    </h4>
                    <p className="text-gray-300 text-sm font-jetbrains">
                      This special format divides 36 teams into 6 groups for a 30-round tournament with two distinct phases.
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-gray-400 font-jetbrains">
                      <li>• Phase 1 (Rounds 1-15): Cross-group play</li>
                      <li>• Phase 2 (Rounds 16-30): Final placement groups</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pairing Method Step */}
          {step === 'pairing-method' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white font-orbitron mb-4">
                Select Pairing Method
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Swiss System */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    pairingSystem === 'swiss' 
                      ? 'bg-blue-900/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setPairingSystem('swiss')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold font-jetbrains">Swiss System</h4>
                    {pairingSystem === 'swiss' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Standard pairing system that matches players with similar records
                  </p>
                </div>
                
                {/* King of the Hill */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    pairingSystem === 'king-of-hill' 
                      ? 'bg-blue-900/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setPairingSystem('king-of-hill')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold font-jetbrains">King of the Hill</h4>
                    {pairingSystem === 'king-of-hill' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Pairs top players against bottom players for maximum spread
                  </p>
                </div>
                
                {/* Fonte-Swiss */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    pairingSystem === 'fonte-swiss' 
                      ? 'bg-blue-900/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setPairingSystem('fonte-swiss')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold font-jetbrains">Fonte-Swiss</h4>
                    {pairingSystem === 'fonte-swiss' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Modified Swiss that pairs within score groups for better accuracy
                  </p>
                </div>
                
                {/* Round Robin */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    pairingSystem === 'round-robin' 
                      ? 'bg-blue-900/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setPairingSystem('round-robin')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold font-jetbrains">Round Robin</h4>
                    {pairingSystem === 'round-robin' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Everyone plays everyone once (best for small tournaments)
                  </p>
                </div>
                
                {/* Team Round Robin */}
                {formData.teamMode && (
                  <div 
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      pairingSystem === 'team-round-robin' 
                        ? 'bg-blue-900/20 border-blue-500' 
                        : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                    }`}
                    onClick={() => setPairingSystem('team-round-robin')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-white font-bold font-jetbrains">Team Round Robin</h4>
                      {pairingSystem === 'team-round-robin' && (
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      Each team plays every other team once
                    </p>
                  </div>
                )}
                
                {/* Manual Pairing */}
                <div 
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    pairingSystem === 'manual' 
                      ? 'bg-blue-900/20 border-blue-500' 
                      : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                  }`}
                  onClick={() => setPairingSystem('manual')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold font-jetbrains">Manual Pairing</h4>
                    {pairingSystem === 'manual' && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    Create your own pairings manually for each round
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white font-orbitron mb-4">
                Review Tournament Details
              </h3>
              
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white font-orbitron">
                      {formData.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-1">
                      {formData.date && (
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span className="font-jetbrains">
                            {new Date(formData.date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      {formData.venue && (
                        <div className="flex items-center gap-1">
                          <MapPin size={14} />
                          <span className="font-jetbrains">{formData.venue}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-gray-400 mb-2 font-jetbrains">
                      Tournament Structure
                    </h5>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-gray-400">Rounds:</span>
                        <span className="text-white font-medium">{formData.rounds}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-400">Divisions:</span>
                        <span className="text-white font-medium">{formData.divisions}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-gray-400">Tournament Type:</span>
                        <span className="text-white font-medium">
                          {formData.triumvirateMode 
                            ? 'Triumvirate Team Tournament' 
                            : formData.teamMode 
                            ? 'Team Tournament' 
                            : 'Individual Tournament'}
                        </span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-400 mb-2 font-jetbrains">
                      Pairing Settings
                    </h5>
                    <ul className="space-y-2 text-sm">
                      <li className="flex justify-between">
                        <span className="text-gray-400">Pairing System:</span>
                        <span className="text-white font-medium">
                          {formData.triumvirateMode 
                            ? 'Triumvirate' 
                            : pairingSystem.charAt(0).toUpperCase() + pairingSystem.slice(1).replace('-', ' ')}
                        </span>
                      </li>
                      {formData.triumvirateMode && (
                        <>
                          <li className="flex justify-between">
                            <span className="text-gray-400">Phase 1:</span>
                            <span className="text-white font-medium">15 rounds (cross-group)</span>
                          </li>
                          <li className="flex justify-between">
                            <span className="text-gray-400">Phase 2:</span>
                            <span className="text-white font-medium">15 rounds (placement)</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
                
                {/* Triumvirate Mode Notice */}
                {formData.triumvirateMode && (
                  <div className="mt-6 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                    <h4 className="text-purple-300 font-medium font-jetbrains mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Triumvirate Mode Configuration
                    </h4>
                    <p className="text-gray-300 text-sm font-jetbrains">
                      Your tournament will be set up with 6 groups of 6 teams each. You'll need to register exactly 36 teams.
                    </p>
                    <p className="text-gray-300 text-sm font-jetbrains mt-1">
                      After Phase 1 (rounds 1-15), teams will be regrouped based on their standings for Phase 2 (rounds 16-30).
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            {step !== 'basic' ? (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains transition-all duration-200"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div></div> // Empty div to maintain layout
            )}
            
            {step !== 'review' ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains transition-all duration-200"
              >
                Next
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleCreateTournament}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Trophy size={16} />
                    Create Tournament
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentSetupModal;