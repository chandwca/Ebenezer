import { screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { morningContext, morningPassage } from '@ebenezer/contracts';
import { AuthProvider } from '@/features/auth/auth-provider';
import { accountSession, authFixture } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { db } from '@/db/database';
import { journal } from '@/db/repositories';
import { EncouragementCard } from './encouragement-card';

beforeEach(async () => {
  await db.preferences.clear();
});

const response = {
  scripture: morningPassage(morningContext(new Date())),
  encouragement: {
    message: 'Bring your cares to Jesus.',
    prayer: 'Jesus, guide me. Amen.',
    question: 'What would you like to bring?',
  },
  source: 'ai',
};

it('requests a morning Word while signed out, without requiring sign-in', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(response)));
  vi.stubGlobal('fetch', fetch);
  const fixture = authFixture();
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <EncouragementCard />
    </AuthProvider>,
  );
  expect(await screen.findByRole('heading', { name: 'A Word for today' })).toBeTruthy();
  expect(await screen.findByText(response.encouragement.message)).toBeTruthy();
  expect(screen.queryByRole('link', { name: 'Sign in for encouragement' })).toBeNull();
  const [, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(new Headers(options.headers).has('Authorization')).toBe(false);
});

it('automatically requests a dated morning Word and displays the selected verified Scripture', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(response)));
  vi.stubGlobal('fetch', fetch);
  const fixture = authFixture(accountSession());
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <EncouragementCard />
    </AuthProvider>,
  );
  expect(await screen.findByText(response.encouragement.message)).toBeTruthy();
  expect(screen.getByText(`“${response.scripture.text}”`)).toBeTruthy();
  expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('http://localhost:3001/v1/morning-word');
  const now = new Date();
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  expect(JSON.parse(String(options.body))).toEqual({ ...morningContext(now), date: day });
});

it('always shows a verse while the morning Word is still loading', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
  const fixture = authFixture();
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <EncouragementCard />
    </AuthProvider>,
  );
  const bundled = morningPassage(morningContext(new Date()));
  expect(await screen.findByText(`“${bundled.text}”`)).toBeTruthy();
  expect(screen.getByText('A thought to carry')).toBeTruthy();
});

it('keeps gentle encouragement visible without errors or retry controls when AI fails', async () => {
  const fetch = vi.fn(async () => new Response('{}', { status: 503 }));
  vi.stubGlobal('fetch', fetch);
  const fixture = authFixture(accountSession());
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <EncouragementCard />
    </AuthProvider>,
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Find encouragement' })).toBeNull();
  expect(screen.queryByText('Include weather context')).toBeNull();
  expect(screen.getByText('What would you like to carry into today?')).toBeTruthy();
});

it('keeps the same Word and carried thought all day instead of choosing a new verse on reload', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const now = new Date();
  const day = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const shown = {
    scripture: {
      reference: 'Psalms 25:7',
      text: 'Remember me according to your loving kindness.',
      translation: 'WEB Classic',
    },
    encouragement: { message: 'God remembers you with kindness.', prayer: 'Amen.', question: 'Q?' },
    source: 'ai',
  };
  await journal.setPreference(
    'today:morningWord',
    JSON.stringify({
      date: day,
      input: { ...morningContext(now), language: 'en', date: day },
      response: shown,
      thought: 'I am remembered.',
    }),
  );
  const fixture = authFixture();
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <EncouragementCard />
    </AuthProvider>,
  );
  expect(await screen.findByText('“Remember me according to your loving kindness.”')).toBeTruthy();
  expect(screen.getByRole('textbox')).toHaveProperty('value', 'I am remembered.');
  await waitFor(async () =>
    expect(
      JSON.parse(String((await journal.getPreference('today:morningWord'))?.value)).thought,
    ).toBe('I am remembered.'),
  );
  expect(fetch).not.toHaveBeenCalled();
});
