import { test } from 'node:test';
import assert from 'node:assert/strict';
import { morningContext } from '@ebenezer/contracts';
import { verifiedMorningVerse } from '../../shared/bible/morning-bible.js';
import { createMorningService, morningVerses } from './morning.service.js';

const generate = async () => ({
  message: 'Carry this Word.',
  prayer: 'Jesus, go with me.',
  question: 'What will you carry today?',
});

test('every curated morning verse exists in the verified WEB Bible and stands alone', async () => {
  for (const [book, chapter, verse] of Object.values(morningVerses).flat()) {
    const snapshot = await verifiedMorningVerse(book, chapter, verse, 'check');
    assert.ok(snapshot.text.length >= 25 && snapshot.text.length <= 450, snapshot.reference);
  }
});

test('signed out, without AI or weather, a verified verse and carry question are returned', async () => {
  const result = await createMorningService().get({
    theme: 'remember',
    language: 'en',
    date: '2026-10-06',
  });
  assert.equal(result.source, 'prepared');
  assert.equal(result.scripture.translation, 'WEB Classic');
  assert.equal(result.snapshot?.text, result.scripture.text);
  assert.match(result.encouragement.question, /carry/);
});

test('weather and calendar shape the fallback choice', async () => {
  const service = createMorningService();
  const storm = await service.get({
    ...morningContext(new Date(2026, 9, 6), 'storm'),
    date: '2026-10-06',
  });
  assert.ok(
    morningVerses.storm.some(([book, chapter, verse]) =>
      storm.scripture.reference.startsWith(`${book} ${chapter}:${verse}`),
    ),
  );
  const christmas = await service.get({
    ...morningContext(new Date(2026, 11, 25)),
    date: '2026-12-25',
  });
  assert.equal(christmas.scripture.reference, 'Luke 2:11');
});

test('AI may choose any verse, but only verified text is shown and bad references fall back', async () => {
  const chosen: unknown[] = [];
  const service = createMorningService({
    async selectMorningReference(input) {
      chosen.push(input);
      return input.weather === 'snow'
        ? { book: 'Hezekiah', chapter: 1, verse: 1 }
        : { book: 'Micah', chapter: 7, verse: 8 };
    },
    generate,
  });
  const day = { theme: 'care', language: 'en', date: '2026-10-06' } as const;
  const micah = await service.get(day);
  assert.equal(micah.scripture.reference, 'Micah 7:8');
  assert.equal(micah.source, 'ai');
  await service.get(day);
  assert.equal(chosen.length, 1, 'one selection per public context');
  assert.deepEqual(Object.keys(chosen[0] as object).sort(), ['date', 'language', 'theme']);
  const snow = await service.get({ ...day, weather: 'snow' });
  assert.ok(
    morningVerses.snow.some(([book, chapter, verse]) =>
      snow.scripture.reference.startsWith(`${book} ${chapter}:${verse}`),
    ),
  );
});
