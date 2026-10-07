import { beforeEach, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { App } from '@/App';
import { db } from '@/db/database';
import { renderWithProviders } from '@/test/render';
import { dayOpensOn, localDate } from '@/lib/word-pack';

beforeEach(async () => {
  await db.preferences.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('{}', { status: 503 })),
  );
});

function startedDaysAgo(days: number) {
  const today = localDate();
  const base = dayOpensOn(today, 1);
  return new Date(Date.parse(`${base}T00:00:00Z`) - days * 86400000).toISOString().slice(0, 10);
}

it('opens only the days that have arrived and keeps the rest locked', async () => {
  renderWithProviders(<App />, { route: `/p/arrival?from=Ana&start=${startedDaysAgo(1)}` });
  expect(await screen.findByRole('heading', { level: 1, name: 'Your first week' })).toBeTruthy();
  expect(screen.getByText('Ana sent you a week of Words')).toBeTruthy();
  expect(screen.getByText('Day 2 of 5')).toBeTruthy();
  expect(screen.queryByRole('navigation')).toBeNull();
  const links = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
  expect(links).toContain(`/w/new?from=Ana&pack=arrival&start=${startedDaysAgo(1)}`);
  expect(links.filter((href) => href?.startsWith('/w/'))).toHaveLength(2);
  expect(screen.getAllByText(/^Opens /)).toHaveLength(3);
});

it('shows a start date in the future as not yet open, and a finished pack as all open', async () => {
  const view = renderWithProviders(<App />, { route: `/p/hard?start=${startedDaysAgo(-3)}` });
  expect(await screen.findByText(/^Starts /)).toBeTruthy();
  expect(
    screen.queryAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/w/')),
  ).toHaveLength(0);
  view.unmount();
  renderWithProviders(<App />, { route: `/p/hard?start=${startedDaysAgo(30)}` });
  expect(await screen.findByText('All five Words are open.')).toBeTruthy();
  expect(
    screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/w/')),
  ).toHaveLength(5);
});

it('treats a missing or invalid start as today and rejects an unknown pack', async () => {
  const view = renderWithProviders(<App />, { route: '/p/arrival?start=garbage' });
  expect(await screen.findByText('Day 1 of 5')).toBeTruthy();
  view.unmount();
  renderWithProviders(<App />, { route: '/p/not-a-pack' });
  expect(await screen.findByRole('heading', { name: 'This pack link isn’t right.' })).toBeTruthy();
});
