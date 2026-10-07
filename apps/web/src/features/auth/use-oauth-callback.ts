import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { completeOAuthCallback } from '@/lib/auth/callback';
import { takeReturnPath } from '@/lib/auth/return-path';

export function useOAuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { client, status } = useAuth();
  const online = useOnlineStatus();
  const [parameters] = useState(() => {
    const search = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.slice(1));
    return { code: search.get('code'), error: search.get('error') ?? hash.get('error') };
  });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Remove codes/provider error details without changing the captured callback parameters.
    if (window.location.pathname === '/auth/callback')
      window.history.replaceState(window.history.state, '', '/auth/callback');
  }, []);
  useEffect(() => {
    let active = true;
    if (parameters.error || !parameters.code) {
      setError(parameters.error === 'access_denied' ? 'errors.cancelled' : 'errors.callback');
    } else if (status === 'error' || status === 'unavailable') {
      setError('errors.callback');
    } else if (client && online) {
      void completeOAuthCallback(client, parameters.code)
        .then(() => {
          if (active) navigate(takeReturnPath(), { replace: true });
        })
        .catch(() => {
          if (active) setError('errors.callback');
        });
    }
    return () => {
      active = false;
    };
  }, [client, status, online, parameters, navigate]);
  return { error, online };
}
