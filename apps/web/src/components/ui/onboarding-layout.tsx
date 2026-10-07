import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { Brand } from './app-shell';
import { LanguageSelect } from './language-select';
import { StoneMark } from './stone-mark';

export function OnboardingLayout({
  children,
  title,
  description,
  visualTitle,
  dark,
  toggleTheme,
  themeLabel,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
  visualTitle: string;
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
      <header className="mx-auto flex max-w-xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <LanguageSelect id="welcome-language" />
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={themeLabel}>
            {dark ? <Sun /> : <Moon />}
          </Button>
        </div>
      </header>
      <main className="mx-auto grid max-w-xl gap-6 px-5 pb-12 sm:px-8">
        <section className="flex flex-col items-start gap-6 rounded-3xl bg-hero p-8 text-hero-foreground sm:p-10">
          <StoneMark className="size-16 rounded-2xl" />
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {visualTitle}
          </h2>
        </section>
        <section aria-labelledby="entry-title" className="grid gap-5">
          <div>
            <h1
              id="entry-title"
              ref={titleRef}
              tabIndex={-1}
              className="font-display text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-3xl"
            >
              {title}
            </h1>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </div>
          {children}
        </section>
      </main>
    </div>
  );
}
