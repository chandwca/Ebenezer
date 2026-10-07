import { quoted } from '@/lib/scripture';
import { ScriptureCredit } from './scripture-credit';
/** The morning Word and the thought she chose to carry, told back to her in the evening. */
export function MorningRecall({
  lead,
  reference,
  translation,
  quote,
  thoughtLead,
  thought,
  credit,
}: {
  lead: string;
  reference: string;
  translation: string;
  quote: string;
  thoughtLead: string;
  thought?: string;
  credit?: { attribution?: string; provider?: 'youversion' };
}) {
  return (
    <div className="grid gap-4">
      <p className="text-base leading-7 text-muted-foreground">{lead}</p>
      <figure className="border-l-2 border-gold/70 pl-5">
        <blockquote lang="en" className="font-serif text-xl leading-relaxed sm:text-2xl">
          {quoted(quote)}
        </blockquote>
        <figcaption lang="en" className="mt-3 text-sm font-semibold text-teal">
          {reference} · {translation}
        </figcaption>
      </figure>
      <ScriptureCredit {...credit} />
      {thought && (
        <p className="text-base leading-7 text-muted-foreground">
          {thoughtLead}{' '}
          <span className="font-serif text-lg italic text-foreground">“{thought}”</span>
        </p>
      )}
    </div>
  );
}
