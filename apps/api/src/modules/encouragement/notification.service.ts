import { notificationWordSchema } from '@ebenezer/contracts';
import type { ScriptureProvider } from '../../shared/bible/provider.js';

// Short complete verses reviewed for the invitation to explore Jesus' love. Not AI text.
const references = [
  ['1 John', 4, 19],
  ['John', 3, 16],
  ['Romans', 5, 8],
  ['Matthew', 11, 28],
  ['1 Peter', 5, 7],
  ['John', 14, 27],
  ['Psalm', 46, 1],
] as const;

export function createNotificationWordService(provider?: ScriptureProvider) {
  return {
    async get(date: string) {
      if (!provider) throw new Error('YouVersion is not configured');
      const day = Math.floor(Date.parse(date) / 86400000);
      const [book, chapter, verse] = references[day % references.length];
      const snapshot = await provider.passage(book, chapter, verse, verse, 'notification');
      // Do not truncate Scripture or substitute an unattributed fallback for a preview.
      return notificationWordSchema.parse({
        date,
        book,
        chapter,
        verse,
        reference: snapshot.reference,
        text: snapshot.text,
        translation: snapshot.translation,
        provider: snapshot.provider,
        attribution: snapshot.attribution,
        sourceUrl: snapshot.sourceUrl,
      });
    },
  };
}
