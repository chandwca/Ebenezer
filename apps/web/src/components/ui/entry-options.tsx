import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The ways into the app on the welcome screen, as large tappable choices. */
export function EntryOptions({
  label,
  options,
}: {
  label: string;
  options: {
    icon: LucideIcon;
    title: string;
    description: string;
    onSelect: () => void;
    emphasis?: boolean;
    disabled?: boolean;
  }[];
}) {
  return (
    <div role="group" aria-label={label} className="grid gap-3">
      {options.map(({ icon: Icon, title, description, onSelect, emphasis, disabled }) => (
        <button
          key={title}
          type="button"
          onClick={onSelect}
          disabled={disabled}
          className={cn(
            'group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50',
            emphasis
              ? 'border-gold bg-gold text-gold-foreground hover:opacity-95'
              : 'bg-card hover:border-teal',
          )}
        >
          <span
            className={cn(
              'grid size-11 shrink-0 place-items-center rounded-xl',
              emphasis ? 'bg-white/30' : 'bg-secondary text-teal',
            )}
          >
            <Icon size={20} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{title}</span>
            <span
              className={cn(
                'mt-0.5 block text-xs leading-5',
                emphasis ? 'text-gold-foreground/80' : 'text-muted-foreground',
              )}
            >
              {description}
            </span>
          </span>
          <ChevronRight
            size={18}
            aria-hidden="true"
            className="shrink-0 transition-transform group-hover:translate-x-0.5"
          />
        </button>
      ))}
    </div>
  );
}
