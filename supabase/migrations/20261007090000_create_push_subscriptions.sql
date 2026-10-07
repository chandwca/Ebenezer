-- Morning and evening reminders (docs/notifications-setup.md).
-- One row per phone or browser that turned reminders on. No account, name or journal content:
-- only where to deliver, when, and in which language. Turning reminders off deletes the row.
-- Server-only: RLS is on with no policies and only service_role has table grants, so the app's
-- anon/authenticated keys cannot read or write it. Edge Functions use the service role.
create table ebenezer_api.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  -- The push service's delivery address for this device, and its encryption keys.
  endpoint text not null unique
    check (endpoint ~ '^https://' and length(endpoint) <= 2048),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]+=*$' and length(p256dh) between 40 and 200),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]+=*$' and length(auth) between 8 and 100),
  -- IANA name such as 'America/Chicago', checked by the trigger below.
  time_zone text not null check (length(time_zone) between 1 and 64),
  language text not null default 'en' check (language in ('en', 'es')),
  morning_time time not null default '07:30',
  evening_time time not null default '20:30',
  -- Lock-screen text says only "A moment for you" unless she chooses fuller wording.
  discreet boolean not null default true,
  -- Local dates of the last reminders sent, so each is sent at most once a day.
  last_morning_sent date,
  last_evening_sent date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ebenezer_api.push_subscriptions is
  'Server-only Web Push reminder settings per device. No account, name or journal content.';

create function ebenezer_private.prepare_push_subscription()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Reject unknown time zones here so the scheduler never meets one.
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Unknown time zone' using errcode = '22023';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function ebenezer_private.prepare_push_subscription()
  from public, anon, authenticated, service_role;

create trigger push_subscriptions_prepare
  before insert or update on ebenezer_api.push_subscriptions
  for each row execute function ebenezer_private.prepare_push_subscription();

alter table ebenezer_api.push_subscriptions enable row level security;
revoke all on table ebenezer_api.push_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on table ebenezer_api.push_subscriptions to service_role;

notify pgrst, 'reload schema';
