import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../app.js';

test('health responds without a database and stays outside the versioned prefix', async () => {
  const app = createApp();
  try {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok', service: 'ebenezer-api' });
    assert.equal((await app.inject('/v1/health')).statusCode, 404);
  } finally {
    await app.close();
  }
});
