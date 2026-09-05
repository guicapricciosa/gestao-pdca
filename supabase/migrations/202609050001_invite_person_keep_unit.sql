-- A company-wide assignment still belongs to a department (DOL Director,
-- Expansion): keep the unit for the directory instead of discarding it.
create or replace function public.invite_person(
  p_auth_user_id uuid,
  p_display_name text,
  p_email text,
  p_company_id uuid,
  p_role_id uuid,
  p_organizational_unit_id uuid,
  p_title text,
  p_unit_scope_mode public.unit_scope_mode,
  p_restaurant_scope_mode public.restaurant_scope_mode,
  p_restaurant_ids uuid[] default '{}'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.current_profile_id();
  profile_id uuid;
  assignment_id uuid;
  restaurant_id uuid;
  unit_id uuid := p_organizational_unit_id;
begin
  if actor is null or not private.has_company_permission(actor, p_company_id, 'organization.manage') then
    raise exception 'permission denied: organization.manage required';
  end if;
  if not exists (select 1 from public.roles r where r.id = p_role_id and r.is_active and (r.company_id is null or r.company_id = p_company_id)) then
    raise exception 'unknown role';
  end if;
  if unit_id is not null and not exists (
    select 1 from public.organizational_units u where u.id = unit_id and u.company_id = p_company_id and u.is_active
  ) then
    if p_unit_scope_mode = 'COMPANY_WIDE' then unit_id := null;
    else raise exception 'unknown organizational unit'; end if;
  end if;
  if p_unit_scope_mode <> 'COMPANY_WIDE' and unit_id is null then
    raise exception 'unknown organizational unit';
  end if;
  if p_restaurant_scope_mode = 'ASSIGNED' and coalesce(array_length(p_restaurant_ids, 1), 0) = 0 then
    raise exception 'at least one restaurant is required for an assigned restaurant scope';
  end if;
  if exists (
    select 1 from unnest(p_restaurant_ids) rid
    where not exists (select 1 from public.restaurants r where r.id = rid and r.company_id = p_company_id and r.is_active)
  ) then
    raise exception 'unknown restaurant';
  end if;

  insert into public.profiles (auth_user_id, display_name, email_snapshot)
  values (p_auth_user_id, btrim(p_display_name), lower(btrim(p_email)))
  on conflict (auth_user_id) do update
    set display_name = excluded.display_name, is_active = true, deactivated_at = null
  returning id into profile_id;

  insert into public.organizational_assignments (
    profile_id, company_id, organizational_unit_id, role_id, title,
    unit_scope_mode, restaurant_scope_mode, valid_from, created_by_profile_id
  ) values (
    profile_id, p_company_id, unit_id, p_role_id, nullif(btrim(coalesce(p_title, '')), ''),
    p_unit_scope_mode, p_restaurant_scope_mode, current_date, actor
  )
  returning id into assignment_id;

  if p_restaurant_scope_mode = 'ASSIGNED' then
    foreach restaurant_id in array p_restaurant_ids loop
      insert into public.restaurant_assignments (organizational_assignment_id, restaurant_id, created_by_profile_id)
      values (assignment_id, restaurant_id, actor);
    end loop;
  end if;

  return profile_id;
end;
$$;
