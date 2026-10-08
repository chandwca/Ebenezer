import { screen, waitFor } from '@testing-library/react';
import { beforeEach, it, expect, vi } from 'vitest';
import { db } from '@/db/database';
import { emptyReflection } from '@ebenezer/contracts';
import { AuthProvider } from '@/features/auth/auth-provider';
import { accountSession, authFixture } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import type { Stone } from '@/db/database';
import { JourneySummary } from './journey-summary';
const stones: Stone[] = [
  {
    ...emptyReflection,
    id: 'one',
    accountId: 'local',
    journalDate: '2026-10-06',
    createdAt: '2026-10-06T12:00:00Z',
    updatedAt: '2026-10-06T12:00:00Z',
    version: 0,
    syncState: 'local',
    tone: 'hard',
    memory: 'Private story',
    prayer: 'Private prayer',
    feel: 'lonely',
    ref: 'Luke 2:11',
  },
];
beforeEach(async () => {
  await db.preferences.delete('remembrance:last');
});

const reply = {
  source: 'ai',
  reflection: {
    message: 'Hard days have a place in your journey.',
    prayer: 'Jesus, help me remember Your love.',
    question: 'Where do you notice His care?',
  },
};

it('sends each stone’s day, Scripture and words, signed out, but never prayer-partner names', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(reply)));
  vi.stubGlobal('fetch', fetch);
  const fixture = authFixture();
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <JourneySummary stones={[{ ...stones[0], partner: 'Priya' }]} />
    </AuthProvider>,
  );
  await screen.findByText('Hard days have a place in your journey.');
  const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toContain('/v1/journey-summary');
  expect(new Headers(options.headers).has('Authorization')).toBe(false);
  expect(JSON.parse(String(options.body))).toEqual({
    language: 'en',
    counts: { hard: 1, mixed: 0, bright: 0 },
    stones: [
      {
        tone: 'hard',
        passages: ['Luke 2:11'],
        count: 1,
        date: '2026-10-06',
        feelings: ['lonely'],
        reflection: 'Private prayer',
        memory: 'Private story',
      },
    ],
  });
  expect(String(options.body)).not.toContain('Priya');
});

it('keeps a gentle remembrance without a generate button when AI is unavailable', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 503 })),
  );
  const fixture = authFixture(accountSession());
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <JourneySummary stones={[{ ...stones[0], tone: 'bright' }]} />
    </AuthProvider>,
  );
  await screen.findByRole('heading', { name: 'Remembering His faithfulness' });
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByText(/room here for both the hard days/)).toBeTruthy();
});

it('when the AI is busy, her last AI reflection stays instead of generic text', async () => {
  const prepared = {
    source: 'prepared',
    reflection: { message: 'Generic prepared words.', prayer: 'Amen.', question: 'Which stone?' },
  };
  const answers = [reply, prepared];
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(answers.shift() ?? prepared))),
  );
  const fixture = authFixture();
  const first = renderWithProviders(
    <AuthProvider client={fixture.client}>
      <JourneySummary stones={[{ ...stones[0], tone: 'mixed' }]} />
    </AuthProvider>,
  );
  await screen.findByText('Hard days have a place in your journey.');
  await waitFor(async () => expect(await db.preferences.get('remembrance:last')).toBeTruthy());
  first.unmount();
  // A new stone changes the journal; the AI is busy this time.
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <JourneySummary
        stones={[
          { ...stones[0], tone: 'mixed' },
          { ...stones[0], id: 'two' },
        ]}
      />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.queryByText('Taking a moment with your journey…')).toBeNull());
  expect(screen.getByText('Hard days have a place in your journey.')).toBeTruthy();
  expect(screen.queryByText('Generic prepared words.')).toBeNull();
});
