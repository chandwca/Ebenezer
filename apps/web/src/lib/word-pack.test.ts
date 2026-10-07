import { describe, expect, it } from 'vitest';
import { wordMoment } from './word-card';
import {
  cleanStart,
  dayOpensOn,
  localDate,
  openDays,
  packCardPath,
  packPath,
  packUrl,
  wordPack,
  wordPacks,
} from './word-pack';

describe('word packs', () => {
  it('only reference reviewed moments, five days each', () => {
    for (const pack of wordPacks) {
      expect(pack.moments).toHaveLength(5);
      for (const moment of pack.moments) expect(wordMoment(moment)).toBeTruthy();
    }
    expect(wordPack('arrival')?.moments[0]).toBe('new');
    expect(wordPack('missing')).toBeUndefined();
  });

  it('unlocks one day at a time from the start date and never goes past the pack', () => {
    expect(openDays('2026-10-08', '2026-10-07', 5)).toBe(0);
    expect(openDays('2026-10-08', '2026-10-08', 5)).toBe(1);
    expect(openDays('2026-10-08', '2026-10-10', 5)).toBe(3);
    expect(openDays('2026-10-08', '2026-12-01', 5)).toBe(5);
    expect(dayOpensOn('2026-10-30', 3)).toBe('2026-11-01');
  });

  it('accepts only real calendar dates for the start', () => {
    expect(cleanStart('2026-10-08')).toBe('2026-10-08');
    expect(cleanStart('2026-02-30')).toBeUndefined();
    expect(cleanStart('tomorrow')).toBeUndefined();
    expect(cleanStart(null)).toBeUndefined();
  });

  it('formats the device-local date without shifting the day', () => {
    expect(localDate(new Date(2026, 9, 7, 23, 30))).toBe('2026-10-07');
    expect(localDate(new Date(2026, 9, 7, 0, 5))).toBe('2026-10-07');
  });

  it('builds links that carry only a start date and a first name', () => {
    expect(packPath('arrival')).toBe('/p/arrival');
    expect(packPath('arrival', { start: '2026-10-08', from: 'Ana' })).toBe(
      '/p/arrival?start=2026-10-08&from=Ana',
    );
    expect(packPath('hard', { start: 'junk', from: '<b>' })).toBe('/p/hard?from=b');
    expect(packUrl('https://e.example/', 'hard', { start: '2026-10-08' })).toBe(
      'https://e.example/p/hard?start=2026-10-08',
    );
  });

  it('links a day back to its pack so the student can return to their week', () => {
    expect(packCardPath('arrival', 'homesick', { start: '2026-10-08', from: 'Ana' })).toBe(
      '/w/homesick?from=Ana&pack=arrival&start=2026-10-08',
    );
    expect(packCardPath('hard', 'break')).toBe('/w/break?pack=hard');
  });
});
