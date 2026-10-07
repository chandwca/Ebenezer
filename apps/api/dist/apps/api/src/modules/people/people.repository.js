import { unwrapRpc } from '../../shared/supabase/rpc.js';
export function createPeopleRepository(client) {
    return {
        search: (query) => unwrapRpc(client.rpc('search_people', { p_query: query })),
        listConnections: () => unwrapRpc(client.rpc('list_connections')),
        request: (userId) => unwrapRpc(client.rpc('request_connection', { p_user: userId })),
        respond: (id, accept) => unwrapRpc(client.rpc('respond_connection', { p_id: id, p_accept: accept })),
        async remove(id) {
            await unwrapRpc(client.rpc('remove_connection', { p_id: id }));
        },
    };
}
