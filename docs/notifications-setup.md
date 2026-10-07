# Notifications setup

Ebenezer sends a gentle morning and evening reminder with standard Web Push. Supabase schedules
and sends them; the app needs no account, and no journal content is ever sent or stored.

## 1. Signing keys (VAPID)

Push services (Google, Apple, Mozilla) only deliver notifications signed by the app's private
key. The matching public key is built into the web app.

Generate a pair **once** and keep it. New keys stop every existing subscription, so every
student would have to turn reminders on again. Keep a copy in a password manager.

```sh
npx web-push generate-vapid-keys
```

| Value | Where it lives | Secret? |
| --- | --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | `apps/web/.env` (and Cloudflare Pages environment variables) | No |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | `supabase/functions/.env` (git-ignored), then Supabase secrets | **Yes** |

`VAPID_SUBJECT` is a contact push services can use if something goes wrong: a `mailto:` address
or the app's `https:` URL.

Upload the secrets to the hosted project:

```sh
pnpm exec supabase secrets set --env-file supabase/functions/.env
```

## 2. Scheduling extensions

Migration `20261007080000_enable_reminder_scheduling.sql` enables `pg_cron` (runs the reminder
job every 15 minutes inside the database) and `pg_net` (lets that job call the sending function).
Both are included in the free plan.

```sh
pnpm db:migrate                         # local
pnpm exec supabase db push --dry-run    # hosted: review first
pnpm exec supabase db push              # hosted: apply
```

Local Edge Functions need the `edge-runtime` service, which the lighter start command in
`supabase-setup.md` excludes. Start it when working on the sending functions.

## Reminder settings table

Migration `20261007090000_create_push_subscriptions.sql` creates
`ebenezer_api.push_subscriptions`: one row per phone that turned reminders on, holding its push
address and keys, time zone, language, morning and evening times, discreet wording, and the
local dates of the last reminders sent. It stores no account, name or journal content, and
turning reminders off deletes the row. Only the server (`service_role`, used by Edge Functions)
can read or write it; the app's public and signed-in keys are denied.
`supabase/tests/database/push-subscriptions.test.sql` checks these rules (`pnpm db:test`).

## Reminder functions

Two Supabase Edge Functions in `supabase/functions/`, sharing code in `_shared/`:

| Function | Called by | Does |
| --- | --- | --- |
| `push-subscription` | The app (no account) | `save` her settings (welcome notification the first time), `test` a morning or evening reminder now, or `remove` to turn reminders off. The phone's push address proves the request is hers. Requests are validated and rate-limited. |
| `send-reminders` | pg_cron every 15 minutes | Sends each reminder due in her time zone once a day (within 3 hours of her time), retries failed deliveries on the next run, and deletes phones the push service reports gone. Requires the `x-reminders-secret` header. |

Wording is discreet by default ("A moment for you") and never contains journal content.
Morning reminders open Today; evening reminders open "Bring your day".

Migration `20261007100000_schedule_send_reminders.sql` schedules the run. It reads the function
URL and shared secret from Supabase Vault, so neither is in the code:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'reminders_project_url');
select vault.create_secret('<REMINDERS_CRON_SECRET from supabase/functions/.env>', 'reminders_cron_secret');
```

Deploy and check:

```sh
pnpm exec supabase secrets set --env-file supabase/functions/.env
pnpm exec supabase functions deploy push-subscription
pnpm exec supabase functions deploy send-reminders
pnpm test:functions        # timing, wording, requests, scheduler, encryption round trip
pnpm typecheck:functions
pnpm exec supabase functions serve --env-file supabase/functions/.env   # local runtime
```

## In the app

- **Today** shows "A gentle reminder, twice a day" (7:30 AM and 8:30 PM by default) with
  **Turn on reminders** and **Not now**. The browser's permission prompt appears only after the
  tap. Once allowed, the welcome notification arrives and the card confirms. "Not now" is asked
  once more after her next stone, then never again.
- **iPhone in a Safari tab** sees the Add to Home Screen steps instead; **blocked** notifications
  show how to allow them; browsers without Web Push show nothing on Today.
- **Settings › Reminders**: on/off, morning and evening times, discreet wording (on by default),
  and **Try a reminder now** (morning or evening). A language change is passed on automatically.
- Settings live on the device (IndexedDB key `reminders`). The service worker shows each
  reminder and, when tapped, routes the open app to Today or "Bring your day" without reloading.
- Code: `apps/web/src/features/reminders/`, `apps/web/tooling/service-worker.ts`.

Try it on a computer (the service worker runs in the production build only):

```sh
pnpm build
pnpm --filter @ebenezer/web preview --host localhost --port 4173
```

## 3. HTTPS

Phones only allow notifications from an HTTPS site. Desktop Chrome also allows
`http://localhost` for development. iPhones need iOS 16.4 or later, with Ebenezer added to the
Home Screen.

## Free-plan reminder

Supabase pauses free projects after a week without activity, and a paused project sends no
reminders. Open the project before a demo.
