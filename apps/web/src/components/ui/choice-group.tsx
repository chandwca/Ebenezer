import * as React from 'react';
import { cn } from '@/lib/utils';

export function ChoiceGroup({
  id,
  labelId,
  name,
  value,
  choices,
  onChange,
  onBlur,
  inputRef,
  invalid,
  describedBy,
  layout = 'grid',
}: {
  id: string;
  labelId: string;
  name: string;
  value: string;
  choices: readonly { value: string; label: string; symbol?: string }[];
  onChange: (value: string) => void;
  onBlur: () => void;
  inputRef: React.Ref<HTMLInputElement>;
  invalid: boolean;
  describedBy?: string;
  layout?: 'grid' | 'stack';
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-invalid={invalid}
      aria-describedby={describedBy}
      className={cn('grid gap-3', layout === 'grid' && 'grid-cols-2')}
    >
      {choices.map((choice, index) => (
        <label key={choice.value} className="relative cursor-pointer">
          <input
            id={`${id}-${index}`}
            type="radio"
            name={name}
            value={choice.value}
            checked={value === choice.value}
            onChange={() => onChange(choice.value)}
            onBlur={onBlur}
            ref={index === 0 ? inputRef : undefined}
            className="peer sr-only"
          />
          <span className="flex min-h-12 items-center rounded-xl border bg-card px-4 py-3 text-sm font-semibold transition-colors peer-checked:border-primary peer-checked:bg-secondary peer-checked:text-secondary-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold">
            {choice.symbol && (
              <span
                aria-hidden="true"
                className="mr-3 flex size-10 shrink-0 items-center justify-center rounded-xl bg-background text-xl"
              >
                {choice.symbol}
              </span>
            )}
            {choice.label}
          </span>
        </label>
      ))}
    </div>
  );
}
