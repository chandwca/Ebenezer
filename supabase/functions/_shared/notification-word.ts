import {
  notificationWordSchema,
  type NotificationWord,
} from '../../../packages/contracts/src/notifications.ts';
import type { Row } from './subscriptions.ts';
import { localNow, messageFor, type ReminderKind } from './reminders.ts';

export function createReminderPayloads(apiUrl: string | undefined, fetcher: typeof fetch = fetch) {
  const pending = new Map<string, Promise<NotificationWord | undefined>>();
  async function word(date: string) {
    if (!apiUrl) return undefined;
    if (!pending.has(date)) {
      if (pending.size >= 8) pending.delete(pending.keys().next().value!);
      pending.set(
        date,
        (async () => {
          try {
            const url = new URL(apiUrl);
            if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
              return undefined;
            const response = await fetcher(`${apiUrl.replace(/\/$/, '')}/v1/notification-word`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ date }),
              signal: AbortSignal.timeout(20000),
              redirect: 'error',
            });
            if (!response.ok) return undefined;
            const parsed = notificationWordSchema.safeParse(await response.json());
            return parsed.success && parsed.data.date === date ? parsed.data : undefined;
          } catch {
            return undefined;
          }
        })(),
      );
    }
    return pending.get(date)!;
  }
  return async (kind: ReminderKind, row: Row, now: Date) => {
    const date = localNow(row.time_zone, now).date;
    return messageFor(kind, row, await word(date));
  };
}
