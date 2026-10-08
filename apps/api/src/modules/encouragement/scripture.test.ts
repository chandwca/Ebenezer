import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';
import { createMorningService } from './morning.service.js';
import { verifiedPassage } from '../../shared/bible/morning-bible.js';
import type { ScriptureProvider } from '../../shared/bible/provider.js';

const scriptureProvider: ScriptureProvider = {
  async passage(book, chapter, first, last, key) {
    const existing = await verifiedPassage(book, chapter, first, last, key);
    return {
      ...existing,
      translation: 'BSB',
      provider: 'youversion',
      attribution: 'Fixture attribution: public domain.',
      sourceUrl: 'https://www.bible.com/bible/3034/PSA.117.BSB',
    };
  },
};

test('morning resolves through the supplied Scripture provider without requiring AI', async () => {
  const result = await createMorningService(undefined, Date.now, scriptureProvider).get({
    theme: 'care',
    language: 'en',
    date: '2026-10-07',
  });
  assert.equal(result.scripture.provider, 'youversion');
  assert.equal(result.scripture.translation, 'BSB');
  assert.equal(result.scripture.attribution, result.snapshot?.attribution);
  assert.equal(result.source, 'prepared');
});

test('provider outages retain explicitly WEB Scripture rather than claiming YouVersion', async () => {
  const result = await createMorningService(undefined, Date.now, {
    passage: async () => {
      throw new Error('unavailable');
    },
  }).get({ theme: 'care', language: 'en', date: '2026-10-07' });
  assert.equal(result.scripture.translation, 'WEB Classic');
  assert.equal(result.scripture.provider, undefined);
});

test('reference-only Scripture route works signed out and rejects personal input', async () => {
  const app = createApp({ logger: false, scriptureProvider });
  try {
    const payload = { book: 'Psalm', chapter: 117, firstVerse: 1, lastVerse: 2 };
    const response = await app.inject({ method: 'POST', url: '/v1/scripture', payload });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().provider, 'youversion');
    assert.match(response.headers['cache-control']!, /no-store/);
    for (const invalid of [
      { ...payload, checkIn: 'private' },
      { ...payload, firstVerse: 3 },
    ]) {
      assert.equal(
        (await app.inject({ method: 'POST', url: '/v1/scripture', payload: invalid })).statusCode,
        400,
      );
    }
  } finally {
    await app.close();
  }
});
