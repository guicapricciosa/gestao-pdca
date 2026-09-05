begin;

create extension if not exists pgtap with schema extensions;
select plan(4);

insert into public.notifications (id, company_id, recipient_profile_id, type, category, title, target_kind, target_id, href, dedupe_key, created_at, read_at)
values
  ('c0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'test', 'tasks', 'antiga lida', 'TASK', '00000000-0000-4000-8000-000000000001', '/tasks', 'r1', now() - interval '200 days', now() - interval '100 days'),
  ('c0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'test', 'tasks', 'antiga por ler', 'TASK', '00000000-0000-4000-8000-000000000002', '/tasks', 'r2', now() - interval '200 days', null),
  ('c0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'test', 'tasks', 'recente lida', 'TASK', '00000000-0000-4000-8000-000000000003', '/tasks', 'r3', now() - interval '10 days', now() - interval '5 days');

select extensions.ok(
  (select notifications from public.purge_old_records()) >= 2,
  'old read and very old unread notifications are purged'
);
select extensions.is((select count(*)::integer from public.notifications where id = 'c0000000-0000-0000-0000-000000000003'), 1, 'recent notifications stay');
select extensions.is((select count(*)::integer from public.notifications where id in ('c0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000002')), 0, 'old ones are gone');
select extensions.ok(not has_function_privilege('authenticated', 'public.purge_old_records()', 'execute'), 'only the scheduler runs the purge');

select * from finish();
rollback;
