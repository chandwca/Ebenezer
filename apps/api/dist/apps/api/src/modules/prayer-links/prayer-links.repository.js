import { unwrapRpc } from '../../shared/supabase/rpc.js';
export function createPrayerLinksRepository(client) {
    return {
        open: (token) => unwrapRpc(client.rpc('open_prayer_link', { p_token: token })),
        async answer(token, note) {
            await unwrapRpc(client.rpc('answer_prayer_link', { p_token: token, ...(note ? { p_note: note } : {}) }));
        },
    };
}
