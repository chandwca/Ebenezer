import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { nodeWebSocket } from '../../src/shared/supabase/node-websocket.js';
import { createApp } from '../../src/app.js';

// Requires the real LOCAL Supabase stack. Never load apps/api/.env for this test.
test('real Auth + Node layers + PostgreSQL isolate two accounts and reject bypasses', async () => {
  const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '--output', 'json'], {
    cwd: fileURLToPath(new URL('../../../../', import.meta.url)),
    encoding: 'utf8',
  });
  assert.equal(status.status, 0, 'Start local Supabase before running integration tests.');
  const config = JSON.parse(status.stdout) as Record<string, string>;
  const url = config.API_URL;
  assert.ok(
    url && ['127.0.0.1', 'localhost'].includes(new URL(url).hostname),
    'Test requires a local URL.',
  );
  const publishableKey = config.PUBLISHABLE_KEY;
  assert.ok(publishableKey?.startsWith('sb_publishable_'), 'Local publishable key is required.');
  const admin = createClient(url, config.SECRET_KEY ?? config.SERVICE_ROLE_KEY, {
    realtime: { transport: nodeWebSocket },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const app = createApp({ supabaseConfig: { url, publishableKey }, logger: false });
  const createdIds: string[] = [];
  const tag = randomUUID().replaceAll('-', '').slice(0, 12);
  try {
    const people = [];
    for (const name of ['alice', 'bob']) {
      const email = `${name}-${tag}@example.invalid`;
      const password = randomUUID();
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      assert.ifError(created.error);
      const id = created.data.user!.id;
      createdIds.push(id);
      const client = createClient(url, publishableKey, {
        db: { schema: 'ebenezer_api' },
        realtime: { transport: nodeWebSocket },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signedIn = await client.auth.signInWithPassword({ email, password });
      assert.ifError(signedIn.error);
      const token = signedIn.data.session!.access_token;
      const headers = { authorization: `Bearer ${token}` };
      assert.equal((await app.inject({ method: 'GET', url: '/v1/me', headers })).statusCode, 404);
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers,
        payload: { displayName: name, handle: `${name}_${tag}` },
      });
      assert.equal(response.statusCode, 200, 'Profile creation through Node succeeds.');
      assert.equal(response.json().profile.id, id);
      people.push({ id, token, headers, client, profile: response.json().profile });
    }
    const [alice, bob] = people;
    const responses = await Promise.all(
      people.map((person) => app.inject({ method: 'GET', url: '/v1/me', headers: person.headers })),
    );
    assert.deepEqual(
      responses.map((response) => response.json().profile.id),
      people.map((person) => person.id),
    );
    assert.equal(responses[0].headers['cache-control'], 'no-store');

    const patch = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: alice.headers,
      payload: { displayName: 'Alicia' },
    });
    assert.equal(patch.statusCode, 200);
    assert.equal(patch.json().profile.handle, alice.profile.handle);
    assert.equal(patch.json().profile.createdAt, alice.profile.createdAt);
    assert.ok(Date.parse(patch.json().profile.updatedAt) > Date.parse(alice.profile.updatedAt));
    const conflict = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: bob.headers,
      payload: { handle: alice.profile.handle },
    });
    assert.equal(conflict.statusCode, 409);
    const injectedOwner = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: alice.headers,
      payload: { id: bob.id, displayName: 'Intruder' },
    });
    assert.equal(injectedOwner.statusCode, 400);

    const readOther = await alice.client.from('profiles').select('*').eq('id', bob.id);
    assert.ifError(readOther.error);
    assert.deepEqual(readOther.data, []);
    const writeOther = await alice.client
      .from('profiles')
      .update({ display_name: 'Intruder' })
      .eq('id', bob.id)
      .select();
    assert.ifError(writeOther.error);
    assert.deepEqual(writeOther.data, []);
    const insertOther = await alice.client
      .from('profiles')
      .insert({ id: bob.id, display_name: 'Intruder', handle: `fake_${tag}` });
    assert.equal(insertOther.error?.code, '42501');
    const suppliedTime = await alice.client
      .from('profiles')
      .update({ updated_at: '2000-01-01' })
      .eq('id', alice.id);
    assert.equal(suppliedTime.error?.code, '42501');
    const missingActor = await app.inject({ method: 'GET', url: '/v1/me' });
    assert.equal(missingActor.statusCode, 401);
    const tokenParts = alice.token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());
    tokenParts[1] = Buffer.from(JSON.stringify({ ...payload, sub: bob.id })).toString('base64url');
    const forged = await app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${tokenParts.join('.')}` },
    });
    assert.equal(forged.statusCode, 401, 'A decoded but unverified identity is never trusted.');
    const anonymous = createClient(url, publishableKey, {
      db: { schema: 'ebenezer_api' },
      realtime: { transport: nodeWebSocket },
      auth: { persistSession: false },
    });
    assert.ok((await anonymous.from('profiles').select('*')).error);
    const privateSchema = await alice.client
      .schema('ebenezer_private')
      .from('profiles')
      .select('*');
    assert.equal(privateSchema.error?.code, 'PGRST106', 'Internal schema is not exposed.');
    const oldSchema = await alice.client.schema('public').from('profiles').select('*');
    assert.equal(oldSchema.error?.code, 'PGRST106', 'Application API no longer exposes public.');
    const bobStillOwns = await app.inject({ method: 'GET', url: '/v1/me', headers: bob.headers });
    assert.equal(bobStillOwns.json().profile.displayName, 'bob');
  } finally {
    await app.close();
    for (const id of createdIds) {
      const deleted = await admin.auth.admin.deleteUser(id);
      assert.ifError(deleted.error);
    }
  }
});
