import { useState } from 'react';
import { useAuth } from './auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { rememberReturnPath } from '@/lib/auth/return-path';

export function useAccountActions() {
  const auth = useAuth();
  const online = useOnlineStatus();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** `returnTo` is where to land after Google; Settings by default. */
  async function signIn(returnTo?: string) {
    if (!auth.client || pending || !online) return;
    if (returnTo) rememberReturnPath(returnTo);
    setPending(true);
    setError(null);
    try {
      const { error } = await auth.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch {
      setError('account:errors.signIn');
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    if (!auth.client || pending) return;
    setPending(true);
    setError(null);
    try {
      // This device only; do not end the person's sessions on other devices.
      const { error } = await auth.client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch {
      setError('account:errors.signOut');
    } finally {
      setPending(false);
    }
  }
  return { ...auth, online, pending, error, signIn, signOut };
}
