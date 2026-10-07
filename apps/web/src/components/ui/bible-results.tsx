import { useTranslation } from 'react-i18next';
import type { Chapter, Passage, SearchResult } from '@/lib/bible/types';
import { Card } from './card';
import { Badge } from './badge';
import { Button } from './button';
import { ContentLayout } from './content-layout';
export function BibleResults({
  results,
  query,
  onRead,
}: {
  results: SearchResult[];
  query: string;
  onRead: (result: SearchResult) => void;
}) {
  const { t } = useTranslation('bible');
  return (
    <ContentLayout>
      {!!results.length && (
        <p className="break-words text-sm text-muted-foreground">{t('resultsFor', { query })}</p>
      )}
      {results.map((result) => (
        <Card key={result.passage.id}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{result.passage.reference}</h2>
            <Badge variant="secondary">{t('translation')}</Badge>
          </div>
          <blockquote lang="en" className="my-5 font-serif text-xl leading-relaxed">
            {result.passage.text}
          </blockquote>
          {!!result.passage.context && (
            <>
              <h3 className="text-sm font-semibold">{t('context')}</h3>
              <p lang="en" className="mt-2 text-sm leading-6 text-muted-foreground">
                {result.passage.context}
              </p>
            </>
          )}
          <p className="my-4 text-xs text-muted-foreground">
            {t('score', { score: result.score.toFixed(3) })}
          </p>
          <Button variant="outline" onClick={() => onRead(result)}>
            {t('readChapter', { chapter: `${result.chapter.book} ${result.chapter.chapter}` })}
          </Button>
          <a
            className="ml-4 inline-block py-3 text-sm font-semibold text-teal underline"
            href={result.passage.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('source')}
          </a>
        </Card>
      ))}
    </ContentLayout>
  );
}
export function BibleChapterReader({
  result,
  onClose,
  embedded = false,
}: {
  result: { chapter: Chapter; passage: Pick<Passage, 'firstVerse' | 'lastVerse'> };
  onClose: () => void;
  embedded?: boolean;
}) {
  const { t } = useTranslation('bible');
  const title = `${result.chapter.book} ${result.chapter.chapter}`;
  return (
    <Card className={embedded ? 'border-0 bg-transparent p-0 shadow-none' : undefined}>
      {!embedded && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            tabIndex={-1}
            ref={(node) => node?.focus()}
            className="font-display text-2xl font-semibold"
          >
            {title}
          </h2>
          <Button variant="outline" onClick={onClose}>
            {t('closeChapter')}
          </Button>
        </div>
      )}
      <p className="my-4 text-sm text-muted-foreground">{t('chapterNote')}</p>
      <div lang="en" className="grid gap-4 font-serif text-lg leading-8">
        {result.chapter.verses.map((verse) => (
          <p
            key={verse.number}
            className={
              verse.number >= result.passage.firstVerse && verse.number <= result.passage.lastVerse
                ? 'rounded-lg border-l-4 border-gold bg-secondary/40 p-3'
                : 'px-3'
            }
          >
            <span className="mr-2 font-sans text-xs text-muted-foreground">{verse.number}</span>
            {verse.text || t('emptyVerse')}
          </p>
        ))}
      </div>
    </Card>
  );
}
