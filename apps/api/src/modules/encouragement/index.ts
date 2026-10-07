import type { FastifyInstance } from 'fastify';
import {
  encouragementRequestSchema,
  journeySummaryRequestSchema,
  journeySummaryResponseSchema,
  encouragementPassages,
  eveningPromptRequestSchema,
  eveningWordRequestSchema,
  type EveningWordResponse,
  type EveningPromptResponse,
  type JourneySummaryResponse,
  scriptureSnapshotSchema,
  wordMoments,
  type ScriptureSnapshot,
} from '@ebenezer/contracts';
import { z } from 'zod';
import type { ScriptureProvider } from '../../shared/bible/provider.js';
import { ApiError } from '../../shared/errors/api-error.js';
import { requireAuth } from '../../shared/http/auth.js';
import { noStore } from '../../shared/http/no-store.js';
import { rateLimit } from '../../shared/http/rate-limit.js';
import { verifiedPassage } from '../../shared/bible/morning-bible.js';
import { createItunesCatalog, type SongCatalog } from '../../shared/music/song-catalog.js';
import type { AuthGateway } from '../../shared/supabase/auth-gateway.js';
import type { EncouragementProvider } from '../../shared/ai/provider.js';
import { createMorningService } from './morning.service.js';
import { createEncouragementService } from './encouragement.service.js';
import { createNotificationWordService } from './notification.service.js';

