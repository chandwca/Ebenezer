-- Daily morning and evening reminders (docs/notifications-setup.md).
-- pg_cron runs the reminder job on a schedule inside the database; pg_net lets that job call
-- the send-reminders Edge Function over HTTPS. Both are included in Supabase's free plan.
-- The job itself is scheduled in a later migration, once the function exists.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
