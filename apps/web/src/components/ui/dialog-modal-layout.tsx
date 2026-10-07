import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';

export function DialogModalLayout({
  open = true,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel,
  busy = false,
  size = 'lg',
}: {
  open?: boolean;
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  closeLabel?: string;
  busy?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const { t } = useTranslation('common');
  const id = React.useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      preventClose={busy}
      size={size}
      aria-labelledby={id}
      aria-describedby={description ? `${id}-description` : undefined}
    >
      <div className="flex max-h-[90dvh] flex-col">
        <DialogHeader>
          <div className="min-w-0">
            <DialogTitle id={id}>{title}</DialogTitle>
            {description && (
              <DialogDescription id={`${id}-description`}>{description}</DialogDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={busy}
            onClick={onClose}
            aria-label={closeLabel ?? t('buttons.close')}
          >
            <X aria-hidden="true" />
          </Button>
        </DialogHeader>
        {children && <DialogBody>{children}</DialogBody>}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </div>
    </Dialog>
  );
}
