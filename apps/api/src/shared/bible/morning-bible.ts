import { readFile } from 'node:fs/promises';
import { scriptureSnapshotSchema, type ScriptureSnapshot } from '@ebenezer/contracts';

type Chapter = {
  book: string;
  chapter: number;
  sourceUrl: string;
  verses: { number: number; text: string }[];
};
let loaded: Promise<Map<string, Chapter>> | undefined;
async function chapters() {
  if (!loaded)
    loaded = (async () => {
      let raw: string;
      try {
        raw = await readFile(new URL('./full-bible.json', import.meta.url), 'utf8');
      } catch {
        raw = await readFile(
          new URL('../../../../web/data/bible/full.json', import.meta.url),
          'utf8',
        );
      }
      const dataset = JSON.parse(raw) as {
        chapters: Record<string, Chapter>;
        verseCount: number;
        translation: string;
      };
      if (dataset.verseCount !== 31103 || Object.keys(dataset.chapters).length !== 1189)
        throw new Error('Incomplete verified Bible');
      return new Map(
        Object.values(dataset.chapters).map((chapter) => [
          `${chapter.book}:${chapter.chapter}`,
          chapter,
        ]),
      );
    })().catch((error) => {
      loaded = undefined;
      throw error;
    });
  return loaded;
}
export async function verifiedMorningVerse(
  book: string,
  chapter: number,
  verse: number,
  inputKey: string,
): Promise<ScriptureSnapshot> {
  return verifiedPassage(book, chapter, verse, verse, inputKey);
}

/** Look up exact WEB text for a short passage; unknown references throw rather than guess. */
export async function verifiedPassage(
  book: string,
  chapter: number,
  firstVerse: number,
  lastVerse: number,
  inputKey: string,
): Promise<ScriptureSnapshot> {
  const name = book === 'Psalms' ? 'Psalm' : book;
  const bible = await chapters();
  const found =
    bible.get(`${name}:${chapter}`) ??
    (name === 'Psalm' ? bible.get(`Psalms:${chapter}`) : undefined);
  if (!found || lastVerse < firstVerse) throw new Error('Passage unavailable');
  const verses = found.verses.filter(
    (item) => item.number >= firstVerse && item.number <= lastVerse && item.text,
  );
  if (!verses.length || verses[0].number !== firstVerse || verses.at(-1)!.number !== lastVerse)
    throw new Error('Passage unavailable');
  return scriptureSnapshotSchema.parse({
    reference: `${found.book} ${chapter}:${firstVerse}${lastVerse > firstVerse ? `–${lastVerse}` : ''}`,
    text: verses.map((item) => item.text).join(' '),
    translation: 'WEB Classic',
    context: '',
    sourceUrl: found.sourceUrl,
    firstVerse,
    lastVerse,
    chapter: { book: found.book, chapter, verses: found.verses },
    inputKey,
  });
}
