import * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { db } from '@/db/database';
import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test/render';

const verse = 'The LORD is near to the brokenhearted and saves those who are crushed in spirit.';
const snapshot = {
  reference: 'Psalm 34:18',
  text: verse,
  context: '',
  sourceUrl: 'https://www.bible.com/bible/3034/PSA.34.BSB',
  translation: 'BSB',
  provider: 'youversion',
  attribution: 'Berean Standard Bible is in the public domain.',
  firstVerse: 18,
  lastVerse: 18,
  chapter: { book: 'Psalm', chapter: 34, verses: [{ number: 18, text: verse }] },
  inputKey: 'reference',
};

function stubScripture(ok = true) {
  const fetch = vi.fn(async () =>
    ok ? new Response(JSON.stringify(snapshot)) : new Response('{}', { status: 503 }),
  );
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

beforeEach(async () => {
  await db.preferences.clear();
});

it('opens a Word from a link with no account, onboarding or navigation', async () => {
  const fetch = stubScripture();
  renderWithProviders(<App />, { route: '/w/hard?from=Sam' });
  expect(await screen.findByRole('heading', { level: 1, name: 'A hard day' })).toBeTruthy();
  expect(screen.getByText('Sam sent you a Word')).toBeTruthy();
  expect(screen.getByText(verse)).toBeTruthy();
  expect(screen.getByText('Psalm 34:18')).toBeTruthy();
  expect(screen.getByText('Scripture from YouVersion')).toBeTruthy();
  expect(screen.getByText(/public domain/)).toBeTruthy();
  expect(screen.queryByRole('navigation')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Welcome to Ebenezer.' })).toBeNull();
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://localhost:3001/v1/word/hard');
  expect(options.method).toBe('GET');
  expect(options.body).toBeUndefined();
  expect(new Headers(options.headers).has('Authorization')).toBe(false);
});

it('drops anything but a name from the sender and rejects unknown moments', async () => {
  stubScripture();
  const view = renderWithProviders(<App />, { route: '/w/hard?from=<b>Eve</b>' });
  expect(await screen.findByText('bEveb sent you a Word')).toBeTruthy();
  view.unmount();
  renderWithProviders(<App />, { route: '/w/not-a-moment' });
  expect(await screen.findByRole('heading', { name: 'This link isn’t right.' })).toBeTruthy();
});

it('lets the student reply from their own messaging app, saving and sending nothing', async () => {
  const fetch = stubScripture();
  const share = vi.fn(async () => undefined);
  vi.stubGlobal('navigator', { ...navigator, share });
  renderWithProviders(<App />, { route: '/w/hard?from=Sam' });
  await screen.findByText(verse);
  expect(screen.queryByRole('button', { name: 'Reply to Sam' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'I’m struggling' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Midterms.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reply to Sam' }));
  expect(share).toHaveBeenCalledWith({
    text: 'I’m having a hard time. Can we talk?\nMidterms.\nPsalm 34:18',
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(await db.preferences.count()).toBe(0);
});

it('keeps a Word on this device and shows it on Today', async () => {
  stubScripture();
  const view = renderWithProviders(<App />, { route: '/w/hard?from=Sam' });
  await screen.findByText(verse);
  fireEvent.click(screen.getByRole('button', { name: 'Keep this Word' }));
  await screen.findByRole('button', { name: 'Kept' });
  view.unmount();
  await db.preferences.put({ key: 'onboardingComplete', value: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 503 })),
  );
  renderWithProviders(<App />, { route: '/' });
  expect(await screen.findByRole('heading', { name: 'From Sam' })).toBeTruthy();
  expect(screen.getByText(verse)).toBeTruthy();
});

it('offers a retry when the passage cannot load', async () => {
  stubScripture(false);
  renderWithProviders(<App />, { route: '/w/new' });
  expect(await screen.findByText('The Word didn’t load.')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
});

it('shows the Word in Spanish chrome while keeping Scripture labelled as English', async () => {
  stubScripture();
  await i18n.changeLanguage('es');
  renderWithProviders(<App />, { route: '/w/hard' });
  expect(await screen.findByRole('heading', { level: 1, name: 'Un día difícil' })).toBeTruthy();
  expect(screen.getByText('Escritura en inglés')).toBeTruthy();
  await waitFor(() => expect(screen.getByText(verse).getAttribute('lang')).toBe('en'));
});

it('reads the verse aloud with the device voice and sends nothing anywhere', async () => {
  const fetch = stubScripture();
  const speak = vi.fn();
  const cancel = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak, cancel, speaking: false });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(public text: string) {}
      lang = '';
      rate = 1;
    },
  );
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak, cancel, speaking: false },
    configurable: true,
  });
  renderWithProviders(<App />, { route: '/w/hard' });
  await screen.findByText(verse);
  fireEvent.click(screen.getByRole('button', { name: 'Listen' }));
  expect(speak).toHaveBeenCalledTimes(1);
  expect((speak.mock.calls[0][0] as { text: string }).text).toBe(verse);
  expect(await screen.findByRole('button', { name: 'Stop' })).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('links back to the pack a card was opened from', async () => {
  stubScripture();
  renderWithProviders(<App />, { route: '/w/hard?from=Sam&pack=arrival&start=2026-10-08' });
  await screen.findByText(verse);
  const back = screen.getByRole('link', { name: 'Your week' });
  expect(back.getAttribute('href')).toBe('/p/arrival?start=2026-10-08&from=Sam');
});
