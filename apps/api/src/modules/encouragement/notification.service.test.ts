import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationWordService } from './notification.service.js';
import { createApp } from '../../app.js';
import { verifiedPassage } from '../../shared/bible/morning-bible.js';

test('notification choice is stable, short, attributed and supplied by the Scripture provider', async () => {
  const seen: unknown[] = [];
  const service = createNotificationWordService({
    async passage(book, chapter, first, last, key) {
      seen.push([book, chapter, first, last]);
      const snapshot = await verifiedPassage(book, chapter, first, last, key);
      return {
        ...snapshot,
        text: 'Fixture complete verse.',
        chapter: {
          ...snapshot.chapter,
          verses: [{ number: first, text: 'Fixture complete verse.' }],
        },
        translation: 'BSB',
        provider: 'youversion',
        attribution: 'Fixture public domain attribution.',
        sourceUrl: 'https://www.bible.com/bible/3034/JHN.3.BSB',
      };
    },
  });
  const first = await service.get('2026-10-07');
  assert.deepEqual(await service.get('2026-10-07'), first);
  assert.deepEqual(seen[0], seen[1]);
  assert.equal(first.provider, 'youversion');
  assert.equal(first.date, '2026-10-07');
  assert.equal(first.text, 'Fixture complete verse.');
  assert.ok(first.attribution);
});

test('unavailable YouVersion fails rather than inventing a notification quote', async () => {
  await assert.rejects(createNotificationWordService().get('2026-10-07'));
  const app = createApp({ logger: false });
  try {
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/notification-word',
          payload: { date: 'invalid' },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/notification-word',
          payload: { date: new Date().toISOString().slice(0, 10), checkIn: 'private' },
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
  }
});
