import * as React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { db } from '@/db/database';
import {
  REMINDERS_KEY,
  ReminderError,
  parseReminders,
  reminderSupport,
  sendTestReminder,
  storeReminders,
  turnOffReminders,
  turnOnReminders,
  updateReminders,
  type ReminderSettings,
} from './reminders';

export type ReminderStatus = 'loading' | 'unsupported' | 'install-first' | 'blocked' | 'off' | 'on';
type ErrorCode = ReminderError['code'];

/** Shared by the Today invitation and Settings; both read the same local settings live. */
export function useReminders() {
  const { i18n } = useTranslation();
  const language: 'en' | 'es' = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  const stored = useLiveQuery(async () => {
    try {
      return parseReminders((await db.preferences.get(REMINDERS_KEY))?.value);
    } catch {
      return parseReminders(undefined);
    }
  });
  const support = React.useMemo(reminderSupport, []);
  const [permission, setPermission] = React.useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<ErrorCode>();
  const [notice, setNotice] = React.useState<'sent' | 'saved'>();

  const status: ReminderStatus = !stored
    ? 'loading'
    : support !== 'available'
      ? support
      : stored.enabled
        ? 'on'
        : permission === 'denied'
          ? 'blocked'
          : 'off';

  /** Resolves true when the work succeeded. */
  async function run(work: () => Promise<void>, success?: 'sent' | 'saved') {
    if (busy) return false;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await work();
      if (success) setNotice(success);
      return true;
    } catch (caught) {
      setError(caught instanceof ReminderError ? caught.code : 'failed');
      return false;
    } finally {
      if (typeof Notification !== 'undefined') setPermission(Notification.permission);
      setBusy(false);
    }
  }

  const settings = stored ?? parseReminders(undefined);

  // Reminders follow the app language: pass a change on to the server.
  React.useEffect(() => {
    if (!stored?.enabled || stored.language === language) return;
    void updateReminders(stored, language)
      .then(() => storeReminders({ ...stored, language }))
      .catch(() => undefined);
  }, [stored, language]);

  return {
    status,
    settings,
    busy,
    error,
    notice,
    /** Call directly from a tap. */
    turnOn: () =>
      run(async () => {
        await turnOnReminders(settings, language);
        // Turned on: the invitation is never shown again.
        await storeReminders({ ...settings, dismissed: undefined, enabled: true, language });
      }),
    turnOff: () =>
      run(async () => {
        await turnOffReminders();
        await storeReminders({ ...settings, enabled: false, dismissed: 'after-stone' });
      }),
    /** Change times or wording; saved on the server too when reminders are on. */
    change: (next: Partial<ReminderSettings>) =>
      run(async () => {
        const updated = { ...settings, ...next };
        if (updated.enabled) await updateReminders(updated, language);
        await storeReminders({ ...updated, ...(updated.enabled ? { language } : {}) });
      }, 'saved'),
    test: (kind: 'morning' | 'evening') => run(() => sendTestReminder(kind), 'sent'),
    dismiss: () =>
      storeReminders({
        ...settings,
        dismissed: settings.dismissed ? 'after-stone' : 'once',
      }).catch(() => undefined),
  };
}
