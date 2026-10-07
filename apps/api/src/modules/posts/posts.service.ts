import { z } from 'zod';
import {
  commentSchema,
  communityPostSchema,
  prayerLinkSchema,
  type CreatePost,
  type FeedQuery,
  type ReportReason,
} from '@ebenezer/contracts';
import type { PostsRepository } from './posts.types.js';

const DEFAULT_PAGE = 20;

export function createPostsService(repository: PostsRepository) {
  return {
    async feed(query: FeedQuery) {
      const limit = query.limit ?? DEFAULT_PAGE;
      const posts = z.array(communityPostSchema).parse(await repository.feed({ ...query, limit }));
      // A full page means there may be more; the last row is the keyset cursor.
      const last = posts.length === limit ? posts[posts.length - 1] : undefined;
      return {
        posts,
        nextCursor: last ? { before: last.createdAt, beforeId: last.id } : null,
      };
    },
    async create(post: CreatePost) {
      return communityPostSchema.parse(await repository.create(post));
    },
    async update(postId: string, body: string) {
      return communityPostSchema.parse(await repository.update(postId, body));
    },
    withdraw: (postId: string) => repository.withdraw(postId),
    async setPrayer(postId: string, praying: boolean) {
      return communityPostSchema.parse(await repository.setPrayer(postId, praying));
    },
    report: (postId: string, reason: ReportReason, detail?: string) =>
      repository.report(postId, reason, detail),
    async comments(postId: string) {
      return z.array(commentSchema).parse(await repository.comments(postId));
    },
    async addComment(postId: string, body: string) {
      return commentSchema.parse(await repository.addComment(postId, body));
    },
    deleteComment: (commentId: string) => repository.deleteComment(commentId),
    async createPrayerLink(postId: string, label: string, days?: number) {
      return prayerLinkSchema.parse(await repository.createPrayerLink(postId, label, days));
    },
    revokePrayerLink: (linkId: string) => repository.revokePrayerLink(linkId),
  };
}
