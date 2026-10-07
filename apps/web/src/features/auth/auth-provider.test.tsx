import { act, screen, waitFor } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Alert } from '@/components/ui/alert';
import { renderWithProviders } from '@/test/render';
import { accountSession, authFixture } from '@/test/auth';
import { AuthProvider, useAuth } from './auth-provider';

function AccountStatus() {
  const { status, session } = useAuth();
  return <Alert variant="info">{`${status}:${session?.access_token ?? 'signed-out'}`}</Alert>;
}

it('restores a session, reacts to refresh/sign-out, and cleans up its listener', async () => {
  const fixture = authFixture(accountSession());
  const view = renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountStatus />
    </AuthProvider>,
  );
  await screen.findByText('ready:test-token');
  act(() => fixture.emit(accountSession(undefined, 'refreshed-token'), 'TOKEN_REFRESHED'));
  await screen.findByText('ready:refreshed-token');
  act(() => fixture.emit(null));
  await screen.findByText('ready:signed-out');
  view.unmount();
  expect(fixture.unsubscribed).toHaveBeenCalledOnce();
});

it('does not let a stale initial session overwrite a newer sign-out event', async () => {
  const fixture = authFixture();
  let finish!: (value: Awaited<ReturnType<typeof fixture.methods.getSession>>) => void;
  fixture.methods.getSession.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountStatus />
    </AuthProvider>,
  );
  act(() => fixture.emit(null));
  await act(async () => finish({ data: { session: accountSession() }, error: null }));
  await screen.findByText('ready:signed-out');
});

it('keeps private app content available when Auth fails or is unconfigured', async () => {
  const fixture = authFixture();
  fixture.methods.getSession.mockRejectedValueOnce(new Error('network unavailable'));
  const view = renderWithProviders(
    <AuthProvider client={fixture.client}>
      <Alert variant="info">My private journal</Alert>
      <AccountStatus />
    </AuthProvider>,
  );
  await screen.findByText('error:signed-out');
  expect(screen.getByText('My private journal')).toBeTruthy();
  view.unmount();
  renderWithProviders(
    <AuthProvider client={null}>
      <AccountStatus />
    </AuthProvider>,
  );
  await screen.findByText('unavailable:signed-out');
});

it('does not accept guest anonymous Auth sessions as community accounts', async () => {
  const session = accountSession();
  session.user.is_anonymous = true;
  const fixture = authFixture(session);
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AccountStatus />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByText('ready:signed-out')).toBeTruthy());
});
