import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { CommunityGroup, CommunityPost, Connection } from '@ebenezer/contracts';
import { AuthProvider } from '@/features/auth/auth-provider';
import { db } from '@/db/database';
import { PrayPage } from '@/pages/pray';
import { accountId, accountSession, authFixture } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { TogetherBoard } from './together-board';

const me = { id: accountId, displayName: 'Alex', handle: 'alex' };
const hannah = {
  id: 'c0000000-0000-4000-8000-000000000003',
  displayName: 'Hannah',
  handle: 'hannah',
};
const at = '2026-10-06T12:00:00.000Z';
const ids = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function post(overrides: Partial<CommunityPost> = {}): CommunityPost {
  return {
    id: ids(1),
    author: hannah,
    kind: 'prayer_request',
    audience: 'community',
    body: 'Starting a new job on Monday.',
    prayerCount: 2,
    commentCount: 0,
    viewerPrayed: false,
    isOwn: false,
    prayingNames: [],
    createdAt: at,
    updatedAt: at,
    ...overrides,
  };
}

/** In-memory stand-in for the Node API, routed by method and path. */
function fakeApi() {
  let posts = [post()];
  const groups: CommunityGroup[] = [
    {
      id: ids(10),
      name: 'Beijing returnees',
      description: 'Settling back home',
      visibility: 'open',
      memberCount: 14,
    },
  ];
  const connections: Connection[] = [
    { id: ids(20), status: 'accepted', direction: 'outgoing', person: hannah },
  ];
  const calls: { method: string; path: string; body?: unknown }[] = [];
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const path = url.pathname;
    calls.push({ method, path, body });
    if (path === '/v1/feed') return json({ posts, nextCursor: null });
    if (path === '/v1/groups' && method === 'GET') return json({ groups });
    if (path === '/v1/connections' && method === 'GET') return json({ connections });
    if (path === '/v1/groups' && method === 'POST')
      return json({ group: { id: ids(11), ...body, memberCount: 1, viewerRole: 'owner' } }, 201);
    if (path.endsWith('/membership') && method === 'PUT')
      return json({ group: { ...groups[0], memberCount: 15, viewerRole: 'member' } });
    if (path.endsWith('/prayer')) {
      const target = posts.find((item) => path.includes(item.id))!;
      const praying = method === 'PUT';
      const updated = {
        ...target,
        viewerPrayed: praying,
        prayerCount: target.prayerCount + (praying ? 1 : -1),
      };
      posts = posts.map((item) => (item.id === target.id ? updated : item));
      return json({ post: updated });
    }
    if (path.endsWith('/comments') && method === 'GET') return json({ comments: [] });
    if (path.endsWith('/comments') && method === 'POST')
      return json(
        {
          comment: {
            id: ids(30),
            postId: ids(1),
            author: me,
            body: body.body,
            createdAt: at,
            isOwn: true,
            canDelete: true,
          },
        },
        201,
      );
    if (path.endsWith('/prayer-links') && method === 'POST')
      return json(
        { link: { id: ids(40), token: 'a'.repeat(64), label: body.label, expiresAt: at } },
        201,
      );
    if (path === '/v1/posts' && method === 'POST') {
      const fields = Object.fromEntries(
        Object.entries(body).filter(([key]) => key !== 'recipientIds' && key !== 'groupId'),
      );
      return json(
        { post: post({ id: ids(2), author: me, isOwn: true, prayerCount: 0, ...fields }) },
        201,
      );
    }
    return json({ error: { code: 'not_found' } }, 404);
  });
  vi.stubGlobal('fetch', fetch);
  return { calls };
}

function renderBoard(signedIn = true) {
  const fixture = authFixture(signedIn ? accountSession() : null);
  return renderWithProviders(
    <AuthProvider client={fixture.client}>
      <TogetherBoard />
    </AuthProvider>,
  );
}

beforeEach(async () => {
  await db.prayerContacts.clear();
});

