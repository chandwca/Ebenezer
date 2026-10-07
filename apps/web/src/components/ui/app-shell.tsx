import * as React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Layers, Moon, Send, Settings, Sun } from 'lucide-react';
import { PwaStatus } from './pwa-status';
import { Button } from './button';
import { LanguageSelect } from './language-select';
import { StoneMark } from './stone-mark';
import { cn } from '@/lib/utils';

const navigation = [
  { to: '/', label: 'navigation.today', icon: Sun },
  { to: '/send', label: 'navigation.send', icon: Send },
  { to: '/story', label: 'navigation.story', icon: Layers },
];
const settingsLink = { to: '/settings', label: 'navigation.settings', icon: Settings };

export function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <StoneMark />
      <span className="font-display text-xl font-bold tracking-tight">Ebenezer</span>
    </Link>
  );
}

export function AppShell({
  children,
  dark,
  toggleTheme,
}: {
  children: React.ReactNode;
  dark: boolean;
  toggleTheme: () => void;
}) {
  const { t } = useTranslation(['common', 'settings']);
  const location = useLocation();
  const headingRef = React.useRef<HTMLElement>(null);
  const headerRef = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => {
      header.parentElement?.style.setProperty('--app-header-height', `${header.offsetHeight}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    const titleKey =
      location.pathname === '/auth/callback'
        ? 'account:callback.title'
        : ([...navigation, settingsLink].find((item) => item.to === location.pathname)?.label ??
          (location.pathname === '/bible-search'
            ? 'navigation.bibleSearch'
            : location.pathname === '/community'
              ? 'navigation.community'
              : location.pathname.startsWith('/notification/')
                ? 'settings:reminders.settings.title'
                : location.pathname.startsWith('/pray/')
                  ? 'community:pray.pageTitle'
                  : location.pathname === '/reflection'
                    ? 'navigation.reflection'
                    : 'errors:notFound'));
    document.title = `${t(titleKey)} · Ebenezer`;
  }, [location.pathname, t]);
  React.useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-card focus:p-4"
      >
        {t('common:skipContent')}
      </a>
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card p-7 md:flex">
        <Brand />
        <nav aria-label={t('mainNavigation')} className="mt-10 space-y-2">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink
              end={to === '/'}
              to={to}
              key={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm',
                  isActive
                    ? 'bg-secondary font-semibold text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )
              }
            >
              <Icon size={19} />
              {t(label)}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="md:ml-64">
        <header
          ref={headerRef}
          className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b bg-background px-5 py-3 sm:px-9"
        >
          <div className="md:hidden">
            <Brand />
          </div>
          <span className="hidden md:block" />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelect id="header-language" />
            <Button asChild variant="ghost" size="icon">
              <NavLink to={settingsLink.to} aria-label={t(settingsLink.label)}>
                <Settings />
              </NavLink>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t(
                dark ? 'settings:appearance.labelLight' : 'settings:appearance.labelDark',
              )}
              aria-pressed={dark}
              onClick={toggleTheme}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <main
          ref={headingRef}
          tabIndex={-1}
          id="main-content"
          className="mx-auto max-w-6xl scroll-mt-[calc(var(--app-header-height,4rem)+1.5rem)] px-5 py-8 pb-32 outline-none sm:px-9 md:pb-12"
        >
          <PwaStatus showInstall={location.pathname === '/settings'} />
          {children}
        </main>
      </div>
      <nav
        aria-label={t('mobileNavigation')}
        className="mobile-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t bg-card/95 px-2 pt-2 backdrop-blur md:hidden"
      >
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink
            end={to === '/'}
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px]',
                isActive
                  ? 'bg-secondary font-semibold text-secondary-foreground'
                  : 'text-muted-foreground',
              )
            }
          >
            <Icon size={20} />
            {t(label)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
