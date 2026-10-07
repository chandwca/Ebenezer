import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  journeySummaryResponseSchema,
  morningPassage,
  publicPassageReferenceSchema,
  type JourneySummaryResponse,
  type JourneyStone,
} from '@ebenezer/contracts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { publicRequest } from '@/lib/api/client';
import { journal } from '@/db/repositories';
import type { Stone } from '@/db/database';
import { RemembrancePanel } from '@/components/ui/remembrance-panel';

// The most recent stones are sent with her words; older ones as day and Scripture only.
const WITH_WORDS = 30;
const MAX_ENTRIES = 200;
// Shorter words keep Gemini's reply quick enough to wait for.
const clip = (value: string | undefined) => value?.trim().slice(0, 400) || undefined;

export function journeyStones(stones: Stone[]): JourneyStone[] {
  const sorted = [...stones]
    .filter((stone) => ['hard', 'mixed', 'bright'].includes(stone.tone))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const entries: JourneyStone[] = [];
  sorted.forEach((stone, index) => {
    const references = new Set<string>();
    if (publicPassageReferenceSchema.safeParse(stone.ref).success) references.add(stone.ref);
    if (stone.morningWord)
      references.add(
        stone.morningWord.scripture?.reference ?? morningPassage(stone.morningWord.input).reference,
      );
    const entry: JourneyStone = {
      tone: stone.tone as JourneyStone['tone'],
      passages: [...references].filter(
        (ref) => publicPassageReferenceSchema.safeParse(ref).success,
      ),
      count: 1,
    };
    if (index >= sorted.length - WITH_WORDS) {
      const feelings = stone.feelings ?? (stone.feel ? [stone.feel] : []);
      const reflection = clip(
        [stone.stood, stone.learned, stone.questions, stone.thoughts, stone.prayer]
          .filter(Boolean)
          .join('\n'),
      );
      // Prayer-partner names belong to other people and are never sent.
      Object.assign(entry, {
        date: stone.journalDate,
        ...(feelings.length ? { feelings } : {}),
        ...(clip(stone.checkIn) ? { checkIn: clip(stone.checkIn) } : {}),
        ...(clip(stone.morningWord?.thought) ? { thought: clip(stone.morningWord?.thought) } : {}),
        ...(reflection ? { reflection } : {}),
        ...(clip(stone.memory) ? { memory: clip(stone.memory) } : {}),
      });
      entries.push(entry);
      return;
    }
    const previous = entries.at(-1);
    if (
      previous &&
      !previous.date &&
      previous.tone === entry.tone &&
      JSON.stringify(previous.passages) === JSON.stringify(entry.passages)
    )
      previous.count++;
    else entries.push(entry);
  });
  return entries;
}

// Session-only cache: no additional calls when navigating back.
const cache = new Map<string, JourneySummaryResponse>();
export function JourneySummary({ stones }: { stones: Stone[] }) {
  const { i18n } = useTranslation();
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  const entries = journeyStones(stones);
  const counts = { hard: 0, mixed: 0, bright: 0 };
  for (const entry of entries) counts[entry.tone] += entry.count;
  if (!entries.length) return null;
  const body = JSON.stringify({
    language,
    counts,
    ...(entries.length <= MAX_ENTRIES ? { stones: entries } : {}),
  });
  return <SummarySession key={body} body={body} />;
}

// The last AI reflection stays on this device, so a busy AI never replaces it with generic text.
const LAST_KEY = 'remembrance:last';
const RETRY_DELAYS = [20000, 20000];

function SummarySession({ body }: { body: string }) {
  const online = useOnlineStatus();
  const [result, setResult] = React.useState(() => cache.get(body));
  const [busy, setBusy] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  const language = JSON.parse(body).language;

  React.useEffect(() => {
    if (cache.has(body)) return;
    let active = true;
    journal
      .getPreference(LAST_KEY)
      .then((saved) => {
        const parsed = journeySummaryResponseSchema.safeParse(
          typeof saved?.value === 'string' ? JSON.parse(saved.value) : undefined,
        );
        if (active && parsed.success && parsed.data.source === 'ai')
          // Whichever arrives first, an AI reflection outranks prepared text.
          setResult((current) => (current?.source === 'ai' ? current : parsed.data));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [body]);

  React.useEffect(() => {
    if (!online || cache.has(body)) return;
    const controller = new AbortController();
    let retry: ReturnType<typeof setTimeout> | undefined;
    setBusy(true);
    void publicRequest('/v1/journey-summary', journeySummaryResponseSchema, {
      method: 'POST',
      body: JSON.parse(body),
      signal: controller.signal,
      // The server may wait up to 30 seconds for Gemini to read the whole journal.
      timeoutMs: 45000,
    })
      .then((value) => {
        if (controller.signal.aborted) return;
        if (value.source === 'ai') {
          if (cache.size >= 100) cache.delete(cache.keys().next().value!);
          cache.set(body, value);
          setResult(value);
          void journal.setPreference(LAST_KEY, JSON.stringify(value)).catch(() => undefined);
          return;
        }
        // AI busy: keep any earlier AI reflection, otherwise show the prepared one.
        setResult((current) => (current?.source === 'ai' ? current : value));
        if (attempt < RETRY_DELAYS.length)
          retry = setTimeout(() => setAttempt((count) => count + 1), RETRY_DELAYS[attempt]);
      })
      .catch(() => {
        /* Keep the gentle local remembrance available. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => {
      controller.abort();
      clearTimeout(retry);
    };
  }, [body, online, attempt]);
  return <RemembrancePanel busy={busy} result={result} language={language} />;
}
