import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';
import { createFakeAuthGateway } from '../../../test/helpers/fake-auth.js';
import {
  createItunesCatalog,
  sameSong,
  type SongCatalog,
} from '../../shared/music/song-catalog.js';

const payload = {
  language: 'en',
  date: '2026-10-07',
  feelings: ['overwhelmed'],
  checkIn: 'Exams and missing home.',
  morningReference: 'Joshua 1:9',
};
const unused = async () => {
  throw new Error('unused');
};
// Only these songs "exist" in the fake catalog.
const catalog: SongCatalog = {
  async verify(candidate) {
    const known = [{ title: 'Firm Foundation (He Won’t)', artist: 'Cody Carnes' }];
    return known.find((song) => sameSong(candidate, song));
  },
};

test('evening Word returns verified WEB text, its note and a confirmed song, skipping invented ones', async () => {
  const seen: unknown[] = [];
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    songCatalog: catalog,
    encouragementProvider: {
      generate: unused,
      async selectEveningWord(input) {
        seen.push(input);
        // A fabricated reference first: the server must reject it and ask once more.
        return seen.length === 1
          ? { book: 'Psalm', chapter: 200, firstVerse: 1, lastVerse: 2, note: 'x', songs: [] }
          : {
              book: 'Psalms',
              chapter: 61,
              firstVerse: 1,
              lastVerse: 2,
              note: 'A prayer for an overwhelmed heart.',
              songs: [
                { title: 'Morning Light Over Exams', artist: 'Imaginary Choir' },
                { title: 'Firm Foundation', artist: 'Cody Carnes' },
              ],
            };
      },
    },
  });
  try {
    const reply = await app.inject({ method: 'POST', url: '/v1/evening-word', payload });
    assert.equal(reply.statusCode, 200);
    const body = reply.json();
    assert.equal(body.scripture.reference, 'Psalms 61:1–2');
    assert.match(body.scripture.text, /^Hear my cry, God\. Listen to my prayer\./);
    assert.deepEqual(body.song, { title: 'Firm Foundation (He Won’t)', artist: 'Cody Carnes' });
    assert.equal(body.note, 'A prayer for an overwhelmed heart.');
    assert.equal(seen.length, 2);
    assert.equal(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/evening-word',
          payload: { ...payload, location: 'Dorm' },
        })
      ).statusCode,
      400,
    );
  } finally {
    await app.close();
  }
});

test('a passage is still returned when no suggested song can be confirmed', async () => {
  const app = createApp({
    logger: false,
    authGateway: createFakeAuthGateway(),
    songCatalog: { verify: async () => undefined },
    encouragementProvider: {
      generate: unused,
      selectEveningWord: async () => ({
        book: 'Matthew',
        chapter: 11,
        firstVerse: 28,
        lastVerse: 28,
        note: 'Rest for the weary.',
        songs: [{ title: 'Not A Real Song', artist: 'Nobody' }],
      }),
    },
  });
  try {
    const body = (await app.inject({ method: 'POST', url: '/v1/evening-word', payload })).json();
    assert.equal(body.scripture.reference, 'Matthew 11:28');
    assert.equal(body.song, undefined);
  } finally {
    await app.close();
  }
});

test('without AI the evening Word is unavailable, so the device search takes over', async () => {
  const app = createApp({ logger: false, authGateway: createFakeAuthGateway() });
  try {
    const reply = await app.inject({ method: 'POST', url: '/v1/evening-word', payload });
    assert.equal(reply.statusCode, 503);
  } finally {
    await app.close();
  }
});

test('the iTunes catalog confirms title and artist, and hymns by title, sending only the song', async () => {
  const urls: string[] = [];
  const catalogFor = (results: unknown[]) =>
    createItunesCatalog(async (url) => {
      urls.push(String(url));
      return new Response(JSON.stringify({ results }));
    });
  const found = await catalogFor([
    { trackName: 'Goodness of God (Live)', artistName: 'Bethel Music & Jenn Johnson' },
  ]).verify({ title: 'Goodness of God', artist: 'Bethel Music' });
  assert.deepEqual(found, {
    title: 'Goodness of God (Live)',
    artist: 'Bethel Music & Jenn Johnson',
  });
  assert.match(
    urls[0],
    /^https:\/\/itunes\.apple\.com\/search\?term=Goodness\+of\+God\+Bethel\+Music/,
  );
  assert.equal(
    await catalogFor([{ trackName: 'Goodness of God', artistName: 'Someone Else' }]).verify({
      title: 'Goodness of God',
      artist: 'Bethel Music',
    }),
    undefined,
  );
  assert.deepEqual(
    await catalogFor([{ trackName: 'It Is Well With My Soul', artistName: 'Audrey Assad' }]).verify(
      { title: 'It Is Well with My Soul', artist: 'Hymn' },
    ),
    { title: 'It Is Well With My Soul', artist: 'Audrey Assad' },
  );
});
