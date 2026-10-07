import { z } from 'zod';
import { commentSchema, communityPostSchema, prayerLinkSchema, } from '@ebenezer/contracts';
const DEFAULT_PAGE = 20;
export function createPostsService(repository) {
    return {
        async feed(query) {
            const limit = query.limit ?? DEFAULT_PAGE;
            const posts = z.array(communityPostSchema).parse(await repository.feed({ ...query, limit }));
            // A full page means there may be more; the last row is the keyset cursor.
            const last = posts.length === limit ? posts[posts.length - 1] : undefined;
            return {
                posts,
                nextCursor: last ? { before: last.createdAt, beforeId: last.id } : null,
            };
        },
        async create(post) {
            return communityPostSchema.parse(await repository.create(post));
        },
        async update(postId, body) {
            return communityPostSchema.parse(await repository.update(postId, body));
        },
        withdraw: (postId) => repository.withdraw(postId),
        async setPrayer(postId, praying) {
            return communityPostSchema.parse(await repository.setPrayer(postId, praying));
        },
        report: (postId, reason, detail) => repository.report(postId, reason, detail),
        async comments(postId) {
            return z.array(commentSchema).parse(await repository.comments(postId));
        },
        async addComment(postId, body) {
            return commentSchema.parse(await repository.addComment(postId, body));
        },
        deleteComment: (commentId) => repository.deleteComment(commentId),
        async createPrayerLink(postId, label, days) {
            return prayerLinkSchema.parse(await repository.createPrayerLink(postId, label, days));
        },
        revokePrayerLink: (linkId) => repository.revokePrayerLink(linkId),
    };
}
