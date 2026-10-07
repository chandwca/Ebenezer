import { z } from 'zod';
import { scriptureSnapshotSchema } from '@ebenezer/contracts';
import type { ScriptureProvider } from './provider.js';

// This first integration supports only the public-domain BSB. Adding licensed editions
// requires their individual storage/distribution rules, not just another version ID.
const VERSION = 3034;
const codes: Record<string, string> = Object.fromEntries(
  [
    ['GEN', 'Genesis'],
    ['EXO', 'Exodus'],
    ['LEV', 'Leviticus'],
    ['NUM', 'Numbers'],
    ['DEU', 'Deuteronomy'],
    ['JOS', 'Joshua'],
    ['JDG', 'Judges'],
    ['RUT', 'Ruth'],
    ['1SA', '1 Samuel'],
    ['2SA', '2 Samuel'],
    ['1KI', '1 Kings'],
    ['2KI', '2 Kings'],
    ['1CH', '1 Chronicles'],
    ['2CH', '2 Chronicles'],
    ['EZR', 'Ezra'],
    ['NEH', 'Nehemiah'],
    ['EST', 'Esther'],
    ['JOB', 'Job'],
    ['PSA', 'Psalm'],
    ['PRO', 'Proverbs'],
    ['ECC', 'Ecclesiastes'],
    ['SNG', 'Song of Solomon'],
    ['ISA', 'Isaiah'],
    ['JER', 'Jeremiah'],
    ['LAM', 'Lamentations'],
    ['EZK', 'Ezekiel'],
    ['DAN', 'Daniel'],
    ['HOS', 'Hosea'],
    ['JOL', 'Joel'],
    ['AMO', 'Amos'],
    ['OBA', 'Obadiah'],
    ['JON', 'Jonah'],
    ['MIC', 'Micah'],
    ['NAM', 'Nahum'],
    ['HAB', 'Habakkuk'],
    ['ZEP', 'Zephaniah'],
    ['HAG', 'Haggai'],
    ['ZEC', 'Zechariah'],
    ['MAL', 'Malachi'],
    ['MAT', 'Matthew'],
    ['MRK', 'Mark'],
    ['LUK', 'Luke'],
    ['JHN', 'John'],
    ['ACT', 'Acts'],
    ['ROM', 'Romans'],
    ['1CO', '1 Corinthians'],
    ['2CO', '2 Corinthians'],
    ['GAL', 'Galatians'],
    ['EPH', 'Ephesians'],
    ['PHP', 'Philippians'],
    ['COL', 'Colossians'],
    ['1TH', '1 Thessalonians'],
    ['2TH', '2 Thessalonians'],
    ['1TI', '1 Timothy'],
    ['2TI', '2 Timothy'],
    ['TIT', 'Titus'],
    ['PHM', 'Philemon'],
    ['HEB', 'Hebrews'],
    ['JAS', 'James'],
    ['1PE', '1 Peter'],
    ['2PE', '2 Peter'],
    ['1JN', '1 John'],
    ['2JN', '2 John'],
    ['3JN', '3 John'],
    ['JUD', 'Jude'],
    ['REV', 'Revelation'],
  ].map(([code, name]) => [name, code]),
);
const versionSchema = z.object({
  id: z.literal(VERSION),
  abbreviation: z.literal('BSB'),
  copyright: z.string().optional(),
  promotional_content: z.string().optional(),
});
const passageSchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(4000),
  reference: z.string().min(1),
});
const chapterSchema = z.object({
  passage_id: z.string(),
  verses: z
    .array(z.object({ passage_id: z.string() }))
    .min(1)
    .max(200),
});

