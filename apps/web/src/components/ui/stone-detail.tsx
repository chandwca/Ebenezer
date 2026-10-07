import * as React from 'react';
import { morningPassage, songSearchUrl, worshipSongs, type Song } from '@ebenezer/contracts';
import { SongSuggestion } from './song-suggestion';
import { useTranslation } from 'react-i18next';
import { passages, stoneSymbol, quoted } from '@/lib/scripture';
import { stoneColors, type StoneItem } from './stone-appearance';
import { Button } from './button';
import { Badge } from './badge';
import { DialogModalLayout } from './dialog-modal-layout';
import { JourneyChapterDialog } from './journey-scripture';
import { ScriptureCredit } from './scripture-credit';

export function StoneDetail<T extends StoneItem>({
  stone,
  onClose,
  onEdit,
  onDelete,
}: {
  stone: T;
  onClose: () => void;
  onEdit: (stone: T) => void;
  onDelete: (stone: T) => void;
}) {
  const { t, i18n } = useTranslation(['journal', 'common']);
  const passage = passages.find((item) => item.value === stone.ref);
  const morning = stone.morningWord
    ? (stone.morningWord.scripture ?? morningPassage(stone.morningWord.input))
    : undefined;
  const morningWord = morning?.reference === stone.ref ? morning : undefined;
  const scripture = stone.scripture?.reference === stone.ref ? stone.scripture : undefined;
  const [reading, setReading] = React.useState(false);
  const song: Song | undefined =
    stone.song ?? worshipSongs.find((item) => item.id === stone.songId);
  const colors = stoneColors[stone.tone as keyof typeof stoneColors];
  return (
    <DialogModalLayout
      title={stone.memory}
      closeLabel={t('tower.close')}
      onClose={onClose}
      footer={
        <>
          {scripture ? (
            <Button variant="outline" onClick={() => setReading(true)}>
              {t('journey.word.chapter')}
            </Button>
          ) : (
            (passage || morningWord) && (
              <Button asChild variant="outline">
                <a
                  href={
                    morningWord
                      ? `https://www.biblegateway.com/passage/?search=${encodeURIComponent(morningWord.reference)}&version=KJV`
                      : passage!.chapterUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('tower.chapter')}
                </a>
              </Button>
            )
          )}
          <Button
            variant="outline"
            onClick={() => onEdit(stone)}
            aria-label={t('manage.editLabel', { memory: stone.memory })}
          >
            {t('manage.edit')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(stone)}
            aria-label={t('manage.deleteLabel', { memory: stone.memory })}
          >
            {t('manage.delete')}
          </Button>
        </>
      }
    >
      <div className="rounded-2xl p-5" style={{ background: colors.fill, color: colors.text }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <time dateTime={stone.journalDate} className="text-sm">
            {new Intl.DateTimeFormat(i18n.resolvedLanguage, {
              dateStyle: 'long',
            }).format(new Date(`${stone.journalDate}T12:00:00`))}
          </time>
          <Badge variant="outline" className="border-current text-inherit">
            {t(`tones.${stone.tone}`)}
          </Badge>
        </div>
        <p className="text-sm font-semibold">
          {stoneSymbol(stone.ref)} {stone.ref}
          {scripture
            ? ` · ${scripture.translation}`
            : morningWord
              ? ` · ${morningWord.translation}`
              : passage
                ? ' · KJV'
                : ''}
        </p>
        {(scripture || passage || morningWord) && (
          <blockquote lang="en" className="mt-4 font-serif text-xl leading-relaxed sm:text-2xl">
            {quoted(scripture?.text ?? morningWord?.text ?? passage?.quote ?? '')}
          </blockquote>
        )}
      </div>
      {morning && morning.reference !== stone.ref && (
        <div className="mt-5 rounded-xl bg-muted p-4">
          <h3 className="text-sm font-semibold">{t('journey.evening.morningLabel')}</h3>
          <p className="mt-2 text-sm">
            {morning.reference} · {morning.translation}
          </p>
          <blockquote lang="en" className="mt-2 font-serif">
            {quoted(morning.text)}
          </blockquote>
          <ScriptureCredit {...stone.morningWord?.scripture} />
          {stone.morningWord?.thought && (
            <p className="mt-3 text-sm italic">“{stone.morningWord.thought}”</p>
          )}
        </div>
      )}
      <ScriptureCredit {...(scripture ?? stone.morningWord?.scripture)} />
      {song && (
        <div className="mt-5">
          <SongSuggestion
            label={t('tower.song')}
            title={song.title}
            artist={song.artist}
            href={songSearchUrl(song)}
            listen={t('evening.song.listen')}
          />
        </div>
      )}
      <div>
        <div className="mt-5 flex flex-wrap gap-2" aria-label={t('form.feel')}>
          {(stone.feelings ?? (stone.feel ? [stone.feel] : [])).map((feeling) => (
            <Badge key={feeling} variant="secondary">
              {t(`feelings.${feeling}`, { defaultValue: feeling })}
            </Badge>
          ))}
        </div>
        <div className="mt-6 grid gap-5">
          {(['checkIn', 'stood', 'learned', 'questions', 'thoughts', 'prayer', 'partner'] as const)
            .filter((key) => stone[key])
            .map((key) => (
              <div key={key}>
                <h3 className="text-sm font-semibold text-muted-foreground">{t(`form.${key}`)}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                  {stone[key]}
                </p>
              </div>
            ))}
        </div>
        <p className="my-6 border-t pt-5 font-serif text-lg">{t('tower.encouragement')}</p>
        {!passage && !scripture && !morningWord && (
          <p className="mb-5 text-xs text-muted-foreground">{t('tower.referenceOnly')}</p>
        )}
      </div>
      {reading && scripture && (
        <JourneyChapterDialog scripture={scripture} onClose={() => setReading(false)} />
      )}
    </DialogModalLayout>
  );
}
