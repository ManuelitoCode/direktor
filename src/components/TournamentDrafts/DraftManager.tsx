import React, { useState } from 'react';
import { FileText, Plus, RefreshCw } from 'lucide-react';
import { useTournamentDrafts, TournamentDraft } from '../../hooks/useTournamentDrafts';
import DraftsList from './DraftsList';

interface DraftManagerProps {
  onNewTournament: () => void;
  onResumeDraft: (draft: TournamentDraft) => void;
}

const DraftManager: React.FC<DraftManagerProps> = ({
  onNewTournament,
  onResumeDraft
}) => {
  const { drafts, isLoading, error, loadDrafts, deleteDraft } = useTournamentDrafts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDrafts();
    setIsRefreshing(false);
  };

  const handleDelete = async (draftId: string) => {
    await deleteDraft(draftId);
  };

  const handleEdit = (draft: TournamentDraft) => {
    onResumeDraft(draft);
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
            disabled={isRefreshing}
            className="p-2 bg-gray-800/50 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700/50 transition-all duration-200"
            title="Refresh Drafts"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={onNewTournament}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200 font-jetbrains text-sm"
          >
            <Plus size={16} />
            New Tournament
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6 text-red-300 font-jetbrains text-sm">
          {error}
        </div>
      )}

      <DraftsList
        drafts={drafts.filter(d => d.status === 'draft')}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
      />
    </div>
  );
};

export default DraftManager;