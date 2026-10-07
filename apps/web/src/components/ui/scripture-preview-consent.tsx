import { Button } from './button';
import { DialogModalLayout } from './dialog-modal-layout';
import { Alert } from './alert';
export function ScripturePreviewConsent({
  title,
  description,
  allow,
  cancel,
  busy,
  error,
  onAllow,
  onCancel,
}: {
  title: string;
  description: string;
  allow: string;
  cancel: string;
  busy: boolean;
  error?: string;
  onAllow: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogModalLayout
      title={title}
      description={description}
      busy={busy}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button autoFocus variant="outline" disabled={busy} onClick={onCancel}>
            {cancel}
          </Button>
          <Button variant="gold" disabled={busy} onClick={onAllow}>
            {allow}
          </Button>
        </>
      }
    >
      {error && <Alert>{error}</Alert>}
    </DialogModalLayout>
  );
}
