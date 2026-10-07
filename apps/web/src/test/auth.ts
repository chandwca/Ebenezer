import { vi } from 'vitest';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { BrowserAuthClient } from '@/lib/auth/client';

export const accountId = 'a0000000-0000-4000-8000-000000000001';
export const otherAccountId = 'b0000000-0000-4000-8000-000000000002';

export function accountSession(id = accountId, token = 'test-token'): Session {
  return {
    access_token: token,
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: {
      id,
      email: 'person@example.invalid',
      aud: 'authenticated',
      created_at: '2026-10-06T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
      is_anonymous: false,
    },
  };
}

export function authFixture(initial: Session | null = null) {
  let session = initial;
  const listeners = new Set<(event: AuthChangeEvent, session: Session | null) => void>();
  const unsubscribed = vi.fn();
  function emit(next: Session | null, event: AuthChangeEvent = next ? 'SIGNED_IN' : 'SIGNED_OUT') {
    session = next;
    for (const listener of listeners) listener(event, session);
  }
  const methods = {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback);
                unsubscribed();
              },
            },
          },
        };
      },
    ),
    signInWithOAuth: vi.fn(async () => ({
      data: { provider: 'google', url: 'https://example.invalid/oauth' },
      error: null,
    })),
    exchangeCodeForSession: vi.fn(async () => {
      const signedIn = accountSession();
      emit(signedIn);
      return { data: { session: signedIn, user: signedIn.user }, error: null };
    }),
    signOut: vi.fn(async () => {
      emit(null);
      return { error: null };
    }),
  };
  // Tests implement only the methods they exercise, not SDK subscription internals.
  const client = { auth: methods } as unknown as BrowserAuthClient;
  return { client, methods, emit, unsubscribed };
}

export function profileFixture(id = accountId, displayName = 'Community Alex') {
  return {
    id,
    displayName,
    handle: id === accountId ? 'alex' : 'blair',
    createdAt: '2026-10-06T00:00:00Z',
    updatedAt: '2026-10-06T00:00:00Z',
  };
}
