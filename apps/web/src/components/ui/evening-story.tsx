import * as React from 'react';
import { cn } from '@/lib/utils';

/** One part of the evening, set along a quiet path of stones. */
export function StoryChapter({
  eyebrow,
  title,
  current = false,
  last = false,
  reveal = false,
  children,
}: {
  eyebrow: string;
  title?: string;
  current?: boolean;
  last?: boolean;
  /** Bring this chapter into view when it first appears. */
  reveal?: boolean;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const heading = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (!reveal) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.current?.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    heading.current?.focus({ preventScroll: true });
  }, [reveal]);
  return (
    <section
      aria-labelledby={id}
      className="relative pb-12 pl-10 motion-safe:animate-[story-rise_.7s_ease-out_both] sm:pl-14"
    >
      {!last && (
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[11px] top-9 w-px bg-linear-to-b from-teal/40 via-teal/15 to-transparent sm:left-[15px]"
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0 top-0.5 size-6 rounded-[46%_54%_42%_58%/55%_45%_55%_45%] transition-colors sm:left-1',
          current
            ? 'bg-gold shadow-[0_0_0_6px_color-mix(in_srgb,var(--gold)_18%,transparent)]'
            : 'bg-teal/60',
        )}
      />
      <p
        id={id}
        ref={heading as React.Ref<HTMLParagraphElement>}
        tabIndex={-1}
        className="scroll-mt-[calc(var(--app-header-height,6rem)+1.5rem)] text-[11px] font-semibold uppercase tracking-[.2em] text-teal outline-none"
      >
        {eyebrow}
      </p>
      {title && (
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          {title}
        </h2>
      )}
      <div className="mt-5 grid gap-5">{children}</div>
    </section>
  );
}

/** A spoken-feeling question, set in the serif voice of the story. */
export function StoryQuestion({ children }: { children: React.ReactNode }) {
  return (
    <p aria-live="polite" className="font-serif text-2xl leading-snug sm:text-3xl">
      {children}
    </p>
  );
}

/** Quiet connecting words between parts of the story. */
export function StoryNote({ children }: { children: React.ReactNode }) {
  return <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{children}</p>;
}

/** Keeps story actions at their natural width beneath the writing. */
export function StoryActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}
