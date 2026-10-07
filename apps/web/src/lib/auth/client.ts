import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Authentication only. Application data goes through the Node API, not this client.
export type BrowserAuthClient = {
  auth: Pick<
    SupabaseClient['auth'],
    'getSession' | 'onAuthStateChange' | 'signInWithOAuth' | 'exchangeCodeForSession' | 'signOut'
  >;
};

let browserClient: BrowserAuthClient | undefined;

export function getBrowserAuth(): BrowserAuthClient | null {
  if (browserClient) return browserClient;
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url && !key) return null;
  if (!url || !key?.startsWith('sb_publishable_')) throw new Error('auth_configuration');
  const endpoint = new URL(url);
  if (
    endpoint.username ||
    endpoint.password ||
    !(
      endpoint.protocol === 'https:' ||
      (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname))
    )
  )
    throw new Error('auth_configuration');

  browserClient = createClient(url, key, {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      // Our callback route owns the exchange and removes the code from the address bar.
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}
