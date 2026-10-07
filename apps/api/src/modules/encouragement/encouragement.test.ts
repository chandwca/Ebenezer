import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';
import { createFakeAuthGateway, bearer } from '../../../test/helpers/fake-auth.js';
import { createEncouragementService } from './encouragement.service.js';
import { encouragementPassages } from '@ebenezer/contracts';

const text = {
  message: 'Notice God’s care today.',
  prayer: 'Jesus, help me remember. Amen.',
  question: 'What are you grateful for?',
};

test('authenticated encouragement accepts only curated public inputs and keeps Scripture outside generated output', async () => {
  let calls = 0;
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    encouragementProvider: {
      async generate(input) {
        calls++;
        assert.deepEqual(Object.keys(input).sort(), ['language', 'scripture', 'theme']);
        return text;
      },
    },
  });
  try {
    const payload = { theme: 'remember', language: 'en' };
    assert.equal(
      (await app.inject({ method: 'POST', url: '/v1/encouragement', payload })).statusCode,
      401,
    );
    for (const extra of [
      { journal: 'Private reflection' },
      { name: 'Alex' },
      { weather: 'Personal location' },
    ])
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/encouragement',
            headers: bearer(),
            payload: { ...payload, ...extra },
          })
        ).statusCode,
        400,
      );
    for (const token of ['alice-session', 'bob-session']) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/encouragement',
        headers: bearer(token),
        payload,
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['cache-control'], 'no-store');
      assert.deepEqual(response.json(), {
        scripture: encouragementPassages.remember,
        encouragement: text,
        source: 'ai',
      });
    }
    assert.equal(calls, 1, 'Shared public content is reused across accounts');
  } finally {
    await app.close();
  }
});

test('provider failures return prepared content and retry only after the short failure cache expires', async () => {
  let time = 0;
  let calls = 0;
  const service = createEncouragementService(
    {
      async generate() {
        calls++;
        throw new Error('Quota exceeded');
      },
    },
    () => time,
  );
  const input = { theme: 'care', language: 'es' } as const;
  const first = await service.get(input);
  assert.equal(first.source, 'prepared');
  assert.equal(first.scripture.text, encouragementPassages.care.text);
  assert.ok(first.encouragement.prayer.includes('Jesús'));
  await service.get(input);
  assert.equal(calls, 1);
  time = 60001;
  await service.get(input);
  assert.equal(calls, 2);
  assert.equal((await createEncouragementService().get(input)).source, 'prepared');
});

test('concurrent requests share one generation and successful cache expires', async () => {
  let finish!: (value: typeof text) => void;
  let calls = 0;
  let time = 0;
  const service = createEncouragementService(
    {
      generate() {
        calls++;
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    },
    () => time,
  );
  const input = { theme: 'steadiness', language: 'en' } as const;
  const one = service.get(input);
  const two = service.get(input);
  assert.equal(calls, 1);
  finish(text);
  assert.deepEqual(await one, await two);
  await service.get(input);
  assert.equal(calls, 1);
  time = 6 * 60 * 60 * 1000 + 1;
  const again = service.get(input);
  assert.equal(calls, 2);
  finish(text);
  await again;
});
