-- Explicit Scripture-preview consent; legacy fuller reminders do not imply this consent.
alter table ebenezer_api.push_subscriptions
  add column scripture_preview_consent boolean not null default false,
  add column delivery_claim_token uuid,
  add column delivery_claim_until timestamptz;
update ebenezer_api.push_subscriptions set discreet = true;
alter table ebenezer_api.push_subscriptions
  add constraint preview_requires_consent check (discreet or scripture_preview_consent);

-- A short renewable-by-expiry lease prevents overlapping cron invocations from both sending.
create function ebenezer_api.claim_reminder_delivery(p_id uuid, p_kind text, p_date date, p_token uuid)
returns boolean
language plpgsql security invoker set search_path = '' as $$
declare claimed uuid;
begin
  if p_kind not in ('morning', 'evening') or p_token is null then return false; end if;
  update ebenezer_api.push_subscriptions set
    delivery_claim_token = p_token, delivery_claim_until = now() + interval '5 minutes'
  where id = p_id
    and (delivery_claim_until is null or delivery_claim_until < now())
    and ((p_kind = 'morning' and last_morning_sent is distinct from p_date)
      or (p_kind = 'evening' and last_evening_sent is distinct from p_date))
  returning id into claimed;
  return claimed is not null;
end;
$$;
revoke all on function ebenezer_api.claim_reminder_delivery(uuid, text, date, uuid) from public, anon, authenticated;
grant execute on function ebenezer_api.claim_reminder_delivery(uuid, text, date, uuid) to service_role;
notify pgrst, 'reload schema';
