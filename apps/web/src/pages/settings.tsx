import { useTranslation } from 'react-i18next';
import { Moon, ShieldCheck, Sun } from 'lucide-react';
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
      <PageHeading eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <ContentLayout>
        <AccountCard />
        <ProfileForm />
        <ReminderPreferences />
        <PreferenceCard
          title={t('language.title')}
          description={t('language.description')}
          note={t('language.available')}
        >
          <LanguageSelect id="settings-language" />
        </PreferenceCard>
        <PreferenceCard title={t('appearance.title')} description={t('appearance.description')}>
          <Button variant="outline" onClick={toggleTheme}>
            {dark ? <Sun /> : <Moon />}
            {t(dark ? 'appearance.switchLight' : 'appearance.switchDark')}
          </Button>
        </PreferenceCard>
        <PreferenceCard
          icon={ShieldCheck}
          title={t('privacy.title')}
          description={t('privacy.description')}
        />
      </ContentLayout>
    </>
  );
}
