import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encouragementPassages } from '@ebenezer/contracts';
import { createGeminiProvider } from './gemini.js';
import { readEncouragementProvider } from '../../config/ai.js';

const input = { theme: 'care', language: 'en', scripture: encouragementPassages.care } as const;
test('accepts dotted Gemini model names and the default model', () => {
  assert.ok(
    readEncouragementProvider({
      AI_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'test-key',
      GEMINI_MODEL: 'gemini-3.1-flash-lite',
    }),
  );
  assert.ok(readEncouragementProvider({ AI_PROVIDER: 'gemini', GEMINI_API_KEY: 'test-key' }));
});
const result = {
  message: 'Bring your cares to Jesus.',
  prayer: 'Jesus, guide me. Amen.',
  question: 'What can you bring to Jesus?',
};

test('Gemini keeps credentials in a header and parses complete structured responses', async () => {
  const provider = createGeminiProvider(
    { apiKey: 'test-secret', model: 'gemini-3.1-flash-lite' },
    async (url, init) => {
      assert.ok(String(url).endsWith('/models/gemini-3.1-flash-lite:generateContent'));
      assert.ok(!String(url).includes('test-secret'));
      assert.equal(new Headers(init?.headers).get('x-goog-api-key'), 'test-secret');
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(JSON.parse(body.contents[0].parts[0].text), input);
      assert.equal(body.generationConfig.responseMimeType, 'application/json');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'STOP',
              content: {
                parts: [
                  { thought: true, text: 'Ignore internal thought' },
                  { text: JSON.stringify(result) },
                ],
              },
            },
          ],
        }),
      );
    },
  );
  assert.deepEqual(await provider.generate(input), result);
});

test('Gemini rejects quota failures, blocked/truncated output and invalid generated fields', async () => {
  for (const response of [
    new Response('sensitive upstream detail', { status: 429 }),
    new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] })),
    new Response(
      JSON.stringify({
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: '{"message":"only one field"}' }] } },
        ],
      }),
    ),
    new Response(JSON.stringify({ promptFeedback: { blockReason: 'SAFETY' } })),
  ]) {
    const provider = createGeminiProvider(
      { apiKey: 'test-secret', model: 'gemini-3.1-flash-lite' },
      async () => response,
    );
    await assert.rejects(() => provider.generate(input));
  }
});

test('AI is optional and explicit Gemini configuration rejects missing keys and unsupported providers', () => {
  assert.equal(readEncouragementProvider({}), undefined);
  assert.equal(readEncouragementProvider({ AI_PROVIDER: 'none' }), undefined);
  assert.throws(() => readEncouragementProvider({ AI_PROVIDER: 'gemini' }), /GEMINI_API_KEY/);
  assert.throws(() => readEncouragementProvider({ AI_PROVIDER: 'gloo' }), /none or gemini/);
  assert.throws(
    () =>
      readEncouragementProvider({
        AI_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: '../invalid',
      }),
    /valid GEMINI_MODEL/,
  );
});

test('morning selection accepts only identifiers for verified passages and rejects fabricated selections', async () => {
  const valid = createGeminiProvider(
    { apiKey: 'test-key', model: 'test-model' },
    async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { finishReason: 'STOP', content: { parts: [{ text: '{"theme":"care"}' }] } },
          ],
        }),
      ),
  );
  assert.equal(
    await valid.selectMorningTheme!({
      theme: 'remember',
      language: 'en',
      date: '2026-10-06',
      weather: 'rain',
    }),
    'care',
  );
  const invalid = createGeminiProvider(
    { apiKey: 'test-key', model: 'test-model' },
    async () =>
      new Response(
        JSON.stringify({
          candidates: [
            { finishReason: 'STOP', content: { parts: [{ text: '{"theme":"invented-verse"}' }] } },
          ],
        }),
      ),
  );
  await assert.rejects(() =>
    invalid.selectMorningTheme!({ theme: 'remember', language: 'en', date: '2026-10-06' }),
  );
});

test('a briefly busy model (503/429) is retried, then gives up with the status', async () => {
  const reply = (status: number) =>
    status === 200
      ? new Response(
          JSON.stringify({
            candidates: [
              {
                finishReason: 'STOP',
                content: {
                  parts: [{ text: JSON.stringify({ message: 'm', prayer: 'p', question: 'q' }) }],
                },
              },
            ],
          }),
        )
      : new Response('{}', { status });
  const input = {
    theme: 'remember' as const,
    language: 'en' as const,
    scripture: {
      reference: '1 Samuel 7:12',
      text: 'Hitherto hath the LORD helped us.',
      translation: 'KJV',
    },
  };
  const statuses = [503, 429, 200];
  let calls = 0;
  const recovering = createGeminiProvider(
    { apiKey: 'key', model: 'gemini-test' },
    async () => reply(statuses[calls++]),
    [0, 0],
  );
  assert.deepEqual(await recovering.generate(input), { message: 'm', prayer: 'p', question: 'q' });
  assert.equal(calls, 3);
  let busyCalls = 0;
  const busy = createGeminiProvider(
    { apiKey: 'key', model: 'gemini-test' },
    async () => (busyCalls++, reply(503)),
    [0, 0],
  );
  await assert.rejects(busy.generate(input), /HTTP 503/);
  assert.equal(busyCalls, 3);
});
