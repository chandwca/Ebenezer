import { createClient } from '@supabase/supabase-js';
import { nodeWebSocket } from './node-websocket.js';
import { applicationSchema } from './client-types.js';
/**
 * Signed-out client (Postgres `anon` role). It can execute only the prayer-link functions;
 * every table and other function denies it.
 */
export function createPublicClient(config) {
    return createClient(config.url, config.publishableKey, {
        db: { schema: applicationSchema },
        realtime: { transport: nodeWebSocket },
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
            fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
        },
    });
}
