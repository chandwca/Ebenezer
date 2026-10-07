import * as React from 'react';
import { Bell, CheckCircle2, Moon, Sunrise } from 'lucide-react';
import { Card } from './card';

export type ReminderLine = { kind: 'morning' | 'evening'; time: string; text: string };

/** Invitation to turn on morning and evening reminders, or the steps to make that possible. */
export function ReminderInvite({
  title,
  lines,
  note,
  steps,
  confirmed,
  message,
  footnote,
  children,
}: {
  title: string;
  lines?: ReminderLine[];
  note?: string;
  /** Numbered steps, e.g. adding to the Home Screen or unblocking notifications. */
  steps?: string[];
  /** Shown once reminders are on, replacing the actions. */
  confirmed?: string;
  message?: string;
  footnote?: string;
  children?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <Card role="region" aria-labelledby={id} className="border-teal/20 bg-secondary/30">
      <div className="flex items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
          <Bell size={20} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-display text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {lines && (
            <ul className="mt-3 grid gap-2">
              {lines.map((line) => {
                const Icon = line.kind === 'morning' ? Sunrise : Moon;
                return (
                  <li key={line.kind} className="flex items-start gap-3 text-sm leading-6">
                    <Icon size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                    <span>
                      <span className="font-semibold">{line.time}</span> · {line.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {note && <p className="mt-3 text-sm leading-6 text-muted-foreground">{note}</p>}
          {steps && (
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {confirmed ? (
            <p
              role="status"
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-teal"
            >
              <CheckCircle2 size={18} aria-hidden="true" />
              {confirmed}
            </p>
          ) : (
            children && <div className="mt-4 flex flex-wrap items-center gap-3">{children}</div>
          )}
          {message && (
            <p role="status" className="mt-3 text-sm leading-6 text-muted-foreground">
              {message}
            </p>
          )}
          {footnote && <p className="mt-3 text-xs text-muted-foreground">{footnote}</p>}
        </div>
      </div>
    </Card>
  );
}
