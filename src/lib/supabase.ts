import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl ? 'present' : 'missing',
    key: supabaseAnonKey ? 'present' : 'missing'
  });
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format');
}

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key (first 10 chars):', supabaseAnonKey.substring(0, 10) + '...');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'direktor-app'
    }
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Test connection function with enhanced error reporting
export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Simple health check with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const { data, error } = await supabase
      .from('tournaments')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Supabase connection test successful');
    return { success: true, data };
  } catch (err: any) {
    console.error('Supabase connection test error:', err);
    
    if (err.name === 'AbortError') {
      return { success: false, error: 'Connection timeout - please check your internet connection' };
    }
    
    return { success: false, error: err.message };
  }
};

// Enhanced error handler for Supabase operations
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  
  // Network-related errors
  if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
    return 'Unable to connect to the database. Please check your internet connection and try again. If the problem persists, the Supabase service may be temporarily unavailable.';
  }
  
  if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
    return 'Network error occurred. Please check your internet connection and try again.';
  }
  
  if (error.message?.includes('CORS')) {
    return 'Database configuration error. Please contact support.';
  }
  
  if (error.message?.includes('Invalid API key') || error.message?.includes('JWT')) {
    return 'Authentication error. Please contact support.';
  }
  
  if (error.message?.includes('timeout') || error.name === 'AbortError') {
    return 'Connection timeout. Please try again.';
  }
  
  if (error.message?.includes('not found') || error.code === 'PGRST116') {
    return 'Resource not found. Please refresh the page and try again.';
  }
  
  // RLS policy errors
  if (error.message?.includes('row-level security') || error.code === '42501') {
    return 'Permission denied. Please ensure you are logged in and have access to this resource.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};

// Retry mechanism for database operations
export const retrySupabaseOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.message?.includes('Invalid API key') || 
          error.message?.includes('row-level security') ||
          error.code === '42501') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
};