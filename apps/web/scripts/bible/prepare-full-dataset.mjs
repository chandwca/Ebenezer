import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { books } from './books.mjs';
import { extractChapter } from './extract.mjs';

const source = new URL('./.source-cache/full/', import.meta.url);
// Not in public/: the large dataset is not automatically shipped or precached yet.
const output = new URL('../../data/bible/', import.meta.url);
const chapters = {};
for (const book of books) {
  for (let chapter = 1; chapter <= book.chapters; chapter++) {
    const key = `${book.code}${String(chapter).padStart(book.code === 'PSA' ? 3 : 2, '0')}`;
    const html = await readFile(new URL(`${key}.htm`, source), 'utf8');
    chapters[key] = {
      book: book.name,
      chapter,
      sourceUrl: `https://ebible.org/eng-web/${key}.htm`,
      sourceSha256: createHash('sha256').update(html).digest('hex'),
      verses: extractChapter(html, { allowEmpty: true }),
    };
  }
  globalThis.console.log(`Verified ${book.name}: ${book.chapters} chapters`);
}
if (books.length !== 66 || Object.keys(chapters).length !== 1189)
  throw new Error('Incomplete 66-book Bible');
const verseCount = Object.values(chapters).reduce((sum, chapter) => sum + chapter.verses.length, 0);
const dataset = {
  format: 'ebenezer-bible-full',
  version: 1,
  translation: 'World English Bible Classic',
  language: 'en',
  license: 'Public domain',
  licenseUrl: 'https://ebible.org/eng-web/copyright.htm',
  sourceArchive: 'https://ebible.org/Scriptures/eng-web_html.zip',
  scope: '66-book Old and New Testament; additional ecumenical books excluded',
  preparedAt: new Date().toISOString(),
  books,
  verseCount,
  emptyVerseMarkers: Object.entries(chapters).flatMap(([key, chapter]) =>
    chapter.verses.filter((verse) => !verse.text).map((verse) => `${key}:${verse.number}`),
  ),
  chapters,
};
await mkdir(output, { recursive: true });
const raw = JSON.stringify(dataset) + '\n';
await writeFile(new URL('full.json', output), raw);
await writeFile(
  new URL('manifest.json', output),
  JSON.stringify(
    {
      version: 1,
      datasetSha256: createHash('sha256').update(raw).digest('hex'),
      books: books.length,
      chapters: Object.keys(chapters).length,
      verses: verseCount,
      bytes: Buffer.byteLength(raw),
    },
    null,
    2,
  ) + '\n',
);
globalThis.console.log(
  `Prepared ${verseCount} verses (${Buffer.byteLength(raw)} bytes). Search index not generated yet.`,
);
