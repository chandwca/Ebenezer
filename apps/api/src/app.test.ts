import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from './app.js';

test('configured CORS applies and unknown or unversioned routes return 404', async () => {
  const app = createApp();
  try {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:5173' },
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal((await app.inject('/missing')).statusCode, 404);
    assert.equal((await app.inject('/me')).statusCode, 404);
  } finally {
    await app.close();
  }
});
