create extension if not exists pgcrypto with schema extensions;

create type public.organizational_unit_type as enum ('DEPARTMENT', 'SHARED_SERVICE');
create type public.unit_scope_mode as enum ('ASSIGNED', 'COMPANY_WIDE');
create type public.restaurant_scope_mode as enum ('NONE', 'ASSIGNED', 'INHERITED', 'COMPANY_WIDE');
create type public.hierarchy_relationship_type as enum ('REPORTS_TO', 'OPERATIONAL_RESPONSIBILITY');
create type public.restaurant_responsibility_type as enum ('PRIMARY', 'SECONDARY', 'COVERAGE');
create type public.visibility_mode as enum ('NORMAL', 'RESTRICTED', 'PRIVATE');
create type public.scope_requirement as enum ('INTERSECT', 'COVER_ALL');

create table public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null,
  name text not null,
  legal_name text,
  timezone text not null default 'Europe/Lisbon',
  locale text not null default 'pt-PT',
  is_active boolean not null default true,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_code_format check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  constraint companies_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint companies_deactivation_consistent check (
    (is_active and deactivated_at is null) or (not is_active and deactivated_at is not null)
  )
);
create unique index companies_code_unique on public.companies (lower(code));
create index companies_active_idx on public.companies (id) where is_active;

create table public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  display_name text not null,
  email_snapshot text not null,
  preferred_locale text not null default 'pt-PT',
  timezone text not null default 'Europe/Lisbon',
  is_active boolean not null default true,
  deactivated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(btrim(display_name)) between 2 and 160),
  constraint profiles_email_normalized check (email_snapshot = lower(email_snapshot)),
  constraint profiles_deactivation_consistent check (
    (is_active and deactivated_at is null) or (not is_active and deactivated_at is not null)
  )
);
create index profiles_active_idx on public.profiles (id) where is_active;
create index profiles_display_name_idx on public.profiles (lower(display_name));

create table public.organizational_units (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  unit_type public.organizational_unit_type not null,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  active_from date not null default current_date,
  active_to date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizational_units_code_format check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  constraint organizational_units_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint organizational_units_dates check (active_to is null or active_to >= active_from),
  constraint organizational_units_subtype_key unique (id, unit_type)
);
create unique index organizational_units_company_code_unique
  on public.organizational_units (company_id, lower(code));
create index organizational_units_company_type_active_idx
  on public.organizational_units (company_id, unit_type) where is_active;

create table public.departments (
  organizational_unit_id uuid primary key,
  unit_type public.organizational_unit_type not null default 'DEPARTMENT',
  parent_department_id uuid references public.departments(organizational_unit_id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint departments_type check (unit_type = 'DEPARTMENT'),
  constraint departments_base_fk foreign key (organizational_unit_id, unit_type)
    references public.organizational_units(id, unit_type) on delete restrict,
  constraint departments_not_own_parent check (parent_department_id is null or parent_department_id <> organizational_unit_id)
);
create index departments_parent_idx on public.departments (parent_department_id);

create table public.shared_services (
  organizational_unit_id uuid primary key,
  unit_type public.organizational_unit_type not null default 'SHARED_SERVICE',
  provider_company_id uuid references public.companies(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint shared_services_type check (unit_type = 'SHARED_SERVICE'),
  constraint shared_services_base_fk foreign key (organizational_unit_id, unit_type)
    references public.organizational_units(id, unit_type) on delete restrict
);
create index shared_services_provider_idx on public.shared_services (provider_company_id);

create table public.restaurants (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  timezone text not null default 'Europe/Lisbon',
  address jsonb not null default '{}'::jsonb,
  opened_on date,
  closed_on date,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint restaurants_code_format check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  constraint restaurants_name_length check (char_length(btrim(name)) between 2 and 160),
  constraint restaurants_dates check (closed_on is null or opened_on is null or closed_on >= opened_on)
);
create unique index restaurants_company_code_unique on public.restaurants (company_id, lower(code));
create index restaurants_company_active_idx on public.restaurants (company_id) where is_active;

create table public.permissions (
  id uuid primary key default extensions.gen_random_uuid(),
  permission_key text not null unique,
  description text not null,
  risk_level smallint not null default 1,
  scope_requirement public.scope_requirement not null default 'INTERSECT',
  is_delegable boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint permissions_key_format check (permission_key ~ '^[a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*$'),
  constraint permissions_risk_level check (risk_level between 1 and 4)
);

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid references public.companies(id) on delete restrict,
  code text not null,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_code_format check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,63}$'),
  constraint roles_name_length check (char_length(btrim(name)) between 2 and 160)
);
create unique index roles_company_code_unique on public.roles (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(code));
create index roles_company_active_idx on public.roles (company_id) where is_active;

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  primary key (role_id, permission_id)
);
create index role_permissions_permission_idx on public.role_permissions (permission_id, role_id);

create table public.organizational_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  organizational_unit_id uuid references public.organizational_units(id) on delete restrict,
  role_id uuid not null references public.roles(id) on delete restrict,
  title text,
  unit_scope_mode public.unit_scope_mode not null default 'ASSIGNED',
  restaurant_scope_mode public.restaurant_scope_mode not null default 'NONE',
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint organizational_assignments_dates check (valid_to is null or valid_to >= valid_from),
  constraint organizational_assignments_assigned_unit check (
    unit_scope_mode = 'COMPANY_WIDE' or organizational_unit_id is not null
  )
);
create index organizational_assignments_profile_current_idx
  on public.organizational_assignments (profile_id, company_id, valid_from, valid_to) where is_active;
