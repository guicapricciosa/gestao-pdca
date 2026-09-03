create type public.pdca_phase as enum ('PLAN', 'DO', 'CHECK', 'ACT');
create type public.object_membership_role as enum ('COLLABORATOR', 'WATCHER');
create type public.pdca_dependency_kind as enum ('PDCA', 'TASK', 'EXTERNAL');

create table public.execution_status_definitions (
  code text primary key,
  label text not null,
  semantic_category text not null,
  sort_order smallint not null,
  is_active boolean not null default true,
  constraint execution_status_code check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  constraint execution_status_semantic check (semantic_category in ('NON_OPERATIONAL','NOT_STARTED','ACTIVE','TERMINAL_SUCCESS','TERMINAL_NON_SUCCESS'))
);
insert into public.execution_status_definitions (code,label,semantic_category,sort_order) values
  ('DRAFT','Draft','NON_OPERATIONAL',10), ('OPEN','Open','NOT_STARTED',20),
  ('PLANNED','Planned','NOT_STARTED',30), ('IN_PROGRESS','In Progress','ACTIVE',40),
  ('BLOCKED','Blocked','ACTIVE',50), ('WAITING','Waiting','ACTIVE',60),
  ('UNDER_REVIEW','Under Review','ACTIVE',70), ('COMPLETED','Completed','TERMINAL_SUCCESS',80),
  ('CANCELLED','Cancelled','TERMINAL_NON_SUCCESS',90), ('ARCHIVED','Archived','NON_OPERATIONAL',100);

create table public.decision_status_definitions (
  code text primary key,
  label text not null,
  sort_order smallint not null,
  is_active boolean not null default true,
  constraint decision_status_code check (code ~ '^[A-Z][A-Z0-9_]{1,31}$')
);
insert into public.decision_status_definitions (code,label,sort_order) values
  ('DRAFT','Draft',10), ('ACTIVE','Active',20), ('ARCHIVED','Archived',30);

create table public.severity_definitions (
  code text primary key,
  label text not null,
  weight smallint not null,
  sort_order smallint not null,
  is_active boolean not null default true,
  constraint severity_code check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  constraint severity_weight check (weight between 1 and 100)
);
insert into public.severity_definitions (code,label,weight,sort_order) values
  ('LOW','Low',10,10), ('MEDIUM','Medium',25,20), ('HIGH','High',50,30), ('CRITICAL','Critical',100,40);

create table public.decisions (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid not null unique references public.security_objects(id) on delete restrict,
  title text not null,
  description text,
  decision_date date not null default current_date,
  status text not null default 'ACTIVE' references public.decision_status_definitions(code) on update restrict,
  decided_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint decisions_title_length check (char_length(btrim(title)) between 2 and 240),
  constraint decisions_version_positive check (version > 0),
  constraint decisions_archive_consistent check ((status = 'ARCHIVED') = (archived_at is not null))
);
create index decisions_company_date_idx on public.decisions (company_id, decision_date desc, id);
create index decisions_active_idx on public.decisions (company_id, updated_at desc) where archived_at is null;

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid not null unique references public.security_objects(id) on delete restrict,
  pdca_id uuid,
  originating_decision_id uuid references public.decisions(id) on delete restrict,
  title text not null,
  description text,
  status text not null default 'DRAFT' references public.execution_status_definitions(code) on update restrict,
  priority text not null default 'MEDIUM' references public.severity_definitions(code) on update restrict,
  owner_profile_id uuid references public.profiles(id) on delete restrict,
  responsible_profile_id uuid references public.profiles(id) on delete restrict,
  start_date date,
  due_date date,
  first_action_at timestamptz,
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by_profile_id uuid references public.profiles(id) on delete restrict,
  completion_notes text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint tasks_title_length check (char_length(btrim(title)) between 2 and 240),
  constraint tasks_dates check (due_date is null or start_date is null or due_date >= start_date),
  constraint tasks_version_positive check (version > 0),
  constraint tasks_completed_consistent check (
    (status = 'COMPLETED' and completed_at is not null and completed_by_profile_id is not null)
    or status <> 'COMPLETED'
  ),
  constraint tasks_archive_consistent check ((status = 'ARCHIVED') = (archived_at is not null))
);
create index tasks_company_status_due_idx on public.tasks (company_id, status, due_date, id);
create index tasks_owner_current_idx on public.tasks (owner_profile_id, status, due_date) where archived_at is null;
create index tasks_responsible_current_idx on public.tasks (responsible_profile_id, status, due_date) where archived_at is null;
create index tasks_pdca_idx on public.tasks (pdca_id) where pdca_id is not null;
create index tasks_search_idx on public.tasks using gin (to_tsvector('simple', title || ' ' || coalesce(description, '')));

