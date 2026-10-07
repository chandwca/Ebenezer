import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ReminderInvite } from '@/components/ui/reminder-invite';
import { ReminderSettingsPanel } from '@/components/ui/reminder-settings';
import { useReminders } from './use-reminders';

/** Settings › Reminders: on/off, times, discreet wording, and trying a reminder now. */
export function ReminderPreferences() {
  const { t } = useTranslation('settings');
  const reminders = useReminders();
  const { status, settings, busy, error, notice } = reminders;
  if (status === 'loading') return null;
  if (status === 'unsupported')
    return (
      <ReminderInvite title={t('reminders.settings.title')} note={t('reminders.unsupported')} />
    );
  if (status === 'install-first' || status === 'blocked')
    return (
      <ReminderInvite
        title={t(`reminders.${status === 'blocked' ? 'blocked' : 'install'}.title`)}
        steps={
          t(`reminders.${status === 'blocked' ? 'blocked' : 'install'}.steps`, {
            returnObjects: true,
          }) as string[]
        }
      />
    );
  const on = status === 'on';
  return (
    <ReminderSettingsPanel
      title={t('reminders.settings.title')}
      description={t('reminders.settings.description')}
      status={t(on ? 'reminders.settings.on' : 'reminders.settings.off')}
      disabled={busy}
      times={{
        morningLabel: t('reminders.settings.morning'),
        eveningLabel: t('reminders.settings.evening'),
        morning: settings.morningTime,
        evening: settings.eveningTime,
        onChange: (kind, value) =>
          void reminders.change(
            kind === 'morning' ? { morningTime: value } : { eveningTime: value },
          ),
      }}
      discreet={{
        label: t('reminders.settings.discreet'),
        note: t('reminders.settings.discreetNote'),
        checked: settings.discreet,
        onChange: (value) => void reminders.change({ discreet: value }),
      }}
      actions={
        on ? (
          <Button variant="outline" disabled={busy} onClick={() => void reminders.turnOff()}>
            {t('reminders.settings.turnOff')}
          </Button>
        ) : (
          <Button disabled={busy} onClick={() => void reminders.turnOn()}>
            {t(busy ? 'reminders.turningOn' : 'reminders.turnOn')}
          </Button>
        )
      }
      tryNow={
        on
          ? {
              title: t('reminders.settings.tryTitle'),
              children: (['morning', 'evening'] as const).map((kind) => (
                <Button
                  key={kind}
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void reminders.test(kind)}
                >
                  {t(`reminders.settings.try.${kind}`)}
                </Button>
              )),
            }
          : undefined
      }
      message={
        error
          ? { text: t(`reminders.errors.${error}`), error: true }
          : notice
            ? { text: t(`reminders.settings.${notice}`) }
            : undefined
      }
    />
  );
}
