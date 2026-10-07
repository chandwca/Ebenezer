import type { CreatePost, FeedQuery, ReportReason } from '@ebenezer/contracts';
import type { AuthContext } from '../../shared/supabase/auth-gateway.js';

/** Raw JSON from the database functions; the service validates it against the contracts. */
export interface PostsRepository {
  feed(query: FeedQuery & { limit: number }): Promise<unknown>;
  create(post: CreatePost): Promise<unknown>;
  update(postId: string, body: string): Promise<unknown>;
  withdraw(postId: string): Promise<void>;
  setPrayer(postId: string, praying: boolean): Promise<unknown>;
  report(postId: string, reason: ReportReason, detail?: string): Promise<void>;
  comments(postId: string): Promise<unknown>;
  addComment(postId: string, body: string): Promise<unknown>;
  deleteComment(commentId: string): Promise<void>;
  createPrayerLink(postId: string, label: string, days?: number): Promise<unknown>;
  revokePrayerLink(linkId: string): Promise<void>;
}
export type PostsRepositoryFactory = (context: AuthContext) => PostsRepository;
