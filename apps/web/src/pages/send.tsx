import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ContentLayout } from '@/components/ui/content-layout';
import { PageHeading } from '@/components/ui/page-heading';
import { WordCardView } from '@/components/ui/word-card';
import { WordSender } from '@/components/ui/word-sender';
import { Alert } from '@/components/ui/alert';
import { ModePicker } from '@/components/ui/mode-picker';
import { PackStrip, type StripDay } from '@/components/ui/pack-strip';
import { QrDialog } from '@/components/ui/qr-dialog';
import { useStudentProfile } from '@/features/profile/use-student-profile';
import { useWordPassage } from '@/features/word-card/use-word-passage';
import { canShare } from '@/lib/contact-messaging';
import {
  cleanSender,
  wordCardUrl,
  wordMoment,
  wordMoments,
  type WordMomentId,
} from '@/lib/word-card';
import {
  dayOpensOn,
  localDate,
  packUrl,
  wordPack,
  wordPacks,
  type WordPackId,
} from '@/lib/word-pack';

type Mode = 'one' | 'pack';

export function SendPage() {
  const { t } = useTranslation(['word', 'common']);
  const preferences = useStudentProfile();
  const [mode, setMode] = React.useState<Mode>('one');
  const [momentId, setMomentId] = React.useState<WordMomentId>('new');
  const [packId, setPackId] = React.useState<WordPackId>('arrival');
  const [typedName, setTypedName] = React.useState<string>();
  const [copied, setCopied] = React.useState(false);
  const [qrOpen, setQrOpen] = React.useState(false);
  const moment = wordMoment(momentId)!;
  const pack = wordPack(packId)!;
  const passage = useWordPassage(mode === 'one' ? moment : undefined);
  const profileName = cleanSender(preferences?.profile?.name).split(' ')[0] ?? '';
  const name = typedName ?? profileName;
  const origin = window.location.origin;
  const url =
    mode === 'one'
      ? wordCardUrl(origin, momentId, name)
      : packUrl(origin, packId, { start: localDate(), from: name });
  const message = t(mode === 'one' ? 'word:send.message' : 'word:send.packMessage');
  const snapshot = passage.status === 'ready' ? passage.snapshot : undefined;
  const copy = () =>
    void navigator.clipboard
      ?.writeText(`${message} ${url}`)
      .then(() => setCopied(true))
      .catch(() => undefined);
  const { i18n } = useTranslation();
  const strip: StripDay[] = pack.moments.map((id, index) => ({
    key: id,
    label:
      index === 0
        ? t('word:pack.today')
        : new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short' }).format(
            new Date(`${dayOpensOn(localDate(), index + 1)}T12:00:00`),
          ),
    state: index === 0 ? 'today' : 'locked',
  }));
  return (
    <ContentLayout>
      <PageHeading title={t('word:send.title')} description={t('word:send.lead')} />
      <WordSender
        header={
          <ModePicker
            label={t('word:send.title')}
            value={mode}
            options={[
              { value: 'one', label: t('word:send.modeOne'), stones: 1 },
              { value: 'pack', label: t('word:send.modePack'), stones: 5 },
            ]}
            onChange={(value) => {
              setMode(value);
              setCopied(false);
            }}
          />
        }
        pickLabel={t(mode === 'one' ? 'word:send.pick' : 'word:send.packPick')}
        moments={
          mode === 'one'
            ? wordMoments.map(({ id }) => ({ value: id as string, label: t(`word:moments.${id}`) }))
            : wordPacks.map(({ id }) => ({
                value: id as string,
                label: t(`word:packs.${id}.title`),
              }))
        }
        value={mode === 'one' ? momentId : packId}
        onChange={(value) => {
          if (mode === 'one') setMomentId(value as WordMomentId);
          else setPackId(value as WordPackId);
          setCopied(false);
        }}
        nameLabel={t('word:send.name')}
        name={name}
        namePlaceholder={t('word:send.namePlaceholder')}
        onNameChange={(value) => {
          setTypedName(value);
          setCopied(false);
        }}
        shareLabel={t('word:send.share')}
        onShare={() => {
          if (canShare()) void navigator.share({ text: message, url }).catch(() => undefined);
          else copy();
        }}
        copyLabel={t('word:send.copy')}
        copiedLabel={t('word:send.copied')}
        copied={copied}
        onCopy={copy}
        qrLabel={t('word:send.qr')}
        onQr={() => setQrOpen(true)}
        disabled={mode === 'one' && !snapshot}
      >
        {mode === 'one' && passage.status === 'error' && <Alert>{t('word:card.error')}</Alert>}
        {mode === 'one' && snapshot && (
          <WordCardView
            headingLevel={2}
            eyebrow={t('word:send.preview')}
            title={t(`word:moments.${momentId}`)}
            quote={snapshot.text}
            reference={snapshot.reference}
            languageNote={t('word:card.english')}
            attribution={snapshot.attribution}
            providerLabel={
              snapshot.provider === 'youversion' ? t('common:scriptureProvider') : undefined
            }
            chapterLabel={t('word:card.chapter')}
          />
        )}
        {mode === 'pack' && (
          <>
            <PackStrip days={strip} label={t(`word:packs.${packId}.title`)} />
            <Alert variant="info">{t('word:send.packNote')}</Alert>
          </>
        )}
      </WordSender>
      <QrDialog
        open={qrOpen}
        title={t('word:send.qrTitle')}
        hint={t('word:send.qrHint')}
        value={url}
        label={t('word:send.qr')}
        closeLabel={t('word:send.close')}
        onClose={() => setQrOpen(false)}
      />
    </ContentLayout>
  );
}
