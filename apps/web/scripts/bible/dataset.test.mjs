import { URL } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extractChapter } from './extract.mjs';

test('extracts poetry and narrative without headings, footnotes, or verse markers', () => {
  const html = `<div class="main"><div class="chapterlabel">Chapter 1</div><div class="d">A heading</div>
    <div class="q"><span class="verse" id="V1">1 </span>First line.</div><div class="q2">Second line.</div>
    <div class="s">Section heading</div><p><span class="verse" id="V2">2 </span><span class="wj">A quotation</span><a class="notemark">*<span>Footnote</span></a> ends here.</p>
    <ul class="tnav"><li>Navigation</li></ul><div class="footnote">More notes</div></div>`;
  assert.deepEqual(extractChapter(html), [
    { number: 1, text: 'First line. Second line.' },
    { number: 2, text: 'A quotation ends here.' },
  ]);
  assert.throws(
    () =>
      extractChapter(
        '<div class="main"><span class="verse" id="V2">2 </span>Missing verse one.</div>',
      ),
    /out-of-order/,
  );
  assert.throws(() => extractChapter('<div>Not a chapter</div>'), /missing/);
});

test('contains 50 unique source-verified passages with their complete chapter context', async () => {
  const sample = JSON.parse(
    await readFile(new URL('../../public/bible/sample.json', import.meta.url), 'utf8'),
  );
  assert.equal(sample.passages.length, 50);
  assert.equal(new Set(sample.passages.map((passage) => passage.id)).size, 50);
  assert.equal(sample.translation, 'World English Bible Classic');
  for (const passage of sample.passages) {
    const chapter = sample.chapters[passage.chapterKey];
    assert.equal(chapter.book, passage.book);
    assert.equal(chapter.chapter, passage.chapter);
    assert.match(chapter.sourceSha256, /^[a-f0-9]{64}$/);
    assert.ok(passage.sourceUrl.startsWith('https://ebible.org/eng-web/'));
    assert.ok(passage.context.length > 20);
    const verses = chapter.verses.filter(
      (verse) => verse.number >= passage.firstVerse && verse.number <= passage.lastVerse,
    );
    assert.equal(verses.length, passage.lastVerse - passage.firstVerse + 1);
    assert.equal(passage.text, verses.map((verse) => verse.text).join(' '));
    assert.ok(!/Footnote|Public Domain|Downloads|Frequently Asked Questions/.test(passage.text));
  }
  const psalm = sample.chapters.PSA023.verses;
  assert.equal(psalm.length, 6);
  assert.equal(psalm[0].text, 'Yahweh is my shepherd; I shall lack nothing.');
});

test('indexes are bound to their dataset/model and reject invalid vectors', async () => {
  const { validateIndex, rankPassages } = await import('./search-core.mjs');
  const config = { dimensions: 2, revision: 'test' };
  const index = {
    format: 'ebenezer-bible-embeddings',
    version: 1,
    model: config,
    datasetSha256: 'same',
    entries: [
      { id: 'a', vector: [1, 0] },
      { id: 'b', vector: [0, 1] },
    ],
  };
  validateIndex(index, config, 'same', ['a', 'b']);
  assert.equal(rankPassages([0, 1], index.entries, 1)[0].id, 'b');
  assert.throws(() => validateIndex(index, config, 'changed', ['a', 'b']), /incompatible/);
  assert.throws(
    () => validateIndex(index, { ...config, revision: 'different' }, 'same', ['a', 'b']),
    /incompatible/,
  );
  assert.throws(
    () =>
      validateIndex(
        { ...index, entries: [{ id: 'a', vector: [NaN, 0] }, index.entries[1]] },
        config,
        'same',
        ['a', 'b'],
      ),
    /Invalid/,
  );
  assert.throws(
    () =>
      validateIndex({ ...index, entries: [index.entries[0], index.entries[0]] }, config, 'same', [
        'a',
        'b',
      ]),
    /Incomplete/,
  );
  assert.throws(() => rankPassages([1], index.entries), /mismatch/);
});

test('generated artifacts contain 50 normalized 384-dimensional vectors for each strategy', async () => {
  const { createHash } = await import('node:crypto');
  const { validateIndex } = await import('./search-core.mjs');
  const folder = new URL('../../public/bible/', import.meta.url);
  const raw = await readFile(new URL('sample.json', folder));
  const sample = JSON.parse(raw);
  const config = JSON.parse(await readFile(new URL('model-config.json', folder), 'utf8'));
  for (const strategy of ['scripture', 'context']) {
    const index = JSON.parse(
      await readFile(new URL(`embeddings-${strategy}.json`, folder), 'utf8'),
    );
    assert.equal(index.strategy, strategy);
    assert.equal(config.dimensions, 384);
    validateIndex(
      index,
      config,
      createHash('sha256').update(raw).digest('hex'),
      sample.passages.map((p) => p.id),
    );
  }
});

test('full Bible preserves all 66 books, chapter numbering, and its dataset checksum', async () => {
  const { createHash } = await import('node:crypto');
  const { books } = await import('./books.mjs');
  const folder = new URL('../../data/bible/', import.meta.url);
  const raw = await readFile(new URL('full.json', folder));
  const full = JSON.parse(raw);
  const manifest = JSON.parse(await readFile(new URL('manifest.json', folder), 'utf8'));
  assert.equal(full.books.length, 66);
  assert.equal(Object.keys(full.chapters).length, 1189);
  assert.equal(createHash('sha256').update(raw).digest('hex'), manifest.datasetSha256);
  assert.equal(raw.length, manifest.bytes);
  let count = 0;
  const empty = [];
  for (const book of books) {
    for (let number = 1; number <= book.chapters; number++) {
      const key = `${book.code}${String(number).padStart(book.code === 'PSA' ? 3 : 2, '0')}`;
      const chapter = full.chapters[key];
      assert.equal(chapter.book, book.name);
      assert.equal(chapter.chapter, number);
      assert.match(chapter.sourceSha256, /^[a-f0-9]{64}$/);
      assert.ok(chapter.verses.length > 0);
      for (const [index, verse] of chapter.verses.entries()) {
        assert.equal(verse.number, index + 1);
        assert.equal(typeof verse.text, 'string');
        if (!verse.text) empty.push(`${key}:${verse.number}`);
      }
      count += chapter.verses.length;
    }
  }
  assert.equal(count, full.verseCount);
  assert.equal(count, manifest.verses);
  assert.deepEqual(empty, full.emptyVerseMarkers);
  assert.equal(
    full.chapters.GEN01.verses[0].text,
    'In the beginning, God created the heavens and the earth.',
  );
  assert.match(full.chapters['1JN04'].verses[7].text, /God is love/);
  assert.match(full.chapters.REV22.verses.at(-1).text, /grace/);
});

test('full-source extraction preserves footnote-only verse markers without inserting footnotes', () => {
  const html =
    '<div class="main"><span class="verse" id="V1">1</span>Text.<span class="verse" id="V2">2</span><a class="notemark">Some manuscripts add text.</a><span class="verse" id="V3">3</span>More text.</div>';
  assert.throws(() => extractChapter(html), /Missing/);
  assert.deepEqual(extractChapter(html, { allowEmpty: true }), [
    { number: 1, text: 'Text.' },
    { number: 2, text: '' },
    { number: 3, text: 'More text.' },
  ]);
});
