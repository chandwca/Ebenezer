import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ReminderInvite } from '@/components/ui/reminder-invite';
import { ReminderSettingsPanel } from '@/components/ui/reminder-settings';
import { useReminders } from './use-reminders';
import * as React from 'react';
import { ScripturePreviewConsent } from '@/components/ui/scripture-preview-consent';

/** Settings › Reminders: on/off, times, discreet wording, and trying a reminder now. */
export function ReminderPreferences() {
  const { t } = useTranslation('settings');
  const reminders = useReminders();
  const [askPreview, setAskPreview] = React.useState(false);
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
    <>
      <ReminderSettingsPanel
        title={t('reminders.settings.title')}
        description={t('reminders.settings.description', {
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })}
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
          onChange: (value) =>
            value
              ? void reminders.change({ discreet: true, scripturePreviewConsent: false })
              : setAskPreview(true),
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
      {askPreview && (
        <ScripturePreviewConsent
          title={t('reminders.settings.previewTitle')}
          description={t('reminders.settings.previewDescription')}
          allow={t('reminders.settings.previewAllow')}
          cancel={t('reminders.settings.previewCancel')}
          busy={busy}
          error={error ? t(`reminders.errors.${error}`) : undefined}
          onCancel={() => setAskPreview(false)}
          onAllow={() => {
            void reminders
              .change({ discreet: false, scripturePreviewConsent: true })
              .then((saved) => {
                if (saved) setAskPreview(false);
              });
          }}
        />
      )}
    </>
  );
}
