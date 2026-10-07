import * as React from 'react';
import { Moon, Sun, ArrowRight } from 'lucide-react';
import { Button } from './button';
import { PwaStatus } from './pwa-status';
import { Brand } from './app-shell';
import { LanguageSelect } from './language-select';
import { StoneMark } from './stone-mark';

export function OnboardingLayout({
  children,
  title,
  description,
  eyebrow,
  visualTitle,
  visualNote,
  pathLabels,
  stepLabel,
  dark,
  toggleTheme,
  themeLabel,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  eyebrow: string;
  visualTitle: string;
  visualNote: string;
  pathLabels: string[];
  stepLabel: string;
  dark: boolean;
  toggleTheme: () => void;
  themeLabel: string;
}) {
  const titleRef = React.useRef<HTMLHeadingElement>(null);
  React.useEffect(() => {
    titleRef.current?.focus();
    document.title = `${title} · Ebenezer`;
  }, [title]);
  return (
    <div className="min-h-dvh bg-background">
      <header className="flex w-full items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageSelect id="welcome-language" />
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={themeLabel}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>
      <main className="grid w-full gap-6 px-5 pb-10 md:min-h-[calc(100dvh-110px)] md:grid-cols-2 md:items-stretch md:gap-8 sm:px-8">
        <section className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-hero px-7 py-7 text-hero-foreground sm:p-12">
          <div>
            <h2 className="max-w-sm font-display text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
              {visualTitle}
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-hero-muted md:leading-7">
              {visualNote}
            </p>
          </div>
          <StoneMark className="mx-auto my-8 hidden size-44 rounded-[2rem] md:block lg:size-52" />
          <div className="mt-10 hidden md:block" aria-hidden="true">
            <svg viewBox="0 0 420 115" className="w-full">
              <path
                d="M0 70 Q35 40 70 65 T140 65 T210 65 T280 65 T350 65 T420 65"
                fill="none"
                stroke="currentColor"
                strokeOpacity=".2"
                strokeWidth="3"
              />
              {pathLabels.map((_, i) => (
                <ellipse
                  key={i}
                  cx={30 + i * 72}
                  cy={i % 2 ? 45 : 65}
                  rx="23"
                  ry="14"
                  fill={i === 0 ? 'var(--color-gold, #D9A441)' : 'none'}
                  stroke="currentColor"
                  strokeOpacity=".6"
                  strokeDasharray={i === 0 ? undefined : '4 4'}
                />
              ))}
            </svg>
            <div className="grid grid-cols-6 gap-1 text-center text-[10px] text-hero-muted">
              {pathLabels.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
          </div>
        </section>
        <section
          className="flex flex-col justify-center py-4 md:px-6 lg:px-12"
          aria-labelledby="entry-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-teal">{eyebrow}</p>
          <h1
            id="entry-title"
            ref={titleRef}
            tabIndex={-1}
            className="mt-4 font-display text-3xl font-semibold leading-tight tracking-tight outline-none sm:text-4xl"
          >
            {title}
          </h1>
          <p className="mb-6 mt-4 text-sm leading-6 text-muted-foreground md:mb-8 md:leading-7">
            {description}
          </p>
          {children}
          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowRight size={14} aria-hidden="true" />
            {stepLabel}
          </p>
          <PwaStatus />
        </section>
      </main>
    </div>
  );
}
