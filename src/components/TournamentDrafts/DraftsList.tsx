import React, { useState } from 'react';
import { Trash2, Edit, Calendar, Clock, FileText } from 'lucide-react';
import { TournamentDraft } from '../../hooks/useTournamentDrafts';

interface DraftsListProps {
  drafts: TournamentDraft[];
  onEdit: (draft: TournamentDraft) => void;
  onDelete: (draftId: string) => void;
  isLoading?: boolean;
}

const DraftsList: React.FC<DraftsListProps> = ({
  drafts,
  onEdit,
  onDelete,
  isLoading = false
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDelete = (draftId: string) => {
    if (deleteConfirm === draftId) {
      onDelete(draftId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(draftId);
      setTimeout(() => setDeleteConfirm(null), 3000);
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Tournament Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Created</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Last Updated</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {drafts.map((draft) => (
            <tr key={draft.id} className="bg-gray-900/30 hover:bg-gray-800/30 transition-colors duration-200">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-white">
                  {draft.data?.name || 'Untitled Tournament'}
                </div>
                <div className="text-xs text-gray-400 font-jetbrains">
                  {draft.status === 'draft' ? 'Draft' : 'Completed'}
                </div>
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-300">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(draft.created_at)}
                </div>
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-300">
                  <Clock className="w-4 h-4 mr-2 text-gray-400" />
                  {formatDate(draft.last_updated)}
                </div>
              </td>
              
              <td className="px-4 py-4 whitespace-nowrap text-center">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(draft)}
                    className="p-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600/30 hover:text-white rounded-lg transition-all duration-200"
                    title="Edit Draft"
                  >
                    <Edit size={16} />
                  </button>
                  
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className={`p-2 rounded-lg transition-all duration-200 ${
                      deleteConfirm === draft.id
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white'
                    }`}
                    title={deleteConfirm === draft.id ? 'Confirm Delete' : 'Delete Draft'}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DraftsList;