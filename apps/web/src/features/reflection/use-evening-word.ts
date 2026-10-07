import * as React from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  eveningWordResponseSchema,
  morningPassage,
  publicPassageReferenceSchema,
  scriptureSnapshotSchema,
  songForFeelings,
  type ReflectionValues,
} from '@ebenezer/contracts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { publicRequest } from '@/lib/api/client';
import { journeySearchInput, useJourneyWord } from './use-journey-word';

// AI-chosen passages are marked so they keep their "suggested by AI" label after reopening.
const AI_PREFIX = 'ai:';
export const isAiChosen = (inputKey: string | undefined) => !!inputKey?.startsWith(AI_PREFIX);

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Tonight's Word from her feelings and words: chosen by AI when online, with the verified
 * text from the server, otherwise found by the on-device search. AI suggests a song, confirmed in a music catalog; offline, one is chosen from her feelings.
 */
export function useEveningWord(form: UseFormReturn<ReflectionValues>, enabled: boolean) {
  const { i18n } = useTranslation();
  const online = useOnlineStatus();
  useWatch({ control: form.control, name: ['feelings', 'checkIn'] });
  const { inputKey } = journeySearchInput(form.getValues());
  const [mode, setMode] = React.useState<'ai' | 'device'>('ai');
  const [phase, setPhase] = React.useState<'idle' | 'searching' | 'done'>('idle');
  const [attempt, setAttempt] = React.useState(0);
  const offered = React.useRef<string[]>([]);
  const songFor = React.useRef(form.getValues('song') ? inputKey : undefined);
  const device = useJourneyWord(form, enabled && (mode === 'device' || !online));
  const useAi = mode === 'ai' && online;

  React.useEffect(() => {
    if (!enabled || !useAi) return;
    const current = form.getValues('scripture')?.inputKey;
    if ((current === inputKey || current === AI_PREFIX + inputKey) && attempt === 0) {
      setPhase('done');
      return;
    }
    const values = form.getValues();
    const morning = values.morningWord;
    const morningReference = morning
      ? (morning.scripture?.reference ?? morningPassage(morning.input).reference)
      : undefined;
    const request = new AbortController();
    setPhase('searching');
    void publicRequest('/v1/evening-word', eveningWordResponseSchema, {
      method: 'POST',
      body: {
        language: i18n.resolvedLanguage === 'es' ? 'es' : 'en',
        date: today(),
        feelings: values.feelings ?? (values.feel ? [values.feel] : []),
        ...(values.checkIn?.trim() ? { checkIn: values.checkIn.trim().slice(0, 2000) } : {}),
        ...(morningReference && publicPassageReferenceSchema.safeParse(morningReference).success
          ? { morningReference }
          : {}),
        ...(morning?.thought ? { thought: morning.thought } : {}),
        ...(offered.current.length ? { exclude: offered.current.slice(-10) } : {}),
      },
      signal: request.signal,
    })
      .then((value) => {
        if (request.signal.aborted) return;
        const snapshot = scriptureSnapshotSchema.parse({
          ...value.scripture,
          context: value.note ?? '',
          inputKey: AI_PREFIX + inputKey,
        });
        offered.current.push(snapshot.reference);
        form.setValue('ref', snapshot.reference, { shouldDirty: true });
        form.setValue('scripture', snapshot, { shouldDirty: true });
        form.clearErrors('ref');
        if (value.song) {
          form.setValue('song', value.song, { shouldDirty: true });
          songFor.current = inputKey;
        }
        setPhase('done');
      })
      .catch(() => {
        // Quota, network or no AI configured: the device search continues the evening.
        if (!request.signal.aborted) setMode('device');
      });
    return () => request.abort();
  }, [enabled, useAi, inputKey, attempt, form, i18n.resolvedLanguage]);

  const currentPhase = useAi ? phase : device.phase;
  // A song for what she shared, even when AI found none or the device search chose the passage.
  React.useEffect(() => {
    if (currentPhase !== 'done' || songFor.current === inputKey) return;
    songFor.current = inputKey;
    const values = form.getValues();
    const { title, artist } = songForFeelings(
      values.feelings ?? (values.feel ? [values.feel] : []),
      today(),
    );
    form.setValue('song', { title, artist }, { shouldDirty: true });
  }, [currentPhase, inputKey, form]);

  if (!useAi) return { ...device, source: 'device' as const };
  return {
    phase: phase === 'idle' ? 'searching' : phase,
    percent: undefined,
    error: 'search',
    canExplore: phase === 'done',
    source: 'ai' as const,
    explore() {
      const current = form.getValues('ref');
      if (current && !offered.current.includes(current)) offered.current.push(current);
      setAttempt((value) => value + 1);
    },
    retry() {
      setAttempt((value) => value + 1);
    },
    useBundledWord() {
      setMode('device');
      device.useBundledWord();
    },
  };
}
