import { createClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '../../config/env.js';
import type { Database } from '../../database/database.types.js';
import { nodeWebSocket } from './node-websocket.js';
import { applicationSchema, type UserScopedSupabaseClient } from './client-types.js';

/**
 * Signed-out client (Postgres `anon` role). It can execute only the prayer-link functions;
 * every table and other function denies it.
 */
export function createPublicClient(config: SupabaseConfig): UserScopedSupabaseClient {
  return createClient<Database, typeof applicationSchema>(config.url, config.publishableKey, {
    db: { schema: applicationSchema },
    realtime: { transport: nodeWebSocket },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
    },
  });
}
