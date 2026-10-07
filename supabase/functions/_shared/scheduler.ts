// The 15-minute reminder run: send each due reminder once, mark it, forget phones that are gone.
import type { Delivery, Target, Vapid } from './push.ts';
import { dueReminder, messageFor, type Payload } from './reminders.ts';
import type { Row } from './subscriptions.ts';

export interface SchedulerStore {
  find(endpoint: string): Promise<Row | undefined>;
  all(): Promise<Row[]>;
  mark(
    id: string,
    marks: { last_morning_sent?: string; last_evening_sent?: string },
  ): Promise<void>;
  claim(id: string, kind: 'morning' | 'evening', date: string, token: string): Promise<boolean>;
  finish(
    id: string,
    token: string,
    marks: { last_morning_sent?: string; last_evening_sent?: string },
  ): Promise<void>;
  release(id: string, token: string): Promise<void>;
  removeById(id: string): Promise<void>;
}

export type SchedulerDeps = {
  store: SchedulerStore;
  vapid: Vapid;
  deliver: (target: Target, payload: Payload, vapid: Vapid) => Promise<Delivery>;
  now: () => Date;
  concurrency?: number;
  payloadFor?: (kind: 'morning' | 'evening', row: Row, now: Date) => Promise<Payload>;
};

export async function runReminders(deps: SchedulerDeps) {
  const now = deps.now();
  const due = (await deps.store.all()).flatMap((row) => {
    const reminder = dueReminder(row, now);
    return reminder ? [{ row, reminder }] : [];
  });
  const totals = { due: due.length, sent: 0, gone: 0, failed: 0 };
  let next = 0;
  async function worker() {
    while (next < due.length) {
      const { row, reminder } = due[next++];
      const token = crypto.randomUUID();
      if (!(await deps.store.claim(row.id, reminder.kind, reminder.date, token))) continue;
      try {
        const payload = deps.payloadFor
          ? await deps.payloadFor(reminder.kind, row, now)
          : messageFor(reminder.kind, row);
        // Recheck after preparation: an outage must not turn a late reminder into a backlog.
        const latest = await deps.store.find(row.endpoint);
        const latestDue = latest ? dueReminder(latest, deps.now()) : undefined;
        if (
          !latest ||
          latestDue?.kind !== reminder.kind ||
          latestDue.date !== reminder.date ||
          latest.time_zone !== row.time_zone ||
          latest.language !== row.language ||
          latest.discreet !== row.discreet ||
          latest.scripture_preview_consent !== row.scripture_preview_consent
        ) {
          await deps.store.release(row.id, token);
          continue;
        }
        const delivery = await deps.deliver(latest, payload, deps.vapid);
        totals[delivery]++;
        if (delivery === 'gone') await deps.store.removeById(row.id);
        else if (delivery === 'sent') await deps.store.finish(row.id, token, reminder.marks);
        else await deps.store.release(row.id, token);
      } catch {
        totals.failed++;
        await deps.store.release(row.id, token);
      }
      // A failed delivery stays unmarked, so the next run retries it within the send window.
    }
  }
  await Promise.all(Array.from({ length: Math.min(deps.concurrency ?? 10, due.length) }, worker));
  return totals;
}
