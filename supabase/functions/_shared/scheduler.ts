// The 15-minute reminder run: send each due reminder once, mark it, forget phones that are gone.
import type { Delivery, Target, Vapid } from './push.ts';
import { dueReminder, messageFor, type Payload } from './reminders.ts';
import type { Row } from './subscriptions.ts';

export interface SchedulerStore {
  all(): Promise<Row[]>;
  mark(id: string, marks: { last_morning_sent?: string; last_evening_sent?: string }): Promise<void>;
  removeById(id: string): Promise<void>;
}

export type SchedulerDeps = {
  store: SchedulerStore;
  vapid: Vapid;
  deliver: (target: Target, payload: Payload, vapid: Vapid) => Promise<Delivery>;
  now: () => Date;
  concurrency?: number;
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
      const delivery = await deps.deliver(row, messageFor(reminder.kind, row), deps.vapid);
      totals[delivery]++;
      if (delivery === 'gone') await deps.store.removeById(row.id);
      else if (delivery === 'sent') await deps.store.mark(row.id, reminder.marks);
      // A failed delivery stays unmarked, so the next run retries it within the send window.
    }
  }
  await Promise.all(Array.from({ length: Math.min(deps.concurrency ?? 10, due.length) }, worker));
  return totals;
}
