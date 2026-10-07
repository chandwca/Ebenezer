import { createClient } from '@supabase/supabase-js';
import { nodeWebSocket } from './node-websocket.js';
import type { SupabaseConfig } from '../../config/env.js';
import type { Database } from '../../database/database.types.js';
import { ApiError } from '../errors/api-error.js';
import { applicationSchema, type UserScopedSupabaseClient } from './client-types.js';

export interface AuthContext {
  actorId: string;
  client: UserScopedSupabaseClient;
}
export interface AuthGateway {
  authenticate(token: string): Promise<AuthContext>;
}

export function createAuthGateway(config: SupabaseConfig): AuthGateway {
  return {
    async authenticate(token) {
      // One client per request; no shared mutable session or administrative key.
      const client = createClient<Database, typeof applicationSchema>(
        config.url,
        config.publishableKey,
        {
          db: { schema: applicationSchema },
          // Explicit transport keeps the current Node 20 runtime supported.
          // Supabase initializes realtime even when only Auth and REST are used.
          realtime: { transport: nodeWebSocket },
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          global: {
            headers: { Authorization: `Bearer ${token}` },
            fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
          },
        },
      );
      const { data, error } = await client.auth.getUser(token);
      if (error) {
        if (!error.status || error.status >= 500 || error.status === 429) {
          throw new ApiError(
            503,
            'auth_unavailable',
            'Sign-in verification is unavailable. Please try again.',
          );
        }
        throw new ApiError(401, 'unauthorized', 'Please sign in again.');
      }
      if (!data.user || data.user.is_anonymous)
        throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
      return { actorId: data.user.id, client };
    },
  };
}
