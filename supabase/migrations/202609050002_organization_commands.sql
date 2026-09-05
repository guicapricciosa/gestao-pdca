-- Definições › Organização: restaurants, departments/services, and changes
-- to a person's assignment, all under `organization.manage` of the company.
-- Audit comes from the existing organization triggers.

create or replace function public.save_restaurant(
  p_restaurant_id uuid,
  p_company_id uuid,
  p_code text,
  p_name text,
  p_is_active boolean default true
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := private.current_profile_id(); v_id uuid;
begin
  if actor is null or not private.has_company_permission(actor, p_company_id, 'organization.manage') then
    raise exception 'permission denied: organization.manage required';
  end if;
  if p_restaurant_id is null then
    insert into public.restaurants (company_id, code, name, is_active)
    values (p_company_id, upper(btrim(p_code)), btrim(p_name), coalesce(p_is_active, true))
    returning id into v_id;
  else
    update public.restaurants
    set name = btrim(p_name), code = upper(btrim(p_code)), is_active = coalesce(p_is_active, is_active),
        closed_on = case when coalesce(p_is_active, is_active) then null else coalesce(closed_on, current_date) end
    where id = p_restaurant_id and company_id = p_company_id
    returning id into v_id;
    if v_id is null then raise exception 'restaurant not found'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_organizational_unit(
  p_unit_id uuid,
  p_company_id uuid,
  p_unit_type public.organizational_unit_type,
  p_code text,
  p_name text,
  p_is_active boolean default true
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := private.current_profile_id(); v_id uuid; created public.organizational_units;
begin
  if actor is null or not private.has_company_permission(actor, p_company_id, 'organization.manage') then
    raise exception 'permission denied: organization.manage required';
  end if;
  if p_unit_id is null then
    created := public.create_organizational_unit(p_company_id, p_unit_type, upper(btrim(p_code)), btrim(p_name));
    return created.id;
  end if;
  update public.organizational_units
  set name = btrim(p_name), code = upper(btrim(p_code)), is_active = coalesce(p_is_active, is_active),
      active_to = case when coalesce(p_is_active, is_active) then null else coalesce(active_to, current_date) end
  where id = p_unit_id and company_id = p_company_id
  returning id into v_id;
  if v_id is null then raise exception 'organizational unit not found'; end if;
  return v_id;
end;
$$;

-- Changes role, department, scope, restaurants and "reports to" of one
-- current assignment. Restaurants not kept are ended (history preserved).
create or replace function public.update_person_assignment(
  p_assignment_id uuid,
  p_role_id uuid,
  p_organizational_unit_id uuid,
  p_title text,
  p_unit_scope_mode public.unit_scope_mode,
  p_restaurant_scope_mode public.restaurant_scope_mode,
  p_restaurant_ids uuid[] default '{}',
  p_reports_to_assignment_id uuid default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.current_profile_id();
  row_before public.organizational_assignments;
  unit_id uuid := p_organizational_unit_id;
  rid uuid;
begin
  select * into row_before from public.organizational_assignments where id = p_assignment_id;
  if not found then raise exception 'assignment not found'; end if;
  if actor is null or not private.has_company_permission(actor, row_before.company_id, 'organization.manage') then
    raise exception 'permission denied: organization.manage required';
  end if;
  if not exists (select 1 from public.roles r where r.id = p_role_id and r.is_active and (r.company_id is null or r.company_id = row_before.company_id)) then
    raise exception 'unknown role';
  end if;
  if unit_id is not null and not exists (
    select 1 from public.organizational_units u where u.id = unit_id and u.company_id = row_before.company_id and u.is_active
  ) then
    if p_unit_scope_mode = 'COMPANY_WIDE' then unit_id := null; else raise exception 'unknown organizational unit'; end if;
  end if;
  if p_unit_scope_mode <> 'COMPANY_WIDE' and unit_id is null then
    raise exception 'unknown organizational unit';
  end if;
  if p_restaurant_scope_mode = 'ASSIGNED' and coalesce(array_length(p_restaurant_ids, 1), 0) = 0 then
    raise exception 'at least one restaurant is required for an assigned restaurant scope';
  end if;
  if exists (
    select 1 from unnest(p_restaurant_ids) x
    where not exists (select 1 from public.restaurants r where r.id = x and r.company_id = row_before.company_id and r.is_active)
  ) then
    raise exception 'unknown restaurant';
  end if;
  if p_reports_to_assignment_id is not null then
    if p_reports_to_assignment_id = p_assignment_id then raise exception 'assignment cannot report to itself'; end if;
    if not exists (
      select 1 from public.organizational_assignments parent
      where parent.id = p_reports_to_assignment_id and parent.company_id = row_before.company_id and private.assignment_is_current(parent)
    ) then raise exception 'unknown parent assignment'; end if;
    if public.has_active_hierarchy_path(p_assignment_id, p_reports_to_assignment_id) then
      raise exception 'hierarchy cycle';
    end if;
  end if;

  update public.organizational_assignments
  set role_id = p_role_id, organizational_unit_id = unit_id, title = nullif(btrim(coalesce(p_title, '')), ''),
      unit_scope_mode = p_unit_scope_mode, restaurant_scope_mode = p_restaurant_scope_mode
  where id = p_assignment_id;

  -- Restaurants: end the ones no longer kept, add the new ones.
  update public.restaurant_assignments ra
  set is_active = false, valid_to = current_date
  where ra.organizational_assignment_id = p_assignment_id and ra.is_active and ra.valid_to is null
    and (p_restaurant_scope_mode <> 'ASSIGNED' or ra.restaurant_id <> all (p_restaurant_ids));
  if p_restaurant_scope_mode = 'ASSIGNED' then
    foreach rid in array p_restaurant_ids loop
      if not exists (
        select 1 from public.restaurant_assignments ra
        where ra.organizational_assignment_id = p_assignment_id and ra.restaurant_id = rid and ra.is_active and ra.valid_to is null
      ) then
        insert into public.restaurant_assignments (organizational_assignment_id, restaurant_id, created_by_profile_id)
        values (p_assignment_id, rid, actor);
      end if;
    end loop;
  end if;

  -- Reports to: one active REPORTS_TO parent at a time.
  update public.hierarchy_relationships h
  set is_active = false, valid_to = current_date
  where h.child_assignment_id = p_assignment_id and h.relationship_type = 'REPORTS_TO' and h.is_active and h.valid_to is null
    and (p_reports_to_assignment_id is null or h.parent_assignment_id <> p_reports_to_assignment_id);
  if p_reports_to_assignment_id is not null and not exists (
    select 1 from public.hierarchy_relationships h
    where h.child_assignment_id = p_assignment_id and h.parent_assignment_id = p_reports_to_assignment_id
      and h.relationship_type = 'REPORTS_TO' and h.is_active and h.valid_to is null
  ) then
    insert into public.hierarchy_relationships (parent_assignment_id, child_assignment_id, relationship_type, created_by_profile_id)
    values (p_reports_to_assignment_id, p_assignment_id, 'REPORTS_TO', actor);
  end if;
end;
$$;

-- Ends every current assignment and marks the profile inactive. The caller
-- also blocks the Auth user. A person cannot deactivate themselves.
create or replace function public.deactivate_person(p_profile_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := private.current_profile_id(); n int;
begin
  if actor is null then raise exception 'permission denied: organization.manage required'; end if;
  if actor = p_profile_id then raise exception 'cannot deactivate yourself'; end if;
  if not exists (
    select 1 from public.organizational_assignments oa
    where oa.profile_id = p_profile_id and private.has_company_permission(actor, oa.company_id, 'organization.manage')
  ) then
    raise exception 'permission denied: organization.manage required';
  end if;
  update public.restaurant_assignments ra set is_active = false, valid_to = current_date
  where ra.is_active and ra.valid_to is null
    and ra.organizational_assignment_id in (select id from public.organizational_assignments where profile_id = p_profile_id);
  update public.hierarchy_relationships h set is_active = false, valid_to = current_date
  where h.is_active and h.valid_to is null
    and (h.child_assignment_id in (select id from public.organizational_assignments where profile_id = p_profile_id)
      or h.parent_assignment_id in (select id from public.organizational_assignments where profile_id = p_profile_id));
  update public.organizational_assignments set is_active = false, valid_to = greatest(valid_from, current_date)
  where profile_id = p_profile_id and is_active;
  get diagnostics n = row_count;
  update public.profiles set is_active = false, deactivated_at = now() where id = p_profile_id and is_active;
end;
$$;

revoke all on function public.save_restaurant(uuid, uuid, text, text, boolean) from public, anon;
revoke all on function public.save_organizational_unit(uuid, uuid, public.organizational_unit_type, text, text, boolean) from public, anon;
revoke all on function public.update_person_assignment(uuid, uuid, uuid, text, public.unit_scope_mode, public.restaurant_scope_mode, uuid[], uuid) from public, anon;
revoke all on function public.deactivate_person(uuid) from public, anon;
grant execute on function public.save_restaurant(uuid, uuid, text, text, boolean) to authenticated;
grant execute on function public.save_organizational_unit(uuid, uuid, public.organizational_unit_type, text, text, boolean) to authenticated;
grant execute on function public.update_person_assignment(uuid, uuid, uuid, text, public.unit_scope_mode, public.restaurant_scope_mode, uuid[], uuid) to authenticated;
grant execute on function public.deactivate_person(uuid) to authenticated;

-- The directory also needs the ids the edit form works with (column order
-- changes, so the view is recreated).
drop view if exists public.people_directory;
create view public.people_directory with (security_invoker = true) as
select
  pr.id as profile_id,
  pr.auth_user_id,
  pr.display_name,
  pr.email_snapshot as email,
  pr.is_active,
  pr.last_seen_at,
  oa.id as assignment_id,
  oa.company_id,
  oa.title,
  oa.role_id,
  r.name as role_name,
  r.code as role_code,
  oa.organizational_unit_id as unit_id,
  u.name as unit_name,
  oa.unit_scope_mode,
  oa.restaurant_scope_mode,
  coalesce((
    select array_agg(rest.name order by rest.name)
    from public.restaurant_assignments ra
    join public.restaurants rest on rest.id = ra.restaurant_id
    where ra.organizational_assignment_id = oa.id and ra.is_active and ra.valid_to is null
  ), array[]::text[]) as restaurant_names,
  coalesce((
    select array_agg(ra.restaurant_id)
    from public.restaurant_assignments ra
    where ra.organizational_assignment_id = oa.id and ra.is_active and ra.valid_to is null
  ), array[]::uuid[]) as restaurant_ids,
  (select h.parent_assignment_id from public.hierarchy_relationships h
   where h.child_assignment_id = oa.id and h.relationship_type = 'REPORTS_TO' and h.is_active and h.valid_to is null
   limit 1) as reports_to_assignment_id,
  (select pp.display_name from public.hierarchy_relationships h
   join public.organizational_assignments pa on pa.id = h.parent_assignment_id
   join public.profiles pp on pp.id = pa.profile_id
   where h.child_assignment_id = oa.id and h.relationship_type = 'REPORTS_TO' and h.is_active and h.valid_to is null
   limit 1) as reports_to_name
from public.profiles pr
join public.organizational_assignments oa on oa.profile_id = pr.id and private.assignment_is_current(oa)
join public.roles r on r.id = oa.role_id
left join public.organizational_units u on u.id = oa.organizational_unit_id;

grant select on public.people_directory to authenticated;
