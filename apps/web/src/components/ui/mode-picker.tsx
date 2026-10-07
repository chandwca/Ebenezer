import { cn } from '@/lib/utils';

export type ModeOption<T extends string> = { value: T; label: string; stones: 1 | 5 };

function Stones({ count, active }: { count: 1 | 5; active: boolean }) {
  const items = count === 1 ? [0] : [0, 1, 2, 3, 4];
  return (
    <svg viewBox="0 0 120 36" className="h-9 w-full max-w-28" aria-hidden="true" fill="none">
      {items.map((index) => {
        const wide = count === 1;
        const x = wide ? 60 : 12 + index * 24;
        const lit = index === 0;
        return (
          <ellipse
            key={index}
            cx={x}
            cy={20}
            rx={wide ? 26 : 10}
            ry={wide ? 12 : 6}
            fill={lit ? (active ? '#ffb627' : '#ffc247') : 'none'}
            fillOpacity={lit ? 1 : 0}
            stroke={lit ? '#ffb627' : 'currentColor'}
            strokeOpacity={lit ? 1 : 0.5}
            strokeDasharray={lit ? undefined : '3 3'}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

export function ModePicker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly ModeOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-2 gap-3">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex min-h-28 flex-col items-center justify-between gap-3 rounded-2xl border p-4 text-center transition-[translate,box-shadow,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
              active
                ? 'border-gold bg-card text-foreground shadow-[0_14px_30px_-16px_var(--gold)]'
                : 'bg-card/60 text-muted-foreground hover:-translate-y-0.5 hover:border-teal',
            )}
          >
            <Stones count={option.stones} active={active} />
            <span className="text-base font-semibold">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
