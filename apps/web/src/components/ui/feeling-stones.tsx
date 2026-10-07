import type { CSSProperties, Ref } from 'react';
import { Gem, type LucideIcon } from 'lucide-react';

export function FeelingStones({
  labelId,
  name,
  value,
  choices,
  onChange,
  onBlur,
  inputRef,
  invalid,
  describedBy,
  selectionNote,
  mixedNote,
}: {
  labelId: string;
  name: string;
  value: string[];
  choices: readonly { value: string; label: string; icon?: LucideIcon; support?: string }[];
  onChange: (value: string[]) => void;
  onBlur: () => void;
  inputRef: Ref<HTMLInputElement>;
  invalid: boolean;
  describedBy?: string;
  selectionNote: string;
  mixedNote: string;
}) {
  const selected = choices.filter((choice) => value.includes(choice.value));
  return (
    <>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className="flex flex-wrap justify-center gap-x-4 gap-y-6 sm:gap-x-6"
      >
        {choices.map(({ icon: Icon = Gem, ...choice }, index) => (
          <label
            key={choice.value}
            className="group relative w-[calc((100%-2rem)/3)] cursor-pointer text-center sm:w-[calc((100%-4.5rem)/4)] lg:w-[calc((100%-7.5rem)/6)]"
            style={{ '--stone-tilt': `${[-5, 4, -2, 5, -4, 2][index % 6]}deg` } as CSSProperties}
          >
            <input
              type="checkbox"
              name={name}
              value={choice.value}
              checked={value.includes(choice.value)}
              onChange={() =>
                onChange(
                  value.includes(choice.value)
                    ? value.filter((item) => item !== choice.value)
                    : [...value, choice.value],
                )
              }
              onBlur={onBlur}
              ref={index === 0 ? inputRef : undefined}
              className="peer sr-only"
            />
            <span className="relative mx-auto flex h-16 w-full max-w-32 rotate-[var(--stone-tilt)] items-center justify-center rounded-[52%_48%_45%_55%/62%_55%_45%_38%] border border-border bg-card text-2xl shadow-[0_5px_0_-2px_var(--border),0_9px_14px_-8px_#062a3330] transition-[translate,rotate,background-color,box-shadow,border-color] duration-200 group-hover:-translate-y-1 group-hover:bg-secondary peer-checked:-translate-y-1 peer-checked:rotate-0 peer-checked:border-gold peer-checked:bg-gold/25 peer-checked:shadow-[0_5px_0_-2px_var(--gold),0_12px_22px_-10px_#ffb22460] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-teal motion-reduce:transition-none motion-reduce:translate-y-0">
              <span
                aria-hidden="true"
                className="absolute left-5 top-2 h-2 w-8 rounded-[50%] bg-secondary/60"
              />
              <Icon
                aria-hidden="true"
                strokeWidth={2}
                className="relative z-10 size-7 shrink-0 text-teal transition-[scale,color] duration-200 group-hover:scale-110 group-has-checked:text-foreground sm:size-8 motion-reduce:transition-none"
              />
            </span>
            <span className="mt-3 block text-[11px] font-medium leading-4 peer-checked:font-semibold peer-checked:text-teal sm:text-xs">
              {choice.label}
            </span>
          </label>
        ))}
      </div>
      <div
        className="mx-auto mt-3 flex min-h-12 max-w-xl items-center justify-center text-center"
        aria-live="polite"
      >
        <p className="text-xs leading-6 text-muted-foreground">
          {selected.length > 1 ? (
            <>
              <span className="font-semibold text-teal">
                {selected.map((choice) => choice.label).join(' · ')}
              </span>
              <br />
              {mixedNote}
            </>
          ) : selected.length === 1 ? (
            selected[0].support
          ) : (
            selectionNote
          )}
        </p>
      </div>
    </>
  );
}
