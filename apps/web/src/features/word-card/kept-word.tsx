import { useTranslation } from 'react-i18next';
import { WordCardView } from '@/components/ui/word-card';
import { wordMoment } from '@/lib/word-card';
import { useKeptWords } from './kept-words';

export function KeptWord() {
  const { t } = useTranslation(['word', 'common']);
  const word = useKeptWords()?.[0];
  if (!word) return null;
  return (
    <WordCardView
      headingLevel={2}
      eyebrow={t('word:kept.title')}
      title={
        word.from
          ? t('word:kept.from', { name: word.from })
          : wordMoment(word.moment)
            ? t(`word:moments.${word.moment}`)
            : t('word:kept.title')
      }
      quote={word.text}
      reference={word.reference}
      languageNote={t('word:card.english')}
      attribution={word.attribution}
      providerLabel={
        word.sourceUrl?.includes('bible.com') ? t('common:scriptureProvider') : undefined
      }
      chapterUrl={word.sourceUrl}
      chapterLabel={t('word:card.chapter')}
    />
  );
}
