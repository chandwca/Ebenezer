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
import { AccountCard } from '@/features/account/account-card';
import { useAuth } from '@/features/auth/auth-provider';
import { ProfileForm } from './profile-form';

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
    start: ['today:entry.title', 'today:entry.description'],
    profile: ['today:entry.profileTitle', 'today:entry.profileDescription'],
    account: ['today:entry.accountTitle', 'today:entry.accountDescription'],
  }[step];
  return (
    <OnboardingLayout
      dark={dark}
      toggleTheme={toggleTheme}
      themeLabel={t(dark ? 'settings:appearance.labelLight' : 'settings:appearance.labelDark')}
      visualTitle={t('today:entry.visualTitle')}
      title={t(copy[0])}
      description={t(copy[1])}
    >
      <ContentLayout>
        {step === 'start' && (
          <>
            <EntryOptions
              label={t('today:entry.choose')}
              options={[
                {
                  icon: Compass,
                  title: t('today:entry.options.explore.title'),
                  onSelect: () => void enter(),
                  emphasis: true,
                  disabled: busy,
                },
                {
                  icon: MapPin,
                  title: t('today:entry.options.local.title'),
                  onSelect: () => setStep('profile'),
                },
                {
                  icon: UserPlus,
                  title: t('today:entry.options.account.title'),
                  onSelect: () => setStep('account'),
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
