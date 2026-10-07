import { unwrapRpc } from '../../shared/supabase/rpc.js';
const fields = (values) => ({
    p_name: values.name,
    p_description: values.description,
    p_meeting_note: values.meetingNote,
    p_visibility: values.visibility,
});
export function createGroupsRepository(client) {
    return {
        list: () => unwrapRpc(client.rpc('list_groups')),
        create: (values) => unwrapRpc(client.rpc('create_group', fields(values))),
        update: (id, values) => unwrapRpc(client.rpc('update_group', { p_id: id, ...fields(values) })),
        async remove(id) {
            await unwrapRpc(client.rpc('delete_group', { p_id: id }));
        },
        join: (id) => unwrapRpc(client.rpc('join_group', { p_id: id })),
        async leave(id) {
            await unwrapRpc(client.rpc('leave_group', { p_id: id }));
        },
        members: (id) => unwrapRpc(client.rpc('list_group_members', { p_id: id })),
        async invite(id, userId) {
            await unwrapRpc(client.rpc('invite_to_group', { p_id: id, p_user: userId }));
        },
        async setRole(id, userId, role) {
            await unwrapRpc(client.rpc('set_group_role', { p_id: id, p_user: userId, p_role: role }));
        },
        async removeMember(id, userId) {
            await unwrapRpc(client.rpc('remove_group_member', { p_id: id, p_user: userId }));
        },
    };
}
