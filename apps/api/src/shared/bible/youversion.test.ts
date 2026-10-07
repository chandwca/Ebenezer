import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createYouVersionProvider } from './youversion.js';
import { readScriptureProvider } from '../../config/scripture.js';

const attribution = 'Berean Standard Bible. This text has been dedicated to the public domain.';
const verses = [
  'Praise the LORD, all you nations! Extol Him, all you peoples!',
  'For great is His loving devotion toward us, and the faithfulness of the LORD endures forever. Hallelujah!',
];
function fixture(overrides: Record<string, unknown> = {}) {
  const requests: { path: string; key: string | null }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    const path = new URL(String(url)).pathname.replace('/v1/bibles/3034', '');
    requests.push({ path, key: new Headers(init?.headers).get('X-YVP-App-Key') });
    const responses: Record<string, unknown> = {
      '': { id: 3034, abbreviation: 'BSB', copyright: attribution },
      '/books/PSA/chapters/117': {
        passage_id: 'PSA.117',
        verses: [{ passage_id: 'PSA.117.1' }, { passage_id: 'PSA.117.2' }],
      },
      '/passages/PSA.117.1': { id: 'PSA.117.1', reference: 'Psalm 117:1', content: verses[0] },
      '/passages/PSA.117.2': { id: 'PSA.117.2', reference: 'Psalm 117:2', content: verses[1] },
      ...overrides,
    };
    assert.ok(Object.hasOwn(responses, path), path);
    return Response.json(responses[path]);
  };
  return { fetcher, requests };
}

test('YouVersion resolves exact text, complete chapter, attribution and a matching reader link', async () => {
  const { fetcher, requests } = fixture();
  const provider = createYouVersionProvider('test-app-key', fetcher);
  const snapshot = await provider.passage('Psalms', 117, 1, 2, 'private-local-key');
  assert.equal(snapshot.text, verses.join(' '));
  assert.equal(snapshot.translation, 'BSB');
  assert.equal(snapshot.provider, 'youversion');
  assert.equal(snapshot.attribution, attribution);
  assert.equal(snapshot.sourceUrl, 'https://www.bible.com/bible/3034/PSA.117.BSB');
  assert.equal(snapshot.chapter.verses.length, 2);
  assert.ok(requests.every((r) => r.key === 'test-app-key'));
  assert.ok(requests.every((r) => !r.path.includes('private-local-key')));
  await provider.passage('Psalm', 117, 2, 2, 'other');
  assert.equal(
    requests.filter((r) => r.path === '').length,
    2,
    'refresh attribution for each encounter',
  );
  assert.equal(
    requests.filter((r) => r.path.startsWith('/passages')).length,
    2,
    'reuse public-domain chapter text',
  );
});

test('missing attribution, non-public-domain metadata and mismatched verse IDs fail closed', async () => {
  for (const overrides of [
    { '': { id: 3034, abbreviation: 'BSB' } },
    { '': { id: 3034, abbreviation: 'BSB', copyright: 'All rights reserved.' } },
    { '/passages/PSA.117.1': { id: 'JHN.3.16', content: 'Wrong passage', reference: 'John 3:16' } },
  ]) {
    await assert.rejects(
      createYouVersionProvider('key', fixture(overrides).fetcher).passage(
        'Psalm',
        117,
        1,
        1,
        'test',
      ),
    );
  }
});

test('upstream credentials and bodies never appear in errors; a missing key uses local mode', async () => {
  const provider = createYouVersionProvider(
    'secret-key',
    async () => new Response('secret-key private upstream body', { status: 401 }),
  );
  await assert.rejects(provider.passage('Psalm', 117, 1, 1, 'test'), (error: Error) => {
    assert.equal(error.message, 'YouVersion Scripture unavailable');
    return true;
  });
  assert.equal(readScriptureProvider({}), undefined);
});
