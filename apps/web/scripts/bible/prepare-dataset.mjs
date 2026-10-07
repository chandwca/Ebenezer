import { URL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { selections } from './passages.mjs';
import { extractChapter } from './extract.mjs';
const origin = 'https://ebible.org/eng-web/';
const output = new URL('../../public/bible/', import.meta.url);
const cache = new URL('./.source-cache/', import.meta.url);
await mkdir(output, { recursive: true });
await mkdir(cache, { recursive: true });
const chapters = {};
for (const item of selections) {
  const key = `${item.bookCode}${String(item.chapter).padStart(item.bookCode === 'PSA' ? 3 : 2, '0')}`;
  if (chapters[key]) continue;
  const sourceUrl = `${origin}${key}.htm`;
  const snapshot = new URL(`${key}.htm`, cache);
  let html;
  try {
    html = await readFile(snapshot, 'utf8');
  } catch {
    const response = await globalThis.fetch(sourceUrl, {
      signal: globalThis.AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Unable to download ${sourceUrl}: ${response.status}`);
    html = await response.text();
    extractChapter(html); // Validate before caching a downloaded response.
    await writeFile(snapshot, html);
  }
  chapters[key] = {
    book: item.book,
    chapter: item.chapter,
    sourceUrl,
    sourceSha256: createHash('sha256').update(html).digest('hex'),
    verses: extractChapter(html),
  };
  globalThis.console.log(`Verified ${item.book} ${item.chapter}`);
}
const passages = selections.map((item) => {
  const key = `${item.bookCode}${String(item.chapter).padStart(item.bookCode === 'PSA' ? 3 : 2, '0')}`;
  const selected = chapters[key].verses.filter(
    (verse) => verse.number >= item.firstVerse && verse.number <= item.lastVerse,
  );
  if (selected.length !== item.lastVerse - item.firstVerse + 1)
    throw new Error(`Incomplete passage ${item.id}`);
  return {
    ...item,
    reference: `${item.book} ${item.chapter}:${item.firstVerse}${item.lastVerse === item.firstVerse ? '' : `–${item.lastVerse}`}`,
    chapterKey: key,
    text: selected.map((verse) => verse.text).join(' '),
    sourceUrl: chapters[key].sourceUrl,
  };
});
if (passages.length !== 50 || new Set(passages.map((item) => item.id)).size !== 50)
  throw new Error('Expected 50 unique passages');
const dataset = {
  format: 'ebenezer-bible-sample',
  version: 1,
  translation: 'World English Bible Classic',
  language: 'en',
  license: 'Public domain',
  licenseUrl: `${origin}copyright.htm`,
  preparedAt: new Date().toISOString(),
  contextAuthor:
    'Ebenezer editorial summaries; separate from Scripture text; pending independent review',
  passages,
  chapters,
};
await writeFile(new URL('sample.json', output), JSON.stringify(dataset, null, 2) + '\n');
globalThis.console.log(
  `Prepared ${passages.length} source-verified passages from ${Object.keys(chapters).length} complete chapters. No embeddings generated yet.`,
);
