import type { LucideIcon } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

/** Page-level view switcher; matches the Story tower/list switcher. */
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
      className={cn('grid gap-1 rounded-2xl border bg-card p-1', !flush && 'mb-6')}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(({ value: option, label: text, icon: Icon, count }) => (
        <Button
          key={option}
          variant={option === value ? 'default' : 'ghost'}
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className="px-2"
        >
          <Icon aria-hidden="true" />
          <span className="truncate">{text}</span>
          {count ? (
            <span className="rounded-full bg-gold px-1.5 text-xs text-gold-foreground">
              {count}
            </span>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
