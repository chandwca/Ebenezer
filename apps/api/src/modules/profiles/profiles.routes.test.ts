import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';
import { alice, bearer, bob } from '../../../test/helpers/fake-auth.js';
import { createTestApp } from '../../../test/helpers/test-app.js';
import { createFakeProfilesRepository } from './profiles.repository.fake.js';

const timestamp = '2026-10-06T12:00:00.000Z';
function fixture() {
  const { repository, rows } = createFakeProfilesRepository(timestamp);
  const app = createTestApp({ repositories: { profiles: () => repository } });
  return { app, rows };
}

test('browser preflight permits authenticated profile saves from the configured web origin', async () => {
  const { app, rows } = fixture();
  try {
    const origin = process.env.WEB_ORIGIN ?? 'http://localhost:5173';
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/me',
      headers: {
        origin,
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['access-control-allow-origin'], origin);
    assert.ok(
      String(response.headers['access-control-allow-methods'])
        .split(',')
        .map((method) => method.trim())
        .includes('PATCH'),
    );
    assert.match(String(response.headers['access-control-allow-headers']), /authorization/);
    assert.match(String(response.headers['access-control-allow-headers']), /content-type/);
    assert.equal(rows.size, 0);
  } finally {
    await app.close();
  }
});

test('missing, malformed and invalid sessions cannot read or mutate profiles', async () => {
  const { app, rows } = fixture();
  try {
    for (const method of ['GET', 'PATCH'] as const) {
      for (const authorization of ['', 'Basic secret', 'Bearer stale', 'Bearer a b']) {
        const response = await app.inject({
          method,
          url: '/v1/me',
          headers: { authorization },
          ...(method === 'PATCH' ? { payload: { displayName: 'Alice', handle: 'alice' } } : {}),
        });
        assert.equal(response.statusCode, 401);
      }
    }
    assert.equal(rows.size, 0);
  } finally {
    await app.close();
  }
});

test('first PATCH creates the actor profile, normalizes fields and subsequent PATCH preserves omitted fields', async () => {
  const { app } = fixture();
  try {
    const missing = await app.inject({ method: 'GET', url: '/v1/me', headers: bearer() });
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.headers['cache-control'], 'no-store');
    const created = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: bearer(),
      payload: { displayName: ' Alice ', handle: ' ALICE_1 ' },
    });
    assert.equal(created.statusCode, 200);
    assert.equal(created.headers['cache-control'], 'no-store');
    assert.equal(created.json().profile.id, alice);
    assert.equal(created.json().profile.handle, 'alice_1');
    const patched = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: bearer(),
      payload: { displayName: 'Alicia' },
    });
    assert.equal(patched.statusCode, 200);
    assert.equal(patched.json().profile.handle, 'alice_1');
    const fetched = await app.inject({ method: 'GET', url: '/v1/me', headers: bearer() });
    assert.equal(fetched.json().profile.displayName, 'Alicia');
  } finally {
    await app.close();
  }
});

test('an incomplete first profile is reported as a 400 with its own error code', async () => {
  const { app, rows } = fixture();
  try {
    const response = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: bearer(),
      payload: { displayName: 'Alice' },
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'profile_incomplete');
    assert.equal(rows.size, 0);
  } finally {
    await app.close();
  }
});

test('invalid and server-owned fields are rejected instead of silently stripped', async () => {
  const { app, rows } = fixture();
  try {
    for (const payload of [
      {},
      { displayName: '' },
      { handle: 'a' },
      { handle: 'two words' },
      { displayName: 'x'.repeat(121) },
      { displayName: 'Alice', handle: 'alice', id: bob },
      { displayName: 'Alice', handle: 'alice', createdAt: timestamp },
    ]) {
      const response = await app.inject({
        method: 'PATCH',
        url: '/v1/me',
        headers: bearer(),
        payload,
      });
      assert.equal(response.statusCode, 400);
    }
    assert.equal(rows.size, 0);
  } finally {
    await app.close();
  }
});

test('interleaved requests use separate actors and duplicate handles return conflict', async () => {
  const { app } = fixture();
  try {
    const results = await Promise.all(
      ['alice', 'bob'].map((name) =>
        app.inject({
          method: 'PATCH',
          url: '/v1/me',
          headers: bearer(`${name}-session`),
          payload: { displayName: name, handle: name },
        }),
      ),
    );
    assert.deepEqual(
      results.map((r) => r.json().profile.id),
      [alice, bob],
    );
    const fetched = await Promise.all(
      ['alice', 'bob'].map((name) =>
        app.inject({ method: 'GET', url: '/v1/me', headers: bearer(`${name}-session`) }),
      ),
    );
    assert.deepEqual(
      fetched.map((r) => r.json().profile.handle),
      ['alice', 'bob'],
    );
    const conflict = await app.inject({
      method: 'PATCH',
      url: '/v1/me',
      headers: bearer('bob-session'),
      payload: { displayName: 'B', handle: 'alice' },
    });
    assert.equal(conflict.statusCode, 409);
  } finally {
    await app.close();
  }
});

test('upstream failures do not expose internal errors or tokens', async () => {
  const app = createApp({
    logger: false,
    authGateway: {
      async authenticate() {
        throw new Error('private bearer token');
      },
    },
  });
  try {
    const response = await app.inject({ method: 'GET', url: '/v1/me', headers: bearer() });
    assert.equal(response.statusCode, 500);
    assert.equal(response.body.includes('private bearer'), false);
  } finally {
    await app.close();
  }
});
