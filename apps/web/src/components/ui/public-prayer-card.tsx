import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeart } from 'lucide-react';
import type { PublicPrayerRequest } from '@ebenezer/contracts';
import { Alert } from './alert';
import { Button } from './button';
import { Card } from './card';
import { WritingArea } from './input';

/** The page someone without an account sees when they open a private prayer link. */
export function PublicPrayerCard({
  request,
  error,
  onAnswer,
}: {
  request: PublicPrayerRequest;
  error?: string;
  /** Resolves when the answer is saved. */
  onAnswer: (note: string) => Promise<void>;
}) {
  const { t } = useTranslation('community');
  const id = React.useId();
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  return (
    <Card className="mx-auto max-w-xl p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[.16em] text-teal">
        {t('pray.eyebrow')}
      </p>
      <h1 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
        {t('pray.title', { name: request.authorName })}
      </h1>
      <p className="mt-5 whitespace-pre-line text-lg leading-8">{request.body}</p>
      {request.scriptureReference && (
        <blockquote className="mt-5 rounded-xl border-l-4 border-teal bg-secondary/50 px-4 py-3">
          {request.scriptureText && (
            <p className="font-serif leading-7" lang="en">
              “{request.scriptureText}”
            </p>
          )}
          <cite className="mt-1 block text-xs font-semibold not-italic">
            {request.scriptureReference}
          </cite>
        </blockquote>
      )}
      {request.answered ? (
        <div className="mt-6">
          <Alert variant="success">{t('pray.thanks', { name: request.authorName })}</Alert>
        </div>
      ) : (
        <form
          className="mt-6 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            onAnswer(note.trim()).finally(() => setBusy(false));
          }}
        >
          <label htmlFor={id} className="text-sm font-semibold">
            {t('pray.noteLabel', { name: request.authorName })}
          </label>
          <WritingArea
            id={id}
            minHeight={88}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t('pray.notePlaceholder')}
          />
          {error && <Alert>{error}</Alert>}
          <Button type="submit" variant="gold" disabled={busy}>
            <HandHeart aria-hidden="true" />
            {t('pray.answer')}
          </Button>
        </form>
      )}
      <p className="mt-6 text-xs leading-5 text-muted-foreground">{t('pray.privacy')}</p>
    </Card>
  );
}
