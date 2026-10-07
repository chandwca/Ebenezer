import { DialogModalLayout } from './dialog-modal-layout';
import { QrCode } from './qr-code';

export function QrDialog({
  open,
  title,
  hint,
  value,
  label,
  closeLabel,
  onClose,
}: {
  open: boolean;
  title: string;
  hint: string;
  value: string;
  label: string;
  closeLabel: string;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <DialogModalLayout
      size="sm"
      title={title}
      description={hint}
      onClose={onClose}
      closeLabel={closeLabel}
    >
      <QrCode value={value} label={label} />
    </DialogModalLayout>
  );
}
