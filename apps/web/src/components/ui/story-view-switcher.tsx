import { useTranslation } from 'react-i18next';
import { Layers, List } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
      role="group"
      aria-label={t('tower.view')}
    >
      {(['tower', 'list'] as const).map((view) => {
        const Icon = view === 'tower' ? Layers : List;
        return (
          <button
            key={view}
            type="button"
            aria-pressed={view === value}
            onClick={() => onChange(view)}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,color,box-shadow] motion-reduce:transition-none',
              view === value
                ? 'bg-card text-foreground shadow-[0_2px_8px_-2px_#062a3326]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className="size-4" /> {t(`tower.${view}`)}
          </button>
        );
      })}
    </div>
  );
}
