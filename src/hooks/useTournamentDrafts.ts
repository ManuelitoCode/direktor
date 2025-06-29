import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuditLog } from './useAuditLog';
import { get, set, del, keys } from 'idb-keyval';

export interface TournamentDraft {
  id: string;
  data: any;
  last_updated: string;
  status: 'draft' | 'completed';
  created_at: string;
}

const DRAFTS_CACHE_KEY = 'tournament-drafts';
const DRAFT_KEY_PREFIX = 'draft-';

export function useTournamentDrafts() {
  const [drafts, setDrafts] = useState<TournamentDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { logAction } = useAuditLog();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDraftsFromCache = async (): Promise<TournamentDraft[]> => {
    try {
      const cachedDrafts = await get(DRAFTS_CACHE_KEY);
      return cachedDrafts || [];
    } catch (err) {
      console.error('Error loading drafts from cache:', err);
      return [];
    }
  };

  const saveDraftsToCache = async (draftsData: TournamentDraft[]) => {
    try {
      await set(DRAFTS_CACHE_KEY, draftsData);
    } catch (err) {
      console.error('Error saving drafts to cache:', err);
    }
  };

  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // If offline, load from cache
      if (!navigator.onLine) {
        const cachedDrafts = await loadDraftsFromCache();
        setDrafts(cachedDrafts);
        setError('You are offline. Showing cached drafts.');
        return;
      }

      // Try to load from Supabase
      try {
        const { data, error: fetchError } = await supabase
          .from('tournament_drafts')
          .select('*')
          .eq('user_id', user.id)
          .order('last_updated', { ascending: false });

        if (fetchError) throw fetchError;
        
        const draftsData = data || [];
        setDrafts(draftsData);
        
        // Cache the successful result
        await saveDraftsToCache(draftsData);
      } catch (networkError) {
        console.error('Network error loading drafts:', networkError);
        
        // Fallback to cache
        const cachedDrafts = await loadDraftsFromCache();
        setDrafts(cachedDrafts);
        setError('Network error. Showing cached drafts. Please check your connection.');
      }
    } catch (err: any) {
      console.error('Error loading tournament drafts:', err);
      setError(err.message || 'Failed to load drafts');
      
      // Try to load from cache as last resort
      try {
        const cachedDrafts = await loadDraftsFromCache();
        setDrafts(cachedDrafts);
      } catch (cacheError) {
        console.error('Error loading from cache:', cacheError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const saveDraft = async (draftData: any, draftId?: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const timestamp = new Date().toISOString();
      let resultId = draftId;

      // If offline, save to cache only
      if (!navigator.onLine) {
        if (!draftId) {
          resultId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        const draftToSave: TournamentDraft = {
          id: resultId!,
          data: draftData,
          last_updated: timestamp,
          status: 'draft',
          created_at: draftId ? drafts.find(d => d.id === draftId)?.created_at || timestamp : timestamp
        };

        // Update local cache
        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = draftId 
          ? cachedDrafts.map(d => d.id === draftId ? draftToSave : d)
          : [...cachedDrafts, draftToSave];
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Saved offline. Changes will sync when you\'re back online.');
        
        return resultId;
      }

      // Try to save to Supabase
      try {
        if (draftId) {
          // Update existing draft
          const { data, error } = await supabase
            .from('tournament_drafts')
            .update({
              data: draftData,
              last_updated: timestamp
            })
            .eq('id', draftId)
            .eq('user_id', user.id)
            .select()
            .single();

          if (error) throw error;
          
          // Log update
          logAction({
            action: 'tournament_draft_updated',
            details: {
              draft_id: draftId
            }
          });
          
          resultId = data.id;
        } else {
          // Create new draft
          const { data, error } = await supabase
            .from('tournament_drafts')
            .insert([{
              user_id: user.id,
              data: draftData,
              status: 'draft'
            }])
            .select()
            .single();

          if (error) throw error;
          
          // Log creation
          logAction({
            action: 'tournament_draft_created',
            details: {
              draft_id: data.id
            }
          });
          
          resultId = data.id;
        }

        // Update cache with successful result
        await loadDrafts();
        return resultId;
      } catch (networkError) {
        console.error('Network error saving draft:', networkError);
        
        // Save to cache as fallback
        if (!draftId) {
          resultId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        const draftToSave: TournamentDraft = {
          id: resultId!,
          data: draftData,
          last_updated: timestamp,
          status: 'draft',
          created_at: draftId ? drafts.find(d => d.id === draftId)?.created_at || timestamp : timestamp
        };

        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = draftId 
          ? cachedDrafts.map(d => d.id === draftId ? draftToSave : d)
          : [...cachedDrafts, draftToSave];
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Network error. Draft saved locally and will sync when connection is restored.');
        
        return resultId;
      }
    } catch (err: any) {
      console.error('Error saving tournament draft:', err);
      setError(err.message || 'Failed to save draft');
      return null;
    }
  };

  const completeDraft = async (draftId: string): Promise<boolean> => {
    try {
      const timestamp = new Date().toISOString();

      // If offline, update cache only
      if (!navigator.onLine) {
        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = cachedDrafts.map(d => 
          d.id === draftId 
            ? { ...d, status: 'completed' as const, last_updated: timestamp }
            : d
        );
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Marked as completed offline. Will sync when you\'re back online.');
        return true;
      }

      // Try to update in Supabase
      try {
        const { error } = await supabase
          .from('tournament_drafts')
          .update({
            status: 'completed',
            last_updated: timestamp
          })
          .eq('id', draftId);

        if (error) throw error;
        
        // Log completion
        logAction({
          action: 'tournament_draft_completed',
          details: {
            draft_id: draftId
          }
        });
        
        await loadDrafts();
        return true;
      } catch (networkError) {
        console.error('Network error completing draft:', networkError);
        
        // Update cache as fallback
        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = cachedDrafts.map(d => 
          d.id === draftId 
            ? { ...d, status: 'completed' as const, last_updated: timestamp }
            : d
        );
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Network error. Draft marked as completed locally and will sync when connection is restored.');
        return true;
      }
    } catch (err: any) {
      console.error('Error completing tournament draft:', err);
      setError(err.message || 'Failed to complete draft');
      return false;
    }
  };

  const deleteDraft = async (draftId: string): Promise<boolean> => {
    try {
      // If offline, remove from cache only
      if (!navigator.onLine) {
        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = cachedDrafts.filter(d => d.id !== draftId);
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Deleted locally. Will sync when you\'re back online.');
        return true;
      }

      // Try to delete from Supabase
      try {
        const { error } = await supabase
          .from('tournament_drafts')
          .delete()
          .eq('id', draftId);

        if (error) throw error;
        
        // Log deletion
        logAction({
          action: 'tournament_draft_deleted',
          details: {
            draft_id: draftId
          }
        });
        
        await loadDrafts();
        return true;
      } catch (networkError) {
        console.error('Network error deleting draft:', networkError);
        
        // Remove from cache as fallback
        const cachedDrafts = await loadDraftsFromCache();
        const updatedDrafts = cachedDrafts.filter(d => d.id !== draftId);
        
        await saveDraftsToCache(updatedDrafts);
        setDrafts(updatedDrafts);
        setError('Network error. Draft deleted locally and will sync when connection is restored.');
        return true;
      }
    } catch (err: any) {
      console.error('Error deleting tournament draft:', err);
      setError(err.message || 'Failed to delete draft');
      return false;
    }
  };

  const getDraft = async (draftId: string): Promise<TournamentDraft | null> => {
    try {
      // First try to get from cache (faster and works offline)
      const cachedDrafts = await loadDraftsFromCache();
      const cachedDraft = cachedDrafts.find(d => d.id === draftId);
      
      if (cachedDraft) {
        return cachedDraft;
      }

      // If not in cache and online, try Supabase
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('tournament_drafts')
            .select('*')
            .eq('id', draftId)
            .single();

          if (error) throw error;
          return data;
        } catch (networkError) {
          console.error('Network error getting draft:', networkError);
          setError('Network error. Could not fetch draft from server.');
        }
      }

      return null;
    } catch (err: any) {
      console.error('Error getting tournament draft:', err);
      setError(err.message || 'Failed to get draft');
      return null;
    }
  };

  return {
    drafts,
    isLoading,
    error,
    isOffline,
    loadDrafts,
    saveDraft,
    completeDraft,
    deleteDraft,
    getDraft
  };
}