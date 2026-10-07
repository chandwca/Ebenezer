import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getBrowserAuth, type BrowserAuthClient } from '@/lib/auth/client';

type AuthState = {
  client: BrowserAuthClient | null;
  session: Session | null;
  status: 'loading' | 'unavailable' | 'ready' | 'error';
};
const initialState: AuthState = { client: null, session: null, status: 'loading' };
const AuthContext = createContext<(AuthState & { retry: () => void }) | null>(null);

export function AuthProvider({
  children,
  client: injectedClient,
}: {
  children: ReactNode;
  client?: BrowserAuthClient | null;
}) {
  const [state, setState] = useState<AuthState>(initialState);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let events = 0;
    let unsubscribe = () => {};
    setState(initialState);
    try {
      const client = injectedClient === undefined ? getBrowserAuth() : injectedClient;
      if (!client) {
        setState({ client: null, session: null, status: 'unavailable' });
        return;
      }
      const applySession = (session: Session | null) => {
        if (active)
          setState({
            client,
            session: session?.user.is_anonymous ? null : session,
            status: 'ready',
          });
      };
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        events += 1;
        // Do not await Auth/API calls inside this listener: the SDK holds its session lock.
        applySession(session);
      });
      unsubscribe = () => data.subscription.unsubscribe();
      void client.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active || events > 0) return;
          if (error) setState({ client, session: null, status: 'error' });
          else applySession(data.session);
        })
        .catch(() => {
          if (active && events === 0) setState({ client, session: null, status: 'error' });
        });
    } catch {
      if (active) setState({ client: null, session: null, status: 'error' });
    }
    return () => {
      active = false;
      unsubscribe();
    };
  }, [injectedClient, attempt]);

  return (
    <AuthContext.Provider value={{ ...state, retry: () => setAttempt((value) => value + 1) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('Use AuthProvider around account features.');
  return context;
}
