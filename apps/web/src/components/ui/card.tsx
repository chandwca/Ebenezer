import * as React from 'react';
import { cn } from '@/lib/utils';
export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('rounded-2xl border bg-card p-6 shadow-[0_2px_12px_#062a3304]', className)}
      {...props}
    />
  );
}
