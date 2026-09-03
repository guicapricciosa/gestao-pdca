create or replace function public.create_organizational_unit(
  target_company_id uuid,
  target_unit_type public.organizational_unit_type,
  target_code text,
  target_name text
)
returns public.organizational_units
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  created_unit public.organizational_units;
begin
  if not private.has_company_permission(
    private.current_profile_id(), target_company_id, 'organization.manage'
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.organizational_units (company_id, unit_type, code, name)
  values (target_company_id, target_unit_type, target_code, target_name)
  returning * into created_unit;

  if target_unit_type = 'DEPARTMENT' then
    insert into public.departments (organizational_unit_id) values (created_unit.id);
  elsif target_unit_type = 'SHARED_SERVICE' then
    insert into public.shared_services (organizational_unit_id) values (created_unit.id);
  end if;

  return created_unit;
end;
$$;

create or replace function public.has_active_hierarchy_path(
  from_assignment_id uuid,
  to_assignment_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  source_company uuid;
begin
  select company_id into source_company
  from public.organizational_assignments
  where id = from_assignment_id;

  if source_company is null or not private.has_company_permission(
    private.current_profile_id(), source_company, 'organization.read'
  ) then
    return false;
  end if;

  return exists (
    with recursive descendants(id) as (
      select from_assignment_id
      union
      select relationship.child_assignment_id
      from public.hierarchy_relationships relationship
      join descendants parent on parent.id = relationship.parent_assignment_id
      where relationship.is_active
        and relationship.valid_from <= current_date
        and (relationship.valid_to is null or relationship.valid_to >= current_date)
    )
    select 1 from descendants where id = to_assignment_id
  );
end;
$$;

create or replace function private.audit_organization_change()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  changed jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_data jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  new_data jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  target_company uuid;
  target_id uuid;
  actor uuid := private.current_profile_id();
begin
  target_id := coalesce(
    (changed ->> 'id')::uuid,
    (changed ->> 'organizational_unit_id')::uuid,
    (changed ->> 'role_id')::uuid
  );

  if tg_table_name = 'companies' then
    target_company := (changed ->> 'id')::uuid;
  elsif changed ? 'company_id' then
    target_company := (changed ->> 'company_id')::uuid;
  elsif tg_table_name = 'hierarchy_relationships' then
    select company_id into target_company
    from public.organizational_assignments
    where id = (changed ->> 'parent_assignment_id')::uuid;
  elsif tg_table_name = 'restaurant_assignments' then
    select company_id into target_company
    from public.organizational_assignments
    where id = (changed ->> 'organizational_assignment_id')::uuid;
  elsif tg_table_name in ('departments', 'shared_services') then
    select company_id into target_company
    from public.organizational_units
    where id = (changed ->> 'organizational_unit_id')::uuid;
  elsif tg_table_name = 'role_permissions' then
    select company_id into target_company
    from public.roles
    where id = (changed ->> 'role_id')::uuid;
  end if;

  if target_company is not null and target_id is not null then
    insert into public.audit_events (
      company_id, subject_type, subject_id, action, actor_profile_id,
      actor_type, before_data, after_data
    ) values (
      target_company,
      upper(tg_table_name),
      target_id,
      'organization.' || lower(tg_table_name) || '.' || lower(tg_op),
      actor,
      case when actor is null then 'SYSTEM' else 'USER' end,
      old_data,
      new_data
    );
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger organizational_units_audit after insert or update or delete on public.organizational_units
  for each row execute function private.audit_organization_change();
create trigger departments_audit after insert or update or delete on public.departments
  for each row execute function private.audit_organization_change();
create trigger shared_services_audit after insert or update or delete on public.shared_services
  for each row execute function private.audit_organization_change();
create trigger restaurants_audit after insert or update or delete on public.restaurants
  for each row execute function private.audit_organization_change();
create trigger roles_audit after insert or update or delete on public.roles
  for each row execute function private.audit_organization_change();
create trigger role_permissions_audit after insert or update or delete on public.role_permissions
  for each row execute function private.audit_organization_change();
create trigger organizational_assignments_audit after insert or update or delete on public.organizational_assignments
  for each row execute function private.audit_organization_change();
create trigger hierarchy_relationships_audit after insert or update or delete on public.hierarchy_relationships
  for each row execute function private.audit_organization_change();
create trigger restaurant_assignments_audit after insert or update or delete on public.restaurant_assignments
  for each row execute function private.audit_organization_change();

create trigger companies_audit after update on public.companies
  for each row execute function private.audit_organization_change();

create or replace function private.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  target_company uuid;
  actor uuid := private.current_profile_id();
begin
  for target_company in
    select distinct company_id
    from public.organizational_assignments
    where profile_id = new.id
  loop
    insert into public.audit_events (
      company_id, subject_type, subject_id, action, actor_profile_id,
      actor_type, before_data, after_data
    ) values (
      target_company,
      'PROFILE',
      new.id,
      'organization.profiles.update',
      actor,
      case when actor is null then 'SYSTEM' else 'USER' end,
      to_jsonb(old),
      to_jsonb(new)
    );
  end loop;
  return new;
end;
$$;
create trigger profiles_audit after update on public.profiles
  for each row execute function private.audit_profile_change();

create or replace function private.prevent_business_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'business records must be deactivated or end-dated, not deleted';
end;
$$;
create trigger companies_prevent_delete before delete on public.companies
  for each row execute function private.prevent_business_delete();
create trigger organizational_units_prevent_delete before delete on public.organizational_units
  for each row execute function private.prevent_business_delete();
create trigger departments_prevent_delete before delete on public.departments
  for each row execute function private.prevent_business_delete();
create trigger shared_services_prevent_delete before delete on public.shared_services
  for each row execute function private.prevent_business_delete();
create trigger restaurants_prevent_delete before delete on public.restaurants
  for each row execute function private.prevent_business_delete();
create trigger roles_prevent_delete before delete on public.roles
  for each row execute function private.prevent_business_delete();
create trigger permissions_prevent_delete before delete on public.permissions
  for each row execute function private.prevent_business_delete();
create trigger organizational_assignments_prevent_delete before delete on public.organizational_assignments
  for each row execute function private.prevent_business_delete();
create trigger hierarchy_relationships_prevent_delete before delete on public.hierarchy_relationships
  for each row execute function private.prevent_business_delete();
create trigger restaurant_assignments_prevent_delete before delete on public.restaurant_assignments
  for each row execute function private.prevent_business_delete();
create trigger security_objects_prevent_delete before delete on public.security_objects
  for each row execute function private.prevent_business_delete();

revoke all on function public.create_organizational_unit(uuid, public.organizational_unit_type, text, text) from public;
revoke all on function public.has_active_hierarchy_path(uuid, uuid) from public;
grant execute on function public.create_organizational_unit(uuid, public.organizational_unit_type, text, text) to authenticated;
grant execute on function public.has_active_hierarchy_path(uuid, uuid) to authenticated;
