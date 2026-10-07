import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSupabaseConfig } from './env.js';

test('configuration is optional for health, rejects partial configuration and administrative keys', () => {
  assert.equal(readSupabaseConfig({}), undefined);
  for (const env of [
    { SUPABASE_URL: 'https://example.supabase.co' },
    {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_PUBLISHABLE_KEY: 'sb_secret_do_not_use_here',
    },
    {
      SUPABASE_URL: 'http://external.example',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_123',
    },
  ]) {
    assert.throws(() => readSupabaseConfig(env), /Set a valid/);
  }
});
