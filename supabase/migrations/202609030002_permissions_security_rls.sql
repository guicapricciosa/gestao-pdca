create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.security_objects (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  object_type text not null,
  visibility public.visibility_mode not null default 'NORMAL',
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  archived_at timestamptz,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint security_objects_type_format check (object_type ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint security_objects_version_positive check (version > 0)
);
create index security_objects_company_type_visibility_idx
  on public.security_objects (company_id, object_type, visibility) where archived_at is null;
create index security_objects_creator_idx on public.security_objects (created_by_profile_id, created_at desc);
create trigger security_objects_set_updated_at before update on public.security_objects
  for each row execute function public.set_updated_at();

create table public.object_scope_organizational_units (
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  organizational_unit_id uuid not null references public.organizational_units(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  primary key (security_object_id, organizational_unit_id)
);
create index object_scope_units_reverse_idx
  on public.object_scope_organizational_units (organizational_unit_id, security_object_id);

create table public.object_scope_restaurants (
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  primary key (security_object_id, restaurant_id)
);
create index object_scope_restaurants_reverse_idx
  on public.object_scope_restaurants (restaurant_id, security_object_id);

create table public.explicit_access_grants (
  id uuid primary key default extensions.gen_random_uuid(),
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  grantee_profile_id uuid not null references public.profiles(id) on delete restrict,
  permission_id uuid not null references public.permissions(id) on delete restrict,
  granted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  revoked_at timestamptz,
  revoked_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint explicit_access_grants_reason_required check (char_length(btrim(reason)) between 3 and 500),
  constraint explicit_access_grants_dates check (valid_to is null or valid_to > valid_from),
  constraint explicit_access_grants_revocation check (
    (revoked_at is null and revoked_by_profile_id is null)
    or (revoked_at is not null and revoked_by_profile_id is not null)
  )
);
create unique index explicit_access_grants_active_unique
  on public.explicit_access_grants (security_object_id, grantee_profile_id, permission_id)
  where revoked_at is null and valid_to is null;
create index explicit_access_grants_grantee_current_idx
  on public.explicit_access_grants (grantee_profile_id, valid_from, valid_to)
  where revoked_at is null;
create index explicit_access_grants_object_idx
  on public.explicit_access_grants (security_object_id, created_at desc);

create table public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid references public.security_objects(id) on delete restrict,
  subject_type text not null,
  subject_id uuid not null,
  action text not null,
  actor_profile_id uuid references public.profiles(id) on delete restrict,
  actor_type text not null default 'USER',
  request_id uuid,
  reason text,
  before_data jsonb,
  after_data jsonb,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_subject_type_format check (subject_type ~ '^[A-Z][A-Z0-9_]{1,63}$'),
  constraint audit_events_action_format check (action ~ '^[a-z][a-z0-9_.]{2,127}$'),
  constraint audit_events_actor_type check (actor_type in ('USER', 'SYSTEM')),
  constraint audit_events_actor_present check (actor_type = 'SYSTEM' or actor_profile_id is not null)
);
create index audit_events_company_time_idx on public.audit_events (company_id, occurred_at desc);
create index audit_events_object_time_idx on public.audit_events (security_object_id, occurred_at desc);
create index audit_events_actor_time_idx on public.audit_events (actor_profile_id, occurred_at desc);

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.is_active
  limit 1
$$;

create or replace function private.assignment_is_current(
  assignment public.organizational_assignments,
  at_date date default current_date
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select assignment.is_active
    and assignment.valid_from <= at_date
    and (assignment.valid_to is null or assignment.valid_to >= at_date)
$$;

create or replace function private.assignment_has_permission(
  assignment_id uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.organizational_assignments oa
    join public.profiles pr on pr.id = oa.profile_id and pr.is_active
    join public.roles r on r.id = oa.role_id and r.is_active
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id and p.is_active
    where oa.id = assignment_id
      and private.assignment_is_current(oa)
      and p.permission_key = requested_permission
  )
$$;

create or replace function private.has_company_permission(
  p_profile_id uuid,
  p_target_company_id uuid,
  p_requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.organizational_assignments oa
    where oa.profile_id = p_profile_id
      and oa.company_id = p_target_company_id
      and private.assignment_is_current(oa)
      and private.assignment_has_permission(oa.id, p_requested_permission)
  )
$$;

create or replace function private.assignment_restaurant_ids(assignment_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  with recursive assignment_tree(id) as (
    select oa.id
    from public.organizational_assignments oa
    where oa.id = assignment_id and private.assignment_is_current(oa)
    union
    select hr.child_assignment_id
    from public.hierarchy_relationships hr
    join assignment_tree tree on tree.id = hr.parent_assignment_id
    join public.organizational_assignments child on child.id = hr.child_assignment_id
    where hr.is_active
      and hr.valid_from <= current_date
      and (hr.valid_to is null or hr.valid_to >= current_date)
      and private.assignment_is_current(child)
  ), selected_assignments as (
    select tree.id
    from assignment_tree tree
    join public.organizational_assignments root on root.id = assignment_id
    where root.restaurant_scope_mode = 'INHERITED'
    union
    select assignment_id
  )
  select distinct ra.restaurant_id
  from selected_assignments selected
  join public.restaurant_assignments ra on ra.organizational_assignment_id = selected.id
  join public.restaurants restaurant on restaurant.id = ra.restaurant_id and restaurant.is_active
  where ra.is_active
    and ra.valid_from <= current_date
    and (ra.valid_to is null or ra.valid_to >= current_date)
$$;

create or replace function private.assignment_covers_object(
  assignment_id uuid,
  target_object_id uuid,
  require_full_coverage boolean
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  assignment_row public.organizational_assignments;
  object_company uuid;
  unit_total integer;
  unit_covered integer;
  restaurant_total integer;
  restaurant_covered integer;
begin
  select * into assignment_row
  from public.organizational_assignments oa
  where oa.id = assignment_id and private.assignment_is_current(oa);
  if not found then return false; end if;

  select company_id into object_company from public.security_objects where id = target_object_id;
  if object_company is distinct from assignment_row.company_id then return false; end if;

  select count(*) into unit_total
  from public.object_scope_organizational_units where security_object_id = target_object_id;
  select count(*) into unit_covered
  from public.object_scope_organizational_units osu
  where osu.security_object_id = target_object_id
    and (
      assignment_row.unit_scope_mode = 'COMPANY_WIDE'
      or osu.organizational_unit_id = assignment_row.organizational_unit_id
    );

  if unit_total = 0 then
    if assignment_row.unit_scope_mode <> 'COMPANY_WIDE' then return false; end if;
  elsif require_full_coverage and unit_covered <> unit_total then
    return false;
  elsif not require_full_coverage and unit_covered = 0 then
    return false;
  end if;

  select count(*) into restaurant_total
  from public.object_scope_restaurants where security_object_id = target_object_id;
  if restaurant_total = 0 then return true; end if;
  if assignment_row.restaurant_scope_mode = 'COMPANY_WIDE' then return true; end if;
  if assignment_row.restaurant_scope_mode = 'NONE' then return false; end if;

  select count(*) into restaurant_covered
  from public.object_scope_restaurants osr
  where osr.security_object_id = target_object_id
    and osr.restaurant_id in (select private.assignment_restaurant_ids(assignment_id));

  if require_full_coverage then return restaurant_covered = restaurant_total; end if;
  return restaurant_covered > 0;
end;
$$;

create or replace function private.permission_requires_full_coverage(requested_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select coalesce(
    (select p.scope_requirement = 'COVER_ALL'
     from public.permissions p
     where p.permission_key = requested_permission and p.is_active),
    true
  )
$$;

create or replace function private.has_explicit_grant(
  p_profile_id uuid,
  p_target_object_id uuid,
  p_requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.explicit_access_grants grant_row
    join public.permissions p on p.id = grant_row.permission_id and p.is_active
    where grant_row.security_object_id = p_target_object_id
      and grant_row.grantee_profile_id = p_profile_id
      and p.permission_key = p_requested_permission
      and grant_row.revoked_at is null
      and grant_row.valid_from <= now()
      and (grant_row.valid_to is null or grant_row.valid_to > now())
  )
$$;

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
    return object_row.created_by_profile_id = p_profile_id and p_requested_permission like '%.read';
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
          and private.assignment_has_permission(oa.id, 'security.restricted.read')
        )
      )
  );
end;
$$;

create or replace function private.can_issue_grant(
  p_profile_id uuid,
  p_target_object_id uuid,
  p_granted_permission_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.organizational_assignments oa
    join public.permissions target_permission on target_permission.id = p_granted_permission_id
      and target_permission.is_active and target_permission.is_delegable
    where oa.profile_id = p_profile_id
      and private.assignment_is_current(oa)
      and private.assignment_has_permission(oa.id, 'security.grant.manage')
      and private.assignment_has_permission(oa.id, target_permission.permission_key)
      and private.assignment_covers_object(oa.id, p_target_object_id, true)
  )
$$;

create or replace function public.authorize_security_object(
  target_object_id uuid,
  requested_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.can_access_security_object(
    private.current_profile_id(),
    target_object_id,
    requested_permission
  )
$$;

create or replace function public.get_accessible_scope()
returns table (
  assignment_id uuid,
  company_id uuid,
  permission_key text,
  organizational_unit_id uuid,
  unit_scope public.unit_scope_mode,
  restaurant_scope public.restaurant_scope_mode,
  restaurant_id uuid
)
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select
    oa.id,
    oa.company_id,
    permission.permission_key,
    oa.organizational_unit_id,
    oa.unit_scope_mode,
    oa.restaurant_scope_mode,
    covered_restaurant.restaurant_id
  from public.organizational_assignments oa
  join public.roles role on role.id = oa.role_id and role.is_active
  join public.role_permissions rp on rp.role_id = role.id
  join public.permissions permission on permission.id = rp.permission_id and permission.is_active
  left join lateral (
    select restaurant.id as restaurant_id
    from public.restaurants restaurant
    where oa.restaurant_scope_mode = 'COMPANY_WIDE'
      and restaurant.company_id = oa.company_id
      and restaurant.is_active
    union
    select private.assignment_restaurant_ids(oa.id)
    where oa.restaurant_scope_mode in ('ASSIGNED', 'INHERITED')
  ) covered_restaurant on true
  where oa.profile_id = private.current_profile_id()
    and private.assignment_is_current(oa)
$$;

create or replace function public.filter_accessible_security_objects(requested_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select object_row.id
  from public.security_objects object_row
  where object_row.archived_at is null
    and private.can_access_security_object(
      private.current_profile_id(),
      object_row.id,
      requested_permission
    )
$$;

create or replace function private.validate_security_scope_company()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  object_company uuid;
  scope_company uuid;
begin
  select company_id into object_company from public.security_objects where id = new.security_object_id;
  if tg_table_name = 'object_scope_organizational_units' then
    select company_id into scope_company from public.organizational_units where id = new.organizational_unit_id;
  else
    select company_id into scope_company from public.restaurants where id = new.restaurant_id;
  end if;
  if object_company is distinct from scope_company then
    raise exception 'security object and scope target must belong to the same company';
  end if;
  return new;
end;
$$;
create trigger object_scope_units_validate before insert or update on public.object_scope_organizational_units
  for each row execute function private.validate_security_scope_company();
create trigger object_scope_restaurants_validate before insert or update on public.object_scope_restaurants
  for each row execute function private.validate_security_scope_company();

create or replace function private.audit_explicit_grant()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  object_company uuid;
begin
  select company_id into object_company
  from public.security_objects
  where id = coalesce(new.security_object_id, old.security_object_id);

  insert into public.audit_events (
    company_id, security_object_id, subject_type, subject_id, action,
    actor_profile_id, reason, before_data, after_data
  ) values (
    object_company,
    coalesce(new.security_object_id, old.security_object_id),
    'EXPLICIT_ACCESS_GRANT',
    coalesce(new.id, old.id),
    case when tg_op = 'INSERT' then 'security.grant.created' else 'security.grant.changed' end,
    case
      when tg_op = 'INSERT' then new.granted_by_profile_id
      else coalesce(new.revoked_by_profile_id, new.granted_by_profile_id)
    end,
    coalesce(new.reason, old.reason),
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return new;
end;
$$;
create trigger explicit_access_grants_audit
  after insert or update on public.explicit_access_grants
  for each row execute function private.audit_explicit_grant();

create or replace function private.validate_explicit_grant_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
    or new.security_object_id <> old.security_object_id
    or new.grantee_profile_id <> old.grantee_profile_id
    or new.permission_id <> old.permission_id
    or new.granted_by_profile_id <> old.granted_by_profile_id
    or new.reason <> old.reason
    or new.valid_from <> old.valid_from then
    raise exception 'grant identity and provenance are immutable; revoke and create a new grant';
  end if;
  if old.revoked_at is not null then
    raise exception 'revoked grants are immutable';
  end if;
  return new;
end;
$$;
create trigger explicit_access_grants_validate_update
  before update on public.explicit_access_grants
  for each row execute function private.validate_explicit_grant_update();

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit events are append-only';
end;
$$;
create trigger audit_events_immutable before update or delete on public.audit_events
  for each row execute function private.prevent_audit_mutation();

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.organizational_units enable row level security;
alter table public.departments enable row level security;
alter table public.shared_services enable row level security;
alter table public.restaurants enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.organizational_assignments enable row level security;
alter table public.hierarchy_relationships enable row level security;
alter table public.restaurant_assignments enable row level security;
alter table public.security_objects enable row level security;
alter table public.object_scope_organizational_units enable row level security;
alter table public.object_scope_restaurants enable row level security;
alter table public.explicit_access_grants enable row level security;
alter table public.audit_events enable row level security;

create policy companies_read on public.companies for select to authenticated
  using (private.has_company_permission(private.current_profile_id(), id, 'organization.read'));
create policy companies_update on public.companies for update to authenticated
  using (private.has_company_permission(private.current_profile_id(), id, 'organization.manage'))
  with check (private.has_company_permission(private.current_profile_id(), id, 'organization.manage'));

create policy profiles_read_self_or_company on public.profiles for select to authenticated
  using (
    id = private.current_profile_id()
    or exists (
      select 1 from public.organizational_assignments target_assignment
      where target_assignment.profile_id = profiles.id
        and private.has_company_permission(
          private.current_profile_id(), target_assignment.company_id, 'organization.read'
        )
    )
  );

create policy organizational_units_read on public.organizational_units for select to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'organization.read'));
create policy organizational_units_manage on public.organizational_units for all to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage'))
  with check (private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage'));

create policy departments_read on public.departments for select to authenticated
  using (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.read')
  ));
create policy departments_manage on public.departments for all to authenticated
  using (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.manage')
  ))
  with check (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.manage')
  ));
create policy shared_services_read on public.shared_services for select to authenticated
  using (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.read')
  ));
