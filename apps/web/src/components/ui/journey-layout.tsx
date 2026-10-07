import * as React from 'react';
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
          <p className="sr-only">{eyebrow}</p>
          <h1 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="sr-only">{progress}</p>
          <p className="sr-only">{description}</p>
        </div>
        <div className="w-full sm:max-w-xl">
          <JourneyPath steps={steps} current={current} />
        </div>
      </header>
      <section className="mx-auto w-full max-w-4xl min-w-0 pt-8">{children}</section>
      <p className="sr-only">
        {affirmation} {note}
      </p>
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
      <p className="sr-only">{description}</p>
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
