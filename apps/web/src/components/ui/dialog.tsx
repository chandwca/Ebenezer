import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const dialogVariants = cva(
  'm-auto max-h-[90dvh] w-[calc(100%_-_2rem)] overflow-hidden rounded-2xl border bg-card p-0 text-foreground shadow-xl backdrop:bg-black/50 backdrop:backdrop-blur-sm',
  {
    variants: { size: { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' } },
    defaultVariants: { size: 'md' },
  },
);

export function Dialog({
  open,
  onClose,
  preventClose = false,
  size,
  className,
  ...props
}: Omit<React.ComponentProps<'dialog'>, 'open' | 'onClose' | 'onCancel'> &
  VariantProps<typeof dialogVariants> & {
    open: boolean;
    onClose: () => void;
    preventClose?: boolean;
  }) {
  const ref = React.useRef<HTMLDialogElement>(null);
  React.useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus?.({ preventScroll: true });
    };
  }, [open]);
  return (
    <dialog
      {...props}
      ref={ref}
      data-slot="dialog"
      className={cn(dialogVariants({ size }), className)}
      onCancel={(event) => {
        event.preventDefault();
        if (!preventClose) onClose();
      }}
      onClick={(event) => {
        if (preventClose || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          onClose();
      }}
    />
  );
}

export function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        'flex shrink-0 items-start justify-between gap-4 border-b px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn('line-clamp-3 break-words font-display text-xl font-semibold', className)}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="dialog-description"
      className={cn('mt-2 text-sm leading-6 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn('min-h-0 flex-1 overflow-y-auto p-5 sm:p-6', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        'flex shrink-0 flex-wrap justify-end gap-3 border-t px-5 py-4 sm:px-6',
        className,
      )}
      {...props}
    />
  );
}