create table public.pdcas (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid not null unique references public.security_objects(id) on delete restrict,
  originating_decision_id uuid references public.decisions(id) on delete restrict,
  title text not null,
  problem_statement text,
  objective text,
  root_cause_or_hypothesis text,
  plan_summary text,
  expected_result text,
  kpi_name text,
  kpi_unit text,
  kpi_baseline numeric,
  kpi_target numeric,
  kpi_measurement_method text,
  kpi_result numeric,
  actual_result text,
  check_notes text,
  corrective_action text,
  outcome_notes text,
  closure_notes text,
  status text not null default 'DRAFT' references public.execution_status_definitions(code) on update restrict,
  phase public.pdca_phase not null default 'PLAN',
  priority text not null default 'MEDIUM' references public.severity_definitions(code) on update restrict,
  impact text not null default 'MEDIUM' references public.severity_definitions(code) on update restrict,
  risk text not null default 'MEDIUM' references public.severity_definitions(code) on update restrict,
  owner_profile_id uuid references public.profiles(id) on delete restrict,
  responsible_profile_id uuid references public.profiles(id) on delete restrict,
  start_date date,
  due_date date,
  first_action_at timestamptz,
  last_activity_at timestamptz not null default now(),
  completed_at timestamptz,
  completed_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint pdcas_title_length check (char_length(btrim(title)) between 2 and 240),
  constraint pdcas_dates check (due_date is null or start_date is null or due_date >= start_date),
  constraint pdcas_version_positive check (version > 0),
  constraint pdcas_completed_consistent check (
    (status = 'COMPLETED' and completed_at is not null and completed_by_profile_id is not null)
    or status <> 'COMPLETED'
  ),
  constraint pdcas_archive_consistent check ((status = 'ARCHIVED') = (archived_at is not null))
);
alter table public.tasks add constraint tasks_pdca_fk foreign key (pdca_id) references public.pdcas(id) on delete restrict;
create index pdcas_company_status_due_idx on public.pdcas (company_id, status, due_date, id);
create index pdcas_owner_current_idx on public.pdcas (owner_profile_id, status, due_date) where archived_at is null;
create index pdcas_responsible_current_idx on public.pdcas (responsible_profile_id, status, due_date) where archived_at is null;
create index pdcas_search_idx on public.pdcas using gin (to_tsvector('simple', title || ' ' || coalesce(problem_statement, '') || ' ' || coalesce(objective, '')));

create table public.object_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  membership_role public.object_membership_role not null,
  added_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint object_memberships_end_consistent check (
    (ended_at is null and ended_by_profile_id is null) or
    (ended_at is not null and ended_by_profile_id is not null)
  )
);
create unique index object_memberships_active_unique on public.object_memberships (security_object_id, profile_id, membership_role) where ended_at is null;
create index object_memberships_profile_idx on public.object_memberships (profile_id, membership_role, created_at desc) where ended_at is null;

create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  hidden_at timestamptz,
  hidden_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint comments_body_length check (char_length(btrim(body)) between 1 and 10000),
  constraint comments_hidden_consistent check (
    (hidden_at is null and hidden_by_profile_id is null) or
    (hidden_at is not null and hidden_by_profile_id is not null)
  )
);
create index comments_object_time_idx on public.comments (security_object_id, created_at, id) where hidden_at is null;

create table public.attachments (
  id uuid primary key default extensions.gen_random_uuid(),
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_bucket text not null default 'execution-attachments',
  storage_path text not null unique,
  uploaded_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint attachments_filename_length check (char_length(btrim(filename)) between 1 and 255),
  constraint attachments_mime_length check (char_length(btrim(mime_type)) between 3 and 255),
  constraint attachments_size check (size_bytes between 0 and 52428800),
  constraint attachments_path_safe check (storage_path !~ '(^|/)\.\.(/|$)' and storage_path !~ '^/'),
  constraint attachments_delete_consistent check (
    (deleted_at is null and deleted_by_profile_id is null) or
    (deleted_at is not null and deleted_by_profile_id is not null)
  )
);
create index attachments_object_time_idx on public.attachments (security_object_id, created_at desc) where deleted_at is null;

