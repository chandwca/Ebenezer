import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeading } from '@/components/ui/page-heading';
import { ContentLayout } from '@/components/ui/content-layout';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useOAuthCallback } from '@/features/auth/use-oauth-callback';

export function AuthCallbackPage() {
  const { t } = useTranslation('account');
  const { error, online } = useOAuthCallback();
  return (
    <>
      <PageHeading
        eyebrow={t('callback.eyebrow')}
        title={t('callback.title')}
        description={t('callback.description')}
      />
      <ContentLayout>
        <Alert variant={error ? 'error' : 'info'}>
          {t(error ?? (online ? 'callback.working' : 'offline'))}
        </Alert>
        <Button variant="outline" asChild>
          <Link to="/settings" replace>
            {t('callback.return')}
          </Link>
        </Button>
      </ContentLayout>
    </>
  );
}
