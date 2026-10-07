import * as React from 'react';
import { Feather, HandHeart, Heart, MessageCircle, Sprout } from 'lucide-react';
import { Card } from './card';
import { WritingArea } from './input';
import { cn } from '@/lib/utils';

const promptIcons = {
  stood: Feather,
  learned: Sprout,
  questions: MessageCircle,
  thoughts: Heart,
  prayer: HandHeart,
};
export type JournalPromptKind = keyof typeof promptIcons;

/** A conversational invitation with open writing space, rather than a form heading. */
export function JournalPrompt({
  prompt,
  kind = 'stood',
  ...props
}: React.ComponentProps<typeof WritingArea> & { prompt: string; kind?: JournalPromptKind }) {
  const lead = kind === 'stood';
  const Icon = promptIcons[kind];
  return (
    <Card
      className={cn(
        'relative h-full overflow-hidden rounded-3xl border-border/60 bg-card/80 p-5 transition-shadow focus-within:ring-2 focus-within:ring-teal/40 motion-reduce:transition-none sm:p-6',
        lead && 'border-gold/30 bg-linear-to-br from-card via-card to-gold/10 sm:p-7',
        kind === 'prayer' && 'bg-linear-to-br from-card to-secondary/40',
      )}
    >
      {lead && (
        <span
          aria-hidden="true"
          className="absolute right-5 -top-5 select-none font-serif text-[9rem] leading-none text-gold/10"
        >
          “
        </span>
      )}
      <div className="relative flex items-start gap-3">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-xl bg-secondary/70 text-teal',
            lead && 'bg-gold/15 text-gold-foreground dark:text-gold',
          )}
        >
          <Icon size={18} strokeWidth={1.6} aria-hidden="true" />
        </span>
        <label
          htmlFor={props.id}
          className={cn(
            'pt-1 text-sm leading-6 text-foreground',
            lead && 'font-serif text-xl leading-7',
          )}
        >
          {prompt}
        </label>
      </div>
      <WritingArea
        {...props}
        minHeight={lead ? 112 : 72}
        className={cn(
          'relative mt-3 min-h-0 rounded-none border-0 bg-transparent px-0 py-2 text-base leading-7 placeholder:text-muted-foreground/75 focus-visible:outline-none',
          lead && 'font-serif text-xl leading-8',
        )}
      />
    </Card>
  );
}