create table public.decision_task_links (
  decision_id uuid not null references public.decisions(id) on delete restrict,
  task_id uuid not null references public.tasks(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (decision_id, task_id)
);
create index decision_task_links_task_idx on public.decision_task_links (task_id, decision_id);

create table public.decision_pdca_links (
  decision_id uuid not null references public.decisions(id) on delete restrict,
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (decision_id, pdca_id)
);
create index decision_pdca_links_pdca_idx on public.decision_pdca_links (pdca_id, decision_id);

create table public.task_status_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  from_status text references public.execution_status_definitions(code) on update restrict,
  to_status text not null references public.execution_status_definitions(code) on update restrict,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);
create index task_status_transitions_task_idx on public.task_status_transitions (task_id, changed_at, id);

create table public.pdca_status_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  from_status text references public.execution_status_definitions(code) on update restrict,
  to_status text not null references public.execution_status_definitions(code) on update restrict,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);
create index pdca_status_transitions_pdca_idx on public.pdca_status_transitions (pdca_id, changed_at, id);

create table public.pdca_phase_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  from_phase public.pdca_phase,
  to_phase public.pdca_phase not null,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);
create index pdca_phase_transitions_pdca_idx on public.pdca_phase_transitions (pdca_id, changed_at, id);

create table public.task_due_date_changes (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  old_due_date date,
  new_due_date date,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  changed_at timestamptz not null default now(),
  constraint task_due_date_changed check (old_due_date is distinct from new_due_date),
  constraint task_due_date_reason check (char_length(btrim(reason)) between 3 and 1000)
);
create index task_due_date_changes_task_idx on public.task_due_date_changes (task_id, changed_at, id);

create table public.pdca_due_date_changes (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  old_due_date date,
  new_due_date date,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  changed_at timestamptz not null default now(),
  constraint pdca_due_date_changed check (old_due_date is distinct from new_due_date),
  constraint pdca_due_date_reason check (char_length(btrim(reason)) between 3 and 1000)
);
create index pdca_due_date_changes_pdca_idx on public.pdca_due_date_changes (pdca_id, changed_at, id);

create table public.task_completion_events (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  completed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  due_date_snapshot date,
  completion_notes text,
  cycle_number integer not null,
  constraint task_completion_cycle_positive check (cycle_number > 0),
  unique (task_id, cycle_number)
);

create table public.pdca_completion_events (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  completed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  due_date_snapshot date,
  actual_result_snapshot text,
  closure_notes text,
  cycle_number integer not null,
  constraint pdca_completion_cycle_positive check (cycle_number > 0),
  unique (pdca_id, cycle_number)
);

create table public.task_reopening_events (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  reopened_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reopened_at timestamptz not null default now(),
  reason text not null,
  previous_completion_event_id uuid not null references public.task_completion_events(id) on delete restrict,
  constraint task_reopening_reason check (char_length(btrim(reason)) between 3 and 1000)
);

create table public.pdca_reopening_events (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  reopened_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reopened_at timestamptz not null default now(),
  reason text not null,
  previous_completion_event_id uuid not null references public.pdca_completion_events(id) on delete restrict,
  constraint pdca_reopening_reason check (char_length(btrim(reason)) between 3 and 1000)
);

create table public.task_blockers (
  id uuid primary key default extensions.gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  reason text not null,
  blocked_at timestamptz not null default now(),
  blocked_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete restrict,
  resolution_notes text,
  constraint task_blocker_reason check (char_length(btrim(reason)) between 3 and 2000),
  constraint task_blocker_resolution_consistent check (
    (resolved_at is null and resolved_by_profile_id is null) or
    (resolved_at is not null and resolved_by_profile_id is not null and resolved_at >= blocked_at)
  )
);
create index task_blockers_active_idx on public.task_blockers (task_id, blocked_at) where resolved_at is null;

create table public.pdca_blockers (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  reason text not null,
  blocked_at timestamptz not null default now(),
  blocked_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete restrict,
  resolution_notes text,
  constraint pdca_blocker_reason check (char_length(btrim(reason)) between 3 and 2000),
  constraint pdca_blocker_resolution_consistent check (
    (resolved_at is null and resolved_by_profile_id is null) or
    (resolved_at is not null and resolved_by_profile_id is not null and resolved_at >= blocked_at)
  )
);
create index pdca_blockers_active_idx on public.pdca_blockers (pdca_id, blocked_at) where resolved_at is null;

