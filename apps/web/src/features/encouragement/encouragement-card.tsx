import { EncouragementPanel } from '@/components/ui/encouragement-panel';
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  morningWordResponseSchema,
  encouragementRequestSchema,
  morningContext,
  encouragementPassages,
  type EncouragementRequest,
  type MorningWordResponse,
} from '@ebenezer/contracts';
import { journal } from '@/db/repositories';
import { cityWeather } from './weather';
import { useStudentProfile } from '@/features/profile/use-student-profile';
import { useAutosave } from '@/hooks/use-autosave';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { publicRequest } from '@/lib/api/client';

export function EncouragementCard() {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  return <AccountEncouragement key={language} language={language} />;
}

function AccountEncouragement({ language }: { language: EncouragementRequest['language'] }) {
  const online = useOnlineStatus();
  const profile = useStudentProfile();
  const [date, setDate] = React.useState(() => new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [weather, setWeather] = React.useState<Awaited<ReturnType<typeof cityWeather>>>();
  const [thought, setThought] = React.useState('');
  const [carriedThought, setCarriedThought] = React.useState('');
  const lockedDay = React.useRef('');
  const weatherController = React.useRef<AbortController | undefined>(undefined);
  const city = profile?.profile?.city;
  React.useEffect(() => {
    setWeather(undefined);
    weatherController.current?.abort();
    return () => weatherController.current?.abort();
  }, [city]);
  const day = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
  const input = { ...morningContext(date, weather?.category), language, date: day };
  const contextKey = JSON.stringify(input);
  const [result, setResult] = React.useState<MorningWordResponse>();
  const [loadedDay, setLoadedDay] = React.useState('');
  React.useEffect(() => {
    if (!profile) return;
    let active = true;
    const request = new AbortController();
    weatherController.current = request;
    setLoadedDay('');
    void (async () => {
      const saved = await journal.getPreference('today:morningWord').catch(() => undefined);
      try {
        const stored = typeof saved?.value === 'string' ? JSON.parse(saved.value) : undefined;
        const parsed = encouragementRequestSchema.safeParse(stored?.input);
        if (stored?.date === day && typeof stored.thought === 'string' && stored.thought) {
          if (active) {
            setCarriedThought(stored.thought);
            setThought(stored.thought);
          }
        }
        // One Word per day: once shown, keep it so Today and the evening tell the same story.
        const response = morningWordResponseSchema.safeParse(stored?.response);
        if (
          stored?.date === day &&
          response.success &&
          parsed.success &&
          parsed.data.language === language
        ) {
          if (active) {
            lockedDay.current = day;
            setResult(response.data);
            setWeather(
              parsed.data.weather
                ? { category: parsed.data.weather, place: stored.weatherPlace ?? '' }
                : undefined,
            );
          }
          return;
        }
        if (stored?.date === day && stored.city === city && parsed.success && parsed.data.weather) {
          if (active)
            setWeather({
              category: parsed.data.weather,
              place: typeof stored.weatherPlace === 'string' ? stored.weatherPlace : (city ?? ''),
            });
          return;
        }
      } catch {
        /* Ignore damaged optional preferences. */
      }
      if (city && online) {
        try {
          const value = await cityWeather(
            city,
            AbortSignal.any([request.signal, AbortSignal.timeout(5000)]),
          );
          if (active) setWeather(value);
        } catch {
          /* Calendar-only Word remains available. */
        }
      }
    })().finally(() => {
      if (active) setLoadedDay(day);
    });
    return () => {
      active = false;
      request.abort();
    };
  }, [day, city, !!profile, online]);
  React.useEffect(() => {
    if (loadedDay !== day) return;
    void journal
      .setPreference(
        'today:morningWord',
        JSON.stringify({
          date: day,
          input: {
            ...JSON.parse(contextKey),
            theme:
              Object.entries(encouragementPassages).find(
                ([, passage]) => passage.reference === result?.scripture.reference,
              )?.[0] ?? input.theme,
          },
          city,
          weatherPlace: weather?.place,
          contextKey,
          response: result,
          scripture: result?.snapshot,
          thought: carriedThought,
        }),
      )
      .catch(() => undefined);
  }, [day, contextKey, loadedDay, city, weather?.place, result, carriedThought]);
  React.useEffect(() => {
    if (loadedDay !== day || !online || lockedDay.current === day) return;
    const request = new AbortController();

    setResult(undefined);
    // Public request: works signed out. Only date, language, occasion and weather category are sent.
    void publicRequest('/v1/morning-word', morningWordResponseSchema, {
      method: 'POST',
      body: JSON.parse(contextKey),
      signal: request.signal,
    })
      .then((value) => {
        if (!request.signal.aborted) {
          lockedDay.current = day;
          setResult(value);
        }
      })
      .catch(() => {
        /* Prepared encouragement remains visible. */
      });
    return () => request.abort();
  }, [loadedDay, day, online, contextKey]);
  useAutosave(
    thought,
    async (value) => {
      const trimmed = value.trim();
      const saved = await journal.getPreference('today:morningWord');
      const existing = typeof saved?.value === 'string' ? JSON.parse(saved.value) : {};
      if (!trimmed && !existing.thought) return;
      await journal.setPreference(
        'today:morningWord',
        JSON.stringify({
          ...existing,
          date: day,
          input,
          scripture: result?.snapshot,
          thought: trimmed,
        }),
      );
      setCarriedThought(trimmed);
    },
    loadedDay === day,
  );
  return (
    <EncouragementPanel
      input={input}
      result={result}
      thought={thought}
      onThoughtChange={setThought}
    />
  );
}
