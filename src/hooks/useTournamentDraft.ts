import { useState, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';

interface TournamentDraft {
  id: string;
  name: string;
  date: string;
  venue?: string;
  rounds: number;
  divisions: number;
  teamMode: boolean;
  lastUpdated: string;
  step: string;
  data: Record<string, any>;
}

export function useTournamentDraft() {
  const [drafts, setDrafts] = useState<TournamentDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      setIsLoading(true);
      const savedDrafts = await get('tournament-drafts') || [];
      setDrafts(savedDrafts);
    } catch (err) {
      console.error('Error loading tournament drafts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraft = async (draft: Omit<TournamentDraft, 'lastUpdated'>) => {
    try {
      const updatedDraft = {
        ...draft,
        lastUpdated: new Date().toISOString()
      };
      
      const currentDrafts = await get('tournament-drafts') || [];
      const existingIndex = currentDrafts.findIndex((d: TournamentDraft) => d.id === draft.id);
      
      let newDrafts;
      if (existingIndex >= 0) {
        // Update existing draft
        newDrafts = [
          ...currentDrafts.slice(0, existingIndex),
          updatedDraft,
          ...currentDrafts.slice(existingIndex + 1)
        ];
      } else {
        // Add new draft
        newDrafts = [...currentDrafts, updatedDraft];
      }
      
      await set('tournament-drafts', newDrafts);
      setDrafts(newDrafts);
      return true;
    } catch (err) {
      console.error('Error saving tournament draft:', err);
      return false;
    }
  };

  const deleteDraft = async (draftId: string) => {
    try {
      const currentDrafts = await get('tournament-drafts') || [];
      const newDrafts = currentDrafts.filter((d: TournamentDraft) => d.id !== draftId);
      await set('tournament-drafts', newDrafts);
      setDrafts(newDrafts);
      return true;
    } catch (err) {
      console.error('Error deleting tournament draft:', err);
      return false;
    }
  };

  const clearAllDrafts = async () => {
    try {
      await del('tournament-drafts');
      setDrafts([]);
      return true;
    } catch (err) {
      console.error('Error clearing tournament drafts:', err);
      return false;
    }
  };

  return {
    drafts,
    isLoading,
    saveDraft,
    deleteDraft,
    clearAllDrafts,
    refreshDrafts: loadDrafts
  };
}