import * as React from 'react';
import { cn } from '@/lib/utils';

export function Checkbox({ className, ...props }: Omit<React.ComponentProps<'input'>, 'type'>) {
  return (
    <input
      type="checkbox"
      className={cn('size-5 shrink-0 rounded border accent-primary disabled:opacity-50', className)}
      {...props}
    />
  );
}