export function createYouVersionProvider(
  appKey: string,
  fetcher: typeof fetch = fetch,
): ScriptureProvider {
  const chapters = new Map<string, { verses: { number: number; text: string }[] }>();
  const pending = new Map<string, Promise<{ verses: { number: number; text: string }[] }>>();
  async function get(path: string, signal: AbortSignal) {
    const response = await fetcher(`https://api.youversion.com/v1/bibles/${VERSION}${path}`, {
      headers: { 'X-YVP-App-Key': appKey, Accept: 'application/json' },
      signal,
      cache: 'no-store',
      redirect: 'error',
    });
    // Never expose upstream bodies or credentials in errors/logs.
    if (!response.ok) throw new Error('YouVersion Scripture unavailable');
    return response.json();
  }
  async function loadChapter(code: string, chapter: number, signal: AbortSignal) {
    const id = `${code}.${chapter}`;
    if (chapters.has(id)) return chapters.get(id)!;
    if (pending.has(id)) return pending.get(id)!;
    const operation = (async () => {
      const index = chapterSchema.parse(await get(`/books/${code}/chapters/${chapter}`, signal));
      if (index.passage_id !== id) throw new Error('Unexpected YouVersion chapter');
      const numbers = index.verses.map((verse) => {
        const match = verse.passage_id.match(new RegExp(`^${code}\\.${chapter}\\.(\\d+)$`));
        if (!match) throw new Error('Unexpected YouVersion verse');
        return Number(match[1]);
      });
      if (new Set(numbers).size !== numbers.length || numbers.some((n, i) => n !== i + 1))
        throw new Error('Incomplete YouVersion chapter');
      const verses: { number: number; text: string }[] = [];
      // Metadata endpoints contain identifiers, not Scripture. Resolve exact verse text
      // through Passages; bounded batches avoid an unbounded request burst.
      for (let offset = 0; offset < numbers.length; offset += 6) {
        verses.push(
          ...(await Promise.all(
            numbers.slice(offset, offset + 6).map(async (number) => {
              const passageId = `${id}.${number}`;
              const passage = passageSchema.parse(
                await get(`/passages/${passageId}?format=text`, signal),
              );
              if (passage.id !== passageId) throw new Error('Unexpected YouVersion passage');
              return { number, text: passage.content };
            }),
          )),
        );
      }
      const value = { verses };
      if (chapters.size >= 100) chapters.delete(chapters.keys().next().value!);
      chapters.set(id, value);
      return value;
    })();
    pending.set(id, operation);
    try {
      return await operation;
    } finally {
      pending.delete(id);
    }
  }
  return {
    async passage(book, chapter, firstVerse, lastVerse, inputKey) {
      const name = book === 'Psalms' ? 'Psalm' : book;
      const code = codes[name];
      if (
        !code ||
        !Number.isInteger(chapter) ||
        chapter < 1 ||
        chapter > 150 ||
        !Number.isInteger(firstVerse) ||
        firstVerse < 1 ||
        !Number.isInteger(lastVerse) ||
        lastVerse < firstVerse ||
        lastVerse > 200
      )
        throw new Error('Invalid Scripture reference');
      const signal = AbortSignal.timeout(12000);
      // Current attribution is fetched for every encounter, even if chapter text is cached.
      const metadata = versionSchema.parse(await get('', signal));
      const attribution = metadata.copyright?.trim() || metadata.promotional_content?.trim();
      if (!attribution || !/public domain/i.test(attribution))
        throw new Error('Public-domain YouVersion attribution unavailable');
      const content = await loadChapter(code, chapter, signal);
      const selected = content.verses.filter(
        (v) => v.number >= firstVerse && v.number <= lastVerse,
      );
      if (selected.length !== lastVerse - firstVerse + 1) throw new Error('Passage unavailable');
      return scriptureSnapshotSchema.parse({
        reference: `${name} ${chapter}:${firstVerse}${lastVerse > firstVerse ? `–${lastVerse}` : ''}`,
        text: selected.map((v) => v.text).join(' '),
        translation: 'BSB',
        provider: 'youversion',
        attribution,
        sourceUrl: `https://www.bible.com/bible/${VERSION}/${code}.${chapter}.BSB`,
        context: '',
        firstVerse,
        lastVerse,
        chapter: { book: name, chapter, verses: content.verses },
        inputKey,
      });
    },
  };
}
