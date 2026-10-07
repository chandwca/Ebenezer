import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/database/database.types.js';
import { ApiError } from '../../src/shared/errors/api-error.js';
import type { AuthGateway } from '../../src/shared/supabase/auth-gateway.js';
import { nodeWebSocket } from '../../src/shared/supabase/node-websocket.js';
import { applicationSchema } from '../../src/shared/supabase/client-types.js';

export const alice = '11111111-1111-4111-8111-111111111111';
export const bob = '22222222-2222-4222-8222-222222222222';
const sessions: Record<string, string> = { 'alice-session': alice, 'bob-session': bob };

export const bearer = (token = 'alice-session') => ({ authorization: `Bearer ${token}` });

/** Accepts `alice-session` and `bob-session`; any other token is rejected like an expired one. */
export function createFakeAuthGateway(): AuthGateway {
  // This client is never queried; tests inject repositories separately.
  const client = createClient<Database, typeof applicationSchema>(
    'http://127.0.0.1:54321',
    'sb_publishable_fixture_key',
    {
      db: { schema: applicationSchema },
      realtime: { transport: nodeWebSocket },
      auth: { persistSession: false },
    },
  );
  return {
    async authenticate(token) {
      const actorId = sessions[token];
      if (!actorId) throw new ApiError(401, 'unauthorized', 'Please sign in again.');
      return { actorId, client };
    },
  };
}
