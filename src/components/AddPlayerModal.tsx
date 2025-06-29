import React, { useState, useEffect } from 'react';
import { X, Save, User, UserCheck, AlertTriangle, Upload, RefreshCw, Check, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Team } from '../types/database';
import { parsePlayerInput } from '../utils/playerParser';
import TeamLogo from './TeamLogo';
import Papa from 'papaparse';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayerAdded: () => void;
  tournamentId: string;
  teamMode?: boolean;
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  onPlayerAdded,
  tournamentId,
  teamMode = false
}) => {
  const [playerName, setPlayerName] = useState('');
  const [playerRating, setPlayerRating] = useState<number>(1500);
  const [teamName, setTeamName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inputMethod, setInputMethod] = useState<'single' | 'bulk' | 'csv'>('single');
  const [bulkInput, setBulkInput] = useState('');
  const [parsedPlayers, setParsedPlayers] = useState<any[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);

  useEffect(() => {
    if (isOpen && teamMode) {
      loadTeams();
    }
  }, [isOpen, teamMode]);

  const loadTeams = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('name');
        
      if (error) throw error;
      
      setTeams(data || []);
    } catch (err: any) {
      console.error('Error loading teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Player name is required');
      return;
    }
    
    if (isNaN(playerRating) || playerRating < 0 || playerRating > 3000) {
      setError('Rating must be between 0 and 3000');
      return;
    }
    
    if (teamMode && !teamName) {
      setError('Team selection is required for team tournaments');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{
          name: playerName.trim(),
          rating: playerRating,
          tournament_id: tournamentId,
          team_name: teamMode ? teamName : undefined,
          participation_status: 'active'
        }])
        .select();
        
      if (error) throw error;
      
      // Success
      setPlayerName('');
      setPlayerRating(1500);
      setTeamName('');
      
      // Show success toast
      setSuccess('Player added successfully');
      setTimeout(() => setSuccess(null), 3000);
      
      onPlayerAdded();
    } catch (err: any) {
      console.error('Error adding player:', err);
      setError(err.message || 'Failed to add player');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewBulkInput = () => {
    if (!bulkInput.trim()) {
      setError('Please enter player data');
      return;
    }
    
    setError(null);
    const players = parsePlayerInput(bulkInput, teamMode);
    setParsedPlayers(players);
  };

  const handleSubmitBulk = async () => {
    const validPlayers = parsedPlayers.filter(p => p.isValid);
    
    if (validPlayers.length === 0) {
      setError('No valid players to add');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const playersToInsert = validPlayers.map(player => ({
        name: player.name,
        rating: player.rating,
        tournament_id: tournamentId,
        team_name: teamMode ? player.team_name : undefined,
        participation_status: 'active'
      }));
      
      const { error } = await supabase
        .from('players')
        .insert(playersToInsert);
        
      if (error) throw error;
      
      // Success
      setBulkInput('');
      setParsedPlayers([]);
      
      // Show success toast
      setSuccess(`Successfully added ${validPlayers.length} players`);
      setTimeout(() => setSuccess(null), 3000);
      
      onPlayerAdded();
    } catch (err: any) {
      console.error('Error adding players:', err);
      setError(err.message || 'Failed to add players');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    setIsParsingCsv(true);
    setError(null);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedPlayers: any[] = [];
          const seenNames = new Set<string>();
          
          results.data.forEach((row: any, index) => {
            // Try to extract data from CSV
            const name = row['Name'] || row['Player'] || row['Player Name'] || '';
            const ratingStr = row['Rating'] || '';
            const teamNameFromCsv = teamMode ? (row['Team'] || row['Team Name'] || '') : '';
            
            // Validate data
            if (!name) {
              parsedPlayers.push({
                name: '',
                rating: 0,
                team_name: teamNameFromCsv,
                isValid: false,
                error: 'Missing player name'
              });
              return;
            }
            
            // Check for duplicate names
            const nameLower = name.toLowerCase();
            if (seenNames.has(nameLower)) {
              parsedPlayers.push({
                name,
                rating: 0,
                team_name: teamNameFromCsv,
                isValid: false,
                error: 'Duplicate player name'
              });
              return;
            }
            
            // Validate rating
            const rating = parseInt(ratingStr, 10);
            if (isNaN(rating) || rating < 0 || rating > 3000) {
              parsedPlayers.push({
                name,
                rating: 0,
                team_name: teamNameFromCsv,
                isValid: false,
                error: 'Invalid rating (0-3000)'
              });
              return;
            }
            
            // Validate team name for team mode
            if (teamMode && !teamNameFromCsv) {
              parsedPlayers.push({
                name,
                rating,
                team_name: '',
                isValid: false,
                error: 'Missing team name'
              });
              return;
            }
            
            seenNames.add(nameLower);
            parsedPlayers.push({
              name,
              rating,
              team_name: teamNameFromCsv,
              isValid: true
            });
          });
          
          setParsedPlayers(parsedPlayers);
        } catch (err: any) {
          console.error('Error parsing CSV:', err);
          setError('Failed to parse CSV: ' + err.message);
        } finally {
          setIsParsingCsv(false);
        }
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setError('Failed to parse CSV file: ' + err.message);
        setIsParsingCsv(false);
      }
    });
  };

  const handleSubmitCsv = async () => {
    const validPlayers = parsedPlayers.filter(p => p.isValid);
    
    if (validPlayers.length === 0) {
      setError('No valid players to add');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const playersToInsert = validPlayers.map(player => ({
        name: player.name,
        rating: player.rating,
        tournament_id: tournamentId,
        team_name: teamMode ? player.team_name : undefined,
        participation_status: 'active'
      }));
      
      const { error } = await supabase
        .from('players')
        .insert(playersToInsert);
        
      if (error) throw error;
      
      // Success
      setCsvFile(null);
      setParsedPlayers([]);
      
      // Show success toast
      setSuccess(`Successfully added ${validPlayers.length} players`);
      setTimeout(() => setSuccess(null), 3000);
      
      onPlayerAdded();
    } catch (err: any) {
      console.error('Error adding players from CSV:', err);
      setError(err.message || 'Failed to add players');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setPlayerName('');
    setPlayerRating(1500);
    setTeamName('');
    setBulkInput('');
    setParsedPlayers([]);
    setCsvFile(null);
    setError(null);
    setSuccess(null);
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
      <div className="relative w-full max-w-3xl bg-gray-900/95 backdrop-blur-lg border-2 border-green-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-green-500/30 bg-gradient-to-r from-green-900/30 to-blue-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              {teamMode ? (
                <UserCheck className="w-6 h-6 text-white" />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                Add Players
              </h2>
              <p className="text-green-300 font-jetbrains">
                {teamMode ? 'Add players to team roster' : 'Add players to tournament'}
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
          {/* Error/Success Messages */}
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
          
          {success && (
            <div className="mb-6 bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-green-300 font-jetbrains text-sm">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p>{success}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Input Method Selector */}
          <div className="mb-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => {
                  setInputMethod('single');
                  resetForm();
                }}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  inputMethod === 'single'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Single Player
              </button>
              <button
                onClick={() => {
                  setInputMethod('bulk');
                  resetForm();
                }}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  inputMethod === 'bulk'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Bulk Import
              </button>
              <button
                onClick={() => {
                  setInputMethod('csv');
                  resetForm();
                }}
                className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                  inputMethod === 'csv'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                CSV Upload
              </button>
            </div>
          </div>
          
          {/* Single Player Form */}
          {inputMethod === 'single' && (
            <form onSubmit={handleSubmitSingle} className="space-y-6">
              {/* Player Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                  Player Name *
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-jetbrains"
                  placeholder="Enter player name"
                />
              </div>
              
              {/* Player Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                  Rating *
                </label>
                <input
                  type="number"
                  min="0"
                  max="3000"
                  value={playerRating}
                  onChange={(e) => setPlayerRating(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-jetbrains"
                  placeholder="Enter player rating"
                />
              </div>
              
              {/* Team Selection (Team Mode Only) */}
              {teamMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                    Team *
                  </label>
                  <select
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-jetbrains"
                  >
                    <option value="">Select a team</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Add Player
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          
          {/* Bulk Import Form */}
          {inputMethod === 'bulk' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                  {teamMode ? 'Enter Players (Name, Rating, Team)' : 'Enter Players (Name, Rating)'}
                </label>
                <textarea
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-64 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 font-jetbrains resize-none"
                  placeholder={teamMode 
                    ? "John Smith, 1750, Team Alpha\nJane Doe, 1820, Team Alpha\nBob Johnson, 1680, Team Beta" 
                    : "John Smith, 1750\nJane Doe, 1820\nBob Johnson, 1680"}
                />
                <p className="mt-2 text-xs text-gray-400 font-jetbrains">
                  {teamMode 
                    ? "Format: Name, Rating, Team (one player per line)" 
                    : "Format: Name, Rating (one player per line)"}
                </p>
              </div>
              
              {/* Preview Button */}
              {parsedPlayers.length === 0 && (
                <div className="flex justify-end">
                  <button
                    onClick={handlePreviewBulkInput}
                    disabled={!bulkInput.trim()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                  >
                    <Eye size={16} />
                    Preview Players
                  </button>
                </div>
              )}
              
              {/* Preview Table */}
              {parsedPlayers.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-3">
                    Preview ({parsedPlayers.filter(p => p.isValid).length} valid players)
                  </h3>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-x-auto mb-4">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rating</th>
                          {teamMode && (
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Team</th>
                          )}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {parsedPlayers.map((player, index) => (
                          <tr 
                            key={index} 
                            className={`${
                              player.isValid 
                                ? 'bg-gray-800/30' 
                                : 'bg-red-900/20 border-red-500/30'
                            }`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              {player.isValid ? (
                                <Check className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-white">
                              {player.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-white">
                              {player.isValid ? player.rating : '-'}
                            </td>
                            {teamMode && (
                              <td className="px-4 py-2 whitespace-nowrap text-white">
                                {player.team_name}
                              </td>
                            )}
                            <td className="px-4 py-2 whitespace-nowrap text-red-400">
                              {player.error || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-white font-orbitron">
                        {parsedPlayers.length}
                      </div>
                      <div className="text-xs text-gray-400">Total Entries</div>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-green-400 font-orbitron">
                        {parsedPlayers.filter(p => p.isValid).length}
                      </div>
                      <div className="text-xs text-gray-400">Valid Players</div>
                    </div>
                    
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-red-400 font-orbitron">
                        {parsedPlayers.filter(p => !p.isValid).length}
                      </div>
                      <div className="text-xs text-gray-400">Errors</div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setParsedPlayers([]);
                        setBulkInput('');
                      }}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                    >
                      Reset
                    </button>
                    
                    <button
                      onClick={handleSubmitBulk}
                      disabled={isSaving || parsedPlayers.filter(p => p.isValid).length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Adding Players...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Add {parsedPlayers.filter(p => p.isValid).length} Players
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* CSV Upload Form */}
          {inputMethod === 'csv' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                  Upload CSV File
                </label>
                
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 file:cursor-pointer file:transition-colors file:duration-200"
                  />
                  
                  {csvFile && (
                    <button
                      onClick={() => {
                        setCsvFile(null);
                        setParsedPlayers([]);
                      }}
                      className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <p className="mt-2 text-xs text-gray-400 font-jetbrains">
                  {teamMode 
                    ? "CSV should have columns: 'Name', 'Rating', 'Team'" 
                    : "CSV should have columns: 'Name', 'Rating'"}
                </p>
              </div>
              
              {/* CSV Preview */}
              {isParsingCsv ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              ) : parsedPlayers.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-white font-orbitron mb-3">
                    Preview ({parsedPlayers.filter(p => p.isValid).length} valid players)
                  </h3>
                  
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-x-auto mb-4">
                    <table className="w-full">
                      <thead className="bg-gray-700/50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rating</th>
                          {teamMode && (
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Team</th>
                          )}
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {parsedPlayers.slice(0, 10).map((player, index) => (
                          <tr 
                            key={index} 
                            className={`${
                              player.isValid 
                                ? 'bg-gray-800/30' 
                                : 'bg-red-900/20 border-red-500/30'
                            }`}
                          >
                            <td className="px-4 py-2 whitespace-nowrap">
                              {player.isValid ? (
                                <Check className="w-5 h-5 text-green-400" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                              )}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-white">
                              {player.name}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-white">
                              {player.isValid ? player.rating : '-'}
                            </td>
                            {teamMode && (
                              <td className="px-4 py-2 whitespace-nowrap text-white">
                                {player.team_name}
                              </td>
                            )}
                            <td className="px-4 py-2 whitespace-nowrap text-red-400">
                              {player.error || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {parsedPlayers.length > 10 && (
                      <div className="p-2 text-center text-gray-400 text-xs font-jetbrains">
                        Showing 10 of {parsedPlayers.length} entries
                      </div>
                    )}
                  </div>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-white font-orbitron">
                        {parsedPlayers.length}
                      </div>
                      <div className="text-xs text-gray-400">Total Entries</div>
                    </div>
                    
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-green-400 font-orbitron">
                        {parsedPlayers.filter(p => p.isValid).length}
                      </div>
                      <div className="text-xs text-gray-400">Valid Players</div>
                    </div>
                    
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-red-400 font-orbitron">
                        {parsedPlayers.filter(p => !p.isValid).length}
                      </div>
                      <div className="text-xs text-gray-400">Errors</div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setParsedPlayers([]);
                        setCsvFile(null);
                      }}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                    >
                      Reset
                    </button>
                    
                    <button
                      onClick={handleSubmitCsv}
                      disabled={isSaving || parsedPlayers.filter(p => p.isValid).length === 0}
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
                    >
                      {isSaving ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Adding Players...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Add {parsedPlayers.filter(p => p.isValid).length} Players
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* CSV Format Help */}
              {parsedPlayers.length === 0 && !isParsingCsv && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white font-orbitron mb-3">
                    CSV Format Example
                  </h3>
                  <div className="bg-gray-900/50 p-3 rounded-lg font-mono text-sm text-gray-300 overflow-x-auto">
                    {teamMode ? (
                      <>
                        Name,Rating,Team<br />
                        John Smith,1750,Team Alpha<br />
                        Jane Doe,1820,Team Alpha<br />
                        Bob Johnson,1680,Team Beta
                      </>
                    ) : (
                      <>
                        Name,Rating<br />
                        John Smith,1750<br />
                        Jane Doe,1820<br />
                        Bob Johnson,1680
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPlayerModal;