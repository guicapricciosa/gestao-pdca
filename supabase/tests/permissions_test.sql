begin;

create extension if not exists pgtap with schema extensions;
select plan(38);

insert into public.security_objects (id, company_id, object_type, visibility, created_by_profile_id)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'RESTRICTED', '21000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'PRIVATE', '21000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'PRIVATE', '21000000-0000-0000-0000-000000000001');

insert into public.object_scope_organizational_units (security_object_id, organizational_unit_id)
values
  ('a0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000011'),
  ('a0000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000013'),
  ('a0000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000003'),
  ('a0000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000004');

insert into public.object_scope_restaurants (security_object_id, restaurant_id)
values
  ('a0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000001');

select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'work_item.read'), 'CEO reads NORMAL across company');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'work_item.read'), 'global management reads NORMAL across company');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'work_item.read'), 'support department reads its domain across restaurants');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'work_item.read'), 'support department denied across department');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'DOL Director inherits restaurant A');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000005', 'work_item.read'), 'DOL Director inherits restaurant B across domains');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'subdirector inherits restaurant A');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'work_item.read'), 'subdirector inherits restaurant B');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'another subdirector denied outside restaurant D');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'work_item.read'), 'supervisor A sees restaurant B');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'supervisor B denied restaurant A');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000003', 'work_item.read'), 'restaurant manager A sees all authorized domains at A');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000002', 'work_item.read'), 'restaurant manager A denied B');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002', 'work_item.read'), 'kitchen supervisor sees assigned B');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'kitchen manager sees A');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000002', 'work_item.read'), 'kitchen manager denied B');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', 'work_item.read'), 'shared service reads own service across restaurants');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000005', 'work_item.read'), 'shared service denied another service');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'NORMAL uses scope');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008', 'work_item.read'), 'RESTRICTED denies normal scoped user');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008', 'work_item.read'), 'RESTRICTED allows scoped restricted permission');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000009', 'work_item.read'), 'PRIVATE allows creator');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000009', 'work_item.read'), 'PRIVATE denies global executive without grant');

insert into public.explicit_access_grants (
  security_object_id, grantee_profile_id, permission_id, granted_by_profile_id, reason
)
select
  'a0000000-0000-0000-0000-000000000010',
  '21000000-0000-0000-0000-000000000003',
  id,
  '21000000-0000-0000-0000-000000000001',
  'Required pgTAP explicit access scenario'
from public.permissions where permission_key = 'work_item.read';

select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000010', 'work_item.read'), 'valid explicit grant permits exact action');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000006', 'work_item.read'), 'read uses restaurant intersection');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000006', 'work_item.scope.update'), 'scope update requires all restaurants');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'work_item.read'), 'read uses department intersection');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 'work_item.scope.update'), 'scope update requires all departments');

select extensions.ok(private.can_issue_grant(
  '21000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  (select id from public.permissions where permission_key = 'work_item.read')
), 'global executive can issue a delegable grant over full scope');
select extensions.ok(private.can_issue_grant(
  '21000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  (select id from public.permissions where permission_key = 'work_item.read')
), 'support leader can issue a grant inside the full department scope');
select extensions.ok(not private.can_issue_grant(
  '21000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000003',
  (select id from public.permissions where permission_key = 'work_item.read')
), 'support leader cannot issue a grant outside the department scope');

update public.organizational_assignments
set valid_to = '2026-08-01'
where id = '70000000-0000-0000-0000-000000000008';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'expired assignment is ignored');

update public.organizational_assignments
set is_active = false
where id = '70000000-0000-0000-0000-000000000015';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'work_item.read'), 'inactive assignment is ignored');

update public.profiles
set is_active = false, deactivated_at = now()
where id = '21000000-0000-0000-0000-000000000014';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000005', 'work_item.read'), 'inactive profile is denied');

select extensions.ok(exists (
  select 1 from public.audit_events
  where subject_type = 'EXPLICIT_ACCESS_GRANT'
    and action = 'security.grant.created'
    and security_object_id = 'a0000000-0000-0000-0000-000000000010'
), 'explicit grant is audited');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.security_objects where object_type = 'WORK_ITEM'), 4, 'RLS returns only manager A intersecting NORMAL objects');
select extensions.results_eq(
  $$ select accessible from filter_accessible_security_objects('work_item.read') accessible join public.security_objects so on so.id = accessible where so.object_type = 'WORK_ITEM' order by 1 $$,
  $$ values
    ('a0000000-0000-0000-0000-000000000001'::uuid),
    ('a0000000-0000-0000-0000-000000000003'::uuid),
    ('a0000000-0000-0000-0000-000000000006'::uuid),
    ('a0000000-0000-0000-0000-000000000007'::uuid)
  $$,
  'query filter foundation returns the same authorized population'
);
select extensions.is((select count(*)::integer from public.get_accessible_scope() where restaurant_id = '40000000-0000-0000-0000-000000000001'), 35, 'effective scope exposes one row per permission for manager restaurant');

select * from extensions.finish();
rollback;
