import type { ReactNode } from 'react';

export function Disclosure({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mb-5">
      <summary className="cursor-pointer rounded-xl px-1 py-3 text-sm font-semibold text-muted-foreground">
        {label}
      </summary>
      {children}
    </details>
  );
}
