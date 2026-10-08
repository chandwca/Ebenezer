import type { ReactNode } from 'react';

export function ViewDescription({ children }: { children: ReactNode }) {
  return <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{children}</p>;
}
