import * as React from 'react';
import { cn } from '@/lib/utils';
export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'min-h-11 w-full rounded-xl border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}
export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'min-h-28 w-full resize-y rounded-xl border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

/** Shared journal writing area that grows with the person's words. */
export function WritingArea({
  ref,
  className,
  minHeight = 128,
  ...props
}: React.ComponentProps<typeof Textarea> & { minHeight?: number }) {
  const input = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => input.current!, []);
  React.useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(320, Math.max(minHeight, element.scrollHeight))}px`;
  }, [props.value, minHeight]);
  return <Textarea {...props} ref={input} className={cn('max-h-80 resize-none', className)} />;
}
