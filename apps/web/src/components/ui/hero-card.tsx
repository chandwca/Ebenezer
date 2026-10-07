import * as React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf } from 'lucide-react';
import { Button } from './button';
import type { HeadingProps } from './page-heading';

export function HeroCard({
  eyebrow,
  title,
  description,
  action,
  to,
}: HeadingProps & { action: string; to: string }) {
  const titleId = React.useId();
  return (
    <section
      className="relative overflow-hidden rounded-3xl bg-hero p-7 text-hero-foreground sm:p-10"
      aria-labelledby={titleId}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 size-64 rounded-full border border-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-28 right-12 size-64 rounded-full border border-white/10"
      />
      <div className="relative">
        <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[.16em] text-hero-muted">
          <Leaf size={15} aria-hidden="true" />
          {eyebrow}
        </span>
        <h2
          id={titleId}
          className="mt-5 max-w-md font-display text-3xl font-semibold leading-[1.2] tracking-[-0.035em] sm:text-4xl"
        >
          {title}
        </h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-white/75">{description}</p>
        <Button asChild variant="gold" className="mt-6">
          <Link to={to}>
            {action}
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
