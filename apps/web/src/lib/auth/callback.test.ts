import { expect, it } from 'vitest';
import { authFixture } from '@/test/auth';
import { completeOAuthCallback } from './callback';

it('exchanges a one-use code once even with simultaneous StrictMode requests', async () => {
  const { client, methods } = authFixture();
  const [one, two] = await Promise.all([
    completeOAuthCallback(client, 'one-use-code'),
    completeOAuthCallback(client, 'one-use-code'),
  ]);
  expect(one).toEqual(two);
  expect(methods.exchangeCodeForSession).toHaveBeenCalledOnce();
  await completeOAuthCallback(client, 'different-code');
  expect(methods.exchangeCodeForSession).toHaveBeenCalledTimes(2);
});

it('rejects an exchange without a permanent session without showing upstream errors', async () => {
  const { client, methods } = authFixture();
  methods.exchangeCodeForSession.mockRejectedValueOnce(new Error('network failed'));
  await expect(completeOAuthCallback(client, 'bad-code')).rejects.toThrow();
  // A failed one-use exchange is not blindly replayed.
  await expect(completeOAuthCallback(client, 'bad-code')).rejects.toThrow();
  expect(methods.exchangeCodeForSession).toHaveBeenCalledOnce();
});
