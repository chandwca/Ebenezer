import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morningContext, morningPassage, encouragementRequestSchema } from '@ebenezer/contracts';
import { createEncouragementService } from './encouragement.service.js';

test('calendar occasions take priority over weather with verified Scripture', () => {
  for (const [date, occasion, reference] of [
    [new Date(2026, 11, 25), 'christmas', 'Luke 2:11'],
    [new Date(2026, 3, 5), 'easter', 'Matthew 28:6'],
    [new Date(2026, 3, 3), 'goodFriday', 'Romans 5:8'],
    [new Date(2027, 0, 1), 'newYear', 'Lamentations 3:23'],
  ] as const) {
    const input = morningContext(date, 'rain');
    assert.equal(input.occasion, occasion);
    assert.equal(morningPassage(input).reference, reference);
  }
  assert.equal(morningContext(new Date(2026, 9, 6), 'rain').theme, 'care');
  assert.equal(morningContext(new Date(2026, 9, 6), 'storm').theme, 'steadiness');
  assert.equal(
    encouragementRequestSchema.safeParse({
      theme: 'care',
      language: 'en',
      weather: 'my private city',
    }).success,
    false,
  );
});

test('AI receives calendar and weather without location, with separate cache entries and correct fallback', async () => {
  const inputs: unknown[] = [];
  const service = createEncouragementService({
    async generate(input) {
      inputs.push(input);
      return {
        message: 'Pause with this Word.',
        prayer: 'Jesus, help me understand.',
        question: 'What stands out?',
      };
    },
  });
  const christmas = morningContext(new Date(2026, 11, 25), 'rain');
  assert.equal((await service.get(christmas)).scripture.reference, 'Luke 2:11');
  await service.get(christmas);
  await service.get({ ...christmas, weather: 'clear' });
  assert.equal(inputs.length, 2);
  assert.deepEqual(Object.keys(inputs[0] as object).sort(), [
    'language',
    'occasion',
    'scripture',
    'theme',
    'weather',
  ]);
  const fallback = await createEncouragementService().get(christmas);
  assert.equal(fallback.source, 'prepared');
  assert.equal(fallback.scripture.reference, 'Luke 2:11');
});

test('dated morning requests use AI selection once per date and save verified text, with calendar priority', async () => {
  let selections = 0;
  const service = createEncouragementService({
    async selectMorningTheme() {
      selections++;
      return 'care';
    },
    async generate(input) {
      assert.equal(
        input.scripture.reference,
        input.occasion === 'christmas' ? 'Luke 2:11' : '1 Peter 5:7',
      );
      return {
        message: 'Bring your day to Jesus.',
        prayer: 'Jesus, help me understand.',
        question: 'What stands out?',
      };
    },
  });
  const first = { theme: 'remember', language: 'en', date: '2026-10-06' } as const;
  assert.equal((await service.get(first)).scripture.reference, '1 Peter 5:7');
  await service.get(first);
  assert.equal(selections, 1);
  await service.get({ ...first, date: '2026-10-07' });
  assert.equal(selections, 2);
  await service.get({ ...first, date: '2026-12-25', occasion: 'christmas' });
  assert.equal(selections, 2);
});
