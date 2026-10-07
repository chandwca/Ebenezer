import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { WordCardLayout } from '@/components/ui/word-card-layout';
import { PageHeading } from '@/components/ui/page-heading';
import { PackView, type PackDay } from '@/components/ui/pack-view';
import { PackStrip, type StripDay } from '@/components/ui/pack-strip';
import { EmptyState } from '@/components/ui/empty-state';
import { cleanSender } from '@/lib/word-card';
import {
  cleanStart,
  dayOpensOn,
  localDate,
  openDays,
  packCardPath,
  wordPack,
} from '@/lib/word-pack';

export function PackPage() {
  const { pack: id } = useParams();
  const [search] = useSearchParams();
  const { t, i18n } = useTranslation(['word']);
  const pack = wordPack(id);
  if (!pack)
    return (
      <WordCardLayout>
        <EmptyState
          headingLevel={1}
          icon={BookOpen}
          title={t('word:pack.missing')}
          description={t('word:card.missingHint')}
          action={t('word:card.home')}
          to="/"
        />
      </WordCardLayout>
    );
  const today = localDate();
  const start = cleanStart(search.get('start')) ?? today;
  const from = cleanSender(search.get('from'));
  const total = pack.moments.length;
  const open = openDays(start, today, total);
  const format = (date: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  const days: PackDay[] = pack.moments.map((moment, index) => {
    const number = index + 1;
    const unlocked = number <= open;
    return {
      number,
      title: t(`word:moments.${moment}`),
      dayLabel: t('word:pack.day', { n: number }),
      state: unlocked ? (number === open && open < total ? 'today' : 'open') : 'locked',
      ...(unlocked
        ? { to: packCardPath(pack.id, moment, { start, from }) }
        : { note: t('word:pack.opens', { date: format(dayOpensOn(start, number)) }) }),
    };
  });
  const strip: StripDay[] = days.map((day, index) => ({
    key: pack.moments[index],
    label:
      day.state === 'today'
        ? t('word:pack.today')
        : new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'short' }).format(
            new Date(`${dayOpensOn(start, index + 1)}T12:00:00`),
          ),
    state: day.state,
  }));
  const summary =
    open === 0
      ? t('word:pack.soon', { date: format(start) })
      : open >= total
        ? t('word:pack.done')
        : t('word:pack.progress', { day: open, total });
  return (
    <WordCardLayout>
      <PageHeading
        eyebrow={from ? t('word:pack.from', { name: from }) : t('word:pack.fromAnon')}
        title={t(`word:packs.${pack.id}.title`)}
        description={summary}
      />
      <PackStrip days={strip} label={t(`word:packs.${pack.id}.title`)} />
      <PackView days={days} label={t(`word:packs.${pack.id}.title`)} />
    </WordCardLayout>
  );
}
