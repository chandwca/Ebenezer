import type { BrowserAuthClient } from './client';

// A one-use PKCE code must not be exchanged twice on a StrictMode remount.
const exchanges = new WeakMap<BrowserAuthClient, { code: string; promise: Promise<void> }>();

export function completeOAuthCallback(client: BrowserAuthClient, code: string): Promise<void> {
  const existing = exchanges.get(client);
  if (existing?.code === code) return existing.promise;
  const promise = client.auth.exchangeCodeForSession(code).then(({ data, error }) => {
    if (error || !data.session || data.session.user.is_anonymous)
      throw new Error('callback_failed');
    // The Auth provider owns the session. Do not retain tokens in the deduplication record.
  });
  exchanges.set(client, { code, promise });
  return promise;
}
