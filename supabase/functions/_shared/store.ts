// push_subscriptions through the service role: the only role allowed to read or write it.
import { createClient } from '@supabase/supabase-js';
import type { SchedulerStore } from './scheduler.ts';
import type { NewRow, Row, Store } from './subscriptions.ts';

const columns =
  'id, endpoint, p256dh, auth, time_zone, language, morning_time, evening_time, discreet, last_morning_sent, last_evening_sent';

export function createStore(url: string, serviceKey: string): Store & SchedulerStore {
  const client = createClient(url, serviceKey, {
    db: { schema: 'ebenezer_api' },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const table = () => client.from('push_subscriptions');
  const check = <T>({ data, error }: { data: T; error: unknown }) => {
    if (error) throw new Error('Reminder storage unavailable');
    return data;
  };
  return {
    async find(endpoint) {
      return (
        check(await table().select(columns).eq('endpoint', endpoint).maybeSingle()) ?? undefined
      ) as Row | undefined;
    },
    async save(row: NewRow) {
      check(await table().upsert(row, { onConflict: 'endpoint' }));
    },
    async remove(endpoint) {
      check(await table().delete().eq('endpoint', endpoint));
    },
    async all() {
      const rows: Row[] = [];
      // Paged so a growing list never exceeds the API's row limit.
      for (let from = 0; ; from += 1000) {
        const page = check(
          await table().select(columns).order('id').range(from, from + 999),
        ) as Row[];
        rows.push(...page);
        if (page.length < 1000) return rows;
      }
    },
    async mark(id, marks) {
      check(await table().update(marks).eq('id', id));
    },
    async removeById(id) {
      check(await table().delete().eq('id', id));
    },
  };
}
