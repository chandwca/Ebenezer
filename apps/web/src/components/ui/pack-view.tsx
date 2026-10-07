import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PackDay = {
  number: number;
  title: string;
  dayLabel: string;
  state: 'open' | 'today' | 'locked';
  note?: string;
  to?: string;
};

export function PackView({ days, label }: { days: PackDay[]; label: string }) {
  return (
    <ol aria-label={label} className="grid gap-3">
      {days.map((day) => {
        const content = (
          <>
            <span
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold',
                day.state === 'today'
                  ? 'bg-gold text-gold-foreground shadow-[0_0_22px_-4px_var(--gold)]'
                  : day.state === 'open'
                    ? 'bg-secondary text-secondary-foreground'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {day.state === 'locked' ? (
                <Lock size={16} aria-hidden="true" />
              ) : day.state === 'open' ? (
                <Check size={18} aria-hidden="true" />
              ) : (
                day.number
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-widest text-teal">
                {day.dayLabel}
              </span>
              <span className="block text-base font-semibold">{day.title}</span>
            </span>
            {day.note && <span className="text-xs text-muted-foreground">{day.note}</span>}
          </>
        );
        const base = 'flex items-center gap-4 rounded-2xl border p-4 transition-colors';
        return (
          <li key={day.number}>
            {day.to ? (
              <Link
                to={day.to}
                aria-current={day.state === 'today' ? 'step' : undefined}
                className={cn(
                  base,
                  'bg-card hover:border-teal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
                  day.state === 'today' && 'border-gold shadow-[0_10px_30px_-14px_var(--gold)]',
                )}
              >
                {content}
              </Link>
            ) : (
              <div className={cn(base, 'bg-card/60 opacity-70')}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
