import {
  encouragementTextSchema,
  occasionPassages,
  type EncouragementRequest,
  type EncouragementText,
  type MorningWordResponse,
} from '@ebenezer/contracts';
import type { EncouragementProvider } from '../../shared/ai/provider.js';
import { verifiedMorningVerse } from '../../shared/bible/morning-bible.js';
import type { ScriptureProvider } from '../../shared/bible/provider.js';

type Reference = readonly [book: string, chapter: number, verse: number];

// Curated fallbacks when AI selection is unavailable. Text always comes from the verified WEB Bible.
export const morningVerses: Record<
  NonNullable<EncouragementRequest['weather']> | 'any',
  readonly Reference[]
> = {
  any: [
    ['Psalm', 143, 8],
    ['Psalm', 5, 3],
    ['Psalm', 90, 14],
    ['Psalm', 118, 24],
    ['Isaiah', 41, 10],
    ['Joshua', 1, 9],
    ['Psalm', 46, 1],
    ['Matthew', 11, 28],
    ['John', 14, 27],
    ['Romans', 15, 13],
    ['Zephaniah', 3, 17],
    ['Psalm', 121, 2],
    ['Isaiah', 40, 31],
    ['John', 8, 12],
    ['Proverbs', 3, 5],
    ['2 Corinthians', 12, 9],
    ['1 John', 4, 19],
    ['Psalm', 23, 1],
    ['Philippians', 4, 7],
    ['Deuteronomy', 31, 8],
  ],
  clear: [
    ['Psalm', 19, 1],
    ['Psalm', 84, 11],
    ['Psalm', 118, 24],
    ['John', 8, 12],
  ],
  cloudy: [
    ['Psalm', 36, 5],
    ['Isaiah', 41, 10],
    ['Psalm', 46, 1],
  ],
  rain: [
    ['Hosea', 6, 3],
    ['Psalm', 147, 8],
    ['Deuteronomy', 32, 2],
    ['Matthew', 11, 28],
  ],
  snow: [
    ['Isaiah', 1, 18],
    ['Psalm', 147, 16],
    ['Lamentations', 3, 23],
  ],
  storm: [
    ['Mark', 4, 39],
    ['Psalm', 107, 29],
    ['Isaiah', 25, 4],
    ['Nahum', 1, 7],
  ],
};

const occasionReferences: Record<NonNullable<EncouragementRequest['occasion']>, Reference> = {
  christmas: ['Luke', 2, 11],
  easter: ['Matthew', 28, 6],
  goodFriday: ['Romans', 5, 8],
  newYear: ['Lamentations', 3, 23],
};

const prepared: Record<EncouragementRequest['language'], EncouragementText> = {
  en: {
    message:
      'Before the day begins, pause with this Word. You can carry it with you into classes, conversations and quiet moments.',
    prayer: 'Jesus, go with me today. Help me notice Your care and carry this Word with me. Amen.',
    question: 'What thought would you like to carry into today?',
  },
  es: {
    message:
      'Antes de comenzar el día, haz una pausa con esta Palabra. Puedes llevarla contigo a clases, conversaciones y momentos de calma.',
    prayer:
      'Jesús, acompáñame hoy. Ayúdame a reconocer Tu cuidado y llevar esta Palabra conmigo. Amén.',
    question: '¿Qué pensamiento te gustaría llevar contigo hoy?',
  },
};

/** Deterministic daily choice so every visitor sees the same fallback on the same date. */
function dailyFallback(input: EncouragementRequest): Reference {
  if (input.occasion) return occasionReferences[input.occasion];
  const pool = morningVerses[input.weather ?? 'any'];
  const day = Math.floor(
    Date.parse(input.date ?? new Date().toISOString().slice(0, 10)) / 86400000,
  );
  return pool[day % pool.length];
}

export function createMorningService(
  provider?: EncouragementProvider,
  now = Date.now,
  scriptureProvider?: ScriptureProvider,
) {
  async function resolve(book: string, chapter: number, verse: number, key: string) {
    if (scriptureProvider) {
      try {
        return await scriptureProvider.passage(book, chapter, verse, verse, key);
      } catch {
        /* Clearly attributed WEB fallback keeps the encounter available. */
      }
    }
    return verifiedMorningVerse(book, chapter, verse, key);
  }
  // Keys hold only public date, language, occasion and weather category: bounded AI usage.
  const cache = new Map<string, { expires: number; value: MorningWordResponse }>();
  const pending = new Map<string, Promise<MorningWordResponse>>();

  async function chooseVerse(input: EncouragementRequest, key: string) {
    if (provider?.selectMorningReference) {
      try {
        const { book, chapter, verse } = await provider.selectMorningReference(input);
        const snapshot = await resolve(book, chapter, verse, key);
        // A lone fragment or a long passage does not carry well through a day.
        if (snapshot.text.length >= 25 && snapshot.text.length <= 450)
          return { snapshot, selected: true };
      } catch {
        /* Unknown references fall back to curated verified Scripture. */
      }
    }
    const [book, chapter, verse] = dailyFallback(input);
    try {
      return {
        snapshot: await resolve(book, chapter, verse, key),
        selected: false,
      };
    } catch {
      return { snapshot: undefined, selected: false };
    }
  }

  return {
    async get(input: EncouragementRequest): Promise<MorningWordResponse> {
      const key = `${input.date ?? 'today'}:${input.language}:${input.occasion ?? 'ordinary'}:${input.weather ?? 'unknown'}`;
      const existing = cache.get(key);
      if (existing && existing.expires > now()) return existing.value;
      const running = pending.get(key);
      if (running) return running;
      const operation = (async () => {
        const { snapshot, selected } = await chooseVerse(input, key);
        // The bundled KJV occasion passage is the last resort if the dataset cannot load.
        const scripture = snapshot
          ? {
              reference: snapshot.reference,
              text: snapshot.text,
              translation: snapshot.translation,
              ...(snapshot.provider
                ? {
                    provider: snapshot.provider,
                    attribution: snapshot.attribution,
                    sourceUrl: snapshot.sourceUrl,
                  }
                : {}),
            }
          : input.occasion
            ? occasionPassages[input.occasion]
            : undefined;
        if (!scripture) throw new Error('Morning Scripture unavailable');
        let value: MorningWordResponse = {
          scripture,
          encouragement: prepared[input.language],
          source: 'prepared',
          ...(snapshot ? { snapshot } : {}),
        };
        try {
          if (provider)
            value = {
              ...value,
              encouragement: encouragementTextSchema.parse(
                await provider.generate({ ...input, scripture }),
              ),
              source: 'ai',
            };
        } catch {
          // Keep verified Scripture and a usable prepared encouragement on quota/network failures.
        }
        if (cache.size >= 200) cache.delete(cache.keys().next().value!);
        cache.set(key, {
          // A verse chosen by AI stays for the day; fallbacks retry selection soon.
          expires: now() + (selected && value.source === 'ai' ? 24 * 60 : 10) * 60 * 1000,
          value,
        });
        return value;
      })();
      pending.set(key, operation);
      try {
        return await operation;
      } finally {
        pending.delete(key);
      }
    },
  };
}