create table public.task_dependencies (
  task_id uuid not null references public.tasks(id) on delete restrict,
  depends_on_task_id uuid not null references public.tasks(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint task_dependencies_not_self check (task_id <> depends_on_task_id)
);
create index task_dependencies_prerequisite_idx on public.task_dependencies (depends_on_task_id, task_id);

create table public.pdca_dependencies (
  id uuid primary key default extensions.gen_random_uuid(),
  pdca_id uuid not null references public.pdcas(id) on delete restrict,
  dependency_kind public.pdca_dependency_kind not null,
  depends_on_pdca_id uuid references public.pdcas(id) on delete restrict,
  depends_on_task_id uuid references public.tasks(id) on delete restrict,
  external_label text,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  resolved_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint pdca_dependencies_target check (
    (dependency_kind = 'PDCA' and depends_on_pdca_id is not null and depends_on_task_id is null and external_label is null and depends_on_pdca_id <> pdca_id)
    or (dependency_kind = 'TASK' and depends_on_task_id is not null and depends_on_pdca_id is null and external_label is null)
    or (dependency_kind = 'EXTERNAL' and depends_on_pdca_id is null and depends_on_task_id is null and char_length(btrim(external_label)) between 3 and 500)
  ),
  constraint pdca_dependencies_resolution check ((is_resolved and resolved_at is not null and resolved_by_profile_id is not null) or (not is_resolved and resolved_at is null and resolved_by_profile_id is null))
);
create index pdca_dependencies_pdca_idx on public.pdca_dependencies (pdca_id, is_resolved, created_at);

create trigger decisions_set_updated_at before update on public.decisions for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger pdcas_set_updated_at before update on public.pdcas for each row execute function public.set_updated_at();

create or replace function private.validate_execution_security_object()
returns trigger language plpgsql set search_path = '' as $$
declare object_row public.security_objects;
begin
  select * into object_row from public.security_objects where id = new.security_object_id;
  if not found or object_row.company_id <> new.company_id or object_row.object_type <> tg_argv[0] then
    raise exception 'invalid % security object', tg_argv[0];
  end if;
  if object_row.created_by_profile_id <> new.created_by_profile_id then
    raise exception 'aggregate creator must match security object creator';
  end if;
  return new;
end $$;
create trigger decisions_validate_security before insert or update on public.decisions for each row execute function private.validate_execution_security_object('DECISION');
create trigger tasks_validate_security before insert or update on public.tasks for each row execute function private.validate_execution_security_object('TASK');
create trigger pdcas_validate_security before insert or update on public.pdcas for each row execute function private.validate_execution_security_object('PDCA');

create or replace function private.validate_assignee_access()
returns trigger language plpgsql security definer set search_path = '' set row_security = off as $$
declare permission_key text;
begin
  permission_key := lower(tg_argv[0]) || '.read';
  if new.owner_profile_id is not null and not private.can_access_security_object(new.owner_profile_id, new.security_object_id, permission_key) then
    raise exception 'owner must already have access; create an explicit grant separately if authorized';
  end if;
  if new.responsible_profile_id is not null and not private.can_access_security_object(new.responsible_profile_id, new.security_object_id, permission_key) then
    raise exception 'responsible must already have access; create an explicit grant separately if authorized';
  end if;
  return new;
end $$;
create trigger tasks_validate_assignees before insert or update of owner_profile_id, responsible_profile_id on public.tasks for each row execute function private.validate_assignee_access('TASK');
create trigger pdcas_validate_assignees before insert or update of owner_profile_id, responsible_profile_id on public.pdcas for each row execute function private.validate_assignee_access('PDCA');

create or replace function private.validate_membership_access()
returns trigger language plpgsql security definer set search_path = '' set row_security = off as $$
declare target_type text;
begin
  select object_type into target_type from public.security_objects where id = new.security_object_id;
  if target_type not in ('TASK', 'PDCA', 'DECISION') then raise exception 'unsupported membership object type'; end if;
  if not private.can_access_security_object(new.profile_id, new.security_object_id, lower(target_type) || '.read') then
    raise exception 'member must already have access; explicit grants are separate';
  end if;
  return new;
end $$;
create trigger object_memberships_validate_access before insert on public.object_memberships for each row execute function private.validate_membership_access();

create or replace function private.prevent_task_dependency_cycle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    with recursive dependency_path(task_id) as (
      select new.depends_on_task_id
      union
      select td.depends_on_task_id from public.task_dependencies td join dependency_path path on td.task_id = path.task_id
    ) select 1 from dependency_path where task_id = new.task_id
  ) then raise exception 'task dependency cycle detected'; end if;
  return new;
