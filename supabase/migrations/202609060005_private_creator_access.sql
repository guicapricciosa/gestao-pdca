-- PRIVATE: the creator keeps their functional permissions (approved by Gui
-- Rainho on 2026-09-06). A private task or PDCA was unusable by the person
-- who created it: only reads were allowed, so it could not be activated,
-- edited or completed without an explicit grant. Now the creator may do on
-- it whatever a current organizational assignment of theirs in the company
-- allows; everyone else still needs an explicit grant. Nothing is written:
-- no silent grant, no membership. The set-based read projection is updated
-- to match (creator reads stay as before).

create or replace function private.can_access_security_object(
  p_profile_id uuid,
  p_target_object_id uuid,
  p_requested_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  object_row public.security_objects;
  require_full boolean;
begin
  if p_profile_id is null or not exists (
    select 1 from public.profiles where id = p_profile_id and is_active
  ) then return false; end if;

  select * into object_row from public.security_objects
  where id = p_target_object_id and archived_at is null;
  if not found then return false; end if;

  if private.has_explicit_grant(p_profile_id, p_target_object_id, p_requested_permission) then
    return true;
  end if;

  if object_row.visibility = 'PRIVATE' then
    if object_row.created_by_profile_id <> p_profile_id then return false; end if;
    if p_requested_permission like '%.read' then return true; end if;
    return exists (
      select 1
      from public.organizational_assignments oa
      where oa.profile_id = p_profile_id
        and oa.company_id = object_row.company_id
        and private.assignment_is_current(oa)
        and private.assignment_has_permission(oa.id, p_requested_permission)
    );
  end if;

  require_full := private.permission_requires_full_coverage(p_requested_permission);

  return exists (
    select 1
    from public.organizational_assignments oa
    where oa.profile_id = p_profile_id
      and oa.company_id = object_row.company_id
      and private.assignment_is_current(oa)
      and private.assignment_has_permission(oa.id, p_requested_permission)
      and private.assignment_covers_object(oa.id, p_target_object_id, require_full)
      and (
        object_row.visibility = 'NORMAL'
        or (
          object_row.visibility = 'RESTRICTED'
          and (
            object_row.created_by_profile_id = p_profile_id
            or private.assignment_has_permission(oa.id, 'security.restricted.read')
          )
        )
      )
  );
end;
$$;

-- Same rule in the set-based projection used by the read policies.
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
    or (w.visibility = 'PRIVATE' and w.created_by_profile_id = p_profile_id
        and (w.permission like '%.read'
             or exists (select 1 from assignment_perms ap join assignments a on a.id = ap.assignment_id
                        where ap.permission = w.permission and a.company_id = w.company_id)))
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

