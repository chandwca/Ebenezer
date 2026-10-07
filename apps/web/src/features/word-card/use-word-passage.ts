import * as React from 'react';
import { scriptureSnapshotSchema, type ScriptureSnapshot } from '@ebenezer/contracts';
import { publicRequest } from '@/lib/api/client';
import type { WordMoment } from '@/lib/word-card';

type State = { status: 'loading' | 'error' } | { status: 'ready'; snapshot: ScriptureSnapshot };

export function useWordPassage(moment: WordMoment | undefined) {
  const [state, setState] = React.useState<State>({ status: 'loading' });
  const [attempt, setAttempt] = React.useState(0);
  const id = moment?.id;
  React.useEffect(() => {
    if (!moment) return;
    const controller = new AbortController();
    setState({ status: 'loading' });
    publicRequest(`/v1/word/${moment.id}`, scriptureSnapshotSchema, {
      signal: controller.signal,
    })
      .then((snapshot) => {
        if (!controller.signal.aborted) setState({ status: 'ready', snapshot });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' });
      });
    return () => controller.abort();
  }, [id, attempt]);
  return { ...state, retry: () => setAttempt((count) => count + 1) };
}
