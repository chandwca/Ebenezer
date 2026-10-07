import * as React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Layers, Leaf, Moon, Settings, Sun, Users } from 'lucide-react';
import { PwaStatus } from './pwa-status';
import { Button } from './button';
import { LanguageSelect } from './language-select';
import { StoneMark } from './stone-mark';
import { cn } from '@/lib/utils';

const navigation = [
  { to: '/', label: 'navigation.today', icon: Sun },
  { to: '/story', label: 'navigation.story', icon: Layers },
  { to: '/community', label: 'navigation.community', icon: Users },
  { to: '/settings', label: 'navigation.settings', icon: Settings },
];

export function Brand() {
  const { t } = useTranslation('common');
  return (
    <Link to="/" className="flex items-center gap-3">
      <StoneMark />
      <span className="font-display text-xl font-bold tracking-tight">
        Ebenezer
        <span className="mt-0.5 block font-sans text-[10px] uppercase tracking-[.2em] text-muted-foreground">
          {t('common:brandTagline')}
        </span>
      </span>
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
        : (navigation.find((item) => item.to === location.pathname)?.label ??
          (location.pathname === '/bible-search'
            ? 'navigation.bibleSearch'
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
        <p className="mt-10 text-[10px] font-semibold uppercase tracking-[.18em] text-muted-foreground">
          {t('common:dailyWalk')}
        </p>
        <nav aria-label={t('mainNavigation')} className="mt-4 space-y-2">
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
        <div className="mt-auto rounded-2xl bg-secondary/50 p-4">
          <Leaf size={19} className="text-teal" />
          <p className="mt-3 font-display text-base font-semibold tracking-tight">
            {t('common:sidebarTitle')}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {t('common:sidebarDescription')}
          </p>
        </div>
      </aside>
      <div className="md:ml-64">
        <header
          ref={headerRef}
          className="sticky top-0 z-30 flex min-h-24 flex-wrap items-center justify-between gap-3 border-b bg-background px-5 py-4 sm:px-9"
        >
          <div className="md:hidden">
            <Brand />
          </div>
          <p className="hidden text-sm text-muted-foreground md:block">
            {t('common:headerTagline')}
          </p>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelect id="header-language" />
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
          className="mx-auto max-w-6xl scroll-mt-[calc(var(--app-header-height,6rem)+1.5rem)] px-5 py-9 pb-32 outline-none sm:px-9 md:pb-12"
        >
          <PwaStatus />
          {children}
          <footer className="mt-10 flex items-center gap-2 border-t pt-5 text-xs text-muted-foreground">
            <Check size={14} /> {t('common:footer')}
          </footer>
        </main>
      </div>
      <nav
        aria-label={t('mobileNavigation')}
        className="mobile-nav fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t bg-card/95 px-2 pt-2 backdrop-blur md:hidden"
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
