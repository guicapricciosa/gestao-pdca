-- Inviting people from the application. The Auth user is created by the
-- server (admin API, sends the invite e-mail); this command creates the
-- profile and the first organizational assignment in one transaction, under
-- the caller's `organization.manage` permission. Profiles have no insert
-- policy on purpose: this is the only way in besides the bootstrap scripts.

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
begin
  if actor is null or not private.has_company_permission(actor, p_company_id, 'organization.manage') then
    raise exception 'permission denied: organization.manage required';
  end if;
  if not exists (select 1 from public.roles r where r.id = p_role_id and r.is_active and (r.company_id is null or r.company_id = p_company_id)) then
    raise exception 'unknown role';
  end if;
  if p_unit_scope_mode <> 'COMPANY_WIDE' and not exists (
    select 1 from public.organizational_units u where u.id = p_organizational_unit_id and u.company_id = p_company_id and u.is_active
  ) then
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
    profile_id, p_company_id,
    case when p_unit_scope_mode = 'COMPANY_WIDE' then null else p_organizational_unit_id end,
    p_role_id, nullif(btrim(coalesce(p_title, '')), ''),
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

revoke all on function public.invite_person(uuid, text, text, uuid, uuid, uuid, text, public.unit_scope_mode, public.restaurant_scope_mode, uuid[]) from public, anon;
grant execute on function public.invite_person(uuid, text, text, uuid, uuid, uuid, text, public.unit_scope_mode, public.restaurant_scope_mode, uuid[]) to authenticated;

-- Directory for Definições › Pessoas: one row per active assignment, readable
-- under the same rules as the underlying tables.
create or replace view public.people_directory with (security_invoker = true) as
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
  r.name as role_name,
  r.code as role_code,
  u.name as unit_name,
  oa.unit_scope_mode,
  oa.restaurant_scope_mode,
  coalesce((
    select array_agg(rest.name order by rest.name)
    from public.restaurant_assignments ra
    join public.restaurants rest on rest.id = ra.restaurant_id
    where ra.organizational_assignment_id = oa.id and ra.is_active and ra.valid_to is null
  ), array[]::text[]) as restaurant_names
from public.profiles pr
join public.organizational_assignments oa on oa.profile_id = pr.id and private.assignment_is_current(oa)
join public.roles r on r.id = oa.role_id
left join public.organizational_units u on u.id = oa.organizational_unit_id;

grant select on public.people_directory to authenticated;

-- "Ainda não entrou" on the People page: the shell touches this at most once
-- an hour for the signed-in person.
create or replace function public.touch_profile_last_seen()
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles
  set last_seen_at = now()
  where auth_user_id = auth.uid()
    and (last_seen_at is null or last_seen_at < now() - interval '1 hour');
$$;
revoke all on function public.touch_profile_last_seen() from public, anon;
grant execute on function public.touch_profile_last_seen() to authenticated;
