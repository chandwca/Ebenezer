import * as React from 'react';
import { HandHeart, Plus } from 'lucide-react';
import { Button } from './button';
import { WritingArea } from './input';

/** An always-open writing space; starter phrases add to the person's own words. */
export function HeartSpace({
  title,
  description,
  descriptionId,
  starters,
  onWrite,
  ref,
  ...props
}: React.ComponentProps<typeof WritingArea> & {
  title: string;
  description: string;
  descriptionId: string;
  starters: readonly { label: string; text: string }[];
  onWrite: (value: string) => void;
}) {
  const input = React.useRef<HTMLTextAreaElement>(null);
  const moveCaret = React.useRef(false);
  React.useImperativeHandle(ref, () => input.current!, []);
  React.useLayoutEffect(() => {
    const element = input.current;
    if (!element) return;
    if (moveCaret.current) {
      element.setSelectionRange(element.value.length, element.value.length);
      moveCaret.current = false;
    }
  }, [props.value]);
  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-4 flex items-start gap-3">
        <HandHeart size={22} className="mt-1 shrink-0 text-teal" aria-hidden="true" />
        <div>
          <label htmlFor={props.id} className="font-display text-lg font-semibold tracking-tight">
            {title}
          </label>
          <p id={descriptionId} className="mt-1 text-xs leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-card px-5 py-4 shadow-[0_8px_30px_-12px_#173b4d26] ring-1 ring-border/50 transition-shadow focus-within:ring-2 focus-within:ring-teal/50 motion-reduce:transition-none">
        <WritingArea
          {...props}
          ref={input}
          className="min-h-32 max-h-80 resize-none rounded-none border-0 bg-transparent p-0 text-base leading-7 shadow-none focus-visible:outline-none"
        />
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
          {starters.map((starter) => (
            <Button
              key={starter.label}
              variant="outline"
              size="sm"
              className="min-h-9 rounded-full border-border/80 bg-background/60 px-3.5 text-xs font-medium text-muted-foreground hover:border-teal/40 hover:bg-secondary hover:text-secondary-foreground"
              onClick={() => {
                const value = String(props.value ?? '');
                moveCaret.current = true;
                onWrite(`${value}${value.trim() ? '\n\n' : ''}${starter.text}`);
                input.current?.focus();
              }}
            >
              <Plus aria-hidden="true" className="!size-3.5" />
              {starter.label}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
