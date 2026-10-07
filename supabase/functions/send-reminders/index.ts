// Called every 15 minutes by pg_cron (migration 20261007100000) with a shared secret.
import { deliver, vapidFromEnv } from '../_shared/push.ts';
import { json, sameSecret } from '../_shared/http.ts';
import { runReminders } from '../_shared/scheduler.ts';
import { createStore } from '../_shared/store.ts';

const store = createStore(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!sameSecret(request.headers.get('x-reminders-secret'), Deno.env.get('REMINDERS_CRON_SECRET')))
    return json({ error: 'forbidden' }, 403);
  const vapid = vapidFromEnv((name) => Deno.env.get(name));
  if (!vapid) return json({ error: 'unavailable' }, 503);
  try {
    return json(await runReminders({ store, vapid, deliver, now: () => new Date() }), 200);
  } catch {
    return json({ error: 'unavailable' }, 503);
  }
});
