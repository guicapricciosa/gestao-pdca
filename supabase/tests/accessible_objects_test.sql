begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

-- The set-based function must accept exactly the objects the per-row rule
-- accepts, for every profile in the seed and every permission we read with.
create temporary table permission_cases (permission text);
insert into permission_cases values
  ('task.read'), ('pdca.read'), ('decision.read'), ('meeting.read'),
  ('attachment.read'), ('work_item.read'), ('task.update');

create or replace function pg_temp.mismatches(p_permission text)
returns integer language sql as $$
  select count(*)::integer
  from public.profiles pr
  cross join public.security_objects so
  where private.can_access_security_object(pr.id, so.id, coalesce(p_permission, lower(so.object_type) || '.read'))
    is distinct from (so.id in (select private.accessible_security_objects(pr.id, p_permission)))
$$;

select extensions.is(pg_temp.mismatches('task.read'), 0, 'task.read: set matches per-row rule for every profile');
select extensions.is(pg_temp.mismatches('pdca.read'), 0, 'pdca.read: set matches per-row rule');
select extensions.is(pg_temp.mismatches('decision.read'), 0, 'decision.read: set matches per-row rule');
select extensions.is(pg_temp.mismatches('meeting.read'), 0, 'meeting.read: set matches per-row rule');
select extensions.is(pg_temp.mismatches('attachment.read'), 0, 'attachment.read: set matches per-row rule');
select extensions.is(pg_temp.mismatches('work_item.read'), 0, 'work_item.read: set matches per-row rule');
select extensions.is(pg_temp.mismatches('task.update'), 0, 'task.update (full coverage): set matches per-row rule');
select extensions.is(pg_temp.mismatches(null), 0, 'per-type read permission: set matches per-row rule');

-- Inactive profile sees nothing, like the per-row rule.
select extensions.is(
  (select count(*)::integer from private.accessible_security_objects('00000000-0000-4000-8000-000000000000', 'task.read')),
  0,
  'unknown profile gets an empty set'
);

select * from finish();
rollback;
