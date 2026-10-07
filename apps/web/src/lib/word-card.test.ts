import { describe, expect, it } from 'vitest';
import {
  cleanSender,
  composeReply,
  wordCardPath,
  wordCardUrl,
  wordMoment,
  wordMoments,
} from './word-card';

describe('word card links', () => {
  it('finds only reviewed moments', () => {
    expect(wordMoment('homesick')?.book).toBe('Psalm');
    expect(wordMoment('anything-else')).toBeUndefined();
    expect(wordMoment(undefined)).toBeUndefined();
  });

  it('gives every moment a valid single-chapter passage', () => {
    for (const moment of wordMoments) {
      expect(moment.firstVerse).toBeGreaterThanOrEqual(1);
      expect(moment.lastVerse).toBeGreaterThanOrEqual(moment.firstVerse);
    }
    expect(new Set(wordMoments.map((moment) => moment.id)).size).toBe(wordMoments.length);
  });

  it('keeps only a first name or nickname from the sender', () => {
    expect(cleanSender('  Pastor   Mark ')).toBe('Pastor Mark');
    expect(cleanSender('Priya<script>alert(1)</script>')).toBe('Priyascriptalert1script');
    expect(cleanSender('李明')).toBe('李明');
    expect(cleanSender("O'Neil-Ruiz")).toBe("O'Neil-Ruiz");
    expect(cleanSender('a'.repeat(80))).toHaveLength(30);
    expect(cleanSender(null)).toBe('');
  });

  it('builds a path and URL that round-trip a sender name', () => {
    expect(wordCardPath('new')).toBe('/w/new');
    expect(wordCardPath('new', 'Ana María')).toBe('/w/new?from=Ana%20Mar%C3%ADa');
    expect(wordCardUrl('https://ebenezer.example/', 'stress', 'Sam')).toBe(
      'https://ebenezer.example/w/stress?from=Sam',
    );
  });

  it('composes a reply from the lines that have words', () => {
    expect(composeReply(['This helped.', undefined, '  ', 'Psalm 34:18'])).toBe(
      'This helped.\nPsalm 34:18',
    );
  });
});