create policy shared_services_manage on public.shared_services for all to authenticated
  using (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.manage')
  ))
  with check (exists (
    select 1 from public.organizational_units unit
    where unit.id = organizational_unit_id
      and private.has_company_permission(private.current_profile_id(), unit.company_id, 'organization.manage')
  ));

create policy restaurants_read on public.restaurants for select to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'organization.read'));
create policy restaurants_manage on public.restaurants for all to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage'))
  with check (private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage'));

create policy permissions_read on public.permissions for select to authenticated
  using (private.current_profile_id() is not null);
create policy permissions_manage on public.permissions for all to authenticated
  using (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.profile_id = private.current_profile_id()
      and private.assignment_is_current(assignment)
      and private.assignment_has_permission(assignment.id, 'authorization.manage')
  ))
  with check (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.profile_id = private.current_profile_id()
      and private.assignment_is_current(assignment)
      and private.assignment_has_permission(assignment.id, 'authorization.manage')
  ));
create policy roles_read on public.roles for select to authenticated
  using (
    company_id is null
    or private.has_company_permission(private.current_profile_id(), company_id, 'organization.read')
  );
create policy role_permissions_read on public.role_permissions for select to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_id
      and (role.company_id is null or private.has_company_permission(
        private.current_profile_id(), role.company_id, 'organization.read'
      ))
  ));
