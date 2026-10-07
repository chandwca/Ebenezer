import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createPublicKey, randomBytes, verify } from 'node:crypto';
import webpush from 'web-push';
// @ts-expect-error http_ece ships no types; it is the reference Web Push encryption library.
import ece from 'http_ece';
import { deliver, requestFor, type Target } from './push.ts';
import { dueReminder, messageFor, settledSentDates, type Subscription } from './reminders.ts';
import { runReminders } from './scheduler.ts';
import { handleSubscriptionRequest, type NewRow, type Row } from './subscriptions.ts';

const chicago: Subscription = {
  time_zone: 'America/Chicago',
  language: 'en',
  morning_time: '07:30:00',
  evening_time: '20:30:00',
  discreet: true,
  last_morning_sent: null,
  last_evening_sent: null,
};
// 2026-10-07 is Central Daylight Time: UTC-5.
const at = (localTime: string) => new Date(`2026-10-07T${localTime}:00-05:00`);

test('morning and evening are due at her local time, once a day, within a 3-hour window', () => {
  assert.equal(dueReminder(chicago, at('07:29')), undefined);
  assert.deepEqual(dueReminder(chicago, at('07:30')), {
    kind: 'morning',
    date: '2026-10-07',
    marks: { last_morning_sent: '2026-10-07' },
  });
  assert.equal(dueReminder({ ...chicago, last_morning_sent: '2026-10-07' }, at('07:45')), undefined);
  assert.equal(dueReminder(chicago, at('10:31')), undefined, 'never hours late');
  assert.equal(dueReminder(chicago, at('20:44'))?.kind, 'evening');
  // The same instant is morning in Chicago and night in Kolkata.
  const kolkata = { ...chicago, time_zone: 'Asia/Kolkata' };
  assert.equal(dueReminder(kolkata, at('07:30')), undefined);
  assert.equal(dueReminder(kolkata, new Date('2026-10-07T15:05:00Z'))?.kind, 'evening');
});

test('when both are due only the later one is sent, and both are marked', () => {
  const close = { ...chicago, morning_time: '19:00', evening_time: '20:00' };
  assert.deepEqual(dueReminder(close, at('20:10')), {
    kind: 'evening',
    date: '2026-10-07',
    marks: { last_morning_sent: '2026-10-07', last_evening_sent: '2026-10-07' },
  });
});

test('saving settings never triggers an immediate scheduled reminder', () => {
  assert.deepEqual(settledSentDates(chicago, at('10:00')), {
    last_morning_sent: '2026-10-07',
    last_evening_sent: null,
  });
  // Moving the evening later after it was sent today does not send it twice.
  assert.equal(
    settledSentDates(
      { ...chicago, evening_time: '22:00', last_evening_sent: '2026-10-07' },
      at('21:00'),
    ).last_evening_sent,
    '2026-10-07',
  );
});

test('wording: discreet by default, fuller on request, English and Spanish, right page', () => {
  assert.deepEqual(messageFor('morning', chicago), {
    title: 'Ebenezer',
    body: 'A moment for you',
    url: '/',
    tag: 'morning',
  });
  const full = { ...chicago, discreet: false };
  assert.equal(messageFor('evening', full).body, 'How was your day? Bring it to Jesus tonight.');
  assert.equal(messageFor('evening', full).url, '/reflection?from=today');
  assert.equal(
    messageFor('welcome', full).body,
    'We’ll meet you at 7:30 AM each morning and 8:30 PM each evening.',
  );
  assert.equal(messageFor('morning', { ...full, language: 'es' }).body, 'Tu Palabra para hoy está lista.');
  assert.doesNotMatch(JSON.stringify(messageFor('welcome', chicago)), /Jesus|Word|God/);
});

// A real phone's subscription keys, so encryption can be checked end to end.
function phone(endpoint = 'https://push.example.test/device-1') {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = randomBytes(16);
  return {
    ecdh,
    auth,
    target: {
      endpoint,
      p256dh: ecdh.getPublicKey().toString('base64url'),
      auth: auth.toString('base64url'),
    } satisfies Target,
  };
}
const vapidKeys = webpush.generateVAPIDKeys();
const vapid = { subject: 'mailto:test@example.org', ...vapidKeys };

