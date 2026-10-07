import * as React from 'react';
import { cn } from '@/lib/utils';
export function Alert({
  children,
  variant = 'error',
}: {
  children: React.ReactNode;
  variant?: 'error' | 'success' | 'info';
}) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-xl border p-4 text-sm',
        variant === 'error'
          ? 'border-destructive/40 text-destructive'
          : 'bg-secondary text-secondary-foreground',
      )}
    >
      {children}
    </div>
  );
}
