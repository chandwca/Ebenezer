begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test');
insert into ebenezer_api.profiles (id, display_name, handle) values
  ('11111111-1111-4111-8111-111111111111', 'Alice', 'alice'),
  ('22222222-2222-4222-8222-222222222222', 'Bob', 'bob');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select is((select count(*) from ebenezer_api.profiles), 1::bigint, 'Alice sees only her profile');
select is((select count(*) from ebenezer_api.profiles where handle = 'bob'), 0::bigint, 'Bob is hidden');
with changed as (update ebenezer_api.profiles set display_name = 'Stolen' where handle = 'bob' returning id)
select is((select count(*) from changed), 0::bigint, 'Cannot update Bob');
select lives_ok($$update ebenezer_api.profiles set display_name = 'Alicia' where handle = 'alice'$$, 'Owner can update');
select is((select display_name from ebenezer_api.profiles), 'Alicia', 'Owner update persisted');
select throws_ok($$insert into ebenezer_api.profiles (id, display_name, handle) values ('22222222-2222-4222-8222-222222222222', 'Fake', 'fake')$$, '42501', null, 'Cannot insert someone else profile');
select throws_ok($$update ebenezer_api.profiles set id = '22222222-2222-4222-8222-222222222222'$$, '42501', null, 'Cannot change account ID');
select throws_ok($$update ebenezer_api.profiles set updated_at = '2000-01-01'$$, '42501', null, 'Cannot supply server timestamps');
select throws_ok($$update ebenezer_api.profiles set handle = 'UPPER CASE'$$, '23514', null, 'Handle constraint cannot be bypassed');
select throws_ok($$delete from ebenezer_api.profiles$$, '42501', null, 'No unimplemented delete permission');

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is((select handle from ebenezer_api.profiles), 'bob', 'Bob has independent owner access');
select throws_ok($$update ebenezer_api.profiles set handle = 'alice'$$, '23505', null, 'Handles are unique across owners');
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*) from ebenezer_api.profiles), 0::bigint, 'Missing identity grants no rows');

-- A guest Auth token still uses authenticated, but cannot access community profiles.
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","is_anonymous":true}', true);
select is((select count(*) from ebenezer_api.profiles), 0::bigint, 'Guest Auth cannot read a profile');
with changed as (update ebenezer_api.profiles set display_name = 'Guest edit' returning id)
select is((select count(*) from changed), 0::bigint, 'Guest Auth cannot update a profile');
select throws_ok($$insert into ebenezer_api.profiles (id, display_name, handle) values ('11111111-1111-4111-8111-111111111111', 'Guest', 'guest')$$, '42501', null, 'Guest Auth cannot insert a profile');
select throws_ok($$select ebenezer_private.set_profile_updated_at()$$, '42501', null, 'Internal helper is inaccessible');

set local role anon;
select throws_ok($$select * from ebenezer_api.profiles$$, '42501', null, 'Anonymous direct read denied');
select throws_ok($$insert into ebenezer_api.profiles (id, display_name, handle) values ('11111111-1111-4111-8111-111111111111', 'Fake', 'fake')$$, '42501', null, 'Anonymous direct insert denied');

select * from finish();
rollback;
