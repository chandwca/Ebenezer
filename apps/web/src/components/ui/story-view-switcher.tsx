import { useTranslation } from 'react-i18next';
import { Layers, List } from 'lucide-react';
import { Button } from './button';

export function StoryViewSwitcher({
  value,
  onChange,
}: {
  value: 'tower' | 'list';
  onChange: (value: 'tower' | 'list') => void;
}) {
  const { t } = useTranslation('journal');
  return (
    <div
      className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border bg-card p-1"
      role="group"
      aria-label={t('tower.view')}
    >
      {(['tower', 'list'] as const).map((view) => {
        const Icon = view === 'tower' ? Layers : List;
        return (
          <Button
            key={view}
            variant={view === value ? 'default' : 'ghost'}
            aria-pressed={view === value}
            onClick={() => onChange(view)}
          >
            <Icon aria-hidden="true" /> {t(`tower.${view}`)}
          </Button>
        );
      })}
    </div>
  );
}
