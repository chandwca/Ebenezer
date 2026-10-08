import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const stackVariants = cva('grid', {
  variants: {
    layout: {
      stack: 'gap-5',
      spacious: 'gap-7',
      /** One centred reading column, for feeds and simple lists. */
      narrow: 'mx-auto w-full max-w-2xl gap-5',
      split: 'mt-7 items-start gap-6 lg:grid-cols-[1.4fr_1fr]',
      columns: 'items-start gap-6 lg:grid-cols-[1.4fr_1fr]',
    },
  },
  defaultVariants: { layout: 'stack' },
});

export function ContentLayout({
  layout,
  className,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof stackVariants>) {
  return <div className={cn(stackVariants({ layout }), className)} {...props} />;
}
