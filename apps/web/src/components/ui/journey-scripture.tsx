import { quoted } from '@/lib/scripture';
import { BookOpen, LoaderCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ScriptureSnapshot } from '@ebenezer/contracts';
import { Button } from './button';
import { DialogModalLayout } from './dialog-modal-layout';
import { BibleChapterReader } from './bible-results';
import { ScriptureCredit } from './scripture-credit';

export function JourneyScripture({
  quote,
  reference,
  note,
  chapterUrl,
  chapterLabel,
  translation = 'KJV',
  context,
  contextLabel,
  onRead,
  credit,
}: {
  quote: string;
  reference: string;
  note: string;
  chapterUrl: string;
  chapterLabel: string;
  translation?: string;
  context?: string;
  contextLabel?: string;
  onRead?: () => void;
  credit?: { attribution?: string; provider?: 'youversion' };
}) {
  return (
    <div className="mb-6 rounded-2xl bg-background p-5 sm:p-6">
      <BookOpen size={20} className="text-teal" aria-hidden="true" />
      <blockquote lang="en" className="my-5 font-serif text-2xl leading-relaxed">
        {quoted(quote)}
      </blockquote>
      <p lang="en" className="text-sm font-semibold text-teal">
        {reference} · {translation}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
      <ScriptureCredit {...credit} />
      {context && (
        <p lang="en" className="mt-4 text-sm leading-6 text-muted-foreground">
          <span className="block text-xs font-semibold">{contextLabel}</span>
          {context}
        </p>
      )}
      {onRead ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRead}>
          {chapterLabel}
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm" className="mt-4">
          <a href={chapterUrl} target="_blank" rel="noopener noreferrer">
            {chapterLabel}
          </a>
        </Button>
      )}
    </div>
  );
}

export function JourneyWordStatus({
  phase,
  percent,
  error,
  canExplore,
  onExplore,
  onRetry,
  onBundled,
}: {
  phase: string;
  percent?: number;
  error: string;
  canExplore: boolean;
  onExplore: () => void;
  onRetry: () => void;
  onBundled: () => void;
}) {
  const { t } = useTranslation('journal');
  const busy = ['loading', 'downloading', 'searching'].includes(phase);
  return (
    <div className="mx-auto mb-6 max-w-2xl text-center">
      {busy && (
        <>
          <p role="status" className="flex items-center justify-center gap-2 text-sm text-teal">
            <LoaderCircle
              size={18}
              className="animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {t(`journey.word.${phase}`)}
            {phase === 'downloading' && percent !== undefined ? ` ${percent}%` : ''}
          </p>
          {phase !== 'searching' && (
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {t('journey.word.download')}
            </p>
          )}
        </>
      )}
      {phase === 'error' && (
        <p role="status" className="text-sm leading-6 text-muted-foreground">
          {t(`journey.word.errors.${error}`)}
        </p>
      )}
      {(busy || phase === 'error') && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {phase === 'error' && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t('form.retry')}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onBundled}>
            {t('journey.word.bundled')}
          </Button>
        </div>
      )}
      {phase === 'done' && canExplore && (
        <Button variant="ghost" size="sm" onClick={onExplore}>
          {t('journey.word.another')}
        </Button>
      )}
    </div>
  );
}

export function JourneyChapterDialog({
  scripture,
  onClose,
}: {
  scripture: ScriptureSnapshot;
  onClose: () => void;
}) {
  const { t } = useTranslation('bible');
  return (
    <DialogModalLayout
      title={`${scripture.chapter.book} ${scripture.chapter.chapter}`}
      closeLabel={t('closeChapter')}
      onClose={onClose}
    >
      <BibleChapterReader
        embedded
        translation={scripture.translation}
        result={{ chapter: scripture.chapter, passage: scripture }}
        onClose={onClose}
      />
      <ScriptureCredit {...scripture} />
    </DialogModalLayout>
  );
}