end $$;
create trigger task_dependencies_prevent_cycle before insert or update on public.task_dependencies for each row execute function private.prevent_task_dependency_cycle();

create or replace function private.prevent_pdca_dependency_cycle()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.dependency_kind = 'PDCA' and exists (
    with recursive dependency_path(pdca_id) as (
      select new.depends_on_pdca_id
      union
      select dependency.depends_on_pdca_id
      from public.pdca_dependencies dependency
      join dependency_path path on dependency.pdca_id = path.pdca_id
      where dependency.dependency_kind = 'PDCA'
    ) select 1 from dependency_path where pdca_id = new.pdca_id
  ) then raise exception 'pdca dependency cycle detected'; end if;
  return new;
end $$;
create trigger pdca_dependencies_prevent_cycle before insert or update on public.pdca_dependencies for each row execute function private.prevent_pdca_dependency_cycle();

create or replace view public.execution_activity with (security_invoker = true) as
select id, company_id, security_object_id, action, actor_profile_id, reason, before_data, after_data, metadata, occurred_at
from public.audit_events
where security_object_id is not null and subject_type in ('DECISION', 'TASK', 'PDCA', 'COMMENT', 'ATTACHMENT', 'OBJECT_MEMBERSHIP');

create or replace view public.decision_list_items with (security_invoker = true) as
select decision.id, decision.security_object_id, decision.title, decision.description, decision.decision_date,
  decision.status, decision.decided_by_profile_id, decision.created_by_profile_id, decision.version, decision.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id = decision.security_object_id), array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id = decision.security_object_id), array[]::uuid[]) restaurant_ids
from public.decisions decision;

create or replace view public.task_list_items with (security_invoker = true) as
select task.id, task.security_object_id, task.title, task.description, task.status, task.priority,
  task.owner_profile_id, task.responsible_profile_id, task.due_date, task.completed_at, task.version, task.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id = task.security_object_id), array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id = task.security_object_id), array[]::uuid[]) restaurant_ids
from public.tasks task;

create or replace view public.pdca_list_items with (security_invoker = true) as
select pdca.id, pdca.security_object_id, pdca.title, pdca.problem_statement, pdca.objective, pdca.status, pdca.phase,
  pdca.priority, pdca.impact, pdca.risk, pdca.owner_profile_id, pdca.responsible_profile_id, pdca.due_date,
  pdca.version, pdca.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id = pdca.security_object_id), array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id = pdca.security_object_id), array[]::uuid[]) restaurant_ids
from public.pdcas pdca;

alter table public.execution_status_definitions enable row level security;
alter table public.decision_status_definitions enable row level security;
alter table public.severity_definitions enable row level security;
alter table public.decisions enable row level security;
alter table public.tasks enable row level security;
alter table public.pdcas enable row level security;
alter table public.object_memberships enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.decision_task_links enable row level security;
alter table public.decision_pdca_links enable row level security;
alter table public.task_status_transitions enable row level security;
alter table public.pdca_status_transitions enable row level security;
alter table public.pdca_phase_transitions enable row level security;
alter table public.task_due_date_changes enable row level security;
alter table public.pdca_due_date_changes enable row level security;
alter table public.task_completion_events enable row level security;
alter table public.pdca_completion_events enable row level security;
alter table public.task_reopening_events enable row level security;
alter table public.pdca_reopening_events enable row level security;
alter table public.task_blockers enable row level security;
alter table public.pdca_blockers enable row level security;
alter table public.task_dependencies enable row level security;
alter table public.pdca_dependencies enable row level security;

create policy execution_status_definitions_read on public.execution_status_definitions
  for select to authenticated using (private.current_profile_id() is not null);
create policy decision_status_definitions_read on public.decision_status_definitions
  for select to authenticated using (private.current_profile_id() is not null);
create policy severity_definitions_read on public.severity_definitions
  for select to authenticated using (private.current_profile_id() is not null);