test('a reminder is encrypted for the phone and signed with the VAPID key', () => {
  const device = phone();
  const payload = messageFor('morning', chicago);
  const request = requestFor(device.target, payload, vapid);
  const plain = ece.decrypt(request.body, {
    version: 'aes128gcm',
    privateKey: device.ecdh,
    authSecret: device.auth,
  });
  assert.deepEqual(JSON.parse(plain.toString()), payload);
  const [, token, key] = /^vapid t=([^,]+), k=(.+)$/.exec(String(request.headers.Authorization))!;
  assert.equal(key, vapidKeys.publicKey);
  const [header, claims, signature] = token.split('.');
  const point = Buffer.from(vapidKeys.publicKey, 'base64url');
  const publicKey = createPublicKey({
    key: {
      kty: 'EC',
      crv: 'P-256',
      x: point.subarray(1, 33).toString('base64url'),
      y: point.subarray(33).toString('base64url'),
    },
    format: 'jwk',
  });
  assert.ok(
    verify(
      'sha256',
      Buffer.from(`${header}.${claims}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url'),
    ),
  );
  assert.equal(JSON.parse(Buffer.from(claims, 'base64url').toString()).aud, 'https://push.example.test');
  assert.equal(request.headers.TTL, 14400);
});

test('delivery outcomes: accepted, gone (404/410) and failed', async () => {
  const { target } = phone();
  const payload = messageFor('morning', chicago);
  const reply = (status: number) => async () => new Response(null, { status });
  assert.equal(await deliver(target, payload, vapid, reply(201)), 'sent');
  assert.equal(await deliver(target, payload, vapid, reply(410)), 'gone');
  assert.equal(await deliver(target, payload, vapid, reply(404)), 'gone');
  assert.equal(await deliver(target, payload, vapid, reply(500)), 'failed');
  assert.equal(
    await deliver(target, payload, vapid, async () => {
      throw new Error('offline');
    }),
    'failed',
  );
});

function memoryStore(rows: Row[] = []) {
  return {
    rows,
    async find(endpoint: string) {
      return rows.find((row) => row.endpoint === endpoint);
    },
    async save(row: NewRow) {
      const index = rows.findIndex((item) => item.endpoint === row.endpoint);
      if (index >= 0) rows[index] = { ...rows[index], ...row };
      else rows.push({ ...row, id: `id-${rows.length + 1}` });
    },
    async remove(endpoint: string) {
      rows.splice(0, rows.length, ...rows.filter((row) => row.endpoint !== endpoint));
    },
    async all() {
      return [...rows];
    },
    async mark(id: string, marks: Partial<Row>) {
      Object.assign(rows.find((row) => row.id === id)!, marks);
    },
    async removeById(id: string) {
      rows.splice(0, rows.length, ...rows.filter((row) => row.id !== id));
    },
  };
}

test('the app saves settings, gets one welcome, can test now and turn reminders off', async () => {
  const store = memoryStore();
  const sent: { endpoint: string; tag: string; body: string }[] = [];
  const deps = {
    store,
    vapid,
    now: () => at('10:00'),
    deliver: async (target: Target, payload: { tag: string; body: string }) => {
      sent.push({ endpoint: target.endpoint, tag: payload.tag, body: payload.body });
      return 'sent' as const;
    },
  };
  const { target } = phone();
  const save = {
    action: 'save',
    subscription: { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
    timeZone: 'America/Chicago',
    language: 'en',
  };
  assert.deepEqual(await handleSubscriptionRequest(save, deps), {
    status: 200,
    body: { created: true, welcome: 'sent' },
  });
  assert.deepEqual(sent.map((item) => item.tag), ['welcome']);
  assert.equal(store.rows[0].discreet, true);
  assert.equal(store.rows[0].last_morning_sent, '2026-10-07', 'no morning reminder right after');
  // Changing times later: no second welcome.
  await handleSubscriptionRequest({ ...save, eveningTime: '21:15', discreet: false }, deps);
  assert.equal(sent.length, 1);
  assert.equal(store.rows[0].evening_time, '21:15');
  assert.equal(store.rows.length, 1, 'each phone appears once');

  assert.deepEqual(
    await handleSubscriptionRequest({ action: 'test', endpoint: target.endpoint, kind: 'evening' }, deps),
    { status: 200, body: { delivery: 'sent' } },
  );
  assert.equal(sent[1].body, 'How was your day? Bring it to Jesus tonight.');
  assert.equal(
    (await handleSubscriptionRequest({ action: 'test', endpoint: 'https://push.example.test/unknown', kind: 'morning' }, deps)).status,
    404,
  );
  for (const invalid of [
    { ...save, timeZone: 'Mars/Olympus' },
    { ...save, subscription: { ...save.subscription, endpoint: 'http://insecure.test/x' } },
    { ...save, eveningTime: '25:00' },
    { ...save, name: 'Maya' },
    { action: 'delete-everything' },
  ])
    assert.equal((await handleSubscriptionRequest(invalid, deps)).status, 400);

  await handleSubscriptionRequest({ action: 'remove', endpoint: target.endpoint }, deps);
  assert.equal(store.rows.length, 0);
  assert.equal((await handleSubscriptionRequest(save, { ...deps, vapid: undefined })).status, 503);
});

test('a phone that is gone is forgotten when a welcome or test cannot reach it', async () => {
  const store = memoryStore();
  const { target } = phone();
  await handleSubscriptionRequest(
    {
      action: 'save',
      subscription: { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      timeZone: 'UTC',
      language: 'es',
    },
    { store, vapid, now: () => at('10:00'), deliver: async () => 'gone' as const },
  );
  assert.equal(store.rows.length, 0);
});

test('the scheduled run sends what is due, marks it, retries failures and forgets gone phones', async () => {
  const row = (id: string, overrides: Partial<Row> = {}): Row => ({
    ...chicago,
    ...phone(`https://push.example.test/${id}`).target,
    id,
    ...overrides,
  });
  const store = memoryStore([
    row('due'),
    row('failing'),
    row('gone'),
    row('done', { last_morning_sent: '2026-10-07' }),
    row('elsewhere', { time_zone: 'Europe/London' }), // 1:35 pm there: nothing due
  ]);
  const outcome = { due: 'sent', failing: 'failed', gone: 'gone' } as const;
  const totals = await runReminders({
    store,
    vapid,
    now: () => at('07:35'),
    deliver: async (target) =>
      outcome[target.endpoint.split('/').pop() as keyof typeof outcome] ?? 'sent',
  });
  assert.deepEqual(totals, { due: 3, sent: 1, gone: 1, failed: 1 });
  const byId = Object.fromEntries(store.rows.map((item) => [item.id, item]));
  assert.equal(byId.due.last_morning_sent, '2026-10-07');
  assert.equal(byId.failing.last_morning_sent, null, 'retried on the next run');
  assert.equal(byId.gone, undefined);
  assert.equal(byId.elsewhere.last_morning_sent, null);
});
