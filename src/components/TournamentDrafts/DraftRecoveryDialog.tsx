import React from 'react';
import { FileText, Clock, Calendar, X, RefreshCw, Trash2 } from 'lucide-react';
import { TournamentDraft } from '../../hooks/useTournamentDrafts';

interface DraftRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  draft: TournamentDraft | null;
  onResume: (draft: TournamentDraft) => void;
  onDiscard: (draftId: string) => void;
  isLoading?: boolean;
}

const DraftRecoveryDialog: React.FC<DraftRecoveryDialogProps> = ({
  isOpen,
  onClose,
  draft,
  onResume,
  onDiscard,
  isLoading = false
}) => {
  if (!isOpen || !draft) return null;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-gray-900/95 backdrop-blur-lg border-2 border-blue-500/50 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-blue-500/30 bg-gradient-to-r from-blue-900/30 to-purple-900/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white font-orbitron">
                Recover Draft
              </h2>
              <p className="text-blue-300 font-jetbrains">
                Resume your saved tournament draft
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
          <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-white font-orbitron mb-4">
              {draft.data?.formData?.name || 'Untitled Tournament'}
            </h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="font-jetbrains">Last edited {getTimeAgo(draft.last_updated)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-300">
                <Calendar className="w-4 h-4 text-green-400" />
                <span className="font-jetbrains">Created on {formatDate(draft.created_at)}</span>
              </div>
              
              {draft.data?.currentStep && (
                <div className="flex items-center gap-2 text-gray-300">
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  <span className="font-jetbrains">
                    Last step: {
                      draft.data.currentStep === 'basic' ? 'Basic Information' :
                      draft.data.currentStep === 'pairing-method' ? 'Pairing Method Selection' :
                      draft.data.currentStep === 'wizard' ? 'Pairing Wizard' :
                      draft.data.currentStep === 'manual-selection' ? 'Manual Pairing Selection' :
                      'Review'
                    }
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-300 font-jetbrains text-sm">
              Would you like to resume this draft or discard it and start fresh?
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => onResume(draft)}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains font-medium transition-all duration-200"
            >
              <FileText size={16} />
              Resume Draft
            </button>
            
            <button
              onClick={() => onDiscard(draft.id)}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600 hover:text-white disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600 rounded-lg font-jetbrains font-medium transition-all duration-200"
            >
              <Trash2 size={16} />
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DraftRecoveryDialog;