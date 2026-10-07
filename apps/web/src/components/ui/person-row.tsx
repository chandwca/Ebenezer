import type * as React from 'react';
import { Avatar } from './avatar';
import { Badge } from './badge';

/** One person in a list: a friend, a request, a search result or someone without an account. */
export function PersonRow({
  name,
  detail,
  badge,
  children,
}: {
  name: string;
  detail?: string;
  badge?: string;
  /** Actions for this person. */
  children?: React.ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
      {badge && <Badge variant="secondary">{badge}</Badge>}
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </li>
  );
}

export function PersonList({ children, empty }: { children: React.ReactNode; empty?: string }) {
  const hasItems = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return hasItems ? (
    <ul className="divide-y">{children}</ul>
  ) : (
    <p className="py-3 text-sm text-muted-foreground">{empty}</p>
  );
}
