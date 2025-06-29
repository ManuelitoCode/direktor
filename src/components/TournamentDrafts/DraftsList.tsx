import React, { useState } from 'react';
import { Trash2, Edit, Calendar, Clock, FileText, Check, X, Pencil } from 'lucide-react';
import { TournamentDraft } from '../../hooks/useTournamentDraftSystem';

interface DraftsListProps {
  drafts: TournamentDraft[];
  onResume?: (draftId: string) => void;
  onDelete: (draftId: string) => Promise<boolean>;
  onRename?: (draftId: string, newName: string) => Promise<boolean>;
  isLoading?: boolean;
}

const DraftsList: React.FC<DraftsListProps> = ({
  drafts,
  onResume,
  onDelete,
  onRename,
  isLoading = false
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHour > 0) return `${diffHour}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return 'Just now';
  };

  const handleDelete = async (draftId: string) => {
    if (deleteConfirm !== draftId) {
      setDeleteConfirm(draftId);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }

    try {
      const success = await onDelete(draftId);
      if (!success) {
        throw new Error('Failed to delete draft');
      }
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      setError(err.message || 'Failed to delete draft');
    }
  };

  const handleStartRename = (draft: TournamentDraft) => {
    setEditingDraft(draft.id);
    setNewName(draft.name || draft.data?.name || 'Untitled Tournament');
    setError(null);
  };

  const handleCancelRename = () => {
    setEditingDraft(null);
    setNewName('');
    setError(null);
  };

  const handleSaveRename = async (draftId: string) => {
    if (!newName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    if (!onRename) {
      setEditingDraft(null);
      return;
    }

    try {
      setIsRenaming(true);
      const success = await onRename(draftId, newName.trim());
      if (!success) {
        throw new Error('Failed to rename draft');
      }
      setEditingDraft(null);
    } catch (err: any) {
      console.error('Error renaming draft:', err);
      setError(err.message || 'Failed to rename draft');
    } finally {
      setIsRenaming(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-800/50 rounded-lg border border-gray-700">
        <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <p className="text-gray-400 font-jetbrains">No drafts found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}
      
      {drafts.map((draft) => (
        <div 
          key={draft.id}
          className="bg-gray-800/50 border border-gray-700 hover:border-blue-500/30 rounded-lg p-4 transition-all duration-200"
        >
          {editingDraft === draft.id ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 font-jetbrains">
                  Draft Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-jetbrains focus:border-blue-500 focus:outline-none transition-colors duration-300"
                  placeholder="Enter draft name"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelRename}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                >
                  <X size={14} />
                  Cancel
                </button>
                
                <button
                  onClick={() => handleSaveRename(draft.id)}
                  disabled={isRenaming}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                >
                  {isRenaming ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white font-orbitron mb-2">
                  {draft.name || draft.data?.name || 'Untitled Tournament'}
                </h3>
                
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span title={formatDate(draft.last_updated)}>
                      Last edited {getTimeSince(draft.last_updated)}
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
                {onRename && (
                  <button
                    onClick={() => handleStartRename(draft)}
                    className="p-2 bg-gray-700 hover:bg-blue-600/30 text-gray-300 hover:text-blue-300 rounded-lg transition-all duration-200"
                    title="Rename draft"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                
                <button
                  onClick={() => handleDelete(draft.id)}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    deleteConfirm === draft.id
                      ? 'bg-red-600 text-white animate-pulse'
                      : 'bg-gray-700 hover:bg-red-600/30 text-gray-300 hover:text-red-300'
                  }`}
                  title={deleteConfirm === draft.id ? 'Click again to confirm' : 'Delete draft'}
                >
                  <Trash2 size={16} />
                </button>
                
                {onResume && (
                  <button
                    onClick={() => onResume(draft.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                  >
                    Resume
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DraftsList;