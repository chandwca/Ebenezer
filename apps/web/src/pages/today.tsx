import { useTranslation } from 'react-i18next';
import { PenLine, Send } from 'lucide-react';
import { ContentLayout } from '@/components/ui/content-layout';
import { ActionTiles } from '@/components/ui/action-tiles';
import { useStudentProfile } from '@/features/profile/use-student-profile';
import { useLocalGreeting } from '@/hooks/use-local-greeting';
import { PageHeading } from '@/components/ui/page-heading';
import { EncouragementCard } from '@/features/encouragement/encouragement-card';
import { KeptWord } from '@/features/word-card/kept-word';
import { ReminderPrompt } from '@/features/reminders/reminder-prompt';

export function TodayPage() {
  const preferences = useStudentProfile();
  const period = useLocalGreeting();
  const { t, i18n } = useTranslation(['common', 'today', 'word']);
  const greeting = t(`today:greeting.${period}`);
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
  return (
    <ContentLayout>
      <PageHeading
        eyebrow={date}
        title={
          preferences?.profile
            ? t('today:greeting.named', { greeting, name: preferences.profile.name })
            : greeting
        }
      />
      <KeptWord />
      <EncouragementCard />
      <ActionTiles
        items={[
          {
            to: '/send',
            icon: Send,
            label: t('word:send.title'),
            hint: t('today:tiles.sendHint'),
            emphasis: true,
          },
          {
            to: '/reflection?from=today',
            icon: PenLine,
            label: t('today:tiles.reflect'),
            hint: t('today:tiles.reflectHint'),
          },
        ]}
      />
      <ReminderPrompt placement="today" />
    </ContentLayout>
  );
}
