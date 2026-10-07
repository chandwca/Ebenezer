import { beforeEach, expect, it } from 'vitest';
import { rememberReturnPath, takeReturnPath } from './return-path';

beforeEach(() => sessionStorage.clear());

it('returns once to an allowed welcome step, then falls back to Settings', () => {
  rememberReturnPath('/welcome?step=account');
  expect(takeReturnPath()).toBe('/welcome?step=account');
  expect(takeReturnPath()).toBe('/settings');
});

it('ignores destinations outside the allowlist', () => {
  rememberReturnPath('https://evil.example/');
  sessionStorage.setItem('ebenezer.afterSignIn', '//evil.example');
  expect(takeReturnPath()).toBe('/settings');
});
