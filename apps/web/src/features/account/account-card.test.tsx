import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/auth-provider';
import { renderWithProviders } from '@/test/render';
import {
  accountId,
  accountSession,
  authFixture,
  otherAccountId,
  profileFixture,
} from '@/test/auth';
import { db } from '@/db/database';
import { AccountCard } from './account-card';

beforeEach(async () => {
  await db.preferences.clear();
});

it('starts Google OAuth with the app callback and renders a friendly failure', async () => {
  const fixture = authFixture();
  fixture.methods.signInWithOAuth.mockRejectedValueOnce(new Error('provider-secret-detail'));
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }));
  await screen.findByText('We couldn’t open Google sign-in. Please try again in a moment.');
  expect(fixture.methods.signInWithOAuth).toHaveBeenCalledWith({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  expect(screen.queryByText('provider-secret-detail')).toBeNull();
});

it('requires explicit profile setup, keeps local details private, and preserves local data on sign-out', async () => {
  const localProfile = JSON.stringify({ name: 'Private Alex', city: 'Denver' });
  await db.preferences.put({ key: 'profile', value: localProfile });
  const fixture = authFixture(accountSession());
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ profile: profileFixture() })));
  vi.stubGlobal('fetch', request);
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  const name = (await screen.findByRole('textbox', {
    name: 'What should your people call you?',
  })) as HTMLInputElement;
  expect(name.value).toBe('');
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Make my community profile' }));
  await screen.findAllByText(/Please enter a name/);
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.change(name, { target: { value: 'Community Alex' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Choose your Together handle' }), {
    target: { value: 'ALEX' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Make my community profile' }));
  await screen.findByText(
    'Your community profile is saved. Your private stones are still on this device.',
  );
  expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({
    displayName: 'Community Alex',
    handle: 'alex',
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign out on this device' }));
  await screen.findByRole('button', { name: 'Continue with Google' });
  expect(fixture.methods.signOut).toHaveBeenCalledWith({ scope: 'local' });
  expect((await db.preferences.get('profile'))?.value).toBe(localProfile);
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('keeps entered values when a handle is taken', async () => {
  const fixture = authFixture(accountSession());
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('private DB detail', { status: 409 })),
  );
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  fireEvent.change(
    await screen.findByRole('textbox', { name: 'What should your people call you?' }),
    { target: { value: 'Alex' } },
  );
  const handle = screen.getByRole('textbox', {
    name: 'Choose your Together handle',
  }) as HTMLInputElement;
  fireEvent.change(handle, { target: { value: 'taken' } });
  fireEvent.click(screen.getByRole('button', { name: 'Make my community profile' }));
  await screen.findByText(
    'That handle is already in use. Try another one—you can keep the same name.',
  );
  expect(handle.value).toBe('taken');
});

it('hides old account details immediately and ignores a late response after switching accounts', async () => {
  const fixture = authFixture(accountSession());
  let finish!: (value: Response) => void;
  const request = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ profile: profileFixture(otherAccountId, 'Blair') })),
    );
  vi.stubGlobal('fetch', request);
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
  act(() => fixture.emit(accountSession(otherAccountId)));
  await waitFor(() =>
    expect(
      (
        screen.getByRole('textbox', {
          name: 'What should your people call you?',
        }) as HTMLInputElement
      ).value,
    ).toBe('Blair'),
  );
  await act(async () =>
    finish(new Response(JSON.stringify({ profile: profileFixture(accountId, 'Old account') }))),
  );
  expect(
    (screen.getByRole('textbox', { name: 'What should your people call you?' }) as HTMLInputElement)
      .value,
  ).toBe('Blair');
});

it('does not query community data while offline', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const fixture = authFixture(accountSession());
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  await screen.findByText(/You can keep your journal here while offline/);
  expect(request).not.toHaveBeenCalled();
  expect(screen.queryByRole('textbox')).toBeNull();
});

it('shows no editable profile when Node rejects an expired session', async () => {
  const fixture = authFixture(accountSession());
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('raw token details', { status: 401 })),
  );
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountCard />
    </AuthProvider>,
  );
  await screen.findByText(
    'Your account session has ended. Sign out, then continue with Google again. Your journal is still here.',
  );
  expect(screen.queryByRole('textbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Sign out on this device' }));
  await screen.findByRole('button', { name: 'Continue with Google' });
});
