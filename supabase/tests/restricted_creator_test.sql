begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

-- Fixtures: support director (0003) creates a RESTRICTED object inside their
-- own domain (unit 3, restaurant A). Only GLOBAL_EXECUTIVE holds
-- security.restricted.read in the seed; 0003 and manager A (0017) do not.
insert into public.security_objects (id, company_id, object_type, visibility, created_by_profile_id)
values
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'RESTRICTED', '21000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'RESTRICTED', '21000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'WORK_ITEM', 'PRIVATE', '21000000-0000-0000-0000-000000000003');
insert into public.object_scope_organizational_units (security_object_id, organizational_unit_id)
values
  ('b0000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000004'),
  ('b0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003');
insert into public.object_scope_restaurants (security_object_id, restaurant_id)
values
  ('b0000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001');

-- Creator keeps access, gated by functional permissions.
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'work_item.read'), 'RESTRICTED creator reads what they created');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'work_item.update'), 'RESTRICTED creator updates through their functional permission');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'work_item.archive'), 'RESTRICTED creator gains no permission they do not hold');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'security.restricted.read'), 'creator rule does not confer restricted-read itself');

-- Everyone else follows the unchanged RESTRICTED rule.
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000002', 'work_item.read'), 'scoped user without restricted-read is denied a RESTRICTED object they did not create');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'work_item.read'), 'restricted-read holder in scope still reads');
select extensions.is((select count(*)::integer from public.explicit_access_grants where security_object_id = 'b0000000-0000-0000-0000-000000000001'), 0, 'no silent explicit grant is created for the creator');

-- PRIVATE is unchanged: creator read only, no update without a grant.
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'work_item.read'), 'PRIVATE creator reads');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'work_item.update'), 'PRIVATE creator does not update without a grant');

-- RLS and the list filter agree with the central rule.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.security_objects where id = 'b0000000-0000-0000-0000-000000000001'), 1, 'RLS exposes the RESTRICTED object to its creator');
select extensions.ok(exists (select 1 from public.filter_accessible_security_objects('work_item.read') accessible where accessible = 'b0000000-0000-0000-0000-000000000001'), 'list filter includes the RESTRICTED object for its creator');
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.security_objects where id = 'b0000000-0000-0000-0000-000000000002'), 0, 'RLS hides the RESTRICTED object from a scoped non-creator without restricted-read');
reset role;

-- Access ends with the assignment: no assignment, no creator access.
update public.organizational_assignments set valid_to = current_date - 1
where id = '70000000-0000-0000-0000-000000000003';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'work_item.read'), 'creator access depends on a current assignment covering the object');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'work_item.update'), 'creator update also ends with the assignment');

select * from extensions.finish();
rollback;
