import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

/** A titled card for board sidebars and tab sections. */
export function SectionCard({
  title,
  description,
  action,
  plain = false,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Render without the card surface, for lists of cards. */
  plain?: boolean;
  children: React.ReactNode;
}) {
  const id = React.useId();
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="font-display text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn(plain ? 'mt-4 grid gap-3' : 'mt-3')}>{children}</div>
    </>
  );
  return plain ? (
    <section aria-labelledby={id}>{content}</section>
  ) : (
    <Card role="region" aria-labelledby={id} className="p-5">
      {content}
    </Card>
  );
}
