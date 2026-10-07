import { useTranslation } from 'react-i18next';
import { ContentLayout } from '@/components/ui/content-layout';
import { HeroCard } from '@/components/ui/hero-card';
import { useStudentProfile } from '@/features/profile/use-student-profile';
import { useLocalGreeting } from '@/hooks/use-local-greeting';
import { PageHeading } from '@/components/ui/page-heading';
import { EncouragementCard } from '@/features/encouragement/encouragement-card';
import { ReminderPrompt } from '@/features/reminders/reminder-prompt';

/** Today is two moments: a Word for the morning and an invitation to bring the day back tonight. */
export function TodayPage() {
  const preferences = useStudentProfile();
  const period = useLocalGreeting();
  const { t, i18n } = useTranslation(['common', 'today']);
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
        description={t('today:description')}
      />
      <ReminderPrompt placement="today" />
      <EncouragementCard />
      <HeroCard
        eyebrow={t('today:hero.tagline')}
        title={t('today:hero.title')}
        description={t('today:hero.description')}
        action={t('today:hero.begin')}
        to="/reflection?from=today"
      />
    </ContentLayout>
  );
}
