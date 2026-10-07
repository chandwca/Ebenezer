import { ExternalLink, Music } from 'lucide-react';
import { Button } from './button';

/** A worship song to listen to; opens a YouTube search in a new tab. */
export function SongSuggestion({
  label,
  title,
  artist,
  href,
  listen,
}: {
  label: string;
  title: string;
  artist: string;
  href: string;
  listen: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gold/30 bg-gold/5 p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold-foreground dark:text-gold">
        <Music size={20} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-teal">{label}</p>
        <p className="mt-1 font-serif text-lg leading-snug">{title}</p>
        <p className="text-sm text-muted-foreground">{artist}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={href} target="_blank" rel="noopener noreferrer">
          {listen}
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </div>
  );
}
