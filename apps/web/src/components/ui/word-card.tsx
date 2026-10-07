import { ExternalLink, Square, Volume2 } from 'lucide-react';

export function WordCardView({
  eyebrow,
  title,
  quote,
  reference,
  language = 'en',
  languageNote,
  attribution,
  providerLabel,
  chapterUrl,
  chapterLabel,
  headingLevel = 1,
  listen,
}: {
  listen?: { label: string; stopLabel: string; speaking: boolean; onToggle: () => void };
  headingLevel?: 1 | 2;
  eyebrow: string;
  title: string;
  quote: string;
  reference: string;
  language?: string;
  languageNote?: string;
  attribution?: string;
  providerLabel?: string;
  chapterUrl?: string;
  chapterLabel: string;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <section className="rounded-3xl bg-hero p-7 text-hero-foreground sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-hero-muted">{eyebrow}</p>
      <Heading className="mt-2 font-display text-xl font-semibold tracking-tight">{title}</Heading>
      <blockquote lang={language} className="mt-6 font-serif text-2xl leading-relaxed sm:text-3xl">
        {quote}
      </blockquote>
      <p lang={language} className="mt-5 text-sm font-semibold text-gold">
        {reference}
        {languageNote && <span className="ml-2 font-normal text-hero-muted">{languageNote}</span>}
      </p>
      {attribution && (
        <p className="mt-4 text-xs leading-5 text-hero-muted">
          {providerLabel && <span className="block font-semibold">{providerLabel}</span>}
          {attribution}
        </p>
      )}
      {listen && (
        <button
          type="button"
          onClick={listen.onToggle}
          aria-pressed={listen.speaking}
          className="mt-5 mr-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {listen.speaking ? (
            <Square size={14} aria-hidden="true" />
          ) : (
            <Volume2 size={16} aria-hidden="true" />
          )}
          {listen.speaking ? listen.stopLabel : listen.label}
        </button>
      )}
      {chapterUrl && (
        <a
          href={chapterUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
        >
          {chapterLabel}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}
