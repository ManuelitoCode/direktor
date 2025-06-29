import React, { useState, useEffect } from 'react';
import { Settings, Trophy, Award, RefreshCw, Check, AlertTriangle, Download, Upload, Save, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuditLog } from '../hooks/useAuditLog';
import { awardTournamentBadges } from '../utils/badgeAwardLogic';
import { generateTouFile } from '../utils/touExport';

interface AdminPanelProps {
  tournamentId: string;
  tournament: any;
  onTournamentUpdate: () => Promise<void>;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  tournamentId, 
  tournament, 
  onTournamentUpdate 
}) => {
  const [isProcessingBadges, setIsProcessingBadges] = useState(false);
  const [badgeProcessingComplete, setBadgeProcessingComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);
  const [isExportingTou, setIsExportingTou] = useState(false);
  
  const { logAction } = useAuditLog();

  const handleAwardBadges = async () => {
    try {
      setIsProcessingBadges(true);
      setError(null);
      setBadgeProcessingComplete(false);
      
      // Log badge processing start
      logAction({
        action: 'tournament_badge_processing_started',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name
        }
      });
      
      // Process badges
      await awardTournamentBadges(tournamentId);
      
      // Show success message
      setSuccess('Badges have been awarded successfully!');
      setBadgeProcessingComplete(true);
      
      // Log badge processing completion
      logAction({
        action: 'tournament_badge_processing_completed',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name
        }
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error awarding badges:', err);
      setError('Failed to award badges: ' + err.message);
      
      // Log badge processing error
      logAction({
        action: 'tournament_badge_processing_error',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name,
          error: err.message
        }
      });
    } finally {
      setIsProcessingBadges(false);
    }
  };

  const handleMarkTournamentComplete = async () => {
    try {
      setIsMarkingComplete(true);
      setError(null);
      
      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({
          status: 'completed',
          last_activity: new Date().toISOString()
        })
        .eq('id', tournamentId);
        
      if (updateError) throw updateError;
      
      // Process badges
      await awardTournamentBadges(tournamentId);
      
      // Show success message
      setSuccess('Tournament marked as completed and badges awarded!');
      
      // Log tournament completion
      logAction({
        action: 'tournament_marked_complete',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name
        }
      });
      
      // Update tournament data in parent component
      await onTournamentUpdate();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error marking tournament complete:', err);
      setError('Failed to mark tournament complete: ' + err.message);
      
      // Log error
      logAction({
        action: 'tournament_mark_complete_error',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name,
          error: err.message
        }
      });
    } finally {
      setIsMarkingComplete(false);
    }
  };

  const handleExportTouFile = async () => {
    try {
      setIsExportingTou(true);
      setError(null);
      
      // Log export start
      logAction({
        action: 'tournament_tou_export_started',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name
        }
      });
      
      // Generate TOU file
      const touContent = await generateTouFile(tournamentId, tournament);
      
      // Create a blob and download
      const blob = new Blob([touContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Create filename from tournament name
      const filename = tournament.slug 
        ? `${tournament.slug}.tou` 
        : `${tournament.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.tou`;
      
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      // Show success message
      setSuccess('TOU file exported successfully!');
      
      // Log export completion
      logAction({
        action: 'tournament_tou_export_completed',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name,
          filename
        }
      });
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Error exporting TOU file:', err);
      setError('Failed to export TOU file: ' + err.message);
      
      // Log error
      logAction({
        action: 'tournament_tou_export_error',
        details: {
          tournament_id: tournamentId,
          tournament_name: tournament.name,
          error: err.message
        }
      });
    } finally {
      setIsExportingTou(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Tournament Settings Section */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-400" />
          Tournament Administration
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mark Tournament Complete */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-300 font-orbitron mb-4 flex items-center gap-2">
              <Trophy size={20} />
              Complete Tournament
            </h3>
            
            <p className="text-gray-300 font-jetbrains text-sm mb-6">
              Mark this tournament as completed. This will finalize all results, award badges to players, and move the tournament to the completed state.
            </p>
            
            <button
              onClick={handleMarkTournamentComplete}
              disabled={isMarkingComplete || tournament.status === 'completed'}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              {isMarkingComplete ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Processing...
                </>
              ) : tournament.status === 'completed' ? (
                <>
                  <Check size={16} />
                  Already Completed
                </>
              ) : (
                <>
                  <Trophy size={16} />
                  Mark as Completed
                </>
              )}
            </button>
          </div>
          
          {/* Award Badges */}
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-300 font-orbitron mb-4 flex items-center gap-2">
              <Award size={20} />
              Award Badges
            </h3>
            
            <p className="text-gray-300 font-jetbrains text-sm mb-6">
              Process player achievements and award badges based on tournament performance. This can be done at any time, even if the tournament is still in progress.
            </p>
            
            <button
              onClick={handleAwardBadges}
              disabled={isProcessingBadges}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              {isProcessingBadges ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Processing...
                </>
              ) : badgeProcessingComplete ? (
                <>
                  <Check size={16} />
                  Badges Awarded
                </>
              ) : (
                <>
                  <Award size={16} />
                  Award Badges
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Export/Import Section */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
          <Download className="w-6 h-6 text-green-400" />
          Data Management
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Export Tournament Data */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-bold text-green-300 font-orbitron mb-4 flex items-center gap-2">
              <Download size={20} />
              Export Tournament Data
            </h3>
            
            <p className="text-gray-300 font-jetbrains text-sm mb-6">
              Download all tournament data including players, pairings, results, and badges in CSV format for backup or analysis.
            </p>
            
            <button
              onClick={() => {/* Export logic would go here */}}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
          
          {/* Export TOU File */}
          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-lg font-bold text-cyan-300 font-orbitron mb-4 flex items-center gap-2">
              <FileText size={20} />
              Export .TOU File
            </h3>
            
            <p className="text-gray-300 font-jetbrains text-sm mb-6">
              Generate a .TOU file compatible with rating systems like WESPA or NASPA. This file contains all player results in the required format for ratings processing.
            </p>
            
            <button
              onClick={handleExportTouFile}
              disabled={isExportingTou}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              {isExportingTou ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Export .TOU File
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Tournament Settings */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-6 flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          Tournament Settings
        </h2>
        
        <div className="space-y-6">
          {/* Tournament Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
              Tournament Name
            </label>
            <input
              type="text"
              value={tournament.name}
              readOnly
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
            />
          </div>
          
          {/* Tournament Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
              Status
            </label>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                tournament.status === 'completed' ? 'bg-green-500' :
                tournament.status === 'active' ? 'bg-blue-500' :
                tournament.status === 'paused' ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}></div>
              <span className="text-white font-jetbrains">
                {tournament.status?.charAt(0).toUpperCase() + tournament.status?.slice(1) || 'Unknown'}
              </span>
            </div>
          </div>
          
          {/* Save Settings Button */}
          <div className="flex justify-end">
            <button
              onClick={onTournamentUpdate}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;