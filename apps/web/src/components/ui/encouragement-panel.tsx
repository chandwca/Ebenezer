import { quoted } from '@/lib/scripture';
import { useTranslation } from 'react-i18next';
import {
  morningPassage,
  type EncouragementRequest,
  type EncouragementResponse,
} from '@ebenezer/contracts';
import { Button } from './button';
import { Card } from './card';
import { ScriptureCredit } from './scripture-credit';

export function EncouragementPanel({
  input,
  result,
  thought,
  onThoughtChange,
}: {
  input: EncouragementRequest;
  result?: EncouragementResponse;
  thought: string;
  onThoughtChange: (value: string) => void;
}) {
  const { t } = useTranslation('today');
  const passage = result?.scripture ?? morningPassage(input);
  return (
    <Card>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-teal">
        {t('morning.title')}
      </h2>
      {input.occasion && (
        <p className="mt-3 text-sm text-teal">{t(`morning.occasions.${input.occasion}.title`)}</p>
      )}
      <blockquote lang="en" className="my-6 font-serif text-2xl leading-relaxed">
        {quoted(passage.text)}
      </blockquote>
      <p lang="en" className="text-sm font-semibold text-teal">
        {passage.reference} · {passage.translation}
      </p>
      {input.occasion && (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t(`morning.occasions.${input.occasion}.context`)}
        </p>
      )}
      <ScriptureCredit {...result?.scripture} />
      <Button asChild variant="ghost" className="mb-1 mt-2 px-0">
        <a
          href={
            result?.scripture.sourceUrl ??
            `https://www.biblegateway.com/passage/?search=${encodeURIComponent(passage.reference)}&version=${passage.translation === 'KJV' ? 'KJV' : 'WEB'}`
          }
          target="_blank"
          rel="noreferrer"
        >
          {t('morning.read')}
        </a>
      </Button>
      <div className="mt-2 space-y-4" aria-live="polite">
        <details>
          <summary className="cursor-pointer text-sm font-semibold text-teal">
            {t('morning.more')}
          </summary>
          <p className="mt-3 leading-7">
            {result?.encouragement.message ??
              t(`morning.prepared.${input.occasion ? 'occasion' : input.theme}`)}
          </p>
          <p className="mt-3 leading-6">
            {result?.encouragement.prayer ?? t('morning.preparedPrayer')}
          </p>
        </details>
        <div className="border-t pt-5">
          <label htmlFor="morning-thought" className="block text-sm font-medium">
            {result?.encouragement.question ?? t('morning.preparedQuestion')}
          </label>
          <textarea
            id="morning-thought"
            value={thought}
            maxLength={500}
            rows={2}
            onChange={(event) => onThoughtChange(event.target.value)}
            placeholder={t('morning.thoughtPlaceholder')}
            className="mt-3 w-full rounded-xl border bg-background p-3 text-sm leading-6"
          />
        </div>
      </div>
    </Card>
  );
}
