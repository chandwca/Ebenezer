import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ReminderInvite } from '@/components/ui/reminder-invite';
import { useReminders } from './use-reminders';

/** "7:30 AM" or "7:30" in her language. */
export function formatReminderTime(time: string, language: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return new Intl.DateTimeFormat(language, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 0, 1, hours, minutes)));
}

/**
 * Asks once on Today (right after welcome, so a demo shows a notification at once), and once
 * more after her first stone if she chose "Not now". Never shown again after that.
 */
export function ReminderPrompt({ placement }: { placement: 'today' | 'after-stone' }) {
  const { t, i18n } = useTranslation('settings');
  const reminders = useReminders();
  const [justTurnedOn, setJustTurnedOn] = React.useState(false);
  const { status, settings, busy, error } = reminders;
  const language = i18n.resolvedLanguage ?? 'en';

  if (justTurnedOn)
    return (
      <ReminderInvite
        title={t('reminders.title')}
        confirmed={t('reminders.confirmed', {
          time: formatReminderTime(settings.morningTime, language),
        })}
      />
    );
  const askable = status === 'off' || status === 'blocked' || status === 'install-first';
  const shown = placement === 'today' ? !settings.dismissed : settings.dismissed === 'once';
  if (!askable || !shown) return null;

  const notNow = (
    <Button variant="ghost" onClick={() => void reminders.dismiss()}>
      {t('reminders.notNow')}
    </Button>
  );
  if (status === 'install-first')
    return (
      <ReminderInvite
        title={t('reminders.install.title')}
        steps={t('reminders.install.steps', { returnObjects: true }) as string[]}
        note={t('reminders.privacy')}
      >
        {notNow}
      </ReminderInvite>
    );
  if (status === 'blocked')
    return (
      <ReminderInvite
        title={t('reminders.blocked.title')}
        steps={t('reminders.blocked.steps', { returnObjects: true }) as string[]}
      >
        {notNow}
      </ReminderInvite>
    );
  return (
    <ReminderInvite
      title={t('reminders.title')}
      lines={[
        {
          kind: 'morning',
          time: formatReminderTime(settings.morningTime, language),
          text: t('reminders.morning'),
        },
        {
          kind: 'evening',
          time: formatReminderTime(settings.eveningTime, language),
          text: t('reminders.evening'),
        },
      ]}
      note={t('reminders.privacy')}
      message={error ? t(`reminders.errors.${error}`) : undefined}
      footnote={t('reminders.changeLater')}
    >
      <Button
        onClick={() => void reminders.turnOn().then((done) => done && setJustTurnedOn(true))}
        disabled={busy}
      >
        {t(busy ? 'reminders.turningOn' : 'reminders.turnOn')}
      </Button>
      {notNow}
    </ReminderInvite>
  );
}
