import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './input';
import { Button } from './button';
import { Card } from './card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './select';
export type JournalFilters = { search: string; tone: string; from: string; to: string };
export function JournalToolbar({
  filters,
  onChange,
  onExport,
  onImport,
  busy,
}: {
  filters: JournalFilters;
  onChange: (filters: JournalFilters) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  busy: boolean;
}) {
  const { t } = useTranslation('journal');
  const id = React.useId();
  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold">
          {t('manage.search')}
          <Input
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </label>
        <div className="grid gap-2 text-sm font-semibold">
          <label htmlFor={id}>{t('form.tone')}</label>
          <Select value={filters.tone} onValueChange={(tone) => onChange({ ...filters, tone })}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['all', 'bright', 'mixed', 'hard'].map((tone) => (
                <SelectItem key={tone} value={tone}>
                  {t(tone === 'all' ? 'manage.all' : `tones.${tone}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(['from', 'to'] as const).map((key) => (
          <label key={key} className="grid gap-2 text-sm font-semibold">
            {t(`manage.${key}`)}
            <Input
              type="date"
              value={filters[key]}
              onChange={(e) => onChange({ ...filters, [key]: e.target.value })}
            />
          </label>
        ))}
      </div>
      <p className="my-4 text-xs text-muted-foreground">{t('manage.backupNote')}</p>
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