create policy roles_manage on public.roles for all to authenticated
  using (
    company_id is not null
    and private.has_company_permission(private.current_profile_id(), company_id, 'authorization.manage')
  )
  with check (
    company_id is not null
    and private.has_company_permission(private.current_profile_id(), company_id, 'authorization.manage')
  );
create policy role_permissions_manage on public.role_permissions for all to authenticated
  using (exists (
    select 1 from public.roles role
    where role.id = role_id and role.company_id is not null
      and private.has_company_permission(private.current_profile_id(), role.company_id, 'authorization.manage')
  ))
  with check (
    created_by_profile_id = private.current_profile_id()
    and exists (
      select 1 from public.roles role
      where role.id = role_id and role.company_id is not null
        and private.has_company_permission(private.current_profile_id(), role.company_id, 'authorization.manage')
    )
  );

create policy organizational_assignments_read on public.organizational_assignments for select to authenticated
  using (
    profile_id = private.current_profile_id()
    or private.has_company_permission(private.current_profile_id(), company_id, 'organization.read')
  );
create policy organizational_assignments_manage on public.organizational_assignments for all to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage'))
  with check (
    private.has_company_permission(private.current_profile_id(), company_id, 'organization.manage')
    and (created_by_profile_id is null or created_by_profile_id = private.current_profile_id())
  );

