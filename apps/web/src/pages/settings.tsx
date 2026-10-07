import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentLayout } from '@/components/ui/content-layout';
import { PageHeading } from '@/components/ui/page-heading';
import { PreferenceCard } from '@/components/ui/preference-card';
import { LanguageSelect } from '@/components/ui/language-select';
import { ProfileForm } from '@/features/profile/profile-form';
import { AccountCard } from '@/features/account/account-card';
import { ReminderPreferences } from '@/features/reminders/reminder-preferences';

export function SettingsPage({ dark, toggleTheme }: { dark: boolean; toggleTheme: () => void }) {
  const { t } = useTranslation('settings');
  return (
    <>
      <PageHeading title={t('title')} />
      <ContentLayout>
        <ProfileForm />
        <ReminderPreferences />
        <PreferenceCard title={t('language.title')}>
          <LanguageSelect id="settings-language" />
        </PreferenceCard>
        <PreferenceCard title={t('appearance.title')}>
          <Button variant="outline" onClick={toggleTheme}>
            {dark ? <Sun /> : <Moon />}
            {t(dark ? 'appearance.switchLight' : 'appearance.switchDark')}
          </Button>
        </PreferenceCard>
        <PreferenceCard icon={Users} title={t('together.title')}>
          <Button asChild variant="outline">
            <Link to="/community">{t('together.open')}</Link>
          </Button>
        </PreferenceCard>
        <AccountCard hideWhenUnavailable />
      </ContentLayout>
    </>
  );
}
