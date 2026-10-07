import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import { Card } from './card';

export function AccountPanel({
  title,
  description,
  identity,
  actions,
  children,
}: {
  title: string;
  description: string;
  identity?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Users className="shrink-0 text-teal" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
            {identity && <p className="mt-2 break-all text-sm font-medium text-teal">{identity}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children && <div className="mt-6 grid gap-4">{children}</div>}
    </Card>
  );
}
