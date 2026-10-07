import { useTranslation } from 'react-i18next';
import type { StoneItem } from './stone-appearance';
import { Button } from './button';
import { Card } from './card';
import { Badge } from './badge';
import { ContentLayout } from './content-layout';

export function StoneList<T extends StoneItem>({
  stones,
  onEdit,
  onDelete,
}: {
  stones: T[];
  onEdit?: (stone: T) => void;
  onDelete?: (stone: T) => void;
}) {
  const { t, i18n } = useTranslation('journal');
  return (
    <ContentLayout>
      {stones.map((stone) => (
        <Card key={stone.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <time dateTime={stone.journalDate} className="text-sm text-muted-foreground">
              {new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'long' }).format(
                new Date(`${stone.journalDate}T12:00:00`),
              )}
            </time>
            <Badge variant="secondary">{t(`tones.${stone.tone}`)}</Badge>
          </div>
          <h2 className="mt-4 whitespace-pre-wrap break-words font-display text-xl font-semibold">
            {stone.memory}
          </h2>
          <p className="mt-3 text-sm font-semibold text-teal">{stone.ref}</p>
          <Badge variant="outline" className="mt-4">
            {t('status.local')}
          </Badge>
          <div className="mt-4 flex flex-wrap gap-3">
            {onEdit && (
              <Button
                variant="outline"
                onClick={() => onEdit(stone)}
                aria-label={t('manage.editLabel', { memory: stone.memory })}
              >
                {t('manage.edit')}
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                onClick={() => onDelete(stone)}
                aria-label={t('manage.deleteLabel', { memory: stone.memory })}
              >
                {t('manage.delete')}
              </Button>
            )}
          </div>
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-semibold">{t('form.details')}</summary>
            <div className="mt-3 grid gap-3">
              {(['stood', 'learned', 'questions', 'thoughts', 'prayer', 'partner'] as const)
                .filter((key) => stone[key])
                .map((key) => (
                  <div key={key}>
                    <h3 className="text-xs font-semibold text-muted-foreground">
                      {t(`form.${key}`)}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm">{stone[key]}</p>
                  </div>
                ))}
            </div>
          </details>
        </Card>
      ))}
    </ContentLayout>
  );
}