create index organizational_assignments_unit_idx on public.organizational_assignments (organizational_unit_id) where is_active;
create index organizational_assignments_role_idx on public.organizational_assignments (role_id) where is_active;

create table public.hierarchy_relationships (
  id uuid primary key default extensions.gen_random_uuid(),
  parent_assignment_id uuid not null references public.organizational_assignments(id) on delete restrict,
  child_assignment_id uuid not null references public.organizational_assignments(id) on delete restrict,
  relationship_type public.hierarchy_relationship_type not null default 'REPORTS_TO',
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint hierarchy_relationships_not_self check (parent_assignment_id <> child_assignment_id),
  constraint hierarchy_relationships_dates check (valid_to is null or valid_to >= valid_from)
);
create unique index hierarchy_relationships_active_edge_unique
  on public.hierarchy_relationships (parent_assignment_id, child_assignment_id, relationship_type)
  where is_active and valid_to is null;
create index hierarchy_relationships_parent_idx on public.hierarchy_relationships (parent_assignment_id, valid_from, valid_to) where is_active;
create index hierarchy_relationships_child_idx on public.hierarchy_relationships (child_assignment_id, valid_from, valid_to) where is_active;

create table public.restaurant_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organizational_assignment_id uuid not null references public.organizational_assignments(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  responsibility_type public.restaurant_responsibility_type not null default 'PRIMARY',
  valid_from date not null default current_date,
  valid_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint restaurant_assignments_dates check (valid_to is null or valid_to >= valid_from)
);
create unique index restaurant_assignments_active_unique
  on public.restaurant_assignments (organizational_assignment_id, restaurant_id, responsibility_type)
  where is_active and valid_to is null;
create index restaurant_assignments_assignment_idx
  on public.restaurant_assignments (organizational_assignment_id, valid_from, valid_to) where is_active;
create index restaurant_assignments_restaurant_idx
  on public.restaurant_assignments (restaurant_id, valid_from, valid_to) where is_active;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_set_updated_at before update on public.companies
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizational_units_set_updated_at before update on public.organizational_units
  for each row execute function public.set_updated_at();
create trigger restaurants_set_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();
create trigger permissions_set_updated_at before update on public.permissions
  for each row execute function public.set_updated_at();
create trigger roles_set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger organizational_assignments_set_updated_at before update on public.organizational_assignments
  for each row execute function public.set_updated_at();
create trigger hierarchy_relationships_set_updated_at before update on public.hierarchy_relationships
  for each row execute function public.set_updated_at();
create trigger restaurant_assignments_set_updated_at before update on public.restaurant_assignments
  for each row execute function public.set_updated_at();

create or replace function public.validate_organizational_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  unit_company uuid;
  role_company uuid;
begin
  if new.organizational_unit_id is not null then
    select company_id into unit_company from public.organizational_units where id = new.organizational_unit_id;
    if unit_company is distinct from new.company_id then
      raise exception 'organizational unit must belong to assignment company';
    end if;
  end if;

  select company_id into role_company from public.roles where id = new.role_id;
  if role_company is not null and role_company is distinct from new.company_id then
    raise exception 'role must be global or belong to assignment company';
  end if;
  return new;
end;
$$;
create trigger organizational_assignments_validate
  before insert or update on public.organizational_assignments
  for each row execute function public.validate_organizational_assignment();

create or replace function public.validate_hierarchy_relationship()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_company uuid;
  child_company uuid;
  creates_cycle boolean;
begin
  select company_id into parent_company from public.organizational_assignments where id = new.parent_assignment_id;
  select company_id into child_company from public.organizational_assignments where id = new.child_assignment_id;
  if parent_company is distinct from child_company then
    raise exception 'hierarchy assignments must belong to the same company';
  end if;

  with recursive descendants(id) as (
    select hr.child_assignment_id
    from public.hierarchy_relationships hr
    where hr.parent_assignment_id = new.child_assignment_id
      and hr.is_active
      and hr.valid_from <= current_date
      and (hr.valid_to is null or hr.valid_to >= current_date)
      and hr.id is distinct from new.id
    union
    select hr.child_assignment_id
    from public.hierarchy_relationships hr
    join descendants d on d.id = hr.parent_assignment_id
    where hr.is_active
      and hr.valid_from <= current_date
      and (hr.valid_to is null or hr.valid_to >= current_date)
      and hr.id is distinct from new.id
  )
  select exists(select 1 from descendants where id = new.parent_assignment_id) into creates_cycle;

  if creates_cycle then
    raise exception 'hierarchy relationship would create a cycle';
  end if;
  return new;
end;
$$;
create trigger hierarchy_relationships_validate
  before insert or update on public.hierarchy_relationships
  for each row execute function public.validate_hierarchy_relationship();

create or replace function public.validate_restaurant_assignment()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  assignment_company uuid;
  restaurant_company uuid;
begin
  select company_id into assignment_company from public.organizational_assignments where id = new.organizational_assignment_id;
  select company_id into restaurant_company from public.restaurants where id = new.restaurant_id;
  if assignment_company is distinct from restaurant_company then
    raise exception 'restaurant and assignment must belong to the same company';
  end if;
  return new;
end;
$$;
create trigger restaurant_assignments_validate
  before insert or update on public.restaurant_assignments
  for each row execute function public.validate_restaurant_assignment();
