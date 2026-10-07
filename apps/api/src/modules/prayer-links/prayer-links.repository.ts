import type { UserScopedSupabaseClient } from '../../shared/supabase/client-types.js';
import { unwrapRpc } from '../../shared/supabase/rpc.js';
import type { PrayerLinksRepository } from './prayer-links.types.js';

export function createPrayerLinksRepository(
  client: UserScopedSupabaseClient,
): PrayerLinksRepository {
  return {
    open: (token) => unwrapRpc(client.rpc('open_prayer_link', { p_token: token })),
    async answer(token, note) {
      await unwrapRpc(
        client.rpc('answer_prayer_link', { p_token: token, ...(note ? { p_note: note } : {}) }),
      );
    },
  };
}
