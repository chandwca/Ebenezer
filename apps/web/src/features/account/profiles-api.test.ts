import { expect, it, vi } from 'vitest';
import {
  accountId,
  accountSession,
  authFixture,
  otherAccountId,
  profileFixture,
} from '@/test/auth';
import { getOwnProfile, saveOwnProfile } from './profiles-api';

it('uses the current access token and sends only explicitly submitted profile fields to Node', async () => {
  const fixture = authFixture(accountSession());
  fixture.emit(accountSession(accountId, 'new-token'), 'TOKEN_REFRESHED');
  const request = vi.fn(
    async () => new Response(JSON.stringify({ profile: profileFixture() }), { status: 200 }),
  );
  vi.stubGlobal('fetch', request);
  await saveOwnProfile(fixture.client, accountId, {
    displayName: 'Community Alex',
    handle: ' ALEX ',
  });
  const [url, options] = request.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://localhost:3001/v1/me');
  expect(options.headers).toEqual({
    Authorization: 'Bearer new-token',
    'Content-Type': 'application/json',
  });
  expect(options.body).toBe(JSON.stringify({ displayName: 'Community Alex', handle: 'alex' }));
  expect(options.cache).toBe('no-store');
  expect(options.credentials).toBe('omit');
});

it('treats only a profile 404 as first-time setup, preserving conflicts and expired-session errors', async () => {
  const { client } = authFixture(accountSession());
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response('raw database error', { status: 409 }))
    .mockResolvedValueOnce(new Response('raw token error', { status: 401 }));
  vi.stubGlobal('fetch', request);
  expect(await getOwnProfile(client, accountId)).toBeNull();
  await expect(saveOwnProfile(client, accountId, { handle: 'taken' })).rejects.toMatchObject({
    code: 'handle_taken',
    status: 409,
  });
  await expect(getOwnProfile(client, accountId)).rejects.toMatchObject({
    code: 'signed_out',
    status: 401,
  });
});

it('does not send a request with another account’s session or after sign-out', async () => {
  const fixture = authFixture(accountSession(otherAccountId));
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  await expect(getOwnProfile(fixture.client, accountId)).rejects.toMatchObject({ status: 401 });
  fixture.emit(null);
  await expect(getOwnProfile(fixture.client, accountId)).rejects.toMatchObject({ status: 401 });
  expect(request).not.toHaveBeenCalled();
});

it('rejects malformed responses and a response belonging to another account', async () => {
  const { client } = authFixture(accountSession());
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ profile: { id: accountId } })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ profile: profileFixture(otherAccountId) })),
      ),
  );
  await expect(getOwnProfile(client, accountId)).rejects.toMatchObject({
    code: 'invalid_response',
  });
  await expect(getOwnProfile(client, accountId)).rejects.toMatchObject({
    code: 'invalid_response',
  });
});
