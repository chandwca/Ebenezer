import { describe, expect, it, vi, afterEach } from 'vitest';
import { Route, Routes, MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { readNotificationWord, notificationSnapshot } from './notification-word';
import { NotificationPage } from '@/pages/notification';
import { db } from '@/db/database';
import { ReflectionPage } from '@/pages/reflection';
import { journal } from '@/db/repositories';

const word = {
  date: '2026-10-07',
  book: '1 John',
  chapter: 4,
  verse: 19,
  reference: '1 John 4:19',
  text: 'We love because He first loved us.',
  translation: 'BSB',
  provider: 'youversion',
  attribution: 'Fixture public domain attribution.',
  sourceUrl: 'https://www.bible.com/bible/3034/1JN.4.BSB',
} as const;
function cacheWord() {
  vi.stubGlobal('caches', {
    open: vi.fn(async () => ({ match: vi.fn(async () => Response.json(word)) })),
  });
}
afterEach(async () => {
  vi.unstubAllGlobals();
  await db.preferences.delete('notification:thought:2026-10-07');
  await db.drafts.clear();
});

describe('notification continuation', () => {
  it('reads the delivered verse without a network request and marks the excerpt honestly', async () => {
    cacheWord();
    const network = vi.fn();
    vi.stubGlobal('fetch', network);
    expect(await readNotificationWord(word.date)).toEqual(word);
    expect(await readNotificationWord('2026-10-08')).toBeUndefined();
    const snapshot = notificationSnapshot(word);
    expect(snapshot.text).toBe(word.text);
    expect(snapshot.chapterComplete).toBe(false);
    expect(network).not.toHaveBeenCalled();
  });
  it('a delayed tap shows the original passage, saves a thought locally and carries it into the evening draft', async () => {
    cacheWord();
    const view = render(
      <MemoryRouter initialEntries={['/notification/morning/2026-10-07']}>
        <Routes>
          <Route path="/notification/:kind/:date" element={<NotificationPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('“We love because He first loved us.”')).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'I can bring my questions.' },
    });
    await waitFor(async () =>
      expect((await db.preferences.get('notification:thought:2026-10-07'))?.value).toBe(
        'I can bring my questions.',
      ),
    );
    view.unmount();
    render(
      <MemoryRouter initialEntries={['/reflection?from=today&notificationDate=2026-10-07']}>
        <ReflectionPage />
      </MemoryRouter>,
    );
    await waitFor(async () => {
      const draft = await journal.getDraft();
      expect(draft?.values.morningWord?.date).toBe(word.date);
      expect(draft?.values.morningWord?.scripture?.text).toBe(word.text);
      expect(draft?.values.morningWord?.thought).toBe('I can bring my questions.');
    });
  });
});