it('keeps sharing controls hidden until initial community requests finish', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
  renderBoard();
  await screen.findByText('Loading…');
  expect(screen.queryByRole('textbox', { name: 'What you want to share' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
});

it('preserves an unshared draft while filtering an empty board', async () => {
  let feeds = 0;
  let finish!: (response: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const path = new URL(String(input)).pathname;
      if (path === '/v1/feed' && ++feeds > 1)
        return new Promise<Response>((resolve) => {
          finish = resolve;
        });
      return new Response(
        JSON.stringify(
          path === '/v1/feed'
            ? { posts: [], nextCursor: null }
            : path === '/v1/groups'
              ? { groups: [] }
              : { connections: [] },
        ),
      );
    }),
  );
  renderBoard();
  const input = await screen.findByRole('textbox', { name: 'What you want to share' });
  fireEvent.change(input, { target: { value: 'My unfinished testimony' } });
  fireEvent.click(screen.getByRole('button', { name: 'Prayer requests' }));
  await waitFor(() => expect(finish).toBeTypeOf('function'));
  expect(
    (screen.getByRole('textbox', { name: 'What you want to share' }) as HTMLTextAreaElement).value,
  ).toBe('My unfinished testimony');
  await act(async () => {
    finish(new Response(JSON.stringify({ posts: [], nextCursor: null })));
  });
  await screen.findByText('Nothing here yet. Be the first to share.');
  expect((input as HTMLTextAreaElement).value).toBe('My unfinished testimony');
});

it('retries a temporarily unavailable prayer link without describing it as expired', async () => {
  const request = {
    authorName: 'Alex',
    kind: 'prayer_request',
    body: 'Please pray for my exam.',
    expiresAt: at,
    answered: false,
  };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ request }))),
  );
  renderWithProviders(
    <Routes>
      <Route path="/pray/:token" element={<PrayPage />} />
    </Routes>,
    { route: `/pray/${'a'.repeat(64)}` },
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(screen.queryByText(/It may have expired/)).toBeNull();
  expect(await screen.findByText('Please pray for my exam.')).toBeTruthy();
});

it('loads the real feed and lets a member pray, comment and share', async () => {
  const { calls } = fakeApi();
  renderBoard();
  const card = await screen.findByRole('article', { name: 'Hannah' });
  fireEvent.click(within(card).getByRole('button', { name: /Pray 2/ }));
  expect(await within(card).findByRole('button', { name: /Praying 3/ })).toBeTruthy();
  expect(calls).toContainEqual(
    expect.objectContaining({ method: 'PUT', path: `/v1/posts/${ids(1)}/prayer` }),
  );

  fireEvent.click(within(card).getByRole('button', { name: '0 comments' }));
  fireEvent.change(await within(card).findByRole('textbox', { name: 'Write a comment' }), {
    target: { value: 'Praying for you!' },
  });
  fireEvent.click(within(card).getByRole('button', { name: 'Post comment' }));
  expect(await within(card).findByText('Praying for you!')).toBeTruthy();
  expect(within(card).getByRole('button', { name: '1 comment' })).toBeTruthy();

  fireEvent.change(screen.getByRole('textbox', { name: 'What you want to share' }), {
    target: { value: 'God provided a flat this week.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Share' }));
  expect(await screen.findByText('Shared on the board.')).toBeTruthy();
  expect(calls).toContainEqual({
    method: 'POST',
    path: '/v1/posts',
    body: { kind: 'experience', audience: 'community', body: 'God provided a flat this week.' },
  });
  expect(screen.getAllByRole('article')[0]!.textContent).toContain(
    'God provided a flat this week.',
  );
});

