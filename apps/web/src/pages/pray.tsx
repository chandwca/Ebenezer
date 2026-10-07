import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HandHeart } from 'lucide-react';
import type { PublicPrayerRequest } from '@ebenezer/contracts';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { PublicPrayerCard } from '@/components/ui/public-prayer-card';
import { prayerLinkApi } from '@/features/community/community-api';
import { errorKey } from '@/features/community/use-community';

/** Opened from a private prayer link by someone who may not have an account. */
export function PrayPage() {
  const { t } = useTranslation('community');
  const { token = '' } = useParams();
  const [request, setRequest] = React.useState<PublicPrayerRequest>();
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = React.useState(0);
  const [error, setError] = React.useState<string>();
  React.useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    prayerLinkApi
      .open(token, controller.signal)
      .then((value) => {
        if (controller.signal.aborted) return;
        setRequest(value);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setStatus(errorKey(cause) === 'not_found' ? 'missing' : 'error');
      });
    return () => controller.abort();
  }, [token, attempt]);
  if (status === 'loading') return <Alert variant="info">{t('status.loading')}</Alert>;
  if (status !== 'ready' || !request)
    return (
      <>
        <EmptyState
          headingLevel={1}
          icon={HandHeart}
          title={t(status === 'missing' ? 'pray.missing' : 'errors.unavailable')}
          description={t(status === 'missing' ? 'pray.missingHint' : 'pray.retryHint')}
          action={t('pray.discover')}
          to="/"
        />
        {status === 'error' && (
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            {t('status.retry')}
          </Button>
        )}
      </>
    );
  return (
    <PublicPrayerCard
      request={request}
      error={error}
      onAnswer={async (note) => {
        setError(undefined);
        try {
          setRequest(await prayerLinkApi.answer(token, note));
        } catch (cause) {
          setError(t(`errors.${errorKey(cause)}`));
        }
      }}
    />
  );
}
