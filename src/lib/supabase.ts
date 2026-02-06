import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
}

// Singleton pattern to avoid multiple client instances with HMR
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl || '', supabaseAnonKey || '', {
      auth: {
        persistSession: true,
        storageKey: 'now-auth',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Bypass navigator.locks to prevent deadlock in dev (HMR/StrictMode)
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => fn(),
      }
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();
