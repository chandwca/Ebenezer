begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Only delivery details and reminder settings: no account, name or journal content.
select columns_are('ebenezer_api', 'push_subscriptions', array[
  'id', 'endpoint', 'p256dh', 'auth', 'time_zone', 'language', 'morning_time', 'evening_time',
  'discreet', 'last_morning_sent', 'last_evening_sent', 'created_at', 'updated_at'
], 'Stores no account, name or journal content');
select is(
  (select relrowsecurity from pg_class where oid = 'ebenezer_api.push_subscriptions'::regclass),
  true, 'Row level security is on');

-- The server (service role) manages subscriptions.
set local role service_role;
select lives_ok($$insert into ebenezer_api.push_subscriptions (endpoint, p256dh, auth, time_zone)
  values ('https://push.example.test/device-1', 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', 'America/Chicago')$$,
  'Server can save a subscription');
select is(
  (select row(language, morning_time, evening_time, discreet)::text from ebenezer_api.push_subscriptions),
  row('en', '07:30'::time, '20:30'::time, true)::text,
  'Defaults: English, 7:30 and 8:30 pm, discreet');
select throws_ok($$insert into ebenezer_api.push_subscriptions (endpoint, p256dh, auth, time_zone)
  values ('https://push.example.test/device-1', 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', 'Asia/Kolkata')$$,
  '23505', null, 'Each phone appears only once');
select throws_ok($$insert into ebenezer_api.push_subscriptions (endpoint, p256dh, auth, time_zone)
  values ('https://push.example.test/device-2', 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', 'Mars/Olympus')$$,
  '22023', null, 'Unknown time zones are rejected');
select throws_ok($$insert into ebenezer_api.push_subscriptions (endpoint, p256dh, auth, time_zone)
  values ('http://push.example.test/device-3', 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', 'UTC')$$,
  '23514', null, 'Only HTTPS push addresses are accepted');
select throws_ok($$update ebenezer_api.push_subscriptions set language = 'fr'$$,
  '23514', null, 'Only supported languages');
select lives_ok($$update ebenezer_api.push_subscriptions set morning_time = '06:45', discreet = false$$,
  'Server can change times and wording');
select lives_ok($$delete from ebenezer_api.push_subscriptions where endpoint = 'https://push.example.test/device-1'$$,
  'Server can remove a subscription');
select throws_ok($$select ebenezer_private.prepare_push_subscription()$$,
  '42501', null, 'Internal trigger function is not callable');

-- The app's public and signed-in keys have no direct access.
set local role anon;
select throws_ok($$select * from ebenezer_api.push_subscriptions$$,
  '42501', null, 'Anonymous read denied');
select throws_ok($$insert into ebenezer_api.push_subscriptions (endpoint, p256dh, auth, time_zone)
  values ('https://push.example.test/x', 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', 'tBHItJI5svbpez7KI4CCXg', 'UTC')$$,
  '42501', null, 'Anonymous insert denied');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select throws_ok($$select * from ebenezer_api.push_subscriptions$$,
  '42501', null, 'Signed-in read denied');
select throws_ok($$update ebenezer_api.push_subscriptions set discreet = false$$,
  '42501', null, 'Signed-in update denied');
select throws_ok($$delete from ebenezer_api.push_subscriptions$$,
  '42501', null, 'Signed-in delete denied');

select * from finish();
rollback;
