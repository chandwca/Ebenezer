import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Single-choice pill buttons for small filters such as post kind. */
export function ToggleChips<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; icon?: LucideIcon }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(({ value: option, label: text, icon: Icon }) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          disabled={disabled}
          onClick={() => onChange(option)}
          className={cn(
            'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50',
            option === value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          {Icon && <Icon className="size-4" aria-hidden="true" />}
          {text}
        </button>
      ))}
    </div>
  );
}
