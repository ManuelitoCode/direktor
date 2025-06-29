import React, { useState } from 'react';
import { FileText, Plus, RefreshCw, AlertTriangle } from 'lucide-react';
import { useTournamentDraftSystem } from '../../hooks/useTournamentDraftSystem';
import DraftsList from './DraftsList';
import { useAuditLog } from '../../hooks/useAuditLog';

interface DraftManagerProps {
  onCreateNew: () => void;
  onResumeDraft?: (draftId: string) => void;
  showRecoveryPrompt?: boolean;
}

const DraftManager: React.FC<DraftManagerProps> = ({
  onCreateNew,
  onResumeDraft,
  showRecoveryPrompt = true
}) => {
  const { 
    drafts, 
    isLoading, 
    error, 
    isOnline,
    deleteDraft, 
    renameDraft, 
    refreshDrafts 
  } = useTournamentDraftSystem();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { logAction } = useAuditLog();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDrafts();
    setIsRefreshing(false);
    
    // Log refresh action
    logAction({
      action: 'drafts_refreshed',
      details: {
        draft_count: drafts.length
      }
    });
  };

  const handleDelete = async (draftId: string) => {
    const success = await deleteDraft(draftId);
    
    // Log delete action
    if (success) {
      logAction({
        action: 'draft_deleted',
        details: {
          draft_id: draftId
        }
      });
    }
    
    return success;
  };

  const handleRename = async (draftId: string, newName: string) => {
    const success = await renameDraft(draftId, newName);
    
    // Log rename action
    if (success) {
      logAction({
        action: 'draft_renamed',
        details: {
          draft_id: draftId,
          new_name: newName
        }
      });
    }
    
    return success;
  };

  const handleResume = (draftId: string) => {
    if (onResumeDraft) {
      onResumeDraft(draftId);
      
      // Log resume action
      logAction({
        action: 'draft_resumed',
        details: {
          draft_id: draftId
        }
      });
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-orbitron">Tournament Drafts</h3>
            <p className="text-gray-400 font-jetbrains text-sm">Resume your saved tournament drafts</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || !isOnline}
            className="p-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh Drafts"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
          >
            <Plus size={16} />
            New Tournament
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {!isOnline && (
        <div className="mb-6 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-yellow-300 font-jetbrains text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium mb-1">You're currently offline</p>
              <p>Your drafts are saved locally and will sync when you reconnect.</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}

      <DraftsList
        drafts={drafts.filter(d => d.status === 'draft')}
        onResume={handleResume}
        onDelete={handleDelete}
        onRename={handleRename}
        isLoading={isLoading}
      />
      
      {/* Empty State */}
      {!isLoading && drafts.filter(d => d.status === 'draft').length === 0 && (
        <div className="text-center py-8 bg-gray-800/30 rounded-lg border border-gray-700">
          <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-white font-orbitron mb-2">No Drafts Found</h4>
          <p className="text-gray-400 font-jetbrains mb-6">
            You don't have any saved tournament drafts.
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
          >
            <Plus size={16} />
            Create New Tournament
          </button>
        </div>
      )}
    </div>
  );
};

export default DraftManager;