create policy decisions_read on public.decisions for select to authenticated using (private.can_access_security_object(private.current_profile_id(), security_object_id, 'decision.read'));
create policy tasks_read on public.tasks for select to authenticated using (private.can_access_security_object(private.current_profile_id(), security_object_id, 'task.read'));
create policy pdcas_read on public.pdcas for select to authenticated using (private.can_access_security_object(private.current_profile_id(), security_object_id, 'pdca.read'));
create policy memberships_read on public.object_memberships for select to authenticated using (private.can_access_security_object(private.current_profile_id(), security_object_id, lower((select object_type from public.security_objects where id = security_object_id)) || '.read'));
create policy comments_read on public.comments for select to authenticated using (hidden_at is null and private.can_access_security_object(private.current_profile_id(), security_object_id, lower((select object_type from public.security_objects where id = security_object_id)) || '.read'));
create policy attachments_read on public.attachments for select to authenticated using (deleted_at is null and private.can_access_security_object(private.current_profile_id(), security_object_id, 'attachment.read'));
create policy audit_execution_activity_read on public.audit_events for select to authenticated using (
  security_object_id is not null and exists (
    select 1 from public.security_objects object_row where object_row.id = security_object_id
      and private.can_access_security_object(private.current_profile_id(), security_object_id, lower(object_row.object_type) || '.read')
  )
);

create policy decision_task_links_read on public.decision_task_links for select to authenticated using (
  private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.decisions where id = decision_id), 'decision.read')
  and private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read')
);
create policy decision_pdca_links_read on public.decision_pdca_links for select to authenticated using (
  private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.decisions where id = decision_id), 'decision.read')
  and private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read')
);
create policy task_status_history_read on public.task_status_transitions for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read'));
create policy pdca_status_history_read on public.pdca_status_transitions for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy pdca_phase_history_read on public.pdca_phase_transitions for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy task_due_history_read on public.task_due_date_changes for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read'));
create policy pdca_due_history_read on public.pdca_due_date_changes for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy task_completion_read on public.task_completion_events for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read'));
create policy pdca_completion_read on public.pdca_completion_events for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy task_reopening_read on public.task_reopening_events for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read'));
create policy pdca_reopening_read on public.pdca_reopening_events for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy task_blockers_read on public.task_blockers for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read'));
create policy pdca_blockers_read on public.pdca_blockers for select to authenticated using (private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read'));
create policy task_dependencies_read on public.task_dependencies for select to authenticated using (
  private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = task_id), 'task.read')
  and private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = depends_on_task_id), 'task.read')
);
create policy pdca_dependencies_read on public.pdca_dependencies for select to authenticated using (
  private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = pdca_id), 'pdca.read')
  and (depends_on_pdca_id is null or private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.pdcas where id = depends_on_pdca_id), 'pdca.read'))
  and (depends_on_task_id is null or private.can_access_security_object(private.current_profile_id(), (select security_object_id from public.tasks where id = depends_on_task_id), 'task.read'))
);

insert into storage.buckets (id, name, public, file_size_limit) values ('execution-attachments', 'execution-attachments', false, 52428800) on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy execution_attachments_download on storage.objects for select to authenticated using (
  bucket_id = 'execution-attachments' and exists (
    select 1 from public.attachments attachment
    where attachment.storage_bucket = bucket_id and attachment.storage_path = name and attachment.deleted_at is null
      and private.can_access_security_object(private.current_profile_id(), attachment.security_object_id, 'attachment.read')
  )
);
create policy execution_attachments_upload on storage.objects for insert to authenticated with check (
  bucket_id = 'execution-attachments' and exists (
    select 1 from public.attachments attachment
    where attachment.storage_bucket = bucket_id and attachment.storage_path = name and attachment.deleted_at is null
      and attachment.uploaded_by_profile_id = private.current_profile_id()
      and private.can_access_security_object(private.current_profile_id(), attachment.security_object_id, 'attachment.upload')
  )
);

revoke insert, update, delete on public.execution_status_definitions, public.decision_status_definitions, public.severity_definitions,
  public.decisions, public.tasks, public.pdcas, public.object_memberships, public.comments, public.attachments,
  public.decision_task_links, public.decision_pdca_links, public.task_status_transitions, public.pdca_status_transitions,
  public.pdca_phase_transitions, public.task_due_date_changes, public.pdca_due_date_changes, public.task_completion_events,
  public.pdca_completion_events, public.task_reopening_events, public.pdca_reopening_events, public.task_blockers,
  public.pdca_blockers, public.task_dependencies, public.pdca_dependencies from authenticated;
