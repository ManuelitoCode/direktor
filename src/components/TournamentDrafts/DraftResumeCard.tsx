import React from 'react';
import { Clock, ArrowRight, Trash2 } from 'lucide-react';
import { TournamentDraft } from '../../hooks/useTournamentDraftSystem';

interface DraftResumeCardProps {
  draft: TournamentDraft;
  onResume: (draftId: string) => void;
  onDelete: (draftId: string) => void;
  className?: string;
}

const DraftResumeCard: React.FC<DraftResumeCardProps> = ({
  draft,
  onResume,
  onDelete,
  className = ''
}) => {
  const [isDeleteConfirm, setIsDeleteConfirm] = React.useState(false);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
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
  
  const handleDelete = () => {
    if (isDeleteConfirm) {
      onDelete(draft.id);
    } else {
      setIsDeleteConfirm(true);
      // Auto-reset after 3 seconds
      setTimeout(() => {
        setIsDeleteConfirm(false);
      }, 3000);
    }
  };
  
  return (
    <div className={`bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 ${className}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white font-orbitron mb-2">
            {draft.name || 'Untitled Tournament'}
          </h3>
          
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span title={formatDate(draft.last_updated)}>
                Last edited {getTimeSince(draft.last_updated)}
              </span>
            </div>
          </div>
          
          {draft.data.step && (
            <div className="mt-2 px-2 py-1 bg-blue-500/20 border border-blue-500/50 text-blue-400 rounded text-xs font-jetbrains inline-block">
              {draft.data.step}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleDelete}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDeleteConfirm
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-gray-700 hover:bg-red-600/30 text-gray-300 hover:text-red-300'
            }`}
            title={isDeleteConfirm ? 'Click again to confirm' : 'Delete draft'}
            aria-label={isDeleteConfirm ? 'Confirm delete' : 'Delete draft'}
          >
            <Trash2 size={16} />
          </button>
          
          <button
            onClick={() => onResume(draft.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
          >
            Resume
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DraftResumeCard;