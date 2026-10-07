import * as React from 'react';
import { Bell } from 'lucide-react';
import { Card } from './card';
import { Checkbox } from './checkbox';
import { Input } from './input';

/** Settings for morning and evening reminders: times, wording and trying one now. */
export function ReminderSettingsPanel({
  title,
  description,
  status,
  times,
  discreet,
  actions,
  tryNow,
  message,
  disabled,
}: {
  title: string;
  description: string;
  status: string;
  times: {
    morningLabel: string;
    eveningLabel: string;
    morning: string;
    evening: string;
    onChange: (kind: 'morning' | 'evening', value: string) => void;
  };
  discreet: { label: string; note: string; checked: boolean; onChange: (value: boolean) => void };
  actions: React.ReactNode;
  tryNow?: { title: string; children: React.ReactNode };
  message?: { text: string; error?: boolean };
  disabled?: boolean;
}) {
  const id = React.useId();
  return (
    <Card role="region" aria-labelledby={id}>
      <div className="flex gap-3">
        <Bell className="shrink-0 text-teal" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id={id} className="font-semibold">
            {title}
          </h2>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
          <p className="mt-2 text-sm font-semibold text-teal">{status}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(['morning', 'evening'] as const).map((kind) => (
          <label key={kind} className="grid gap-2 text-sm font-semibold">
            {kind === 'morning' ? times.morningLabel : times.eveningLabel}
            <Input
              type="time"
              value={kind === 'morning' ? times.morning : times.evening}
              disabled={disabled}
              onChange={(event) => event.target.value && times.onChange(kind, event.target.value)}
            />
          </label>
        ))}
      </div>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <Checkbox
          checked={discreet.checked}
          disabled={disabled}
          onChange={(event) => discreet.onChange(event.target.checked)}
        />
        <span>
          <span className="font-semibold">{discreet.label}</span>
          <span className="block text-muted-foreground">{discreet.note}</span>
        </span>
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>
      {tryNow && (
        <div className="mt-5 border-t pt-4">
          <p className="text-sm font-semibold">{tryNow.title}</p>
          <div className="mt-3 flex flex-wrap gap-3">{tryNow.children}</div>
        </div>
      )}
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={
            message.error
              ? 'mt-4 text-sm leading-6 text-destructive'
              : 'mt-4 text-sm leading-6 text-muted-foreground'
          }
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
