-- Set-based read access. The per-row rule `private.can_access_security_object`
-- stays the single source of truth for commands, triggers and single checks;
-- this function computes, once per query, the set of objects that rule would
-- accept for one profile and one permission. Read policies on the list-heavy
-- tables use it as `security_object_id in (select …)`, which Postgres runs as
-- a single hashed sub-plan instead of calling plpgsql for every row.
-- `p_permission` null means "the read permission of each object's own type"
-- (lower(object_type) || '.read'), for tables that mix object types.
-- Equivalence with the per-row rule is asserted in
-- supabase/tests/accessible_objects_test.sql.

create or replace function private.accessible_security_objects(
  p_profile_id uuid,
  p_permission text default null
)
returns setof uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with wanted as (
    select so.id, so.company_id, so.visibility, so.created_by_profile_id,
      coalesce(p_permission, lower(so.object_type) || '.read') as permission
    from public.security_objects so
    where so.archived_at is null
      and exists (select 1 from public.profiles pr where pr.id = p_profile_id and pr.is_active)
  ),
  perm_info as (
    select permission, private.permission_requires_full_coverage(permission) as require_full
    from (select distinct permission from wanted) perms
  ),
  assignments as (
    select oa.id, oa.company_id, oa.unit_scope_mode, oa.organizational_unit_id, oa.restaurant_scope_mode
    from public.organizational_assignments oa
    where oa.profile_id = p_profile_id and private.assignment_is_current(oa)
  ),
  assignment_perms as (
    select a.id as assignment_id, p.permission, p.require_full
    from assignments a cross join perm_info p
    where private.assignment_has_permission(a.id, p.permission)
  ),
  restricted_readers as (
    select a.id as assignment_id
    from assignments a
    where private.assignment_has_permission(a.id, 'security.restricted.read')
  ),
  assignment_restaurants as (
    select a.id as assignment_id, r as restaurant_id
    from assignments a
    cross join lateral private.assignment_restaurant_ids(a.id) r
    where a.restaurant_scope_mode not in ('COMPANY_WIDE', 'NONE')
  ),
  grants as (
    select g.security_object_id, p.permission_key as permission
    from public.explicit_access_grants g
    join public.permissions p on p.id = g.permission_id and p.is_active
    where g.grantee_profile_id = p_profile_id
      and g.revoked_at is null
      and g.valid_from <= now()
      and (g.valid_to is null or g.valid_to > now())
  )
  select w.id
  from wanted w
  where exists (select 1 from grants g where g.security_object_id = w.id and g.permission = w.permission)
    or (w.visibility = 'PRIVATE' and w.created_by_profile_id = p_profile_id and w.permission like '%.read')
    or (w.visibility <> 'PRIVATE' and exists (
      select 1
      from assignments a
      join assignment_perms ap on ap.assignment_id = a.id and ap.permission = w.permission
      where a.company_id = w.company_id
        and (
          w.visibility = 'NORMAL'
          or w.created_by_profile_id = p_profile_id
          or exists (select 1 from restricted_readers rr where rr.assignment_id = a.id)
        )
        and (
          case
            when not exists (select 1 from public.object_scope_organizational_units u where u.security_object_id = w.id)
              then a.unit_scope_mode = 'COMPANY_WIDE'
            when ap.require_full
              then not exists (
                select 1 from public.object_scope_organizational_units u
                where u.security_object_id = w.id
                  and not (a.unit_scope_mode = 'COMPANY_WIDE' or u.organizational_unit_id = a.organizational_unit_id))
            else exists (
                select 1 from public.object_scope_organizational_units u
                where u.security_object_id = w.id
                  and (a.unit_scope_mode = 'COMPANY_WIDE' or u.organizational_unit_id = a.organizational_unit_id))
          end
        )
        and (
          case
            when not exists (select 1 from public.object_scope_restaurants r where r.security_object_id = w.id) then true
            when a.restaurant_scope_mode = 'COMPANY_WIDE' then true
            when a.restaurant_scope_mode = 'NONE' then false
            when ap.require_full
              then not exists (
                select 1 from public.object_scope_restaurants r
                where r.security_object_id = w.id
                  and r.restaurant_id not in (select ar.restaurant_id from assignment_restaurants ar where ar.assignment_id = a.id))
            else exists (
                select 1 from public.object_scope_restaurants r
                where r.security_object_id = w.id
                  and r.restaurant_id in (select ar.restaurant_id from assignment_restaurants ar where ar.assignment_id = a.id))
          end
        )
    ))
$$;

revoke all on function private.accessible_security_objects(uuid, text) from public, anon;
grant execute on function private.accessible_security_objects(uuid, text) to authenticated;

-- Read policies on the tables that back lists.
drop policy if exists decisions_read on public.decisions;
create policy decisions_read on public.decisions for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'decision.read')));

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'task.read')));

drop policy if exists pdcas_read on public.pdcas;
create policy pdcas_read on public.pdcas for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'pdca.read')));

drop policy if exists memberships_read on public.object_memberships;
create policy memberships_read on public.object_memberships for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id())));

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select to authenticated
  using (hidden_at is null and security_object_id in (select private.accessible_security_objects(private.current_profile_id())));

drop policy if exists attachments_read on public.attachments;
create policy attachments_read on public.attachments for select to authenticated
  using (deleted_at is null and security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'attachment.read')));

drop policy if exists security_objects_read on public.security_objects;
create policy security_objects_read on public.security_objects for select to authenticated
  using (id in (select private.accessible_security_objects(private.current_profile_id())));

drop policy if exists meeting_security_objects_read on public.security_objects;
create policy meeting_security_objects_read on public.security_objects for select to authenticated
  using (
    object_type in ('MEETING_SERIES', 'MEETING_SESSION')
    and id in (select private.accessible_security_objects(private.current_profile_id(), 'meeting.read'))
  );

drop policy if exists meeting_series_read on public.meeting_series;
create policy meeting_series_read on public.meeting_series for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'meeting.read')));

drop policy if exists meeting_sessions_read on public.meeting_sessions;
create policy meeting_sessions_read on public.meeting_sessions for select to authenticated
  using (security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'meeting.read')));
