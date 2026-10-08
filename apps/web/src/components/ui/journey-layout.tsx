import * as React from 'react';
import { Heart } from 'lucide-react';
import { JourneyPath } from './journey-path';

export function JourneyLayout({
  title,
  description,
  eyebrow,
  steps,
  current,
  progress,
  affirmation,
  note,
  children,
}: {
  title: string;
  description: string;
  eyebrow: string;
  steps: string[];
  current: number;
  progress: string;
  affirmation: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <header className="flex flex-col gap-5 border-b border-border/70 pb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
        <div className="shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-teal">{eyebrow}</p>
          <h1 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
          </h1>
          <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-gold" />
            {progress}
          </p>
          <p className="sr-only">{description}</p>
        </div>
        <div className="w-full sm:max-w-xl">
          <JourneyPath steps={steps} current={current} />
        </div>
      </header>
      <section className="mx-auto w-full max-w-4xl min-w-0 pt-8">{children}</section>
      <aside className="mx-auto mt-8 max-w-xl text-center">
        <p className="flex items-center justify-center gap-2 text-xs text-teal">
          <Heart size={14} aria-hidden="true" />
          {affirmation}
        </p>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{note}</p>
      </aside>
    </div>
  );
}

export function JourneyMoment({
  title,
  description,
  current,
}: {
  title: string;
  description: string;
  current: number;
}) {
  const heading = React.useRef<HTMLHeadingElement>(null);
  const previous = React.useRef(current);
  React.useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    if (previous.current !== current) heading.current?.scrollIntoView({ block: 'start' });
    previous.current = current;
  }, [current]);
  return (
    <header className="mb-6 text-center">
      <h2
        ref={heading}
        tabIndex={-1}
        className="scroll-mt-[calc(var(--app-header-height,6rem)+1.5rem)] font-display text-2xl font-semibold leading-tight tracking-tight outline-none sm:text-4xl"
      >
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}

export function JourneyStatus({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="flex min-h-5 items-center justify-center gap-2 text-[11px] text-muted-foreground"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-teal" />
      {children}
    </p>
  );
}
