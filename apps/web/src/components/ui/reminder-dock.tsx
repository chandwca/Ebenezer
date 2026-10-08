import * as React from 'react';
import { Bell, CheckCircle2, Moon, Sunrise } from 'lucide-react';
import type { ReminderLine } from './reminder-invite';

/**
 * A small invitation that floats at the side of the page instead of pushing content down:
 * bottom right on larger screens, just above the tab bar on phones.
 */
export function ReminderDock({
  title,
  lines,
  note,
  steps,
  confirmed,
  message,
  children,
}: {
  title: string;
  lines?: ReminderLine[];
  note?: string;
  steps?: string[];
  confirmed?: string;
  message?: string;
  children?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <aside
      aria-labelledby={id}
      className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-teal/20 bg-card p-4 shadow-[0_18px_40px_-16px_#173b4d55] motion-safe:animate-[story-rise_.5s_ease-out_both] sm:left-auto sm:w-[22rem] md:bottom-6 md:right-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
          <Bell size={18} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-display text-sm font-semibold leading-9 tracking-tight">
            {title}
          </h2>
          {lines && (
            <ul className="mt-1 grid gap-1">
              {lines.map((line) => {
                const Icon = line.kind === 'morning' ? Sunrise : Moon;
                return (
                  <li key={line.kind} className="flex items-center gap-2 text-xs leading-5">
                    <Icon size={14} className="shrink-0 text-gold" aria-hidden="true" />
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{line.time}</span> · {line.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {steps && (
            <ol className="mt-1 list-decimal space-y-0.5 pl-4 text-xs leading-5">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {note && <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{note}</p>}
          {confirmed ? (
            <p
              role="status"
              className="mt-3 flex items-center gap-2 text-xs font-semibold text-teal"
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              {confirmed}
            </p>
          ) : (
            children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
          )}
          {message && (
            <p role="status" className="mt-2 text-xs leading-5 text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
