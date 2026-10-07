import { useTranslation } from 'react-i18next';
import { Input } from './input';
import { Button } from './button';
import { Card } from './card';
export function JournalToolbar({
  onExport,
  onImport,
  busy,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  busy: boolean;
}) {
  const { t } = useTranslation('journal');
  return (
    <Card>
      <p className="mb-4 text-xs text-muted-foreground">{t('manage.backupNote')}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={busy} onClick={onExport}>
          {t('manage.export')}
        </Button>
        <label className="grid gap-2 text-sm font-semibold">
          {t('manage.import')}
          <Input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onImport(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </Card>
  );
}
