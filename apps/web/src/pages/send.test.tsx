import * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { App } from '@/App';
import { db } from '@/db/database';
import { renderWithProviders } from '@/test/render';

const verse = 'Be strong and courageous. Do not be afraid or discouraged.';
const snapshot = {
  reference: 'Joshua 1:9',
  text: verse,
  context: '',
  sourceUrl: 'https://www.bible.com/bible/3034/JOS.1.BSB',
  translation: 'BSB',
  provider: 'youversion',
  attribution: 'Berean Standard Bible is in the public domain.',
  firstVerse: 9,
  lastVerse: 9,
  chapter: { book: 'Joshua', chapter: 1, verses: [{ number: 9, text: verse }] },
  inputKey: 'reference',
};

beforeEach(async () => {
  await db.preferences.clear();
  await db.preferences.put({ key: 'onboardingComplete', value: true });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(snapshot))),
  );
});

it('previews the card and shares a link that carries only a moment and a first name', async () => {
  const share = vi.fn(async () => undefined);
  vi.stubGlobal('navigator', { ...navigator, share });
  renderWithProviders(<App />, { route: '/send' });
  await screen.findByText(verse);
  fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  const [payload] = share.mock.calls[0] as unknown as [{ text: string; url: string }];
  expect(payload.text).toBe('A Word for you:');
  expect(new URL(payload.url).pathname + new URL(payload.url).search).toBe('/w/new?from=Ana');
});

it('changes the card when another moment is picked, and copies the link without sharing', async () => {
  const writeText = vi.fn(async () => undefined);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  renderWithProviders(<App />, { route: '/send' });
  await screen.findByText(verse);
  fireEvent.click(screen.getByRole('button', { name: 'Far from home' }));
  const copy = screen.getByRole('button', { name: 'Copy link' });
  expect(copy.hasAttribute('disabled')).toBe(true);
  await waitFor(() => expect(copy.hasAttribute('disabled')).toBe(false));
  fireEvent.click(copy);
  await waitFor(() => expect(writeText).toHaveBeenCalled());
  expect(String((writeText.mock.calls[0] as unknown[])[0])).toMatch(
    /^A Word for you: .*\/w\/homesick$/,
  );
  expect(await screen.findByRole('button', { name: 'Link copied' })).toBeTruthy();
});

it('is one of three tabs, with settings reachable from the header', async () => {
  renderWithProviders(<App />, { route: '/send' });
  const nav = await screen.findAllByRole('navigation');
  const links = nav.flatMap((element) =>
    Array.from(element.querySelectorAll('a')).map((link) => link.textContent),
  );
  expect(links).toEqual(expect.arrayContaining(['Today', 'Send', 'My stones']));
  expect(links).not.toContain('Together');
  expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy();
});

it('shares a five-day pack link with a start date and shows a scannable code', async () => {
  const share = vi.fn(async () => undefined);
  vi.stubGlobal('navigator', { ...navigator, share });
  renderWithProviders(<App />, { route: '/send' });
  await screen.findByText(verse);
  fireEvent.click(screen.getByRole('button', { name: '5 days' }));
  expect(await screen.findByRole('list', { name: 'Your first week' })).toBeTruthy();
  expect(screen.getByText('One new Word opens each day.')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'Ana' } });
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  const [payload] = share.mock.calls[0] as unknown as [{ text: string; url: string }];
  expect(payload.text).toBe('A week of Words for you:');
  const link = new URL(payload.url);
  expect(link.pathname).toBe('/p/arrival');
  expect(link.searchParams.get('from')).toBe('Ana');
  expect(link.searchParams.get('start')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  fireEvent.click(screen.getByRole('button', { name: 'QR code' }));
  expect(await screen.findByRole('img', { name: 'QR code' })).toBeTruthy();
});
