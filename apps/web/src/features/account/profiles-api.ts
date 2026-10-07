import {
  cloudProfileResponseSchema,
  updateCloudProfileSchema,
  type UpdateCloudProfile,
} from '@ebenezer/contracts';
import type { BrowserAuthClient } from '@/lib/auth/client';
import { accountRequest, AccountApiError } from '@/lib/api/client';

export async function getOwnProfile(
  client: BrowserAuthClient,
  actorId: string,
  signal?: AbortSignal,
) {
  try {
    const { profile } = await accountRequest(
      client,
      actorId,
      '/v1/me',
      cloudProfileResponseSchema,
      { signal },
    );
    if (profile.id !== actorId) throw new AccountApiError('invalid_response');
    return profile;
  } catch (error) {
    if (error instanceof AccountApiError && error.code === 'profile_missing') return null;
    throw error;
  }
}

export async function saveOwnProfile(
  client: BrowserAuthClient,
  actorId: string,
  values: UpdateCloudProfile,
  signal?: AbortSignal,
) {
  const body = updateCloudProfileSchema.parse(values);
  const { profile } = await accountRequest(client, actorId, '/v1/me', cloudProfileResponseSchema, {
    method: 'PATCH',
    body,
    signal,
  });
  if (profile.id !== actorId) throw new AccountApiError('invalid_response');
  return profile;
}
