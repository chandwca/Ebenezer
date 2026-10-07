import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { morningContext, type NotificationWord } from '@ebenezer/contracts';
import { readNotificationWord } from '@/features/reminders/notification-word';
import { journal } from '@/db/repositories';
import { useAutosave } from '@/hooks/use-autosave';
import { PageHeading } from '@/components/ui/page-heading';
import { Alert } from '@/components/ui/alert';
import { ContentLayout } from '@/components/ui/content-layout';
import { Button } from '@/components/ui/button';
import { EncouragementPanel } from '@/components/ui/encouragement-panel';

// The original push snapshot is authoritative. Never replace it with today's new verse.
export function NotificationPage() {
  const { kind = '', date = '' } = useParams();
  const { t, i18n } = useTranslation(['settings', 'today', 'errors']);
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  const [word, setWord] = React.useState<NotificationWord>();
  const [loaded, setLoaded] = React.useState(false);
  const [thought, setThought] = React.useState('');
  const [error, setError] = React.useState(false);
  React.useEffect(() => {
    let active = true;
    setLoaded(false);
    setWord(undefined);
    setThought('');
    setError(false);
    if (!['morning', 'evening'].includes(kind)) {
      setLoaded(true);
      return;
    }
    void readNotificationWord(date)
      .then(async (value) => {
        if (!active || !value) return;
        setWord(value);
        const preference = await journal.getPreference(`notification:thought:${date}`);
        if (active && typeof preference?.value === 'string') {
          setThought(preference.value);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [date, kind]);
  useAutosave(
    thought,
    (value) => journal.setPreference(`notification:thought:${date}`, value.trim()),
    loaded && !!word,
  );
  const input = { ...morningContext(new Date(`${date}T12:00:00`)), date, language } as const;
  return (
    <ContentLayout>
      <PageHeading
        eyebrow={t('settings:reminders.settings.title')}
        title={t(`settings:reminders.encounter.${kind === 'evening' ? 'evening' : 'morning'}`)}
        description={t('settings:reminders.encounter.description', { date })}
      />
      {!loaded ? (
        <Alert variant="info">{t('settings:reminders.encounter.loading')}</Alert>
      ) : !word ? (
        <Alert>{t('settings:reminders.encounter.missing')}</Alert>
      ) : (
        <>
          <EncouragementPanel
            input={input}
            result={{
              scripture: word,
              source: 'prepared',
              encouragement: {
                message: t('settings:reminders.encounter.invitation'),
                prayer: t('today:morning.preparedPrayer'),
                question: t('today:morning.preparedQuestion'),
              },
            }}
            thought={thought}
            onThoughtChange={setThought}
          />
          <Button asChild variant="gold">
            <Link to={`/reflection?from=today&notificationDate=${date}`}>
              {t('settings:reminders.encounter.reflect')}
            </Link>
          </Button>
        </>
      )}
      {error && <Alert>{t('errors:saveFailed')}</Alert>}
      <Button asChild variant="outline">
        <Link to="/">{t('settings:reminders.encounter.today')}</Link>
      </Button>
    </ContentLayout>
  );
}