it('joins an open group and starts a new one', async () => {
  const { calls } = fakeApi();
  renderBoard();
  await screen.findByRole('article', { name: 'Hannah' });
  fireEvent.click(screen.getByRole('button', { name: 'Groups' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Join' }));
  expect(await screen.findByText('You joined Beijing returnees.')).toBeTruthy();
  expect(calls).toContainEqual(
    expect.objectContaining({ method: 'PUT', path: `/v1/groups/${ids(10)}/membership` }),
  );

  fireEvent.click(screen.getByRole('button', { name: 'Start a group' }));
  const dialog = screen.getByRole('dialog', { name: 'Start a group' });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'Group name' }), {
    target: { value: 'Thursday study' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start group' }));
  expect(await screen.findByText('Thursday study is ready.')).toBeTruthy();
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: '/v1/groups',
      body: { name: 'Thursday study', description: '', meetingNote: '', visibility: 'private' },
    }),
  );
});

it('keeps Mom on this device and sends her a private prayer link through WhatsApp', async () => {
  const { calls } = fakeApi();
  await db.prayerContacts.add({
    id: 'mom',
    accountId: 'local',
    displayName: 'Mom',
    relationship: 'Mother',
    channel: 'whatsapp',
    phone: '+86 138 0000 0000',
    createdAt: at,
    updatedAt: at,
  });
  renderBoard();
  await screen.findByRole('article', { name: 'Hannah' });
  fireEvent.click(screen.getByRole('button', { name: /My people/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ask Mom to pray' }));
  const dialog = screen.getByRole('dialog', { name: 'Ask Mom to pray' });
  fireEvent.click(within(dialog).getByRole('checkbox'));
  await within(dialog).findByText(`${window.location.origin}/pray/${'a'.repeat(64)}`);
  expect(calls).toContainEqual(
    expect.objectContaining({
      method: 'POST',
      path: `/v1/posts/${ids(2)}/prayer-links`,
      body: { label: 'Mom' },
    }),
  );
  const whatsapp = within(dialog).getAllByRole('link')[0]!;
  expect(whatsapp.getAttribute('href')).toContain('https://wa.me/8613800000000?text=');
  expect(decodeURIComponent(whatsapp.getAttribute('href')!)).toContain(`/pray/${'a'.repeat(64)}`);
  // Mom's number never goes to the server.
  expect(JSON.stringify(calls)).not.toContain('138');
});

it('works for local people while signed out and asks to sign in for the board', async () => {
  fakeApi();
  renderBoard(false);
  expect(await screen.findByText(/Sign in to share on the board/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /My people/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Add someone I know' }));
  const dialog = screen.getByRole('dialog', { name: 'Add someone I know' });
  fireEvent.change(within(dialog).getByRole('textbox', { name: 'What do you call them?' }), {
    target: { value: 'Grandma' },
  });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add to my people' }));
  expect(await screen.findByText('Grandma is in your people.')).toBeTruthy();
  await waitFor(async () =>
    expect((await db.prayerContacts.toArray())[0]?.displayName).toBe('Grandma'),
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Ask Grandma to pray' }));
  const ask = screen.getByRole('dialog', { name: 'Ask Grandma to pray' });
  expect((within(ask).getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
});

it('lets someone without an account answer a prayer link', async () => {
  const request = {
    authorName: 'Alex',
    kind: 'prayer_request',
    body: 'Please pray for my exam.',
    expiresAt: at,
    answered: false,
  };
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ request })))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ request: { ...request, answered: true } })),
    );
  vi.stubGlobal('fetch', fetch);
  const token = 'b'.repeat(64);
  renderWithProviders(
    <Routes>
      <Route path="/pray/:token" element={<PrayPage />} />
    </Routes>,
    { route: `/pray/${token}` },
  );
  expect(await screen.findByRole('heading', { name: 'Alex asked you to pray' })).toBeTruthy();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Love you' } });
  fireEvent.click(screen.getByRole('button', { name: 'I prayed for you' }));
  expect(await screen.findByText('Thank you. Alex will see that you prayed.')).toBeTruthy();
  expect(fetch.mock.calls[1]![0]).toBe(
    `http://localhost:3001/v1/public/prayer-links/${token}/prayers`,
  );
  expect(JSON.parse(fetch.mock.calls[1]![1].body)).toEqual({ note: 'Love you' });
  expect(fetch.mock.calls[1]![1].headers.Authorization).toBeUndefined();
});
