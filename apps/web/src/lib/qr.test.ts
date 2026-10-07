import { describe, expect, it } from 'vitest';
import { qrCode } from './qr';

describe('qr code', () => {
  it('draws a square grid with dark modules for a link', () => {
    const code = qrCode('https://ebenezer.example/w/new?from=Ana');
    expect(code.size).toBeGreaterThanOrEqual(21);
    expect(code.path.startsWith('M')).toBe(true);
    expect(code.path).toContain('h1v1h-1z');
  });

  it('is deterministic for the same link and different for another', () => {
    expect(qrCode('https://e.example/a').path).toBe(qrCode('https://e.example/a').path);
    expect(qrCode('https://e.example/a').path).not.toBe(qrCode('https://e.example/b').path);
  });
});
