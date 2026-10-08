import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Page-level view switcher; matches the Story view switcher. */
export function SegmentedTabs<T extends string>({
  label,
  value,
  options,
  onChange,
  flush = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; icon: LucideIcon; count?: number }[];
  onChange: (value: T) => void;
  flush?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('grid gap-1 rounded-2xl bg-muted p-1', !flush && 'mb-6')}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ value: option, label: text, icon: Icon, count }) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold transition-[background-color,color,box-shadow] motion-reduce:transition-none',
            option === value
              ? 'bg-card text-foreground shadow-[0_2px_8px_-2px_#173b4d26]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <Icon aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate">{text}</span>
          {count ? (
            <span className="rounded-full bg-gold px-1.5 text-xs text-gold-foreground">
              {count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