create policy hierarchy_relationships_read on public.hierarchy_relationships for select to authenticated
  using (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.id = parent_assignment_id
      and (
        assignment.profile_id = private.current_profile_id()
        or private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.read')
      )
  ));
create policy hierarchy_relationships_manage on public.hierarchy_relationships for all to authenticated
  using (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.id = parent_assignment_id
      and private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.manage')
  ))
  with check (
    (created_by_profile_id is null or created_by_profile_id = private.current_profile_id())
    and exists (
      select 1 from public.organizational_assignments assignment
      where assignment.id = parent_assignment_id
        and private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.manage')
    )
  );
create policy restaurant_assignments_read on public.restaurant_assignments for select to authenticated
  using (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.id = organizational_assignment_id
      and (
        assignment.profile_id = private.current_profile_id()
        or private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.read')
      )
  ));
create policy restaurant_assignments_manage on public.restaurant_assignments for all to authenticated
  using (exists (
    select 1 from public.organizational_assignments assignment
    where assignment.id = organizational_assignment_id
      and private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.manage')
  ))
  with check (
    (created_by_profile_id is null or created_by_profile_id = private.current_profile_id())
    and exists (
      select 1 from public.organizational_assignments assignment
      where assignment.id = organizational_assignment_id
        and private.has_company_permission(private.current_profile_id(), assignment.company_id, 'organization.manage')
    )
  );

