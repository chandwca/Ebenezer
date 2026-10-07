import { StrictMode } from 'react';
import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Alert } from '@/components/ui/alert';
import { AuthProvider } from '@/features/auth/auth-provider';
import { authFixture } from '@/test/auth';
import { renderWithProviders } from '@/test/render';
import { AuthCallbackPage } from './auth-callback';

it('finishes a PKCE callback once under StrictMode, clears sensitive URL parameters, and returns to settings', async () => {
  window.history.replaceState({}, '', '/auth/callback?code=one-use-code');
  const fixture = authFixture();
  renderWithProviders(
    <StrictMode>
      <AuthProvider client={fixture.client}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/settings" element={<Alert variant="info">Account settings</Alert>} />
        </Routes>
      </AuthProvider>
    </StrictMode>,
    { route: '/auth/callback?code=one-use-code' },
  );
  await screen.findByText('Account settings');
  expect(fixture.methods.exchangeCodeForSession).toHaveBeenCalledOnce();
  expect(window.location.search).toBe('');
  expect(window.location.hash).toBe('');
});

it('handles cancelled sign-in without rendering provider error details or exchanging a code', async () => {
  const fixture = authFixture();
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AuthCallbackPage />
    </AuthProvider>,
    { route: '/auth/callback?error=access_denied&error_description=private-provider-detail' },
  );
  await screen.findByText('You didn’t finish signing in. You can try again whenever you’re ready.');
  expect(fixture.methods.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(screen.queryByText('private-provider-detail')).toBeNull();
});

it('offers a fresh sign-in after an expired or invalid exchange', async () => {
  const fixture = authFixture();
  fixture.methods.exchangeCodeForSession.mockRejectedValueOnce(new Error('raw-auth-details'));
  renderWithProviders(
    <AuthProvider client={fixture.client}>
      <AuthCallbackPage />
    </AuthProvider>,
    { route: '/auth/callback?code=expired-code' },
  );
  await screen.findByText(
    'We couldn’t finish this sign-in. Return to account settings and continue with Google again.',
  );
  expect(
    screen.getByRole('link', { name: 'Return to account settings' }).getAttribute('href'),
  ).toBe('/settings');
  expect(screen.queryByText('raw-auth-details')).toBeNull();
});
