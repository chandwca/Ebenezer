import {
  commentResponseSchema,
  commentsResponseSchema,
  connectionResponseSchema,
  connectionsResponseSchema,
  feedResponseSchema,
  groupMembersResponseSchema,
  groupResponseSchema,
  groupsResponseSchema,
  peopleSearchResponseSchema,
  postResponseSchema,
  prayerLinkResponseSchema,
  publicPrayerResponseSchema,
  type CreateGroupValues,
  type CreatePost,
  type FeedQuery,
  type ReportReason,
} from '@ebenezer/contracts';
import type { z } from 'zod';
import type { BrowserAuthClient } from '@/lib/auth/client';
import { communityRequest, publicRequest } from '@/lib/api/client';

/** Every Together endpoint for one signed-in person. */
export function communityApi(client: BrowserAuthClient, actorId: string) {
  const request = <T>(
    path: string,
    schema: z.ZodType<T> | null,
    options?: Parameters<typeof communityRequest>[4],
  ) => communityRequest(client, actorId, path, schema, options);
  const query = (values: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(values))
      if (value !== undefined) params.set(key, String(value));
    const text = params.toString();
    return text ? `?${text}` : '';
  };
  return {
    feed: (feed: FeedQuery, signal?: AbortSignal) =>
      request(`/v1/feed${query(feed)}`, feedResponseSchema, { signal }),
    createPost: async (post: CreatePost) =>
      (await request('/v1/posts', postResponseSchema, { method: 'POST', body: post })).post,
    updatePost: async (id: string, body: string) =>
      (await request(`/v1/posts/${id}`, postResponseSchema, { method: 'PATCH', body: { body } }))
        .post,
    deletePost: (id: string) => request(`/v1/posts/${id}`, null, { method: 'DELETE' }),
    setPrayer: async (id: string, praying: boolean) =>
      (
        await request(`/v1/posts/${id}/prayer`, postResponseSchema, {
          method: praying ? 'PUT' : 'DELETE',
        })
      ).post,
    report: (id: string, reason: ReportReason) =>
      request(`/v1/posts/${id}/reports`, null, { method: 'POST', body: { reason } }),
    comments: async (id: string, signal?: AbortSignal) =>
      (await request(`/v1/posts/${id}/comments`, commentsResponseSchema, { signal })).comments,
    addComment: async (id: string, body: string) =>
      (
        await request(`/v1/posts/${id}/comments`, commentResponseSchema, {
          method: 'POST',
          body: { body },
        })
      ).comment,
    deleteComment: (id: string) => request(`/v1/comments/${id}`, null, { method: 'DELETE' }),
    createPrayerLink: async (postId: string, label: string) =>
      (
        await request(`/v1/posts/${postId}/prayer-links`, prayerLinkResponseSchema, {
          method: 'POST',
          body: { label },
        })
      ).link,

    groups: async (signal?: AbortSignal) =>
      (await request('/v1/groups', groupsResponseSchema, { signal })).groups,
    createGroup: async (values: CreateGroupValues) =>
      (await request('/v1/groups', groupResponseSchema, { method: 'POST', body: values })).group,
    updateGroup: async (id: string, values: CreateGroupValues) =>
      (await request(`/v1/groups/${id}`, groupResponseSchema, { method: 'PATCH', body: values }))
        .group,
    deleteGroup: (id: string) => request(`/v1/groups/${id}`, null, { method: 'DELETE' }),
    joinGroup: async (id: string) =>
      (await request(`/v1/groups/${id}/membership`, groupResponseSchema, { method: 'PUT' })).group,
    leaveGroup: (id: string) => request(`/v1/groups/${id}/membership`, null, { method: 'DELETE' }),
    members: async (id: string, signal?: AbortSignal) =>
      (await request(`/v1/groups/${id}/members`, groupMembersResponseSchema, { signal })).members,
    invite: (id: string, userId: string) =>
      request(`/v1/groups/${id}/members`, null, { method: 'POST', body: { userId } }),
    removeMember: (id: string, userId: string) =>
      request(`/v1/groups/${id}/members/${userId}`, null, { method: 'DELETE' }),
    setRole: (id: string, userId: string, role: 'admin' | 'member') =>
      request(`/v1/groups/${id}/members/${userId}`, null, { method: 'PATCH', body: { role } }),

    search: async (q: string, signal?: AbortSignal) =>
      (await request(`/v1/people/search${query({ q })}`, peopleSearchResponseSchema, { signal }))
        .people,
    connections: async (signal?: AbortSignal) =>
      (await request('/v1/connections', connectionsResponseSchema, { signal })).connections,
    requestFriend: async (userId: string) =>
      (
        await request('/v1/connections', connectionResponseSchema, {
          method: 'POST',
          body: { userId },
        })
      ).connection,
    respond: async (id: string, accept: boolean) =>
      (
        await request(`/v1/connections/${id}`, connectionResponseSchema, {
          method: 'PATCH',
          body: { accept },
        })
      ).connection,
    removeFriend: (id: string) => request(`/v1/connections/${id}`, null, { method: 'DELETE' }),
  };
}
export type CommunityApi = ReturnType<typeof communityApi>;

export const prayerLinkApi = {
  open: async (token: string, signal?: AbortSignal) =>
    (
      await publicRequest(`/v1/public/prayer-links/${token}`, publicPrayerResponseSchema, {
        signal,
      })
    ).request,
  answer: async (token: string, note: string) =>
    (
      await publicRequest(`/v1/public/prayer-links/${token}/prayers`, publicPrayerResponseSchema, {
        method: 'POST',
        body: note ? { note } : {},
      })
    ).request,
};

export const prayerLinkUrl = (token: string) => `${window.location.origin}/pray/${token}`;
