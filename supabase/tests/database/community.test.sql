begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- Alice, Bob and Carol have community profiles; Dave only has an account.
insert into auth.users (id, email) values
  ('11111111-1111-4111-8111-111111111111', 'alice@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'bob@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'carol@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'dave@example.test');
insert into ebenezer_api.profiles (id, display_name, handle) values
  ('11111111-1111-4111-8111-111111111111', 'Alice', 'alice'),
  ('22222222-2222-4222-8222-222222222222', 'Bob', 'bob'),
  ('33333333-3333-4333-8333-333333333333', 'Carol', 'carol');

create function pg_temp.act_as(person text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', person, true),
         set_config('request.jwt.claims', json_build_object('sub', person)::text, true);
$$;
create function pg_temp.saved(name text) returns uuid language sql as $$
  select current_setting('test.' || name)::uuid
$$;
grant execute on function pg_temp.act_as(text), pg_temp.saved(text) to authenticated, anon;

-- Access boundaries ------------------------------------------------------------------------
set local role anon;
select throws_ok($$select ebenezer_api.feed()$$, '42501', null, 'Signed-out callers cannot read the feed');
set local role authenticated;
select pg_temp.act_as('44444444-4444-4444-8444-444444444444');
select throws_ok($$select ebenezer_api.feed()$$, 'EB428', null, 'An account without a profile must create one first');
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select throws_ok($$select * from ebenezer_api.posts$$, '42501', null, 'Tables are not directly readable');
select throws_ok($$insert into ebenezer_api.groups (owner_id, name, visibility) values (auth.uid(), 'x', 'open')$$,
  '42501', null, 'Tables are not directly writable');
select throws_ok($$select ebenezer_private.can_see_post(null, null)$$, '42501', null, 'Private helpers are not callable');

-- Community posts ----------------------------------------------------------------------------
select set_config('test.community_post', (ebenezer_api.create_post('experience', 'community', 'God was faithful.') ->> 'id'), true);
select is(jsonb_array_length(ebenezer_api.feed()), 1, 'Author sees their community post');
select is((ebenezer_api.feed() -> 0 ->> 'isOwn')::boolean, true, 'Author is told the post is theirs');
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select is(ebenezer_api.feed() -> 0 ->> 'body', 'God was faithful.', 'Another member sees community posts');
select is((ebenezer_api.feed() -> 0 ->> 'isOwn')::boolean, false, 'Not marked as theirs');
select throws_ok($$select ebenezer_api.update_post(pg_temp.saved('community_post'), 'Hijacked')$$, 'P0002', null, 'Only the author edits');
select throws_ok($$select ebenezer_api.create_post('experience', 'community', '   ')$$, '23514', null, 'Empty body is rejected');
select throws_ok($$select ebenezer_api.create_post('stone', 'community', 'No verse')$$, '23514', null, 'A stone needs Scripture');

-- Prayers and comments -------------------------------------------------------------------------
select is((ebenezer_api.set_prayer(pg_temp.saved('community_post'), true) ->> 'prayerCount')::int, 1, 'Praying increments the count');
select is((ebenezer_api.set_prayer(pg_temp.saved('community_post'), true) ->> 'prayerCount')::int, 1, 'Praying twice is idempotent');
select set_config('test.comment', (ebenezer_api.add_comment(pg_temp.saved('community_post'), 'Amen!') ->> 'id'), true);
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select is(jsonb_array_length(ebenezer_api.list_comments(pg_temp.saved('community_post'))), 1, 'Members read comments');
select throws_ok($$select ebenezer_api.delete_comment(pg_temp.saved('comment'))$$, 'P0002', null, 'Others cannot delete a comment');
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select is(ebenezer_api.feed() -> 0 -> 'prayingNames', '["Bob"]'::jsonb, 'Author sees who is praying');
select is((ebenezer_api.feed() -> 0 ->> 'commentCount')::int, 1, 'Comment counter is maintained');
select lives_ok($$select ebenezer_api.delete_comment(pg_temp.saved('comment'))$$, 'The post author can remove a comment');
select is((ebenezer_api.feed() -> 0 ->> 'commentCount')::int, 0, 'Counter decrements');

-- Private groups ----------------------------------------------------------------------------
select set_config('test.group', (ebenezer_api.create_group('Thursday study', 'Our study', null, 'private') ->> 'id'), true);
select set_config('test.group_post', (ebenezer_api.create_post('experience', 'group', 'Group only', pg_temp.saved('group')) ->> 'id'), true);
select throws_ok($$select ebenezer_api.leave_group(pg_temp.saved('group'))$$, '55000', null, 'The owner cannot leave');
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select is(jsonb_array_length(ebenezer_api.feed()), 1, 'Nonmembers do not see group posts');
select throws_ok($$select ebenezer_api.join_group(pg_temp.saved('group'))$$, 'P0002', null, 'Private groups cannot be joined uninvited');
select throws_ok($$select ebenezer_api.list_group_members(pg_temp.saved('group'))$$, 'P0002', null, 'Nonmembers cannot read the roster');
select throws_ok($$select ebenezer_api.create_post('experience', 'group', 'Sneaky', pg_temp.saved('group'))$$, '42501', null, 'Nonmembers cannot post to a group');
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select ebenezer_api.invite_to_group(pg_temp.saved('group'), '22222222-2222-4222-8222-222222222222');
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select is(ebenezer_api.join_group(pg_temp.saved('group')) ->> 'memberCount', '2', 'Accepting an invitation joins the group');
select is(jsonb_array_length(ebenezer_api.feed(p_group => pg_temp.saved('group'))), 1, 'Members read group posts');
select throws_ok($$select ebenezer_api.invite_to_group(pg_temp.saved('group'), '33333333-3333-4333-8333-333333333333')$$, '42501', null, 'Ordinary members cannot invite');

-- Direct posts need friendship ------------------------------------------------------------------
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select throws_ok($$select ebenezer_api.create_post('prayer_request', 'people', 'Pray for Dad', null, null, null, null, array['22222222-2222-4222-8222-222222222222'::uuid])$$,
  '42501', null, 'Direct shares require friendship');
select set_config('test.connection', (ebenezer_api.request_connection('22222222-2222-4222-8222-222222222222') ->> 'id'), true);
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select is(ebenezer_api.respond_connection(pg_temp.saved('connection'), true) ->> 'status', 'accepted', 'Recipient accepts');
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select set_config('test.direct_post', (ebenezer_api.create_post('prayer_request', 'people', 'Pray for Dad', null, null, null, null, array['22222222-2222-4222-8222-222222222222'::uuid]) ->> 'id'), true);
select pg_temp.act_as('33333333-3333-4333-8333-333333333333');
select throws_ok($$select ebenezer_api.set_prayer(pg_temp.saved('direct_post'), true)$$, 'P0002', null, 'Non-recipients cannot see a direct post');
select pg_temp.act_as('22222222-2222-4222-8222-222222222222');
select is((ebenezer_api.set_prayer(pg_temp.saved('direct_post'), true) ->> 'audience'), 'people', 'The recipient sees and prays');
select ebenezer_api.remove_connection(pg_temp.saved('connection'));
select throws_ok($$select ebenezer_api.set_prayer(pg_temp.saved('direct_post'), false)$$, 'P0002', null, 'Unfriending revokes direct access');

-- Prayer links for people without an account -------------------------------------------------------
select pg_temp.act_as('11111111-1111-4111-8111-111111111111');
select set_config('test.token', (ebenezer_api.create_prayer_link(pg_temp.saved('direct_post'), 'Mom') ->> 'token'), true);
set local role anon;
select is(ebenezer_api.open_prayer_link(current_setting('test.token')) ->> 'authorName', 'Alice', 'Mom opens the link without an account');
select is(ebenezer_api.answer_prayer_link(current_setting('test.token'), 'Praying, love you') ->> 'answered', 'true', 'Mom answers');
select throws_ok($$select ebenezer_api.open_prayer_link(repeat('0', 64))$$, 'P0002', null, 'A guessed token reveals nothing');
set local role authenticated;
select ok((select p -> 'prayingNames' from jsonb_array_elements(ebenezer_api.feed()) p where p ->> 'id' = pg_temp.saved('direct_post')::text)
  ? 'Mom', 'The author sees Mom praying');
select ebenezer_api.delete_post(pg_temp.saved('direct_post'));
set local role anon;
select throws_ok($$select ebenezer_api.open_prayer_link(current_setting('test.token'))$$, 'P0002', null, 'Withdrawing a post closes its links');

select * from finish();
rollback;
