import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/auth-provider';
import { accountSession, authFixture, otherAccountId } from '@/test/auth';
import { useCommunity } from './use-community';

it('ignores an earlier account publication that finishes after switching accounts', async () => {
  const fixture = authFixture(accountSession());
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      if (path === '/v1/posts' && init?.method === 'POST')
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return new Response(
        JSON.stringify(
          path === '/v1/feed'
            ? { posts: [], nextCursor: null }
            : path === '/v1/groups'
              ? { groups: [] }
              : { connections: [] },
        ),
      );
    }),
  );
  function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider client={fixture.client}>{children}</AuthProvider>;
  }
  const { result } = renderHook(() => useCommunity(), { wrapper: Wrapper });
  await waitFor(() => expect(result.current.status).toBe('ready'));
  let pending!: ReturnType<typeof result.current.actions.publish>;
  act(() => {
    pending = result.current.actions.publish({
      kind: 'experience',
      audience: 'community',
      body: 'Private account context',
    });
  });
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  act(() => fixture.emit(accountSession(otherAccountId)));
  await waitFor(() => expect(result.current.owner).toBe(otherAccountId));
  await waitFor(() => expect(result.current.status).toBe('ready'));
  await act(async () => {
    finish(
      new Response(
        JSON.stringify({
          post: {
            id: 'd0000000-0000-4000-8000-000000000001',
            author: { id: accountSession().user.id, displayName: 'Alex', handle: 'alex' },
            kind: 'experience',
            audience: 'community',
            body: 'Private account context',
            prayerCount: 0,
            commentCount: 0,
            viewerPrayed: false,
            isOwn: true,
            prayingNames: [],
            createdAt: '2026-10-06T12:00:00.000Z',
            updatedAt: '2026-10-06T12:00:00.000Z',
          },
        }),
      ),
    );
    await pending;
  });
  expect(result.current.posts).toEqual([]);
});
