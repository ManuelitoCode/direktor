import React, { useState, useRef } from 'react';
import { Upload, Check, AlertTriangle, RefreshCw, Save, X, FileText } from 'lucide-react';
import Papa from 'papaparse';
import { supabase } from '../../lib/supabase';
import { useAuditLog } from '../../hooks/useAuditLog';

interface TriumvirateTeamImportProps {
  tournamentId: string;
  onImportComplete: () => void;
}

interface ParsedTeamPlayer {
  fullName: string;
  rating: number;
  teamName: string;
  isValid: boolean;
  error?: string;
}

const TriumvirateTeamImport: React.FC<TriumvirateTeamImportProps> = ({
  tournamentId,
  onImportComplete
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTeamPlayer[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [inputMethod, setInputMethod] = useState<'csv' | 'manual'>('manual');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { logAction } = useAuditLog();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    setIsUploading(true);
    setError(null);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const parsedPlayers: ParsedTeamPlayer[] = [];
          const seenNames = new Set<string>();
          
          results.data.forEach((row: any, index) => {
            // Extract data from CSV
            const fullName = row['Full Name'] || row['Name'] || '';
            const ratingStr = row['Rating'] || '';
            const teamName = row['Team Name'] || row['Team'] || '';
            
            // Validate data
            if (!fullName) {
              parsedPlayers.push({
                fullName: '',
                rating: 0,
                teamName,
                isValid: false,
                error: 'Missing player name'
              });
              return;
            }
            
            // Check for duplicate names
            const nameLower = fullName.toLowerCase();
            if (seenNames.has(nameLower)) {
              parsedPlayers.push({
                fullName,
                rating: 0,
                teamName,
                isValid: false,
                error: 'Duplicate player name'
              });
              return;
            }
            
            // Validate rating
            const rating = parseInt(ratingStr, 10);
            if (isNaN(rating) || rating < 0 || rating > 3000) {
              parsedPlayers.push({
                fullName,
                rating: 0,
                teamName,
                isValid: false,
                error: 'Invalid rating (0-3000)'
              });
              return;
            }
            
            // Validate team name
            if (!teamName) {
              parsedPlayers.push({
                fullName,
                rating,
                teamName: '',
                isValid: false,
                error: 'Missing team name'
              });
              return;
            }
            
            seenNames.add(nameLower);
            parsedPlayers.push({
              fullName,
              rating,
              teamName,
              isValid: true
            });
          });
          
          setParsedData(parsedPlayers);
        } catch (err: any) {
          console.error('Error parsing CSV:', err);
          setError('Failed to parse CSV: ' + err.message);
        } finally {
          setIsUploading(false);
        }
      },
      error: (err) => {
        console.error('CSV parsing error:', err);
        setError('Failed to parse CSV file: ' + err.message);
        setIsUploading(false);
      }
    });
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManualInput(e.target.value);
  };

  const parseManualInput = () => {
    setIsUploading(true);
    setError(null);
    
    try {
      const lines = manualInput.split('\n').filter(line => line.trim() !== '');
      const parsedPlayers: ParsedTeamPlayer[] = [];
      const seenNames = new Set<string>();
      
      lines.forEach((line, index) => {
        // Try to parse the line in format: "Name, Rating, Team"
        const parts = line.split(',').map(part => part.trim());
        
        if (parts.length < 3) {
          parsedPlayers.push({
            fullName: line,
            rating: 0,
            teamName: '',
            isValid: false,
            error: 'Invalid format. Use: Name, Rating, Team'
          });
          return;
        }
        
        const fullName = parts[0];
        const ratingStr = parts[1];
        const teamName = parts.slice(2).join(',').trim(); // In case team name has commas
        
        // Validate name
        if (!fullName) {
          parsedPlayers.push({
            fullName: '',
            rating: 0,
            teamName,
            isValid: false,
            error: 'Missing player name'
          });
          return;
        }
        
        // Check for duplicate names
        const nameLower = fullName.toLowerCase();
        if (seenNames.has(nameLower)) {
          parsedPlayers.push({
            fullName,
            rating: 0,
            teamName,
            isValid: false,
            error: 'Duplicate player name'
          });
          return;
        }
        
        // Validate rating
        const rating = parseInt(ratingStr, 10);
        if (isNaN(rating) || rating < 0 || rating > 3000) {
          parsedPlayers.push({
            fullName,
            rating: 0,
            teamName,
            isValid: false,
            error: 'Invalid rating (0-3000)'
          });
          return;
        }
        
        // Validate team name
        if (!teamName) {
          parsedPlayers.push({
            fullName,
            rating,
            teamName: '',
            isValid: false,
            error: 'Missing team name'
          });
          return;
        }
        
        seenNames.add(nameLower);
        parsedPlayers.push({
          fullName,
          rating,
          teamName,
          isValid: true
        });
      });
      
      setParsedData(parsedPlayers);
    } catch (err: any) {
      console.error('Error parsing manual input:', err);
      setError('Failed to parse input: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setError(null);
      
      const validPlayers = parsedData.filter(p => p.isValid);
      
      if (validPlayers.length === 0) {
        setError('No valid players to import');
        return;
      }
      
      // Group players by team
      const teamPlayers = new Map<string, ParsedTeamPlayer[]>();
      
      validPlayers.forEach(player => {
        if (!teamPlayers.has(player.teamName)) {
          teamPlayers.set(player.teamName, []);
        }
        
        teamPlayers.get(player.teamName)!.push(player);
      });
      
      // Create teams first
      for (const [teamName, players] of teamPlayers.entries()) {
        // Check if team already exists
        const { data: existingTeams, error: checkError } = await supabase
          .from('teams')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('name', teamName);
          
        if (checkError) throw checkError;
        
        if (existingTeams && existingTeams.length === 0) {
          // Create new team
          const { error: createError } = await supabase
            .from('teams')
            .insert([{
              tournament_id: tournamentId,
              name: teamName
            }]);
            
          if (createError) throw createError;
        }
      }
      
      // Now create players
      for (const [teamName, players] of teamPlayers.entries()) {
        const playersToInsert = players.map(player => ({
          name: player.fullName,
          rating: player.rating,
          tournament_id: tournamentId,
          team_name: teamName,
          participation_status: 'active'
        }));
        
        const { error: insertError } = await supabase
          .from('players')
          .insert(playersToInsert);
          
        if (insertError) throw insertError;
      }
      
      // Log action
      logAction({
        action: 'triumvirate_teams_imported',
        details: {
          tournament_id: tournamentId,
          team_count: teamPlayers.size,
          player_count: validPlayers.length,
          import_method: inputMethod
        }
      });
      
      // Show success message
      setSuccess(`Successfully imported ${validPlayers.length} players across ${teamPlayers.size} teams`);
      
      // Reset form
      setCsvFile(null);
      setParsedData([]);
      setManualInput('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Notify parent component
      setTimeout(() => {
        onImportComplete();
      }, 2000);
    } catch (err: any) {
      console.error('Error importing teams:', err);
      setError('Failed to import teams: ' + err.message);
      
      // Log error
      logAction({
        action: 'triumvirate_teams_import_error',
        details: {
          tournament_id: tournamentId,
          error: err.message,
          import_method: inputMethod
        }
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancel = () => {
    setCsvFile(null);
    setParsedData([]);
    setManualInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePreviewData = () => {
    if (inputMethod === 'csv' && csvFile) {
      // CSV is already parsed on file selection
      return;
    } else if (inputMethod === 'manual' && manualInput.trim()) {
      parseManualInput();
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
      <h2 className="text-xl font-bold text-white font-orbitron mb-4 flex items-center gap-2">
        <Upload className="w-6 h-6 text-blue-400" />
        Import Teams & Players
      </h2>
      
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
      
      {/* Input Method Selector */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setInputMethod('manual')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              inputMethod === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setInputMethod('csv')}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              inputMethod === 'csv'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            CSV Upload
          </button>
        </div>
        
        {/* Manual Input */}
        {inputMethod === 'manual' && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
              Enter Players (Name, Rating, Team)
            </label>
            <textarea
              value={manualInput}
              onChange={handleManualInputChange}
              className="w-full h-64 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300 resize-none"
              placeholder="John Smith, 1750, Team Alpha
Jane Doe, 1820, Team Alpha
Bob Johnson, 1680, Team Beta
Alice Williams, 1920, Team Beta"
            />
            <p className="mt-2 text-xs text-gray-400 font-jetbrains">
              Format: Name, Rating, Team (one player per line)
            </p>
            <div className="mt-4">
              <button
                onClick={handlePreviewData}
                disabled={!manualInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains transition-all duration-200"
              >
                Preview Data
              </button>
            </div>
          </div>
        )}
        
        {/* CSV Upload */}
        {inputMethod === 'csv' && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2 font-jetbrains">
              Upload CSV File
            </label>
            
            <div className="flex items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30 file:cursor-pointer file:transition-colors file:duration-200"
              />
              
              {csvFile && (
                <button
                  onClick={handleCancel}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-all duration-200"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <p className="mt-2 text-xs text-gray-400 font-jetbrains">
              CSV should have columns: "Full Name", "Rating", "Team Name"
            </p>
          </div>
        )}
      </div>
      
      {/* Preview Table */}
      {parsedData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white font-orbitron mb-3">
            Preview ({parsedData.filter(p => p.isValid).length} valid players)
          </h3>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Player Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Rating</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Team</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {parsedData.slice(0, 10).map((player, index) => (
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
                      {player.fullName}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-white">
                      {player.isValid ? player.rating : '-'}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-white">
                      {player.teamName}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-red-400">
                      {player.error || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {parsedData.length > 10 && (
              <div className="p-2 text-center text-gray-400 text-xs font-jetbrains">
                Showing 10 of {parsedData.length} entries
              </div>
            )}
          </div>
          
          {/* Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-white font-orbitron">
                {parsedData.length}
              </div>
              <div className="text-xs text-gray-400">Total Entries</div>
            </div>
            
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-green-400 font-orbitron">
                {parsedData.filter(p => p.isValid).length}
              </div>
              <div className="text-xs text-gray-400">Valid Players</div>
            </div>
            
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
              <div className="text-xl font-bold text-red-400 font-orbitron">
                {parsedData.filter(p => !p.isValid).length}
              </div>
              <div className="text-xs text-gray-400">Errors</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Team Count Summary */}
      {parsedData.length > 0 && (
        <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-lg font-bold text-blue-300 font-orbitron mb-3">
            Team Summary
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from(new Set(parsedData.filter(p => p.isValid).map(p => p.teamName))).map(teamName => {
              const teamPlayers = parsedData.filter(p => p.isValid && p.teamName === teamName);
              return (
                <div key={teamName} className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
                  <div className="font-medium text-white mb-1">{teamName}</div>
                  <div className="text-sm text-gray-400">
                    {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Import Button */}
      {parsedData.filter(p => p.isValid).length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
          >
            {isImporting ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Save size={16} />
                Import Teams & Players
              </>
            )}
          </button>
        </div>
      )}
      
      {/* Format Help */}
      <div className="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-bold text-white font-orbitron mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Format Guidelines
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Entry Format */}
          <div>
            <h4 className="text-blue-300 font-medium font-jetbrains mb-2">Manual Entry Format</h4>
            <p className="text-gray-300 font-jetbrains text-sm mb-3">
              Enter one player per line in this format:
            </p>
            <div className="bg-gray-900/50 p-3 rounded-lg font-mono text-sm text-gray-300 overflow-x-auto">
              John Smith, 1750, Team Alpha<br />
              Jane Doe, 1820, Team Alpha<br />
              Bob Johnson, 1680, Team Beta<br />
              Alice Williams, 1920, Team Beta
            </div>
          </div>
          
          {/* CSV Format */}
          <div>
            <h4 className="text-blue-300 font-medium font-jetbrains mb-2">CSV File Format</h4>
            <p className="text-gray-300 font-jetbrains text-sm mb-3">
              Your CSV file should have these columns:
            </p>
            <div className="bg-gray-900/50 p-3 rounded-lg font-mono text-sm text-gray-300 overflow-x-auto">
              Full Name,Rating,Team Name<br />
              John Smith,1750,Team Alpha<br />
              Jane Doe,1820,Team Alpha<br />
              Bob Johnson,1680,Team Beta<br />
              Alice Williams,1920,Team Beta
            </div>
          </div>
        </div>
        
        <p className="text-gray-400 font-jetbrains text-xs mt-4">
          Note: Each team should have the same number of players for balanced matchups. Triumvirate mode requires exactly 36 teams.
        </p>
      </div>
    </div>
  );
};

export default TriumvirateTeamImport;