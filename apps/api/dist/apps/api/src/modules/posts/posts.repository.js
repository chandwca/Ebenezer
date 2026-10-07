import { unwrapRpc } from '../../shared/supabase/rpc.js';
export function createPostsRepository(client) {
    return {
        feed: (query) => unwrapRpc(client.rpc('feed', {
            p_limit: query.limit,
            ...(query.before ? { p_before: query.before } : {}),
            ...(query.beforeId ? { p_before_id: query.beforeId } : {}),
            ...(query.kind ? { p_kind: query.kind } : {}),
            ...(query.groupId ? { p_group: query.groupId } : {}),
        })),
        create: (post) => unwrapRpc(client.rpc('create_post', {
            p_kind: post.kind,
            p_audience: post.audience,
            p_body: post.body,
            ...(post.groupId ? { p_group_id: post.groupId } : {}),
            ...(post.scriptureReference ? { p_scripture_reference: post.scriptureReference } : {}),
            ...(post.scriptureText ? { p_scripture_text: post.scriptureText } : {}),
            ...(post.tone ? { p_tone: post.tone } : {}),
            ...(post.recipientIds ? { p_recipient_ids: post.recipientIds } : {}),
        })),
        update: (id, body) => unwrapRpc(client.rpc('update_post', { p_id: id, p_body: body })),
        async withdraw(id) {
            await unwrapRpc(client.rpc('delete_post', { p_id: id }));
        },
        setPrayer: (id, praying) => unwrapRpc(client.rpc('set_prayer', { p_post: id, p_praying: praying })),
        async report(id, reason, detail) {
            await unwrapRpc(client.rpc('report_post', {
                p_post: id,
                p_reason: reason,
                ...(detail ? { p_detail: detail } : {}),
            }));
        },
        comments: (id) => unwrapRpc(client.rpc('list_comments', { p_post: id })),
        addComment: (id, body) => unwrapRpc(client.rpc('add_comment', { p_post: id, p_body: body })),
        async deleteComment(id) {
            await unwrapRpc(client.rpc('delete_comment', { p_id: id }));
        },
        createPrayerLink: (id, label, days) => unwrapRpc(client.rpc('create_prayer_link', {
            p_post: id,
            p_label: label,
            ...(days ? { p_days: days } : {}),
        })),
        async revokePrayerLink(id) {
            await unwrapRpc(client.rpc('revoke_prayer_link', { p_id: id }));
        },
    };
}
