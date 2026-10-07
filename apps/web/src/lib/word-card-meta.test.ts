import { describe, expect, it } from 'vitest';
import { buildPackMeta, buildWordCardMeta, metaTags } from './word-card-meta';

describe('word card link previews', () => {
  it('shows the verse and who sent it when the passage resolves', () => {
    const meta = buildWordCardMeta({
      origin: 'https://ebenezer.example/',
      moment: 'hard',
      from: 'Sam',
      passage: { text: 'The LORD is near to the brokenhearted.', reference: 'Psalm 34:18' },
    });
    expect(meta).toEqual({
      title: 'Sam sent you a Word',
      description: '“The LORD is near to the brokenhearted.” — Psalm 34:18',
      url: 'https://ebenezer.example/w/hard?from=Sam',
      image: 'https://ebenezer.example/icon-512.png',
    });
  });

  it('falls back to the moment name without a passage, and stays anonymous without a sender', () => {
    const meta = buildWordCardMeta({ origin: 'https://e.example', moment: 'homesick' });
    expect(meta?.title).toBe('A Word for you');
    expect(meta?.description).toBe('Far from home');
    expect(meta?.url).toBe('https://e.example/w/homesick');
  });

  it('refuses unknown moments and truncates long passages', () => {
    expect(buildWordCardMeta({ origin: 'https://e.example', moment: 'nope' })).toBeUndefined();
    const meta = buildWordCardMeta({
      origin: 'https://e.example',
      moment: 'stress',
      passage: { text: 'word '.repeat(100), reference: 'Philippians 4:6–7' },
    });
    expect(meta!.description.length).toBeLessThanOrEqual(200);
    expect(meta!.description.endsWith('…')).toBe(true);
  });

  it('escapes anything that could break out of an attribute', () => {
    const html = metaTags({
      title: 'A "quoted" <title>',
      description: 'x & y',
      url: 'https://e.example/w/new',
      image: 'https://e.example/icon-512.png',
    });
    expect(html).toContain('content="A &quot;quoted&quot; &lt;title&gt;"');
    expect(html).toContain('content="x &amp; y"');
    expect(html).not.toContain('<title>');
  });

  it('previews a pack with who sent it and a valid start date only', () => {
    expect(
      buildPackMeta({
        origin: 'https://e.example',
        pack: 'arrival',
        from: 'Ana',
        start: '2026-10-08',
      }),
    ).toEqual({
      title: 'Ana sent you a week of Words',
      description: 'Your first week. Five Words for settling in.',
      url: 'https://e.example/p/arrival?start=2026-10-08&from=Ana',
      image: 'https://e.example/icon-512.png',
    });
    expect(buildPackMeta({ origin: 'https://e.example', pack: 'hard', start: 'junk' })?.url).toBe(
      'https://e.example/p/hard',
    );
    expect(buildPackMeta({ origin: 'https://e.example', pack: 'nope' })).toBeUndefined();
  });
});
