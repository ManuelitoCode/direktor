import React from 'react';
import { FileText, Clock, Calendar, X, RefreshCw, Trash2 } from 'lucide-react';
import { TournamentDraft } from '../../hooks/useTournamentDraftSystem';
import { useAuditLog } from '../../hooks/useAuditLog';

interface DraftRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: TournamentDraft[];
  onResumeDraft: (draftId: string) => void;
  onDiscardDraft: (draftId: string) => Promise<boolean>;
  onRenameDraft?: (draftId: string, newName: string) => Promise<boolean>;
  isLoading?: boolean;
}

const DraftRecoveryDialog: React.FC<DraftRecoveryDialogProps> = ({
  isOpen,
  onClose,
  drafts,
  onResumeDraft,
  onDiscardDraft,
  onRenameDraft,
  isLoading = false
}) => {
  const { logAction } = useAuditLog();

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleResumeDraft = (draftId: string) => {
    onResumeDraft(draftId);
    
    // Log resume action
    logAction({
      action: 'draft_resumed_from_recovery',
      details: {
        draft_id: draftId
      }
    });
  };

  const handleDiscardDraft = async (draftId: string) => {
    const success = await onDiscardDraft(draftId);
    
    // Log discard action
    if (success) {
      logAction({
        action: 'draft_discarded_from_recovery',
        details: {
          draft_id: draftId
        }
      });
    }
    
    return success;
  };

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
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                Recover Drafts
              </h2>
              <p className="text-blue-300 font-jetbrains">
                Resume your saved tournament drafts
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
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : drafts.length > 0 ? (
            <div className="space-y-4">
              {drafts.map((draft) => (
                <div 
                  key={draft.id}
                  className="bg-gray-800/50 border border-gray-700 hover:border-blue-500/30 rounded-lg p-4 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-white font-orbitron mb-2">
                        {draft.name || draft.data?.name || 'Untitled Tournament'}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span title={formatDate(draft.last_updated)}>
                            Last edited {getTimeAgo(draft.last_updated)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>
                            Created {new Date(draft.created_at || draft.last_updated).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      {draft.data?.step && (
                        <div className="mt-2 px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded text-xs font-jetbrains inline-block">
                          {draft.data.step}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDiscardDraft(draft.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                      >
                        <Trash2 size={14} />
                        Discard
                      </button>
                      
                      <button
                        onClick={() => handleResumeDraft(draft.id)}
                        className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                      >
                        <RefreshCw size={14} />
                        Resume
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 font-jetbrains">No drafts found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400 font-jetbrains">
              {drafts.length} draft{drafts.length !== 1 ? 's' : ''} found
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftRecoveryDialog;