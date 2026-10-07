import { useEffect, useRef, useState } from 'react';
import type { CloudProfile, UpdateCloudProfile } from '@ebenezer/contracts';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { getOwnProfile, saveOwnProfile } from './profiles-api';

type ProfileState = {
  owner: string | undefined;
  status: 'loading' | 'ready' | 'error';
  profile: CloudProfile | null;
  error?: unknown;
};

export function useCloudProfile() {
  const { client, session } = useAuth();
  const owner = session?.user.id;
  const online = useOnlineStatus();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ProfileState>({ owner, status: 'loading', profile: null });
  const currentRequest = useRef<AbortController | null>(null);
  const actor = useRef(owner);
  actor.current = owner;

  useEffect(() => {
    const controller = new AbortController();
    currentRequest.current = controller;
    setState({ owner, status: 'loading', profile: null });
    if (client && owner && online) {
      void getOwnProfile(client, owner, controller.signal)
        .then((profile) => {
          if (!controller.signal.aborted) setState({ owner, status: 'ready', profile });
        })
        .catch((error: unknown) => {
          if (!controller.signal.aborted)
            setState({ owner, status: 'error', profile: null, error });
        });
    }
    return () => controller.abort();
  }, [client, owner, attempt, online]);

  async function save(values: UpdateCloudProfile) {
    if (!client || !owner || !online) throw new Error('account_unavailable');
    const signal = currentRequest.current?.signal;
    const profile = await saveOwnProfile(client, owner, values, signal);
    if (signal?.aborted || actor.current !== owner) return;
    setState({ owner, status: 'ready', profile });
  }

  // Never render the previous account's profile while the new effect starts.
  const visible =
    state.owner === owner ? state : { owner, status: 'loading' as const, profile: null };
  return { ...visible, online, save, reload: () => setAttempt((value) => value + 1) };
}
