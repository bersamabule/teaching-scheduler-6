import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tarhblookmrkyfjqhqrv.supabase.co';
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcmhibG9va21ya3lmanFocXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODcxOTgxNjEsImV4cCI6MjAwMjc3NDE2MX0.rF4AEuhHyN8WxlcrOr1WVRwUaZLqcXyuUeEYRyuFGSE';

// Log connection information for debugging
console.log(`[DB] Connecting to Supabase at ${supabaseUrl}`);

// Function to create a fallback client
function createFallbackClient() {
  console.error('[DB] Creating fallback Supabase client');
  return {
    from: () => ({ 
      select: () => ({ data: null, error: new Error('Supabase client initialization failed') }) 
    }),
    auth: { 
      onAuthStateChange: () => ({ data: null, error: new Error('Supabase client initialization failed') }) 
    },
    // Add any other methods that your app might use
  };
}

// Function to create the actual client
function createSupabaseClient() {
  try {
    console.log('[DB] Initializing Supabase client');
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    console.log('[DB] Supabase client initialized successfully');
    return client;
  } catch (error) {
    console.error('[DB] Failed to initialize Supabase client:', error);
    return createFallbackClient();
  }
}

// Create and export the client
export const supabase = createSupabaseClient();

// Export helper for reliability stats
export function getSupabaseStatus() {
  try {
    // Simple check to see if the client is properly initialized
    if (supabase && typeof supabase.from === 'function') {
      return { initialized: true, url: supabaseUrl };
    }
    return { initialized: false, url: supabaseUrl };
  } catch (error) {
    return {
      initialized: false,
      url: supabaseUrl,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Re-export the service for convenience - Note: Import only when needed to avoid circular deps
// export { supabaseService } from './service'; 