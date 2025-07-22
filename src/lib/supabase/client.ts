import { createBrowserClient } from '@supabase/ssr';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

// Singleton instance
let supabase: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabase) return supabase;
  
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  return supabase;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    // Only log if it's not the expected 'Auth session missing' error
    if (!error.message?.toLowerCase().includes('auth session missing')) {
      console.error('Error fetching user:', error);
    }
    return { data: { user: null }, error };
  }
  
  return { data: { user }, error: null };
}

export async function getSession() {
  const supabase = createClient();
  return supabase.auth.getSession();
}

export async function signOut() {
  const supabase = createClient();
  return supabase.auth.signOut();
}

// Add color to the Profile type
export type Profile = {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  color?: string;
};

// Profile helpers
export async function getProfile(userId: string) {
  const supabase = createClient();
  return supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  avatar_url?: string;
  color?: string;
}) {
  const supabase = createClient();
  return supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
}

// Auth state change listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = createClient();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event: AuthChangeEvent, session: Session | null) => {
      callback(session?.user ?? null);
    }
  );
  
  return subscription;
}