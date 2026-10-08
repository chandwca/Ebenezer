import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from './card';

export function PreferenceCard({
  title,
  description,
  note,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  note?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex gap-3">
          {Icon && <Icon className="shrink-0 text-teal" aria-hidden="true" />}
          <div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </div>
      {note && <p className="mt-3 text-xs text-muted-foreground">{note}</p>}
    </Card>
  );
}
