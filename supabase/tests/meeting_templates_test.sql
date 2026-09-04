begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

-- CEO (Global Executive) manages templates; manager A (0017) can only read.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
set local role authenticated;
select extensions.ok(public.save_meeting_template(null, 1, '10000000-0000-0000-0000-000000000001', 'Reunião de Direção', 60, 'MANAGEMENT', 'NORMAL',
  array['21000000-0000-0000-0000-000000000017']::uuid[], array['30000000-0000-0000-0000-000000000001']::uuid[], array[]::uuid[], true,
  '["Operações","Comercial","Marketing"]'::jsonb, '{"freq":"WEEKLY","interval":1,"weekdays":[1],"end":{"kind":"never"}}'::jsonb) is not null,
  'an executive creates a template');
select extensions.is((select count(*)::int from public.meeting_templates where name = 'Reunião de Direção'), 1, 'the template is visible to its creator');
select extensions.throws_ok(
  $$ select public.save_meeting_template(null, 1, '10000000-0000-0000-0000-000000000001', 'x', 60, 'OPERATIONS', 'NORMAL', array[]::uuid[], array[]::uuid[], array[]::uuid[], false, '[]'::jsonb, '{}'::jsonb) $$,
  '23514', null, 'names shorter than two characters are rejected');
select extensions.throws_ok(
  $$ select public.save_meeting_template(null, 1, '10000000-0000-0000-0000-000000000001', 'Duração inválida', 45, 'OPERATIONS', 'NORMAL', array[]::uuid[], array[]::uuid[], array[]::uuid[], false, '[]'::jsonb, '{}'::jsonb) $$,
  '23514', null, 'durations must be multiples of 10 minutes');

-- Update with optimistic concurrency.
select public.save_meeting_template((select id from public.meeting_templates where name = 'Reunião de Direção'), 1, '10000000-0000-0000-0000-000000000001',
  'Reunião de Direção', 90, 'MANAGEMENT', 'NORMAL', array[]::uuid[], array[]::uuid[], array[]::uuid[], true, '["Operações"]'::jsonb, '{"freq":"NONE"}'::jsonb);
select extensions.is((select default_duration_minutes from public.meeting_templates where name = 'Reunião de Direção'), 90, 'updates apply');
select extensions.throws_ok(
  $$ select public.save_meeting_template((select id from public.meeting_templates where name = 'Reunião de Direção'), 1, '10000000-0000-0000-0000-000000000001', 'Reunião de Direção', 60, 'MANAGEMENT', 'NORMAL', array[]::uuid[], array[]::uuid[], array[]::uuid[], true, '[]'::jsonb, '{}'::jsonb) $$,
  'P0001', 'optimistic concurrency conflict', 'a stale version is rejected');
select extensions.ok(exists (select 1 from public.audit_events where subject_type = 'MEETING_TEMPLATE' and action = 'meeting.template.updated'), 'template changes are audited');
reset role;

-- Manager A reads but cannot manage.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.is((select count(*)::int from public.meeting_templates where name = 'Reunião de Direção'), 1, 'anyone who can create meetings reads templates');
select extensions.throws_ok(
  $$ select public.save_meeting_template(null, 1, '10000000-0000-0000-0000-000000000001', 'Tentativa', 60, 'OPERATIONS', 'NORMAL', array[]::uuid[], array[]::uuid[], array[]::uuid[], false, '[]'::jsonb, '{}'::jsonb) $$,
  'P0001', 'access denied', 'without meeting.template.manage nothing can be saved');
reset role;

-- Series keep a structured recurrence next to the label.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
set local role authenticated;
create temporary table fx as select public.create_meeting_series('10000000-0000-0000-0000-000000000001', 'Recorrência · teste', null, 'OPERATIONS', '21000000-0000-0000-0000-000000000001', 'Quinzenalmente à terça', '{}'::jsonb, 'NORMAL', array['30000000-0000-0000-0000-000000000007']::uuid[], array['40000000-0000-0000-0000-000000000001']::uuid[]) as id;
select public.set_meeting_series_recurrence((select id from fx), 1, '{"freq":"WEEKLY","interval":2,"weekdays":[2],"end":{"kind":"never"}}'::jsonb, 'Quinzenalmente à terça');
select extensions.is((select recurrence->>'freq' from public.meeting_series where id = (select id from fx)), 'WEEKLY', 'the structured recurrence is stored');
select extensions.is((select version from public.meeting_series where id = (select id from fx)), 2::bigint, 'setting the recurrence bumps the version');
reset role;

select * from extensions.finish();
rollback;
