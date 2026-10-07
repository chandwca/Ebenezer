import * as React from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { scriptureSnapshotSchema, type ReflectionValues } from '@ebenezer/contracts';
import { createBibleSearchWorker } from '@/lib/bible/worker-client';
import type { SearchResult, WorkerResponse } from '@/lib/bible/types';
import { passages } from '@/lib/scripture';
import { publicRequest } from '@/lib/api/client';

// Describe the person's feelings for the multilingual embedding model, never map to verse IDs.
const feelingMeaning: Record<string, string> = {
  overwhelmed: 'overwhelmed',
  anxious: 'anxious',
  lonely: 'lonely and wanting belonging',
  sad: 'sad',
  afraid: 'afraid',
  tired: 'tired and needing rest',
  ashamed: 'ashamed',
  homesick: 'missing home in a new country',
  uncertain: 'uncertain about my direction',
  grateful: 'grateful and thankful',
  hopeful: 'hopeful',
};

export function journeySearchInput(values: ReflectionValues) {
  const feelings = values.feelings ?? (values.feel ? [values.feel] : []);
  const words = values.checkIn?.trim() ?? '';
  return {
    inputKey: `${feelings.join(',')}\n${words}`,
    query: `${words}${feelings.length ? `\nI feel ${feelings.map((feeling) => feelingMeaning[feeling] ?? feeling).join(', ')}.` : ''}\nScripture for encouragement, God's care and hope.`,
  };
}

export function useJourneyWord(form: UseFormReturn<ReflectionValues>, enabled: boolean) {
  useWatch({ control: form.control, name: ['feelings', 'checkIn'] });
  const { inputKey, query } = journeySearchInput(form.getValues());
  const [phase, setPhase] = React.useState<
    'idle' | 'loading' | 'downloading' | 'searching' | 'done' | 'error'
  >('idle');
  const [percent, setPercent] = React.useState<number>();
  const [error, setError] = React.useState('setup');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [attempt, setAttempt] = React.useState(0);
  const completed = React.useRef<string | undefined>(undefined);
  const worker = React.useRef<Worker | undefined>(undefined);
  const generation = React.useRef(0);

  const accept = React.useCallback(
    async (result: SearchResult, key: string, id: number) => {
      let snapshot = scriptureSnapshotSchema.parse({
        ...result.passage,
        chapter: result.chapter,
        inputKey: key,
        translation: 'WEB Classic',
      });
      if (navigator.onLine) {
        try {
          const remote = await publicRequest('/v1/scripture', scriptureSnapshotSchema, {
            method: 'POST',
            body: {
              book: result.chapter.book,
              chapter: result.chapter.chapter,
              firstVerse: snapshot.firstVerse,
              lastVerse: snapshot.lastVerse,
            },
          });
          if (remote.provider === 'youversion') snapshot = { ...remote, inputKey: key };
        } catch {
          /* The exact device passage remains available offline or on outages. */
        }
      }
      if (generation.current !== id) return;
      if (form.getValues('ref') !== snapshot.reference) form.setValue('readConfirmed', false);
      form.setValue('ref', snapshot.reference, { shouldDirty: true });
      form.setValue('scripture', snapshot, { shouldDirty: true });
      form.clearErrors('ref');
      completed.current = key;
      setPhase('done');
    },
    [form],
  );

  React.useEffect(() => {
    if (!enabled) return;
    if (form.getValues('scripture')?.inputKey === inputKey || completed.current === inputKey) {
      setPhase('done');
      return;
    }
    const id = ++generation.current;
    setResults([]);
    setPercent(undefined);
    setPhase('loading');
    form.setValue('ref', '');
    form.setValue('scripture', undefined);
    form.setValue('readConfirmed', false);
    try {
      const search = createBibleSearchWorker();
      worker.current = search;
      search.onmessage = async (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id || generation.current !== id) return;
        const message = event.data;
        if (message.type === 'progress') {
          setPhase(message.phase);
          setPercent(message.percent);
        } else if (message.type === 'error') {
          setError(message.code);
          setPhase('error');
        } else {
          try {
            if (!message.results.length) throw new Error('No passages');
            setPhase('searching');
            await accept(message.results[0], inputKey, id);
            if (generation.current !== id) return;
            setResults(message.results);
          } catch {
            setError('search');
            setPhase('error');
          }
        }
      };
      search.onerror = () => {
        if (generation.current !== id) return;
        setError('setup');
        setPhase('error');
        search.terminate();
      };
      search.postMessage({ id, query, strategy: 'context' });
    } catch {
      setError('setup');
      setPhase('error');
    }
    return () => {
      generation.current++;
      worker.current?.terminate();
      worker.current = undefined;
    };
  }, [enabled, inputKey, query, attempt, accept, form]);

  return {
    phase,
    percent,
    error,
    canExplore: results.length > 1,
    explore() {
      const index = results.findIndex(
        (result) => result.passage.reference === form.getValues('ref'),
      );
      setPhase('searching');
      void accept(results[(index + 1) % results.length], inputKey, ++generation.current);
    },
    retry() {
      completed.current = undefined;
      setAttempt((value) => value + 1);
    },
    useBundledWord() {
      generation.current++;
      worker.current?.terminate();
      worker.current = undefined;
      completed.current = inputKey;
      form.setValue('ref', passages[1].value, { shouldDirty: true });
      form.setValue('scripture', undefined);
      form.clearErrors('ref');
      setResults([]);
      setPhase('done');
    },
  };
}
