import * as React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { WordCardLayout } from '@/components/ui/word-card-layout';
import { WordCardView } from '@/components/ui/word-card';
import { WordResponse } from '@/components/ui/word-response';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { keepWord } from '@/features/word-card/kept-words';
import { useSpeech } from '@/features/word-card/use-speech';
import { useWordPassage } from '@/features/word-card/use-word-passage';
import { canShare, channelHref } from '@/lib/contact-messaging';
import { cleanSender, composeReply, wordMoment } from '@/lib/word-card';
import { cleanStart, packPath, wordPack } from '@/lib/word-pack';
import { Link } from 'react-router-dom';

const choices = ['helped', 'struggling', 'more'] as const;
type Choice = (typeof choices)[number];

export function WordPage() {
  const { moment: id } = useParams();
  const [search] = useSearchParams();
  const { t } = useTranslation(['word', 'common']);
  const moment = wordMoment(id);
  const from = cleanSender(search.get('from'));
  const passage = useWordPassage(moment);
  const speech = useSpeech(passage.status === 'ready' ? passage.snapshot.text : undefined);
  const pack = wordPack(search.get('pack') ?? undefined);
  const [choice, setChoice] = React.useState<Choice | ''>('');
  const [note, setNote] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [kept, setKept] = React.useState(false);
  const title = moment ? t(`word:moments.${moment.id}`) : t('word:card.missing');
  React.useEffect(() => {
    document.title = `${title} · Ebenezer`;
  }, [title]);

  if (!moment)
    return (
      <WordCardLayout>
        <EmptyState
          headingLevel={1}
          icon={BookOpen}
          title={t('word:card.missing')}
          description={t('word:card.missingHint')}
          action={t('word:card.home')}
          to="/"
        />
      </WordCardLayout>
    );

  const snapshot = passage.status === 'ready' ? passage.snapshot : undefined;
  const reply = composeReply([
    choice && t(`word:respond.text.${choice}`),
    note,
    snapshot?.reference,
  ]);
  const name = from || t('word:card.fromAnon');
  const sendReply = () => {
    if (canShare()) void navigator.share({ text: reply }).catch(() => undefined);
    else window.open(channelHref('whatsapp', reply), '_blank', 'noopener,noreferrer');
  };
  const copyReply = () => {
    navigator.clipboard
      ?.writeText(reply)
      .then(() => setCopied(true))
      .catch(() => undefined);
  };

  return (
    <WordCardLayout>
      {passage.status === 'loading' && <LoadingState />}
      {passage.status === 'error' && (
        <>
          <Alert>{t('word:card.error')}</Alert>
          <Button variant="outline" onClick={passage.retry}>
            {t('word:card.retry')}
          </Button>
        </>
      )}
      {snapshot && (
        <>
          <WordCardView
            eyebrow={from ? t('word:card.from', { name: from }) : t('word:card.fromAnon')}
            title={title}
            quote={snapshot.text}
            reference={snapshot.reference}
            languageNote={t('word:card.english')}
            attribution={snapshot.attribution}
            providerLabel={
              snapshot.provider === 'youversion' ? t('common:scriptureProvider') : undefined
            }
            chapterUrl={snapshot.sourceUrl}
            chapterLabel={t('word:card.chapter')}
            listen={
              speech.supported
                ? {
                    label: t('word:card.listen'),
                    stopLabel: t('word:card.stop'),
                    speaking: speech.speaking,
                    onToggle: speech.toggle,
                  }
                : undefined
            }
          />
          <WordResponse
            label={t('word:respond.label')}
            options={choices.map((value) => ({ value, label: t(`word:respond.${value}`) }))}
            value={choice}
            onChange={(value) => {
              setChoice(value);
              setCopied(false);
            }}
            noteLabel={t('word:respond.note')}
            note={note}
            onNoteChange={(value) => {
              setNote(value);
              setCopied(false);
            }}
            replyLabel={from ? t('word:respond.reply', { name }) : t('word:respond.replyAnon')}
            onReply={sendReply}
            copyLabel={t('word:respond.copy')}
            copiedLabel={t('word:respond.copied')}
            copied={copied}
            onCopy={copyReply}
            privacy={t('word:respond.private')}
            keepLabel={t('word:next.keep')}
            keptLabel={t('word:next.kept')}
            kept={kept}
            onKeep={() =>
              void keepWord({
                moment: moment.id,
                ...(from ? { from } : {}),
                reference: snapshot.reference,
                text: snapshot.text,
                translation: snapshot.translation,
                provider: snapshot.provider,
                attribution: snapshot.attribution,
                sourceUrl: snapshot.sourceUrl,
              }).then(() => setKept(true))
            }
            passLabel={t('word:next.pass')}
            passTo="/send"
          />
          {pack && (
            <Button asChild variant="outline">
              <Link to={packPath(pack.id, { start: cleanStart(search.get('start')), from })}>
                {t('word:pack.back')}
              </Link>
            </Button>
          )}
        </>
      )}
    </WordCardLayout>
  );
}
