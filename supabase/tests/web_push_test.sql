begin;

create extension if not exists pgtap with schema extensions;
select plan(15);

-- Manager A registers two devices; one of them will be reported gone.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.ok(public.register_push_subscription('https://push.example/ok/a', 'p256dh-a', 'auth-a', 'Mozilla/5.0 (Macintosh) Chrome/120') is not null, 'a device can be registered');
select extensions.ok(public.register_push_subscription('https://push.example/gone/b', 'p256dh-b', 'auth-b', 'Mozilla/5.0 (iPhone) Safari/17') is not null, 'a second device can be registered');
select extensions.is(public.register_push_subscription('https://push.example/ok/a', 'p256dh-a2', 'auth-a2', null),
  (select id from public.push_subscriptions where endpoint = 'https://push.example/ok/a'), 're-registering the same endpoint updates in place');
select extensions.is((select count(*)::int from public.push_subscriptions), 2, 'the person sees only their own devices through RLS');
reset role;

-- Another person cannot see them.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select extensions.is((select count(*)::int from public.push_subscriptions), 0, 'RLS hides other people''s devices');
reset role;

-- A notification for manager A queues one delivery per active device.
select private.notify('21000000-0000-0000-0000-000000000017', null, '10000000-0000-0000-0000-000000000001',
  'task.assigned', 'tasks', 'Push · tarefa', '{}'::jsonb, null, 'TASK', extensions.gen_random_uuid(), '/tasks/x', 'push-test:1') as notification_id \gset
select extensions.is((select count(*)::int from public.notification_deliveries d join public.notifications n on n.id = d.notification_id where n.dedupe_key = 'push-test:1' and d.status = 'pending'), 2,
  'one pending delivery per device');

-- Claiming marks rows as sending and exposes only what the sender needs.
select extensions.is((select count(*)::int from public.claim_push_deliveries(10)), 2, 'claiming returns the pending deliveries');
select extensions.is((select count(*)::int from public.claim_push_deliveries(10)), 0, 'a second claim finds nothing (no double sends)');

-- Completing: sent, and gone → subscription revoked.
select public.complete_push_delivery((select d.id from public.notification_deliveries d join public.push_subscriptions s on s.id = d.subscription_id where s.endpoint = 'https://push.example/ok/a'), 'sent', null, 201, null, false);
select public.complete_push_delivery((select d.id from public.notification_deliveries d join public.push_subscriptions s on s.id = d.subscription_id where s.endpoint = 'https://push.example/gone/b'), 'failed', 'gone', 410, null, true);
select extensions.is((select status from public.notification_deliveries d join public.push_subscriptions s on s.id = d.subscription_id where s.endpoint = 'https://push.example/ok/a'), 'sent', 'a successful delivery is recorded');
select extensions.ok((select revoked_at is not null and revoked_reason = 'gone' from public.push_subscriptions where endpoint = 'https://push.example/gone/b'), 'a gone subscription is revoked for cleanup');

-- Retry scheduling keeps the row pending for later.
select private.notify('21000000-0000-0000-0000-000000000017', null, '10000000-0000-0000-0000-000000000001',
  'task.assigned', 'tasks', 'Push · outra', '{}'::jsonb, null, 'TASK', extensions.gen_random_uuid(), '/tasks/y', 'push-test:2');
select extensions.is((select count(*)::int from public.notification_deliveries d join public.notifications n on n.id = d.notification_id where n.dedupe_key = 'push-test:2'), 1,
  'revoked devices receive no new deliveries');
select public.complete_push_delivery((select d.id from public.notification_deliveries d join public.notifications n on n.id = d.notification_id where n.dedupe_key = 'push-test:2'), 'failed', 'service unavailable', 503, 60, false);
select extensions.ok((select status = 'pending' and available_at > now() from public.notification_deliveries d join public.notifications n on n.id = d.notification_id where n.dedupe_key = 'push-test:2'),
  'a retry keeps the delivery pending until later');

-- Push disabled by preference: nothing is queued.
insert into public.notification_preferences (profile_id, push_enabled) values ('21000000-0000-0000-0000-000000000017', false);
select private.notify('21000000-0000-0000-0000-000000000017', null, '10000000-0000-0000-0000-000000000001',
  'task.assigned', 'tasks', 'Push · silenciosa', '{}'::jsonb, null, 'TASK', extensions.gen_random_uuid(), '/tasks/z', 'push-test:3');
select extensions.is((select count(*)::int from public.notification_deliveries d join public.notifications n on n.id = d.notification_id where n.dedupe_key = 'push-test:3'), 0,
  'push disabled in preferences queues nothing');

-- The person can revoke a device; the server-only functions are not callable by browsers.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.ok(public.revoke_push_subscription('https://push.example/ok/a'), 'a person revokes their own device');
reset role;
select extensions.ok(not has_function_privilege('authenticated', 'public.claim_push_deliveries(integer)', 'execute'), 'browsers cannot claim deliveries');

select * from extensions.finish();
rollback;