export function registerEncouragementRoutes(
  app: FastifyInstance,
  gateway?: AuthGateway,
  provider?: EncouragementProvider,
  songCatalog: SongCatalog = createItunesCatalog(),
  scriptureProvider?: ScriptureProvider,
) {
  const morning = createMorningService(provider, Date.now, scriptureProvider);
  const notificationWords = createNotificationWordService(scriptureProvider);
  app.post(
    '/notification-word',
    { onRequest: rateLimit({ max: 120, windowMs: 3600000 }), onSend: noStore },
    async (request) => {
      const input = z.strictObject({ date: z.iso.date() }).safeParse(request.body);
      if (!input.success || Math.abs(Date.parse(input.data.date) - Date.now()) > 2 * 86400000)
        throw new ApiError(400, 'invalid_request', 'Provide the current notification date.');
      try {
        return await notificationWords.get(input.data.date);
      } catch {
        throw new ApiError(503, 'unavailable', 'Notification Scripture is unavailable.');
      }
    },
  );
  async function resolve(
    book: string,
    chapter: number,
    firstVerse: number,
    lastVerse: number,
    key: string,
  ) {
    if (scriptureProvider) {
      try {
        return await scriptureProvider.passage(book, chapter, firstVerse, lastVerse, key);
      } catch {
        /* Verified, separately attributed WEB remains available on outages. */
      }
    }
    return verifiedPassage(book, chapter, firstVerse, lastVerse, key);
  }
  // Only a reference crosses this boundary; device search keeps private inputs local.
  app.post(
    '/scripture',
    { onRequest: rateLimit({ max: 30, windowMs: 3600000 }), onSend: noStore },
    async (request) => {
      const parsed = z
        .strictObject({
          book: z.string().min(1).max(80),
          chapter: z.number().int().min(1).max(150),
          firstVerse: z.number().int().min(1).max(200),
          lastVerse: z.number().int().min(1).max(200),
        })
        .safeParse(request.body);
      if (!parsed.success || parsed.data.lastVerse < parsed.data.firstVerse)
        throw new ApiError(400, 'invalid_request', 'Provide a valid Scripture reference.');
      const { book, chapter, firstVerse, lastVerse } = parsed.data;
      try {
        return scriptureSnapshotSchema.parse(
          await resolve(book, chapter, firstVerse, lastVerse, 'reference'),
        );
      } catch {
        throw new ApiError(503, 'unavailable', 'Scripture is unavailable.');
      }
    },
  );
  const wordCache = new Map<string, { expires: number; value: ScriptureSnapshot }>();
  app.get(
    '/word/:moment',
    { onRequest: rateLimit({ max: 240, windowMs: 60000 }) },
    async (request, reply) => {
      const moment = wordMoments.find(
        (item) => item.id === (request.params as { moment?: string }).moment,
      );
      if (!moment) throw new ApiError(404, 'not_found', 'Unknown Word.');
      const cached = wordCache.get(moment.id);
      reply.header('Cache-Control', 'public, max-age=300');
      if (cached && cached.expires > Date.now()) return cached.value;
      try {
        const value = scriptureSnapshotSchema.parse(
          await resolve(
            moment.book,
            moment.chapter,
            moment.firstVerse,
            moment.lastVerse,
            `word:${moment.id}`,
          ),
        );
        wordCache.set(moment.id, { expires: Date.now() + 6 * 3600000, value });
        return value;
      } catch {
        reply.header('Cache-Control', 'no-store');
        throw new ApiError(503, 'unavailable', 'Scripture is unavailable.');
      }
    },
  );
  const publicRequests = new Map<string, { time: number; count: number }>();
  app.post('/morning-word', { onSend: noStore }, async (request) => {
    const parsed = encouragementRequestSchema.safeParse(request.body);
    if (
      !parsed.success ||
      !parsed.data.date ||
      Math.abs(Date.parse(parsed.data.date) - Date.parse(new Date().toISOString().slice(0, 10))) >
        2 * 86400000
    )
      throw new ApiError(400, 'invalid_request', 'Provide today’s public calendar context.');
    const now = Date.now();
    let limit = publicRequests.get(request.ip);
    if (!limit || limit.time < now - 3600000) {
      limit = { time: now, count: 0 };
      if (publicRequests.size >= 1000) publicRequests.delete(publicRequests.keys().next().value!);
      publicRequests.set(request.ip, limit);
    }
    if (++limit.count > 30) throw new ApiError(429, 'rate_limited', 'Please try again later.');
    return morning.get(parsed.data);
  });
  const service = createEncouragementService(provider);
  const summaries = new Map<string, { expires: number; value: JourneySummaryResponse }>();
  const pending = new Map<string, Promise<JourneySummaryResponse>>();
  const evening = new Map<string, { expires: number; value: EveningPromptResponse }>();
  app.post(
    '/evening-prompt',
    { onRequest: rateLimit({ max: 30, windowMs: 3600000 }), onSend: noStore },
    async (request) => {
      const parsed = eveningPromptRequestSchema.safeParse(request.body);
      if (!parsed.success)
        throw new ApiError(400, 'invalid_request', 'Provide the morning reference and language.');
      const key = JSON.stringify(parsed.data);
      const cached = evening.get(key);
      if (cached && cached.expires > Date.now()) return cached.value;
      let value: EveningPromptResponse = {
        source: 'prepared',
        question:
          parsed.data.language === 'es'
            ? 'Entonces, ¿cómo fue tu día? Cuéntaselo a Él, los momentos luminosos y los difíciles.'
            : 'So, how was your day? Tell Him about it, the bright moments and the heavy ones.',
      };
      try {
        if (provider?.eveningQuestion)
          value = {
            source: 'ai',
            question: await provider.eveningQuestion(parsed.data),
          };
      } catch {
        /* The prepared question keeps the evening reflection usable. */
      }
      if (evening.size >= 200) evening.delete(evening.keys().next().value!);
      evening.set(key, {
        value,
        expires: Date.now() + (value.source === 'ai' ? 21600000 : 60000),
      });
      return value;
    },
  );
  // Her feelings and words choose tonight's passage; only verified WEB text is ever returned.
  app.post(
    '/evening-word',
    { onRequest: rateLimit({ max: 30, windowMs: 3600000 }), onSend: noStore },
    async (request): Promise<EveningWordResponse> => {
      const parsed = eveningWordRequestSchema.safeParse(request.body);
      if (!parsed.success)
        throw new ApiError(400, 'invalid_request', 'Provide feelings, words and language only.');
      if (!provider?.selectEveningWord)
        throw new ApiError(503, 'unavailable', 'AI passage selection is not configured.');
      const exclude = [...(parsed.data.exclude ?? [])];
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const choice = await provider.selectEveningWord({
            ...parsed.data,
            exclude,
          });
          const scripture = await resolve(
            choice.book,
            choice.chapter,
            choice.firstVerse,
            choice.lastVerse,
            'evening',
          );
          if (scripture.text.length > 1500 || exclude.includes(scripture.reference)) {
            exclude.push(scripture.reference);
            continue;
          }
          // Show the first suggested song the catalog confirms; none rather than an invented one.
          let song;
          for (const candidate of choice.songs) {
            song = await songCatalog.verify(candidate).catch(() => undefined);
            if (song) break;
          }
          return {
            scripture,
            note: choice.note,
            ...(song ? { song } : {}),
            source: 'ai',
          };
        } catch {
          /* Unknown references or AI failures retry once, then fall back on the device. */
        }
      }
      throw new ApiError(503, 'unavailable', 'No verified passage could be chosen.');
    },
  );
  // Public like the morning Word: stones live on her device, and nothing is stored here.
  app.post(
    '/journey-summary',
    {
      bodyLimit: 524288,
      onRequest: rateLimit({ max: 30, windowMs: 3600000 }),
      onSend: noStore,
    },
    async (request) => {
      const parsed = journeySummaryRequestSchema.safeParse(request.body);
      if (!parsed.success)
        throw new ApiError(400, 'invalid_request', 'Provide day counts and language only.');
      const { counts, language, passages, stones } = parsed.data;
      const key = JSON.stringify(parsed.data);
      const cached = summaries.get(key);
      if (cached && cached.expires > Date.now()) return cached.value;
      if (pending.has(key)) return pending.get(key);
      const operation = (async () => {
        let value: JourneySummaryResponse = {
          source: 'prepared',
          reflection:
            language === 'es'
              ? {
                  message:
                    'Tu camino tiene espacio para días difíciles, mixtos y luminosos. La Escritura recuerda el amor fiel de Dios, incluso cuando quedan preguntas. Al mirar atrás, ¿dónde reconoces Su cuidado?',
                  prayer:
                    'Jesús, ayúdame a recordar Tu amor y traer lo que sigue siendo difícil. Amén.',
                  question: '¿Qué piedra te gustaría volver a visitar hoy?',
                }
              : {
                  message:
                    'Your journey has room for hard, mixed, and bright days. Scripture points to God’s faithful love, even when questions remain. As you look back, where do you recognize His care?',
                  prayer:
                    'Jesus, help me remember Your love and bring You what still feels difficult. Amen.',
                  question: 'Which stone would you like to revisit today?',
                },
        };
        try {
          if (provider)
            value = journeySummaryResponseSchema.parse({
              source: 'ai',
              reflection: await provider.generate({
                theme: 'remember',
                language,
                scripture: encouragementPassages.remember,
                journey: counts,
                ...(stones ? { stones } : {}),
                ...(passages?.length ? { passageReferences: passages } : {}),
              }),
            });
        } catch (error) {
          // Keep a usable reflection when quota or generation fails. The reason holds only an
          // HTTP status or failure kind, never journal content.
          request.log.warn(
            {
              reason: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
            },
            'Journey summary used the prepared reflection',
          );
        }
        if (summaries.size >= 100) summaries.delete(summaries.keys().next().value!);
        summaries.set(key, {
          value,
          expires: Date.now() + (value.source === 'ai' ? 21600000 : 60000),
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
  );
  app.post(
    '/encouragement',
    { onRequest: requireAuth(gateway), onSend: noStore },
    async (request) => {
      const input = encouragementRequestSchema.safeParse(request.body);
      if (!input.success)
        throw new ApiError(400, 'invalid_request', 'Choose a supported theme and language.');
      return service.get(input.data);
    },
  );
}
