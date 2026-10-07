import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';
import { createFakeAuthGateway, bearer } from '../../../test/helpers/fake-auth.js';

test('summary accepts only nonempty day counts, coalesces requests and excludes journal text', async () => {
  let calls = 0;
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    encouragementProvider: {
      async generate(input) {
        calls++;
        assert.equal(input.journey?.hard, 2);
        assert.deepEqual(input.passageReferences, ['Luke 2:11', 'Matthew 11:28–30']);
        assert.deepEqual(Object.keys(input).sort(), [
          'journey',
          'language',
          'passageReferences',
          'scripture',
          'theme',
        ]);
        return {
          message: 'There is room for hard days.',
          prayer: 'Jesus, help me remember.',
          question: 'Where do you see His care?',
        };
      },
    },
  });
  const payload = {
    language: 'en',
    counts: { hard: 2, mixed: 1, bright: 3 },
    passages: ['Luke 2:11', 'Matthew 11:28–30'],
  };
  try {
    // Signed out works too: the journal lives on her device.
    assert.equal(
      (await app.inject({ method: 'POST', url: '/v1/journey-summary', payload })).statusCode,
      200,
    );
    calls = 0;
    for (const invalid of [
      { ...payload, journal: 'private' },
      { ...payload, passages: ['My private reflection'] },
      { ...payload, counts: { hard: 0, mixed: 0, bright: 0 } },
      { ...payload, counts: { hard: -1, mixed: 0, bright: 1 } },
    ])
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/journey-summary',
            headers: bearer(),
            payload: invalid,
          })
        ).statusCode,
        400,
      );
    const fresh = { ...payload, counts: { hard: 2, mixed: 1, bright: 4 } };
    const replies = await Promise.all(
      [1, 2].map(() =>
        app.inject({
          method: 'POST',
          url: '/v1/journey-summary',
          headers: bearer(),
          payload: fresh,
        }),
      ),
    );
    assert.equal(calls, 1);
    for (const reply of replies) {
      assert.equal(reply.statusCode, 200);
      assert.equal(reply.headers['cache-control'], 'no-store');
      assert.equal(reply.json().source, 'ai');
    }
  } finally {
    await app.close();
  }
});
test('summary retains a prepared invitation when Gemini fails', async () => {
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    encouragementProvider: {
      async generate() {
        throw new Error('Quota');
      },
    },
  });
  try {
    const reply = await app.inject({
      method: 'POST',
      url: '/v1/journey-summary',
      headers: bearer(),
      payload: { language: 'en', counts: { hard: 1, mixed: 0, bright: 0 } },
    });
    assert.equal(reply.statusCode, 200);
    assert.equal(reply.json().source, 'prepared');
    assert.match(reply.json().reflection.message, /questions remain/);
  } finally {
    await app.close();
  }
});

test('per-stone remembrance passes her own words and rejects unknown fields', async () => {
  const stones = [
    {
      tone: 'hard',
      passages: ['Matthew 11:28–30'],
      count: 2,
      date: '2026-10-06',
      feelings: ['homesick'],
      thought: 'I can bring what feels heavy to Jesus.',
      memory: 'A friend invited me to dinner.',
    },
    { tone: 'bright', passages: ['1 Samuel 7:12', 'Luke 2:11'], count: 1 },
  ];
  let received: unknown;
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    encouragementProvider: {
      async generate(input) {
        received = input.stones;
        return {
          message: 'Bring the hard days and gratitude to Jesus.',
          prayer: 'Jesus, help me remember.',
          question: 'Where do you recognize His care?',
        };
      },
    },
  });
  try {
    const payload = { language: 'en', counts: { hard: 2, mixed: 0, bright: 1 }, stones };
    assert.equal(
      (await app.inject({ method: 'POST', url: '/v1/journey-summary', headers: bearer(), payload }))
        .statusCode,
      200,
    );
    assert.deepEqual(received, stones);
    for (const invalid of [
      { ...payload, stones: [{ ...stones[0], location: 'Dorm 4' }, stones[1]] },
      { ...payload, counts: { hard: 1, mixed: 0, bright: 1 } },
    ])
      assert.equal(
        (
          await app.inject({
            method: 'POST',
            url: '/v1/journey-summary',
            headers: bearer(),
            payload: invalid,
          })
        ).statusCode,
        400,
      );
  } finally {
    await app.close();
  }
});

test('evening question uses the morning reference and thought, with a prepared fallback', async () => {
  let received: unknown;
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    encouragementProvider: {
      async eveningQuestion(input) {
        received = input;
        return 'How did resting in Jesus look in your day?';
      },
      async generate() {
        throw new Error('unused');
      },
    },
  });
  const plain = createApp({ logger: false, authGateway: createFakeAuthGateway() });
  const payload = { language: 'en', reference: 'Matthew 11:28', thought: 'Bring it to Jesus.' };
  try {
    const reply = await app.inject({ method: 'POST', url: '/v1/evening-prompt', payload });
    assert.equal(reply.json().question, 'How did resting in Jesus look in your day?');
    assert.deepEqual(received, payload);
    const fallback = await plain.inject({ method: 'POST', url: '/v1/evening-prompt', payload });
    assert.deepEqual(fallback.json(), {
      source: 'prepared',
      question: 'So, how was your day? Tell Him about it, the bright moments and the heavy ones.',
    });
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/evening-prompt',
          payload: { ...payload, reference: 'not a verse' },
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
    await plain.close();
  }
});
