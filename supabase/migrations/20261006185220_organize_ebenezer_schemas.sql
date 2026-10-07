-- Move deployed objects in place: preserve row IDs, constraints, grants and trigger bindings.
create schema if not exists ebenezer_api;
create schema if not exists ebenezer_private;

revoke all on schema ebenezer_api from public, anon, authenticated, service_role;
grant usage on schema ebenezer_api to authenticated, service_role;
revoke all on schema ebenezer_private from public, anon, authenticated, service_role;

-- PostgreSQL's global PUBLIC function default cannot be revoked per schema.
-- Future postgres-owned functions require explicit execution grants.
alter default privileges for role postgres
  revoke execute on functions from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema ebenezer_api
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema ebenezer_api
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema ebenezer_api
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema ebenezer_private
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema ebenezer_private
  revoke execute on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema ebenezer_private
  revoke all on sequences from anon, authenticated, service_role;

alter table public.profiles set schema ebenezer_api;
alter function public.set_profile_updated_at() set schema ebenezer_private;

-- Guest Auth sessions use the authenticated role too. Align database access with Node.
alter policy profiles_read_own on ebenezer_api.profiles
  using (id = (select auth.uid()) and not coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false));
alter policy profiles_create_own on ebenezer_api.profiles
  with check (id = (select auth.uid()) and not coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false));
alter policy profiles_update_own on ebenezer_api.profiles
  using (id = (select auth.uid()) and not coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false))
  with check (id = (select auth.uid()) and not coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false));

notify pgrst, 'reload schema';
