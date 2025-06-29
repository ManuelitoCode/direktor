import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useTournamentDraftSystem } from '../../hooks/useTournamentDraftSystem';
import DraftsList from './DraftsList';
import DashboardLayout from '../UI/DashboardLayout';
import { useAuditLog } from '../../hooks/useAuditLog';

const DraftManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { logAction } = useAuditLog();
  
  const {
    drafts,
    isLoading,
    error: draftError,
    isOnline,
    loadDraft,
    deleteDraft,
    renameDraft,
    refreshDrafts,
    syncDrafts
  } = useTournamentDraftSystem();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  useEffect(() => {
    // Log page view
    logAction({
      action: 'draft_management_page_viewed',
      details: {
        draft_count: drafts.length
      }
    });
  }, [drafts.length]);
  
  const handleBack = () => {
    navigate('/dashboard');
  };
  
  const handleResumeDraft = async (draftId: string) => {
    try {
      const draft = await loadDraft(draftId);
      if (draft) {
        // Log draft resume
        logAction({
          action: 'draft_resumed',
          details: {
            draft_id: draftId,
            draft_name: draft.name || 'Untitled Tournament'
          }
        });
        
        // Navigate to tournament setup with draft data
        navigate('/new-tournament', { state: { draftId } });
      }
    } catch (err) {
      console.error('Error resuming draft:', err);
    }
  };
  
  const handleDiscardDraft = async (draftId: string) => {
    try {
      const success = await deleteDraft(draftId);
      
      if (success) {
        // Log draft discard
        logAction({
          action: 'draft_discarded',
          details: {
            draft_id: draftId
          }
        });
      }
      
      return success;
    } catch (err) {
      console.error('Error discarding draft:', err);
      return false;
    }
  };
  
  const handleSyncDrafts = async () => {
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      await syncDrafts();
      
      // Log sync success
      logAction({
        action: 'drafts_synced_manually',
        details: {
          draft_count: drafts.length
        }
      });
    } catch (err) {
      console.error('Error syncing drafts:', err);
      setSyncError('Failed to sync drafts');
      
      // Log sync error
      logAction({
        action: 'drafts_sync_error_manual',
        details: {
          error: String(err)
        }
      });
    } finally {
      setIsSyncing(false);
    }
  };
  
  const handleCreateNew = () => {
    navigate('/new-tournament');
  };
  
  return (
    <DashboardLayout
      title="Tournament Drafts"
      subtitle="Manage your saved tournament drafts"
    >
      {/* Connection Status */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-200"
          >
            <ArrowLeft size={20} />
            <span className="font-jetbrains">← Back to Dashboard</span>
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-jetbrains">
            {isOnline ? (
              <div className="flex items-center gap-1 text-green-400">
                <Wifi size={16} />
                <span>Online</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-yellow-400">
                <WifiOff size={16} />
                <span>Offline</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncDrafts}
              disabled={isSyncing || !isOnline}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg text-sm font-jetbrains transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Syncing...' : 'Sync Drafts'}
            </button>
            
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-3 py-2 bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-white rounded-lg text-sm font-jetbrains transition-all duration-200"
            >
              <Plus size={14} />
              New Draft
            </button>
          </div>
        </div>
      </div>
      
      {/* Sync Error */}
      {syncError && (
        <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p>{syncError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Draft Error */}
      {draftError && (
        <div className="mb-6 bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p>{draftError}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Drafts List */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
        <h2 className="text-xl font-bold text-white font-orbitron mb-6">
          Saved Drafts
        </h2>
        
        <DraftsList
          drafts={drafts}
          onResume={handleResumeDraft}
          onDelete={handleDiscardDraft}
          onRename={renameDraft}
          isLoading={isLoading}
        />
      </div>
      
      {/* Info Section */}
      <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-bold text-blue-300 font-orbitron mb-4">
          About Tournament Drafts
        </h3>
        
        <div className="text-gray-300 font-jetbrains text-sm space-y-4">
          <p>
            Tournament drafts are automatically saved as you create tournaments. You can resume your work at any time, even if you close your browser or lose connection.
          </p>
          
          <p>
            When you're offline, drafts are saved locally and will sync with the server when you're back online.
          </p>
          
          <p>
            Drafts are automatically deleted when you complete tournament creation.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DraftManagementPage;