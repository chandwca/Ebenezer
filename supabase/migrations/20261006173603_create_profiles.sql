-- Public schema means Data API accessible, not publicly readable.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  handle text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_valid check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 120
  ),
  constraint profiles_handle_valid check (handle ~ '^[a-z0-9][a-z0-9_]{2,29}$')
);

alter table public.profiles enable row level security;

-- Be explicit even on projects where public tables receive default grants.
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, display_name, handle) on public.profiles to authenticated;
grant update (display_name, handle) on public.profiles to authenticated;

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_create_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_profile_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_profile_updated_at();

comment on table public.profiles is
  'Owner-only account profiles. Discovery requires a separate reviewed migration.';
