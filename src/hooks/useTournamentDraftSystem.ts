import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { get, set, del } from 'idb-keyval';
import { useAuditLog } from './useAuditLog';

export interface TournamentDraft {
  id: string;
  user_id?: string;
  data: Record<string, any>;
  last_updated: string;
  status: 'draft' | 'completed';
  created_at?: string;
  name?: string;
}

export interface AutoSaveConfig {
  primaryStorage: 'supabase' | 'localStorage';
  fallbackStorage: 'localStorage' | 'none';
  debounceMs: number;
  checkpointTriggers: string[];
}

const DEFAULT_CONFIG: AutoSaveConfig = {
  primaryStorage: 'supabase',
  fallbackStorage: 'localStorage',
  debounceMs: 15000, // 15 seconds
  checkpointTriggers: ['basicInfo', 'pairingMethod', 'playerRegistration']
};

export function useTournamentDraftSystem(config: Partial<AutoSaveConfig> = {}) {
  const [drafts, setDrafts] = useState<TournamentDraft[]>([]);
  const [currentDraft, setCurrentDraft] = useState<TournamentDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const { logAction } = useAuditLog();
  const saveTimeoutRef = useRef<number | null>(null);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Track changes that need to be saved
  const pendingChangesRef = useRef<Record<string, any> | null>(null);
  
  // Initialize user and online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      }
    });
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      subscription.unsubscribe();
      
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  // Load drafts when user changes
  useEffect(() => {
    if (isAuthenticated) {
      loadDrafts();
    }
  }, [isAuthenticated]);
  
  // Load drafts from primary and fallback storage
  const loadDrafts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      let loadedDrafts: TournamentDraft[] = [];
      
      // Try to load from primary storage first
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('tournament_drafts')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'draft')
            .order('last_updated', { ascending: false });
            
          if (error) throw error;
          
          loadedDrafts = data || [];
          
          // Log successful load from Supabase
          logAction({
            action: 'drafts_loaded_from_supabase',
            details: {
              count: loadedDrafts.length
            }
          });
        } catch (err) {
          console.error('Error loading drafts from Supabase:', err);
          
          // Log error
          logAction({
            action: 'drafts_load_error_supabase',
            details: {
              error: String(err)
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            loadedDrafts = localDrafts;
            
            // Log fallback to localStorage
            logAction({
              action: 'drafts_loaded_from_localstorage_fallback',
              details: {
                count: localDrafts.length
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Load from localStorage
        const localDrafts = await get('tournament-drafts') || [];
        loadedDrafts = localDrafts;
        
        // Log successful load from localStorage
        logAction({
          action: 'drafts_loaded_from_localstorage',
          details: {
            count: localDrafts.length
          }
        });
      }
      
      setDrafts(loadedDrafts);
    } catch (err) {
      console.error('Error loading drafts:', err);
      setError('Failed to load drafts');
      
      // Log error
      logAction({
        action: 'drafts_load_error',
        details: {
          error: String(err)
        }
      });
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, isAuthenticated, user, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Create a new draft
  const createDraft = useCallback(async (initialData: Record<string, any> = {}): Promise<string | null> => {
    try {
      setError(null);
      
      const newDraft: TournamentDraft = {
        id: crypto.randomUUID(),
        data: initialData,
        last_updated: new Date().toISOString(),
        status: 'draft',
        name: initialData.name || 'Untitled Tournament'
      };
      
      // Save to primary storage
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { error } = await supabase
            .from('tournament_drafts')
            .insert([{
              ...newDraft,
              user_id: user.id
            }]);
            
          if (error) throw error;
          
          // Log successful creation in Supabase
          logAction({
            action: 'draft_created_supabase',
            details: {
              draft_id: newDraft.id,
              draft_name: newDraft.name
            }
          });
        } catch (err) {
          console.error('Error creating draft in Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_create_error_supabase',
            details: {
              error: String(err),
              draft_id: newDraft.id
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            await set('tournament-drafts', [...localDrafts, newDraft]);
            
            // Log fallback to localStorage
            logAction({
              action: 'draft_created_localstorage_fallback',
              details: {
                draft_id: newDraft.id,
                draft_name: newDraft.name
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Save to localStorage
        const localDrafts = await get('tournament-drafts') || [];
        await set('tournament-drafts', [...localDrafts, newDraft]);
        
        // Log successful creation in localStorage
        logAction({
          action: 'draft_created_localstorage',
          details: {
            draft_id: newDraft.id,
            draft_name: newDraft.name
          }
        });
      }
      
      // Update state
      setDrafts(prev => [newDraft, ...prev]);
      setCurrentDraft(newDraft);
      
      return newDraft.id;
    } catch (err) {
      console.error('Error creating draft:', err);
      setError('Failed to create draft');
      
      // Log error
      logAction({
        action: 'draft_create_error',
        details: {
          error: String(err)
        }
      });
      
      return null;
    }
  }, [isOnline, isAuthenticated, user, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Load a specific draft
  const loadDraft = useCallback(async (draftId: string): Promise<TournamentDraft | null> => {
    try {
      setError(null);
      
      let loadedDraft: TournamentDraft | null = null;
      
      // Try to load from primary storage first
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('tournament_drafts')
            .select('*')
            .eq('id', draftId)
            .eq('user_id', user.id)
            .single();
            
          if (error) throw error;
          
          loadedDraft = data;
          
          // Log successful load from Supabase
          logAction({
            action: 'draft_loaded_supabase',
            details: {
              draft_id: draftId,
              draft_name: data.name || 'Untitled Tournament'
            }
          });
        } catch (err) {
          console.error('Error loading draft from Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_load_error_supabase',
            details: {
              error: String(err),
              draft_id: draftId
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            loadedDraft = localDrafts.find((d: TournamentDraft) => d.id === draftId) || null;
            
            if (loadedDraft) {
              // Log fallback to localStorage
              logAction({
                action: 'draft_loaded_localstorage_fallback',
                details: {
                  draft_id: draftId,
                  draft_name: loadedDraft.name || 'Untitled Tournament'
                }
              });
            }
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Load from localStorage
        const localDrafts = await get('tournament-drafts') || [];
        loadedDraft = localDrafts.find((d: TournamentDraft) => d.id === draftId) || null;
        
        if (loadedDraft) {
          // Log successful load from localStorage
          logAction({
            action: 'draft_loaded_localstorage',
            details: {
              draft_id: draftId,
              draft_name: loadedDraft.name || 'Untitled Tournament'
            }
          });
        }
      }
      
      if (loadedDraft) {
        setCurrentDraft(loadedDraft);
      } else {
        setError('Draft not found');
      }
      
      return loadedDraft;
    } catch (err) {
      console.error('Error loading draft:', err);
      setError('Failed to load draft');
      
      // Log error
      logAction({
        action: 'draft_load_error',
        details: {
          error: String(err),
          draft_id: draftId
        }
      });
      
      return null;
    }
  }, [isOnline, isAuthenticated, user, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Update draft data with debounce
  const updateDraft = useCallback((draftId: string, data: Record<string, any>, checkpoint?: string) => {
    // Store the changes to be saved
    pendingChangesRef.current = {
      ...(pendingChangesRef.current || {}),
      ...data
    };
    
    // If this is a checkpoint trigger, save immediately
    if (checkpoint && mergedConfig.checkpointTriggers.includes(checkpoint)) {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      saveDraftChanges(draftId);
      return;
    }
    
    // Otherwise, debounce the save
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      saveDraftChanges(draftId);
    }, mergedConfig.debounceMs);
  }, [mergedConfig.debounceMs, mergedConfig.checkpointTriggers]);
  
  // Save draft changes
  const saveDraftChanges = async (draftId: string) => {
    if (!pendingChangesRef.current) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Find the draft to update
      const draftToUpdate = drafts.find(d => d.id === draftId);
      if (!draftToUpdate) {
        throw new Error('Draft not found');
      }
      
      // Merge changes with existing data
      const updatedData = {
        ...draftToUpdate.data,
        ...pendingChangesRef.current
      };
      
      const updatedDraft: TournamentDraft = {
        ...draftToUpdate,
        data: updatedData,
        last_updated: new Date().toISOString(),
        name: updatedData.name || draftToUpdate.name || 'Untitled Tournament'
      };
      
      // Save to primary storage
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { error } = await supabase
            .from('tournament_drafts')
            .update({
              data: updatedData,
              last_updated: updatedDraft.last_updated,
              name: updatedDraft.name
            })
            .eq('id', draftId)
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          // Log successful update in Supabase
          logAction({
            action: 'draft_updated_supabase',
            details: {
              draft_id: draftId,
              draft_name: updatedDraft.name
            }
          });
        } catch (err) {
          console.error('Error updating draft in Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_update_error_supabase',
            details: {
              error: String(err),
              draft_id: draftId
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            const updatedDrafts = localDrafts.map((d: TournamentDraft) => 
              d.id === draftId ? updatedDraft : d
            );
            await set('tournament-drafts', updatedDrafts);
            
            // Log fallback to localStorage
            logAction({
              action: 'draft_updated_localstorage_fallback',
              details: {
                draft_id: draftId,
                draft_name: updatedDraft.name
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Save to localStorage
        const localDrafts = await get('tournament-drafts') || [];
        const updatedDrafts = localDrafts.map((d: TournamentDraft) => 
          d.id === draftId ? updatedDraft : d
        );
        await set('tournament-drafts', updatedDrafts);
        
        // Log successful update in localStorage
        logAction({
          action: 'draft_updated_localstorage',
          details: {
            draft_id: draftId,
            draft_name: updatedDraft.name
          }
        });
      }
      
      // Update state
      setDrafts(prev => prev.map(d => d.id === draftId ? updatedDraft : d));
      setCurrentDraft(updatedDraft);
      setLastSaved(new Date());
      
      // Clear pending changes
      pendingChangesRef.current = null;
    } catch (err) {
      console.error('Error saving draft changes:', err);
      setError('Failed to save draft changes');
      
      // Log error
      logAction({
        action: 'draft_update_error',
        details: {
          error: String(err),
          draft_id: draftId
        }
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save draft immediately (manual save)
  const saveDraftNow = useCallback(async (draftId: string): Promise<boolean> => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    await saveDraftChanges(draftId);
    return !error;
  }, [error]);
  
  // Complete a draft (mark as completed)
  const completeDraft = useCallback(async (draftId: string, tournamentId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the draft to complete
      const draftToComplete = drafts.find(d => d.id === draftId);
      if (!draftToComplete) {
        throw new Error('Draft not found');
      }
      
      // Update draft status
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { error } = await supabase
            .from('tournament_drafts')
            .update({
              status: 'completed',
              data: {
                ...draftToComplete.data,
                tournamentId
              }
            })
            .eq('id', draftId)
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          // Log successful completion in Supabase
          logAction({
            action: 'draft_completed_supabase',
            details: {
              draft_id: draftId,
              tournament_id: tournamentId
            }
          });
        } catch (err) {
          console.error('Error completing draft in Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_complete_error_supabase',
            details: {
              error: String(err),
              draft_id: draftId
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            const updatedDrafts = localDrafts.filter((d: TournamentDraft) => d.id !== draftId);
            await set('tournament-drafts', updatedDrafts);
            
            // Log fallback to localStorage
            logAction({
              action: 'draft_completed_localstorage_fallback',
              details: {
                draft_id: draftId,
                tournament_id: tournamentId
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Remove from localStorage (completed drafts are not stored locally)
        const localDrafts = await get('tournament-drafts') || [];
        const updatedDrafts = localDrafts.filter((d: TournamentDraft) => d.id !== draftId);
        await set('tournament-drafts', updatedDrafts);
        
        // Log successful completion in localStorage
        logAction({
          action: 'draft_completed_localstorage',
          details: {
            draft_id: draftId,
            tournament_id: tournamentId
          }
        });
      }
      
      // Update state
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      setCurrentDraft(null);
      
      return true;
    } catch (err) {
      console.error('Error completing draft:', err);
      setError('Failed to complete draft');
      
      // Log error
      logAction({
        action: 'draft_complete_error',
        details: {
          error: String(err),
          draft_id: draftId
        }
      });
      
      return false;
    }
  }, [isOnline, isAuthenticated, user, drafts, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Delete a draft
  const deleteDraft = useCallback(async (draftId: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Delete from primary storage
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { error } = await supabase
            .from('tournament_drafts')
            .delete()
            .eq('id', draftId)
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          // Log successful deletion from Supabase
          logAction({
            action: 'draft_deleted_supabase',
            details: {
              draft_id: draftId
            }
          });
        } catch (err) {
          console.error('Error deleting draft from Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_delete_error_supabase',
            details: {
              error: String(err),
              draft_id: draftId
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            const updatedDrafts = localDrafts.filter((d: TournamentDraft) => d.id !== draftId);
            await set('tournament-drafts', updatedDrafts);
            
            // Log fallback to localStorage
            logAction({
              action: 'draft_deleted_localstorage_fallback',
              details: {
                draft_id: draftId
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Delete from localStorage
        const localDrafts = await get('tournament-drafts') || [];
        const updatedDrafts = localDrafts.filter((d: TournamentDraft) => d.id !== draftId);
        await set('tournament-drafts', updatedDrafts);
        
        // Log successful deletion from localStorage
        logAction({
          action: 'draft_deleted_localstorage',
          details: {
            draft_id: draftId
          }
        });
      }
      
      // Update state
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (currentDraft?.id === draftId) {
        setCurrentDraft(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting draft:', err);
      setError('Failed to delete draft');
      
      // Log error
      logAction({
        action: 'draft_delete_error',
        details: {
          error: String(err),
          draft_id: draftId
        }
      });
      
      return false;
    }
  }, [isOnline, isAuthenticated, user, currentDraft, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Check for existing drafts
  const checkForExistingDrafts = useCallback(async (): Promise<TournamentDraft[]> => {
    try {
      setError(null);
      
      let existingDrafts: TournamentDraft[] = [];
      
      // Check primary storage
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('tournament_drafts')
            .select('*')
            .eq('user_id', user.id)
            .eq('status', 'draft')
            .order('last_updated', { ascending: false });
            
          if (error) throw error;
          
          existingDrafts = data || [];
          
          // Log successful check in Supabase
          logAction({
            action: 'drafts_checked_supabase',
            details: {
              count: existingDrafts.length
            }
          });
        } catch (err) {
          console.error('Error checking drafts in Supabase:', err);
          
          // Log error
          logAction({
            action: 'drafts_check_error_supabase',
            details: {
              error: String(err)
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            existingDrafts = localDrafts;
            
            // Log fallback to localStorage
            logAction({
              action: 'drafts_checked_localstorage_fallback',
              details: {
                count: localDrafts.length
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Check localStorage
        const localDrafts = await get('tournament-drafts') || [];
        existingDrafts = localDrafts;
        
        // Log successful check in localStorage
        logAction({
          action: 'drafts_checked_localstorage',
          details: {
            count: localDrafts.length
          }
        });
      }
      
      return existingDrafts;
    } catch (err) {
      console.error('Error checking for existing drafts:', err);
      setError('Failed to check for existing drafts');
      
      // Log error
      logAction({
        action: 'drafts_check_error',
        details: {
          error: String(err)
        }
      });
      
      return [];
    }
  }, [isOnline, isAuthenticated, user, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  // Sync drafts between Supabase and localStorage
  const syncDrafts = useCallback(async (): Promise<boolean> => {
    if (!isOnline || !isAuthenticated || mergedConfig.primaryStorage !== 'supabase') {
      return false;
    }
    
    try {
      setError(null);
      
      // Get drafts from Supabase
      const { data: supabaseDrafts, error } = await supabase
        .from('tournament_drafts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'draft');
        
      if (error) throw error;
      
      // Get drafts from localStorage
      const localDrafts = await get('tournament-drafts') || [];
      
      // Create a map of drafts by ID
      const draftsMap = new Map<string, TournamentDraft>();
      
      // Add Supabase drafts to map
      (supabaseDrafts || []).forEach(draft => {
        draftsMap.set(draft.id, draft);
      });
      
      // Process localStorage drafts
      for (const localDraft of localDrafts) {
        const supabaseDraft = draftsMap.get(localDraft.id);
        
        if (!supabaseDraft) {
          // Draft exists only in localStorage, upload to Supabase
          try {
            await supabase
              .from('tournament_drafts')
              .insert([{
                ...localDraft,
                user_id: user.id
              }]);
              
            draftsMap.set(localDraft.id, {
              ...localDraft,
              user_id: user.id
            });
            
            // Log upload to Supabase
            logAction({
              action: 'draft_uploaded_to_supabase',
              details: {
                draft_id: localDraft.id,
                draft_name: localDraft.name || 'Untitled Tournament'
              }
            });
          } catch (err) {
            console.error('Error uploading draft to Supabase:', err);
            
            // Log error
            logAction({
              action: 'draft_upload_error',
              details: {
                error: String(err),
                draft_id: localDraft.id
              }
            });
          }
        } else {
          // Draft exists in both, compare last_updated
          const localDate = new Date(localDraft.last_updated).getTime();
          const supabaseDate = new Date(supabaseDraft.last_updated).getTime();
          
          if (localDate > supabaseDate) {
            // Local draft is newer, update Supabase
            try {
              await supabase
                .from('tournament_drafts')
                .update({
                  data: localDraft.data,
                  last_updated: localDraft.last_updated,
                  name: localDraft.name || supabaseDraft.name
                })
                .eq('id', localDraft.id)
                .eq('user_id', user.id);
                
              draftsMap.set(localDraft.id, {
                ...supabaseDraft,
                data: localDraft.data,
                last_updated: localDraft.last_updated,
                name: localDraft.name || supabaseDraft.name
              });
              
              // Log update to Supabase
              logAction({
                action: 'draft_updated_in_supabase',
                details: {
                  draft_id: localDraft.id,
                  draft_name: localDraft.name || 'Untitled Tournament'
                }
              });
            } catch (err) {
              console.error('Error updating draft in Supabase:', err);
              
              // Log error
              logAction({
                action: 'draft_update_error',
                details: {
                  error: String(err),
                  draft_id: localDraft.id
                }
              });
            }
          }
        }
      }
      
      // Update localStorage with all drafts
      await set('tournament-drafts', Array.from(draftsMap.values()));
      
      // Update state
      setDrafts(Array.from(draftsMap.values()));
      
      // Log successful sync
      logAction({
        action: 'drafts_synced',
        details: {
          count: draftsMap.size
        }
      });
      
      return true;
    } catch (err) {
      console.error('Error syncing drafts:', err);
      setError('Failed to sync drafts');
      
      // Log error
      logAction({
        action: 'drafts_sync_error',
        details: {
          error: String(err)
        }
      });
      
      return false;
    }
  }, [isOnline, isAuthenticated, user, mergedConfig.primaryStorage]);
  
  // Rename a draft
  const renameDraft = useCallback(async (draftId: string, newName: string): Promise<boolean> => {
    try {
      setError(null);
      
      // Find the draft to rename
      const draftToRename = drafts.find(d => d.id === draftId);
      if (!draftToRename) {
        throw new Error('Draft not found');
      }
      
      // Update draft name
      if (mergedConfig.primaryStorage === 'supabase' && isOnline && isAuthenticated) {
        try {
          const { error } = await supabase
            .from('tournament_drafts')
            .update({
              name: newName,
              data: {
                ...draftToRename.data,
                name: newName
              }
            })
            .eq('id', draftId)
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          // Log successful rename in Supabase
          logAction({
            action: 'draft_renamed_supabase',
            details: {
              draft_id: draftId,
              new_name: newName
            }
          });
        } catch (err) {
          console.error('Error renaming draft in Supabase:', err);
          
          // Log error
          logAction({
            action: 'draft_rename_error_supabase',
            details: {
              error: String(err),
              draft_id: draftId
            }
          });
          
          // Fall back to localStorage if configured
          if (mergedConfig.fallbackStorage === 'localStorage') {
            const localDrafts = await get('tournament-drafts') || [];
            const updatedDrafts = localDrafts.map((d: TournamentDraft) => 
              d.id === draftId ? { 
                ...d, 
                name: newName,
                data: { ...d.data, name: newName }
              } : d
            );
            await set('tournament-drafts', updatedDrafts);
            
            // Log fallback to localStorage
            logAction({
              action: 'draft_renamed_localstorage_fallback',
              details: {
                draft_id: draftId,
                new_name: newName
              }
            });
          }
        }
      } else if (mergedConfig.primaryStorage === 'localStorage') {
        // Update in localStorage
        const localDrafts = await get('tournament-drafts') || [];
        const updatedDrafts = localDrafts.map((d: TournamentDraft) => 
          d.id === draftId ? { 
            ...d, 
            name: newName,
            data: { ...d.data, name: newName }
          } : d
        );
        await set('tournament-drafts', updatedDrafts);
        
        // Log successful rename in localStorage
        logAction({
          action: 'draft_renamed_localstorage',
          details: {
            draft_id: draftId,
            new_name: newName
          }
        });
      }
      
      // Update state
      setDrafts(prev => prev.map(d => 
        d.id === draftId ? { 
          ...d, 
          name: newName,
          data: { ...d.data, name: newName }
        } : d
      ));
      
      if (currentDraft?.id === draftId) {
        setCurrentDraft(prev => prev ? {
          ...prev,
          name: newName,
          data: { ...prev.data, name: newName }
        } : null);
      }
      
      return true;
    } catch (err) {
      console.error('Error renaming draft:', err);
      setError('Failed to rename draft');
      
      // Log error
      logAction({
        action: 'draft_rename_error',
        details: {
          error: String(err),
          draft_id: draftId
        }
      });
      
      return false;
    }
  }, [isOnline, isAuthenticated, user, drafts, currentDraft, mergedConfig.primaryStorage, mergedConfig.fallbackStorage]);
  
  return {
    drafts,
    currentDraft,
    isLoading,
    isSaving,
    lastSaved,
    error,
    isOnline,
    createDraft,
    loadDraft,
    updateDraft,
    saveDraftNow,
    completeDraft,
    deleteDraft,
    checkForExistingDrafts,
    syncDrafts,
    renameDraft,
    refreshDrafts: loadDrafts
  };
}