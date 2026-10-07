import { useTranslation } from 'react-i18next';
import { AccountPanel } from '@/components/ui/account-panel';
import { ContentLayout } from '@/components/ui/content-layout';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { useAccountActions } from '@/features/auth/use-account-actions';
import { useAuth } from '@/features/auth/auth-provider';
import { AccountApiError } from '@/lib/api/client';
import { useCloudProfile } from './use-cloud-profile';
import { CommunityProfileForm } from './profile-form';

function AccountProfile() {
  const { t } = useTranslation('account');
  const { session } = useAuth();
  const { status, profile, error, online, reload, save } = useCloudProfile();
  if (!online) return <Alert variant="info">{t('offline')}</Alert>;
  if (status === 'loading') return <Alert variant="info">{t('profile.loading')}</Alert>;
  if (status === 'error')
    return (
      <ContentLayout>
        <Alert>
          {t(
            error instanceof AccountApiError && error.status === 401
              ? 'errors.sessionExpired'
              : 'errors.load',
          )}
        </Alert>
        <Button variant="outline" onClick={reload}>
          {t('retry')}
        </Button>
      </ContentLayout>
    );
  return (
    <ContentLayout>
      <Alert variant="info">{t(profile ? 'profile.existing' : 'profile.welcome')}</Alert>
      <CommunityProfileForm key={session?.user.id} profile={profile} save={save} />
    </ContentLayout>
  );
}

/** `returnTo`: where Google sign-in should come back to (Settings by default). */
export function AccountCard({
  returnTo,
  hideWhenUnavailable = false,
}: { returnTo?: string; hideWhenUnavailable?: boolean } = {}) {
  const { t } = useTranslation('account');
  const { status, session, online, pending, error, signIn, signOut, retry } = useAccountActions();
  if (hideWhenUnavailable && status === 'unavailable') return null;
  return (
    <AccountPanel
      title={t(session ? 'signedInTitle' : 'title')}
      description={t('description')}
      identity={session?.user.email}
      actions={
        status === 'ready' && (
          <Button
            variant={session ? 'outline' : 'gold'}
            disabled={pending || (!session && !online)}
            onClick={session ? signOut : () => signIn(returnTo)}
          >
            {t(pending ? 'working' : session ? 'signOut' : 'google')}
          </Button>
        )
      }
    >
      {status === 'loading' && <Alert variant="info">{t('loading')}</Alert>}
      {status === 'unavailable' && <Alert variant="info">{t('unavailable')}</Alert>}
      {status === 'error' && (
        <>
          <Alert>{t('errors.session')}</Alert>
          <Button variant="outline" onClick={retry}>
            {t('retry')}
          </Button>
        </>
      )}
      {error && <Alert>{t(error)}</Alert>}
      {!online && !session && <Alert variant="info">{t('offline')}</Alert>}
      {session && <AccountProfile key={session.user.id} />}
    </AccountPanel>
  );
}
