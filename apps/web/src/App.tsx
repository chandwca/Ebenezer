import * as React from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useStudentProfile } from './features/profile/use-student-profile';
import { AppShell } from './components/ui/app-shell';
import { NotFoundPage } from './pages/preview';
import { LoadingState } from './components/ui/loading-state';
import { AuthProvider } from './features/auth/auth-provider';
import { useNotificationRouting } from './pwa/use-notification-routing';

const AuthCallbackPage = React.lazy(() =>
  import('./pages/auth-callback').then((module) => ({ default: module.AuthCallbackPage })),
);

const TodayPage = React.lazy(() =>
  import('./pages/today').then((module) => ({ default: module.TodayPage })),
);
const SettingsPage = React.lazy(() =>
  import('./pages/settings').then((module) => ({ default: module.SettingsPage })),
);
const ReflectionPage = React.lazy(() =>
  import('./pages/reflection').then((module) => ({ default: module.ReflectionPage })),
);
const StoryPage = React.lazy(() =>
  import('./pages/story').then((module) => ({ default: module.StoryPage })),
);
const PrayPage = React.lazy(() =>
  import('./pages/pray').then((module) => ({ default: module.PrayPage })),
);
const TogetherPage = React.lazy(() =>
  import('./pages/together').then((module) => ({ default: module.TogetherPage })),
);

const BibleSearchPage = React.lazy(() =>
  import('./pages/bible-search').then((module) => ({ default: module.BibleSearchPage })),
);

const StudentWelcome = React.lazy(() =>
  import('./features/profile/student-welcome').then((module) => ({
    default: module.StudentWelcome,
  })),
);

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const location = useLocation();
  useNotificationRouting();
  const preferences = useStudentProfile();
  const [dark, setDark] = React.useState(() => {
    try {
      const saved = localStorage.getItem('ebenezer.theme');
      return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem('ebenezer.theme', dark ? 'dark' : 'light');
    } catch {
      /* Keep an in-memory preference if storage is unavailable. */
    }
  }, [dark]);
  const toggleTheme = () => setDark((value) => !value);

  if (
    location.pathname === '/welcome' ||
    (location.pathname === '/' && preferences && !preferences.complete)
  )
    return (
      <React.Suspense fallback={<LoadingState />}>
        <StudentWelcome dark={dark} toggleTheme={toggleTheme} />
      </React.Suspense>
    );
  if (location.pathname === '/' && !preferences) return <LoadingState />;

  return (
    <AppShell dark={dark} toggleTheme={toggleTheme}>
      <React.Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/" element={<TodayPage />} />
          <Route path="/reflection" element={<ReflectionPage />} />
          <Route path="/bible-search" element={<BibleSearchPage />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/community" element={<TogetherPage />} />
          <Route path="/pray/:token" element={<PrayPage key={location.pathname} />} />
          <Route
            path="/settings"
            element={<SettingsPage dark={dark} toggleTheme={toggleTheme} />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </React.Suspense>
    </AppShell>
  );
}
