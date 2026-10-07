import { Alert } from './alert';
import { Button } from './button';
import { DialogModalLayout } from './dialog-modal-layout';

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogModalLayout
      title={title}
      description={description}
      onClose={onCancel}
      busy={busy}
      size="sm"
      footer={
        <>
          <Button autoFocus variant="outline" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
    </DialogModalLayout>
  );
}