create policy security_objects_read on public.security_objects for select to authenticated
  using (private.can_access_security_object(
    private.current_profile_id(), id, lower(object_type) || '.read'
  ));
create policy object_scope_units_read on public.object_scope_organizational_units for select to authenticated
  using (exists (
    select 1 from public.security_objects object_row
    where object_row.id = security_object_id
      and private.can_access_security_object(
        private.current_profile_id(), object_row.id, lower(object_row.object_type) || '.read'
      )
  ));
create policy object_scope_restaurants_read on public.object_scope_restaurants for select to authenticated
  using (exists (
    select 1 from public.security_objects object_row
    where object_row.id = security_object_id
      and private.can_access_security_object(
        private.current_profile_id(), object_row.id, lower(object_row.object_type) || '.read'
      )
  ));

create policy explicit_access_grants_read on public.explicit_access_grants for select to authenticated
  using (
    grantee_profile_id = private.current_profile_id()
    or private.can_issue_grant(private.current_profile_id(), security_object_id, permission_id)
  );
create policy explicit_access_grants_create on public.explicit_access_grants for insert to authenticated
  with check (
    granted_by_profile_id = private.current_profile_id()
    and private.can_issue_grant(private.current_profile_id(), security_object_id, permission_id)
  );
create policy explicit_access_grants_revoke on public.explicit_access_grants for update to authenticated
  using (private.can_issue_grant(private.current_profile_id(), security_object_id, permission_id))
  with check (
    revoked_at is not null
    and revoked_by_profile_id = private.current_profile_id()
    and private.can_issue_grant(private.current_profile_id(), security_object_id, permission_id)
  );

create policy audit_events_read on public.audit_events for select to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'audit.read'));

revoke all on function public.set_updated_at() from public;
revoke all on function public.validate_organizational_assignment() from public;
revoke all on function public.validate_hierarchy_relationship() from public;
revoke all on function public.validate_restaurant_assignment() from public;
revoke all on function public.authorize_security_object(uuid, text) from public;
revoke all on function public.get_accessible_scope() from public;
revoke all on function public.filter_accessible_security_objects(text) from public;
grant execute on function public.authorize_security_object(uuid, text) to authenticated;
grant execute on function public.get_accessible_scope() to authenticated;
grant execute on function public.filter_accessible_security_objects(text) to authenticated;
