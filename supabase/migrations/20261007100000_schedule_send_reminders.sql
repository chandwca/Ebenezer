-- Every 15 minutes, pg_cron asks the send-reminders Edge Function to send any morning or
-- evening reminders now due in each person's time zone (docs/notifications-setup.md).
-- The function URL and shared secret are read from Supabase Vault at run time, never stored
-- in this file. Until both Vault secrets exist each run fails harmlessly and sends nothing:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'reminders_project_url');
--   select vault.create_secret('<REMINDERS_CRON_SECRET>', 'reminders_cron_secret');
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'reminders_project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-reminders-secret', (select decrypted_secret from vault.decrypted_secrets
                             where name = 'reminders_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $job$
);
