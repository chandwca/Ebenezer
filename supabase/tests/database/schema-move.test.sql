begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- Rehearse the deployed migration with existing data; rollback restores the migrated stack.
alter table ebenezer_api.profiles set schema public;
alter function ebenezer_private.set_profile_updated_at() set schema public;
insert into auth.users (id, email) values
  ('33333333-3333-4333-8333-333333333333', 'migration@example.test');
insert into public.profiles (id, display_name, handle, created_at, updated_at) values
  ('33333333-3333-4333-8333-333333333333', 'Existing person', 'existing_person', '2000-01-01', '2000-01-01');
create temporary table before_move as select
  'public.profiles'::regclass::oid as table_id,
  'public.set_profile_updated_at()'::regprocedure::oid as function_id,
  (select jsonb_agg(to_jsonb(p) order by id) from public.profiles p) as rows,
  (select array_agg(oid order by oid) from pg_constraint where conrelid = 'public.profiles'::regclass) as constraints,
  (select array_agg(indexrelid order by indexrelid) from pg_index where indrelid = 'public.profiles'::regclass) as indexes,
  (select oid from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'profiles_updated_at') as trigger_id,
  (select relacl::text from pg_class where oid = 'public.profiles'::regclass) as grants,
  (select jsonb_agg(jsonb_build_array(attname, attacl::text) order by attnum) from pg_attribute where attrelid = 'public.profiles'::regclass and attnum > 0 and not attisdropped) as column_grants;

\ir ../../migrations/20261006185220_organize_ebenezer_schemas.sql

select is((select jsonb_agg(to_jsonb(p) order by id) from ebenezer_api.profiles p), (select rows from before_move), 'All existing rows and values survive');
select is('ebenezer_api.profiles'::regclass::oid, (select table_id from before_move), 'Same table object is moved');
select is((select array_agg(oid order by oid) from pg_constraint where conrelid = 'ebenezer_api.profiles'::regclass), (select constraints from before_move), 'Foreign key, unique and check constraints survive');
select is((select array_agg(indexrelid order by indexrelid) from pg_index where indrelid = 'ebenezer_api.profiles'::regclass), (select indexes from before_move), 'Indexes survive');
select is((select oid from pg_trigger where tgrelid = 'ebenezer_api.profiles'::regclass and tgname = 'profiles_updated_at'), (select trigger_id from before_move), 'Trigger identity survives');
select is('ebenezer_private.set_profile_updated_at()'::regprocedure::oid, (select function_id from before_move), 'Same helper function is moved');
select is((select relacl::text from pg_class where oid = 'ebenezer_api.profiles'::regclass), (select grants from before_move), 'Table grants survive');
select is((select jsonb_agg(jsonb_build_array(attname, attacl::text) order by attnum) from pg_attribute where attrelid = 'ebenezer_api.profiles'::regclass and attnum > 0 and not attisdropped), (select column_grants from before_move), 'Column grants survive');
select ok((select relrowsecurity from pg_class where oid = 'ebenezer_api.profiles'::regclass), 'RLS stays enabled');
select is((select count(*) from pg_policy where polrelid = 'ebenezer_api.profiles'::regclass), 3::bigint, 'All owner policies remain');
select is(to_regclass('public.profiles'), null::regclass, 'No old table or compatibility view remains');
select ok(not has_schema_privilege('authenticated', 'ebenezer_private', 'USAGE'), 'Internal schema stays inaccessible');

create table ebenezer_api.default_grant_probe (id integer);
select ok(not has_table_privilege('authenticated', 'ebenezer_api.default_grant_probe', 'SELECT'), 'New API tables require explicit grants');
create function ebenezer_private.default_grant_probe() returns boolean language sql as $$select true$$;
select ok(not has_function_privilege('authenticated', 'ebenezer_private.default_grant_probe()', 'EXECUTE'), 'New internal functions have no default execution grant');

set local role authenticated;
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);
update ebenezer_api.profiles set display_name = 'Updated person' where handle = 'existing_person';
select ok((select updated_at > '2000-01-01'::timestamptz from ebenezer_api.profiles where handle = 'existing_person'), 'Moved trigger updates timestamps for the owner');
select * from finish();
rollback;
