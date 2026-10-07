import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Compass, MapPin, UserPlus } from 'lucide-react';
import { journal } from '@/db/repositories';
import { OnboardingLayout } from '@/components/ui/onboarding-layout';
import { ContentLayout } from '@/components/ui/content-layout';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EntryOptions } from '@/components/ui/entry-options';
import { WelcomeReminders } from '@/components/ui/welcome-reminders';
import { AccountCard } from '@/features/account/account-card';
import { useAuth } from '@/features/auth/auth-provider';
import { ProfileForm } from './profile-form';
import { journeySteps } from '@/lib/journey';

type Step = 'start' | 'profile' | 'account';
const ACCOUNT_RETURN = '/welcome?step=account';

/**
 * The first screen: create an account, use Ebenezer with just a name and city on this
 * device, or go straight in. Every path keeps the private journal on this device.
 */
export function StudentWelcome({
  dark = false,
  toggleTheme = () => {},
}: {
  dark?: boolean;
  toggleTheme?: () => void;
}) {
  const { t } = useTranslation(['today', 'common', 'settings', 'errors']);
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { session } = useAuth();
  const [step, setStep] = React.useState<Step>(() =>
    search.get('step') === 'account' ? 'account' : 'start',
  );
  const [busy, setBusy] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  async function enter() {
    if (busy) return;
    setBusy(true);
    try {
      await journal.setPreference('onboardingComplete', true);
      navigate('/', { replace: true });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  const copy = {
    start: ['today:entry.title', 'today:entry.description', 'today:entry.stepOne'],
    profile: ['today:entry.profileTitle', 'today:entry.profileDescription', 'today:entry.stepTwo'],
    account: ['today:entry.accountTitle', 'today:entry.accountDescription', 'today:entry.stepTwo'],
  }[step];
  return (
    <OnboardingLayout
      dark={dark}
      toggleTheme={toggleTheme}
      themeLabel={t(dark ? 'settings:appearance.labelLight' : 'settings:appearance.labelDark')}
      eyebrow={t('today:entry.eyebrow')}
      visualTitle={t('today:entry.visualTitle')}
      visualNote={t('today:entry.visualNote')}
      title={t(copy[0])}
      description={t(copy[1])}
      pathLabels={journeySteps.map((name) => t(`common:steps.${name}`))}
      stepLabel={t(copy[2])}
    >
      <ContentLayout>
        {step === 'start' && (
          <>
            <WelcomeReminders
              items={['loved', 'provided', 'together'].map((name) => ({
                title: t(`today:entry.reminders.${name}.title`),
                description: t(`today:entry.reminders.${name}.description`),
              }))}
            />
            <EntryOptions
              label={t('today:entry.choose')}
              options={[
                {
                  icon: UserPlus,
                  title: t('today:entry.options.account.title'),
                  description: t('today:entry.options.account.description'),
                  onSelect: () => setStep('account'),
                  emphasis: true,
                },
                {
                  icon: MapPin,
                  title: t('today:entry.options.local.title'),
                  description: t('today:entry.options.local.description'),
                  onSelect: () => setStep('profile'),
                },
                {
                  icon: Compass,
                  title: t('today:entry.options.explore.title'),
                  description: t('today:entry.options.explore.description'),
                  onSelect: () => void enter(),
                  disabled: busy,
                },
              ]}
            />
          </>
        )}
        {step === 'profile' && (
          <>
            <ProfileForm onSaved={enter} compact submitLabel={t('today:entry.finish')} />
            <Button variant="ghost" onClick={() => setStep('start')}>
              {t('today:entry.back')}
            </Button>
          </>
        )}
        {step === 'account' && (
          <>
            <AccountCard returnTo={ACCOUNT_RETURN} />
            {session && (
              <Button variant="gold" onClick={enter} disabled={busy}>
                {t('today:entry.finish')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => setStep('start')}>
              {t('today:entry.back')}
            </Button>
          </>
        )}
        {failed && <Alert>{t('errors:saveFailed')}</Alert>}
      </ContentLayout>
    </OnboardingLayout>
  );
}
