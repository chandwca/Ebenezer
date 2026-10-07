import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { paragraphGroups, splitGroup } from './chunk-passages.mjs';
import { validateFullIndex, rankFullPassages } from './full-search-core.mjs';

test('groups source paragraphs and preserves poetry continuations', () => {
  const html =
    '<div class="main"><div class="p"><span class="verse" id="V1">1</span>A<span class="verse" id="V2">2</span>B</div><div class="q"><span class="verse" id="V3">3</span>C</div><div class="q2"><span class="verse" id="V4">4</span>D</div><div class="p"><span class="verse" id="V5">5</span>E</div></div>';
  const verses = ['A', 'B', 'C', 'D', 'E'].map((text, index) => ({ number: index + 1, text }));
  assert.deepEqual(
    paragraphGroups(html, verses).map((group) => group.map((v) => v.number)),
    [[1, 2], [3, 4], [5]],
  );
  assert.deepEqual(
    splitGroup(verses, (input) => input.length, '', 3, 5).map((group) =>
      group.map((v) => v.number),
    ),
    [[1, 2], [3, 4], [5]],
  );
  assert.throws(
    () => splitGroup([{ number: 1, text: 'Too long' }], (s) => s.length, '', 3, 5),
    /exceeds/,
  );
});

test('full index covers every nonempty verse exactly once and contains valid model-bound vectors', async () => {
  const folder = new URL('../../data/bible/', import.meta.url);
  const raw = await readFile(new URL('full.json', folder));
  const dataset = JSON.parse(raw);
  const index = JSON.parse(await readFile(new URL('index.json', folder), 'utf8'));
  const binary = await readFile(new URL('vectors.f32', folder));
  const config = JSON.parse(
    await readFile(new URL('../../public/bible/model-config.json', import.meta.url), 'utf8'),
  );
  const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
  validateFullIndex(index, binary, config, sha(raw), sha(binary), dataset);
  assert.throws(
    () => validateFullIndex(index, binary, config, 'stale', sha(binary), dataset),
    /incompatible/,
  );
  assert.throws(
    () => validateFullIndex(index, binary.subarray(4), config, sha(raw), sha(binary), dataset),
    /Incomplete/,
  );
  const first = Array.from({ length: config.dimensions }, (_, column) =>
    binary.readFloatLE(column * 4),
  );
  assert.equal(rankFullPassages(first, index, binary)[0].id, index.passages[0].id);
  assert.ok(index.passages.some((p) => p.chapterKey === '1JN04'));
  assert.ok(index.passages.some((p) => p.chapterKey === 'REV22'));
});
