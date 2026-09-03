insert into public.permissions (permission_key, description, risk_level, scope_requirement, is_delegable)
values
  ('decision.create', 'Create decisions in the full proposed scope', 2, 'COVER_ALL', false),
  ('decision.read', 'Read decisions', 1, 'INTERSECT', true),
  ('decision.update', 'Update decisions', 2, 'INTERSECT', true),
  ('decision.scope.update', 'Change the complete Decision scope', 3, 'COVER_ALL', true),
  ('decision.archive', 'Archive decisions in the full scope', 3, 'COVER_ALL', true),
  ('task.create', 'Create tasks in the full proposed scope', 2, 'COVER_ALL', false),
  ('task.read', 'Read tasks', 1, 'INTERSECT', true),
  ('task.update', 'Update tasks', 2, 'INTERSECT', true),
  ('task.scope.update', 'Change the complete Task scope', 3, 'COVER_ALL', true),
  ('task.archive', 'Archive tasks in the full scope', 3, 'COVER_ALL', true),
  ('pdca.create', 'Create PDCAs in the full proposed scope', 2, 'COVER_ALL', false),
  ('pdca.read', 'Read PDCAs', 1, 'INTERSECT', true),
  ('pdca.update', 'Update PDCAs', 2, 'INTERSECT', true),
  ('pdca.scope.update', 'Change the complete PDCA scope', 3, 'COVER_ALL', true),
  ('pdca.archive', 'Archive PDCAs in the full scope', 3, 'COVER_ALL', true),
  ('comment.create', 'Comment on authorized execution objects', 1, 'INTERSECT', true),
  ('attachment.read', 'Download authorized execution attachments', 1, 'INTERSECT', true),
  ('attachment.upload', 'Upload attachments to authorized execution objects', 2, 'INTERSECT', true)
on conflict (permission_key) do nothing;

create or replace function private.actor_has_full_scope_permission(
  p_profile_id uuid,
  p_object_id uuid,
  p_permission_key text
) returns boolean
language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (
    select 1 from public.organizational_assignments assignment
    where assignment.profile_id = p_profile_id
      and private.assignment_is_current(assignment)
      and private.assignment_has_permission(assignment.id, p_permission_key)
      and private.assignment_covers_object(assignment.id, p_object_id, true)
  )
$$;

create or replace function private.create_scoped_security_object(
  p_actor uuid,
  p_company_id uuid,
  p_object_type text,
  p_visibility public.visibility_mode,
  p_unit_ids uuid[],
  p_restaurant_ids uuid[],
  p_create_permission text
) returns uuid
language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare object_id uuid := extensions.gen_random_uuid(); target_id uuid;
begin
  if p_actor is null then raise exception 'authentication required'; end if;
  insert into public.security_objects (id, company_id, object_type, visibility, created_by_profile_id)
  values (object_id, p_company_id, p_object_type, p_visibility, p_actor);
  foreach target_id in array coalesce(p_unit_ids, array[]::uuid[]) loop
    insert into public.object_scope_organizational_units (security_object_id, organizational_unit_id, created_by_profile_id)
    values (object_id, target_id, p_actor);
  end loop;
  foreach target_id in array coalesce(p_restaurant_ids, array[]::uuid[]) loop
    insert into public.object_scope_restaurants (security_object_id, restaurant_id, created_by_profile_id)
    values (object_id, target_id, p_actor);
  end loop;
  if not private.actor_has_full_scope_permission(p_actor, object_id, p_create_permission) then
    raise exception 'insufficient permission for the complete proposed scope';
  end if;
  return object_id;
end $$;

create or replace function private.write_execution_audit(
  p_company_id uuid, p_object_id uuid, p_subject_type text, p_subject_id uuid,
  p_action text, p_actor uuid, p_reason text, p_before jsonb, p_after jsonb,
  p_metadata jsonb default '{}'::jsonb
) returns void
language sql volatile security definer set search_path = '' set row_security = off as $$
  insert into public.audit_events (
    company_id, security_object_id, subject_type, subject_id, action,
    actor_profile_id, reason, before_data, after_data, metadata
  ) values (
    p_company_id, p_object_id, p_subject_type, p_subject_id, p_action,
    p_actor, p_reason, p_before, p_after, coalesce(p_metadata, '{}'::jsonb)
  )
$$;

create or replace function public.create_decision(
  company_id uuid, title text, description text default null,
  decision_date date default current_date, decided_by_profile_id uuid default null,
  visibility public.visibility_mode default 'NORMAL', unit_ids uuid[] default array[]::uuid[],
  restaurant_ids uuid[] default array[]::uuid[], initial_status text default 'ACTIVE'
) returns uuid
language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_id uuid; aggregate_id uuid := extensions.gen_random_uuid(); row_after public.decisions;
begin
  if initial_status not in ('DRAFT','ACTIVE') then raise exception 'invalid initial Decision status'; end if;
  object_id := private.create_scoped_security_object(actor, company_id, 'DECISION', visibility, unit_ids, restaurant_ids, 'decision.create');
  insert into public.decisions (id, company_id, security_object_id, title, description, decision_date, status, decided_by_profile_id, created_by_profile_id)
  values (aggregate_id, company_id, object_id, btrim(title), description, decision_date, initial_status, decided_by_profile_id, actor) returning * into row_after;
  perform private.write_execution_audit(company_id, object_id, 'DECISION', aggregate_id, 'decision.created', actor, null, null, to_jsonb(row_after));
  return aggregate_id;
end $$;

create or replace function public.update_decision(
  decision_id uuid, expected_version bigint, title text, description text,
  decision_date date, decided_by_profile_id uuid
) returns public.decisions
language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.decisions; after_row public.decisions;
begin
  select * into before_row from public.decisions where id = decision_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'decision.update') then raise exception 'decision not found or access denied'; end if;
  update public.decisions set title = btrim(update_decision.title), description = update_decision.description,
    decision_date = update_decision.decision_date, decided_by_profile_id = update_decision.decided_by_profile_id,
    version = version + 1
  where id = decision_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'DECISION', decision_id, 'decision.updated', actor, null, to_jsonb(before_row), to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.archive_decision(decision_id uuid, expected_version bigint, reason text)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.decisions; after_row public.decisions;
begin
  select * into before_row from public.decisions where id = decision_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'decision.archive') then raise exception 'decision not found or access denied'; end if;
  update public.decisions set status = 'ARCHIVED', archived_at = now(), version = version + 1 where id = decision_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set archived_at = now(), version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'DECISION', decision_id, 'decision.archived', actor, reason, to_jsonb(before_row), to_jsonb(after_row));
end $$;

create or replace function public.activate_decision(decision_id uuid, expected_version bigint)
returns public.decisions language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid:=private.current_profile_id(); before_row public.decisions; after_row public.decisions;
begin
  select * into before_row from public.decisions where id=decision_id and status='DRAFT';
  if not found or not private.can_access_security_object(actor,before_row.security_object_id,'decision.update') then raise exception 'decision not found or access denied'; end if;
  update public.decisions set status='ACTIVE',version=version+1 where id=decision_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'DECISION',decision_id,'decision.activated',actor,null,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.create_task(
  company_id uuid, title text, description text default null, priority text default 'MEDIUM',
  owner_profile_id uuid default null, responsible_profile_id uuid default null, start_date date default null,
  due_date date default null, pdca_id uuid default null, originating_decision_id uuid default null,
  visibility public.visibility_mode default 'NORMAL', unit_ids uuid[] default array[]::uuid[], restaurant_ids uuid[] default array[]::uuid[]
) returns uuid
language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_id uuid; aggregate_id uuid := extensions.gen_random_uuid(); row_after public.tasks;
begin
  if create_task.pdca_id is not null and not exists (
    select 1 from public.pdcas linked
    where linked.id = create_task.pdca_id and linked.company_id = create_task.company_id
      and private.can_access_security_object(actor, linked.security_object_id, 'pdca.read')
  ) then raise exception 'PDCA not found or access denied'; end if;
  if create_task.originating_decision_id is not null and not exists (
    select 1 from public.decisions linked
    where linked.id = create_task.originating_decision_id and linked.company_id = create_task.company_id
      and private.can_access_security_object(actor, linked.security_object_id, 'decision.read')
  ) then raise exception 'Decision not found or access denied'; end if;
  object_id := private.create_scoped_security_object(actor, company_id, 'TASK', visibility, unit_ids, restaurant_ids, 'task.create');
  insert into public.tasks (id, company_id, security_object_id, pdca_id, originating_decision_id, title, description, priority, owner_profile_id, responsible_profile_id, start_date, due_date, created_by_profile_id)
  values (aggregate_id, company_id, object_id, pdca_id, originating_decision_id, btrim(title), description, priority, owner_profile_id, responsible_profile_id, start_date, due_date, actor) returning * into row_after;
  insert into public.task_status_transitions (task_id, from_status, to_status, changed_by_profile_id) values (aggregate_id, null, 'DRAFT', actor);
  perform private.write_execution_audit(company_id, object_id, 'TASK', aggregate_id, 'task.created', actor, null, null, to_jsonb(row_after));
  return aggregate_id;
end $$;

create or replace function private.task_transition_allowed(from_status text, to_status text)
returns boolean language sql immutable set search_path = '' as $$
  select case from_status
    when 'DRAFT' then to_status in ('OPEN','PLANNED','CANCELLED','ARCHIVED')
    when 'OPEN' then to_status in ('PLANNED','IN_PROGRESS','BLOCKED','WAITING','CANCELLED','ARCHIVED')
    when 'PLANNED' then to_status in ('OPEN','IN_PROGRESS','BLOCKED','WAITING','CANCELLED','ARCHIVED')
    when 'IN_PROGRESS' then to_status in ('BLOCKED','WAITING','UNDER_REVIEW','COMPLETED','CANCELLED','ARCHIVED')
    when 'BLOCKED' then to_status in ('IN_PROGRESS','WAITING','CANCELLED','ARCHIVED')
    when 'WAITING' then to_status in ('IN_PROGRESS','BLOCKED','UNDER_REVIEW','CANCELLED','ARCHIVED')
    when 'UNDER_REVIEW' then to_status in ('IN_PROGRESS','COMPLETED','CANCELLED','ARCHIVED')
    when 'COMPLETED' then to_status in ('OPEN','PLANNED','IN_PROGRESS','ARCHIVED')
    when 'CANCELLED' then to_status in ('OPEN','PLANNED','ARCHIVED')
    when 'ARCHIVED' then false
  end
$$;

create or replace function public.transition_task(task_id uuid, expected_version bigint, new_status text, reason text default null, completion_notes text default null)
returns public.tasks language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.tasks; after_row public.tasks; completion_cycle integer;
begin
  select * into before_row from public.tasks where id = task_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'task.update') then raise exception 'task not found or access denied'; end if;
  if not private.task_transition_allowed(before_row.status, new_status) then raise exception 'invalid task status transition'; end if;
  if new_status in ('OPEN','PLANNED') and (before_row.owner_profile_id is null or before_row.responsible_profile_id is null or before_row.due_date is null) then raise exception 'production task requires owner, responsible and due date'; end if;
  if new_status = 'BLOCKED' and not exists (select 1 from public.task_blockers blocker where blocker.task_id = transition_task.task_id and blocker.resolved_at is null) then raise exception 'blocked task requires an active blocker'; end if;
  if new_status = 'COMPLETED' and exists (select 1 from public.task_blockers blocker where blocker.task_id = transition_task.task_id and blocker.resolved_at is null) then raise exception 'cannot complete a task with active blockers'; end if;
  if new_status in ('CANCELLED') and char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'reason is required'; end if;
  if before_row.status = 'COMPLETED' and new_status <> 'ARCHIVED' then
    if char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'reopening reason is required'; end if;
    insert into public.task_reopening_events (task_id, reopened_by_profile_id, reason, previous_completion_event_id)
    select transition_task.task_id, actor, reason, completion.id from public.task_completion_events completion where completion.task_id = transition_task.task_id order by completion.cycle_number desc limit 1;
  end if;
  update public.tasks set status = new_status,
    first_action_at = case when new_status = 'IN_PROGRESS' then coalesce(first_action_at, now()) else first_action_at end,
    completed_at = case when new_status = 'COMPLETED' then now() when status = 'COMPLETED' then null else completed_at end,
    completed_by_profile_id = case when new_status = 'COMPLETED' then actor when status = 'COMPLETED' then null else completed_by_profile_id end,
    completion_notes = case when new_status = 'COMPLETED' then transition_task.completion_notes when status = 'COMPLETED' then null else tasks.completion_notes end,
    archived_at = case when new_status = 'ARCHIVED' then now() else archived_at end,
    last_activity_at = now(), version = version + 1
  where id = task_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.task_status_transitions (task_id, from_status, to_status, changed_by_profile_id, reason) values (task_id, before_row.status, new_status, actor, reason);
  if new_status = 'COMPLETED' then
    select coalesce(max(cycle_number),0)+1 into completion_cycle from public.task_completion_events where task_completion_events.task_id = transition_task.task_id;
    insert into public.task_completion_events (task_id, completed_by_profile_id, due_date_snapshot, completion_notes, cycle_number)
    values (task_id, actor, before_row.due_date, completion_notes, completion_cycle);
  end if;
  update public.security_objects set archived_at = case when new_status = 'ARCHIVED' then now() else archived_at end, version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id,
    case when new_status = 'COMPLETED' then 'task.completed' when before_row.status = 'COMPLETED' then 'task.reopened' else 'task.status.changed' end,
    actor, reason, to_jsonb(before_row), to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.change_task_due_date(task_id uuid, expected_version bigint, new_due_date date, reason text)
returns public.tasks language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.tasks; after_row public.tasks;
begin
  select * into before_row from public.tasks where id = task_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'task.update') then raise exception 'task not found or access denied'; end if;
  if before_row.due_date is not distinct from new_due_date then raise exception 'due date did not change'; end if;
  update public.tasks set due_date = new_due_date, last_activity_at = now(), version = version + 1 where id = task_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.task_due_date_changes (task_id, old_due_date, new_due_date, changed_by_profile_id, reason) values (task_id, before_row.due_date, new_due_date, actor, reason);
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id, 'task.due_date.changed', actor, reason, to_jsonb(before_row.due_date), to_jsonb(new_due_date));
  return after_row;
end $$;

create or replace function public.update_task(
  task_id uuid, expected_version bigint, title text, description text, priority text,
  owner_profile_id uuid, responsible_profile_id uuid, start_date date
) returns public.tasks language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.tasks; after_row public.tasks;
begin
  select * into before_row from public.tasks where id = task_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'task.update') then raise exception 'task not found or access denied'; end if;
  update public.tasks set title = btrim(update_task.title), description = update_task.description, priority = update_task.priority,
    owner_profile_id = update_task.owner_profile_id, responsible_profile_id = update_task.responsible_profile_id,
    start_date = update_task.start_date, last_activity_at = now(), version = version + 1
  where id = task_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  if before_row.owner_profile_id is distinct from after_row.owner_profile_id then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id, 'task.owner.changed', actor, null, to_jsonb(before_row.owner_profile_id), to_jsonb(after_row.owner_profile_id)); end if;
  if before_row.responsible_profile_id is distinct from after_row.responsible_profile_id then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id, 'task.responsible.changed', actor, null, to_jsonb(before_row.responsible_profile_id), to_jsonb(after_row.responsible_profile_id)); end if;
  if before_row.priority is distinct from after_row.priority then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id, 'task.priority.changed', actor, null, to_jsonb(before_row.priority), to_jsonb(after_row.priority)); end if;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'TASK', task_id, 'task.updated', actor, null, to_jsonb(before_row), to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.add_task_blocker(task_id uuid, reason text)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); task_row public.tasks; blocker_id uuid := extensions.gen_random_uuid();
begin
  select * into task_row from public.tasks where id = task_id;
  if not found or not private.can_access_security_object(actor, task_row.security_object_id, 'task.update') then raise exception 'task not found or access denied'; end if;
  insert into public.task_blockers (id, task_id, reason, blocked_by_profile_id) values (blocker_id, task_id, btrim(reason), actor);
  update public.tasks set last_activity_at = now(), version = version + 1 where id = task_id;
  perform private.write_execution_audit(task_row.company_id, task_row.security_object_id, 'TASK', task_id, 'task.blocker.added', actor, reason, null, jsonb_build_object('blocker_id', blocker_id));
  return blocker_id;
end $$;

create or replace function public.resolve_task_blocker(blocker_id uuid, resolution_notes text default null)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); blocker_row public.task_blockers; task_row public.tasks;
begin
  select * into blocker_row from public.task_blockers where id = blocker_id and resolved_at is null;
  select * into task_row from public.tasks where id = blocker_row.task_id;
  if not found or not private.can_access_security_object(actor, task_row.security_object_id, 'task.update') then raise exception 'blocker not found or access denied'; end if;
  update public.task_blockers set resolved_at = now(), resolved_by_profile_id = actor, resolution_notes = resolve_task_blocker.resolution_notes where id = blocker_id;
  update public.tasks set last_activity_at = now(), version = version + 1 where id = task_row.id;
  perform private.write_execution_audit(task_row.company_id, task_row.security_object_id, 'TASK', task_row.id, 'task.blocker.resolved', actor, resolution_notes, null, jsonb_build_object('blocker_id', blocker_id));
end $$;

create or replace function public.add_task_dependency(task_id uuid, depends_on_task_id uuid)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); task_row public.tasks; prerequisite public.tasks;
begin
  select * into task_row from public.tasks where id = task_id;
  select * into prerequisite from public.tasks where id = depends_on_task_id;
  if not private.can_access_security_object(actor, task_row.security_object_id, 'task.update') or not private.can_access_security_object(actor, prerequisite.security_object_id, 'task.read') then raise exception 'dependency object not found or access denied'; end if;
  if task_row.company_id <> prerequisite.company_id then raise exception 'cross-company dependency is forbidden'; end if;
  insert into public.task_dependencies values (task_id, depends_on_task_id, actor, now());
  perform private.write_execution_audit(task_row.company_id, task_row.security_object_id, 'TASK', task_id, 'task.dependency.added', actor, null, null, jsonb_build_object('depends_on_task_id', depends_on_task_id));
end $$;

create or replace function public.create_pdca(
  company_id uuid, title text, problem_statement text default null, objective text default null,
  root_cause_or_hypothesis text default null, priority text default 'MEDIUM',
  impact text default 'MEDIUM', risk text default 'MEDIUM',
  owner_profile_id uuid default null, responsible_profile_id uuid default null, start_date date default null,
  due_date date default null, originating_decision_id uuid default null, visibility public.visibility_mode default 'NORMAL',
  unit_ids uuid[] default array[]::uuid[], restaurant_ids uuid[] default array[]::uuid[]
) returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_id uuid; aggregate_id uuid := extensions.gen_random_uuid(); row_after public.pdcas;
begin
  if create_pdca.originating_decision_id is not null and not exists (
    select 1 from public.decisions linked
    where linked.id = create_pdca.originating_decision_id and linked.company_id = create_pdca.company_id
      and private.can_access_security_object(actor, linked.security_object_id, 'decision.read')
  ) then raise exception 'Decision not found or access denied'; end if;
  object_id := private.create_scoped_security_object(actor, company_id, 'PDCA', visibility, unit_ids, restaurant_ids, 'pdca.create');
  insert into public.pdcas (id, company_id, security_object_id, originating_decision_id, title, problem_statement, objective, root_cause_or_hypothesis, priority, impact, risk, owner_profile_id, responsible_profile_id, start_date, due_date, created_by_profile_id)
  values (aggregate_id, company_id, object_id, originating_decision_id, btrim(title), problem_statement, objective, root_cause_or_hypothesis, priority, impact, risk, owner_profile_id, responsible_profile_id, start_date, due_date, actor) returning * into row_after;
  insert into public.pdca_status_transitions (pdca_id, from_status, to_status, changed_by_profile_id) values (aggregate_id, null, 'DRAFT', actor);
  insert into public.pdca_phase_transitions (pdca_id, from_phase, to_phase, changed_by_profile_id) values (aggregate_id, null, 'PLAN', actor);
  perform private.write_execution_audit(company_id, object_id, 'PDCA', aggregate_id, 'pdca.created', actor, null, null, to_jsonb(row_after));
  return aggregate_id;
end $$;

create or replace function private.pdca_transition_allowed(from_status text, to_status text)
returns boolean language sql immutable set search_path = '' as $$ select private.task_transition_allowed(from_status, to_status) $$;

create or replace function public.transition_pdca(pdca_id uuid, expected_version bigint, new_status text, reason text default null, closure_notes text default null)
returns public.pdcas language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.pdcas; after_row public.pdcas; completion_cycle integer;
begin
  select * into before_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  if not private.pdca_transition_allowed(before_row.status, new_status) then raise exception 'invalid pdca status transition'; end if;
  if new_status in ('OPEN','PLANNED') and (before_row.problem_statement is null or before_row.objective is null or before_row.owner_profile_id is null or before_row.responsible_profile_id is null or before_row.due_date is null) then raise exception 'production PDCA requires problem, objective, owner, responsible and due date'; end if;
  if new_status = 'BLOCKED' and not exists (select 1 from public.pdca_blockers blocker where blocker.pdca_id = transition_pdca.pdca_id and blocker.resolved_at is null) then raise exception 'blocked PDCA requires an active blocker'; end if;
  if new_status = 'COMPLETED' and (before_row.phase <> 'ACT' or before_row.actual_result is null or char_length(btrim(coalesce(closure_notes,''))) < 1 or exists (select 1 from public.pdca_blockers blocker where blocker.pdca_id = transition_pdca.pdca_id and blocker.resolved_at is null)) then raise exception 'PDCA completion requires ACT, actual result, closure notes and no blockers'; end if;
  if new_status = 'CANCELLED' and char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'reason is required'; end if;
  if before_row.status = 'COMPLETED' and new_status <> 'ARCHIVED' then
    if char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'reopening reason is required'; end if;
    insert into public.pdca_reopening_events (pdca_id, reopened_by_profile_id, reason, previous_completion_event_id)
    select transition_pdca.pdca_id, actor, reason, completion.id from public.pdca_completion_events completion where completion.pdca_id = transition_pdca.pdca_id order by completion.cycle_number desc limit 1;
  end if;
  update public.pdcas set status = new_status,
    first_action_at = case when new_status = 'IN_PROGRESS' then coalesce(first_action_at, now()) else first_action_at end,
    completed_at = case when new_status = 'COMPLETED' then now() when status = 'COMPLETED' then null else completed_at end,
    completed_by_profile_id = case when new_status = 'COMPLETED' then actor when status = 'COMPLETED' then null else completed_by_profile_id end,
    closure_notes = case when new_status = 'COMPLETED' then transition_pdca.closure_notes when status = 'COMPLETED' then null else pdcas.closure_notes end,
    archived_at = case when new_status = 'ARCHIVED' then now() else archived_at end,
    last_activity_at = now(), version = version + 1
  where id = pdca_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.pdca_status_transitions (pdca_id, from_status, to_status, changed_by_profile_id, reason) values (pdca_id, before_row.status, new_status, actor, reason);
  if new_status = 'COMPLETED' then
    select coalesce(max(cycle_number),0)+1 into completion_cycle from public.pdca_completion_events where pdca_completion_events.pdca_id = transition_pdca.pdca_id;
    insert into public.pdca_completion_events (pdca_id, completed_by_profile_id, due_date_snapshot, actual_result_snapshot, closure_notes, cycle_number)
    values (pdca_id, actor, before_row.due_date, before_row.actual_result, closure_notes, completion_cycle);
  end if;
  update public.security_objects set archived_at = case when new_status = 'ARCHIVED' then now() else archived_at end, version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id,
    case when new_status = 'COMPLETED' then 'pdca.completed' when before_row.status = 'COMPLETED' then 'pdca.reopened' else 'pdca.status.changed' end,
    actor, reason, to_jsonb(before_row), to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.change_pdca_phase(pdca_id uuid, expected_version bigint, new_phase public.pdca_phase, reason text default null)
returns public.pdcas language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.pdcas; after_row public.pdcas;
begin
  select * into before_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  if before_row.phase = new_phase then raise exception 'phase did not change'; end if;
  if new_phase < before_row.phase and char_length(btrim(coalesce(reason,''))) < 3 then raise exception 'reason required when returning to an earlier phase'; end if;
  update public.pdcas set phase = new_phase, first_action_at = case when new_phase = 'DO' then coalesce(first_action_at, now()) else first_action_at end, last_activity_at = now(), version = version + 1 where id = pdca_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.pdca_phase_transitions (pdca_id, from_phase, to_phase, changed_by_profile_id, reason) values (pdca_id, before_row.phase, new_phase, actor, reason);
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.phase.changed', actor, reason, to_jsonb(before_row.phase), to_jsonb(new_phase));
  return after_row;
end $$;

create or replace function public.change_pdca_due_date(pdca_id uuid, expected_version bigint, new_due_date date, reason text)
returns public.pdcas language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.pdcas; after_row public.pdcas;
begin
  select * into before_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  if before_row.due_date is not distinct from new_due_date then raise exception 'due date did not change'; end if;
  update public.pdcas set due_date = new_due_date, last_activity_at = now(), version = version + 1 where id = pdca_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.pdca_due_date_changes (pdca_id, old_due_date, new_due_date, changed_by_profile_id, reason) values (pdca_id, before_row.due_date, new_due_date, actor, reason);
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.due_date.changed', actor, reason, to_jsonb(before_row.due_date), to_jsonb(new_due_date));
  return after_row;
end $$;

create or replace function public.update_pdca(
  pdca_id uuid, expected_version bigint, title text, problem_statement text, objective text,
  root_cause_or_hypothesis text, expected_result text, actual_result text, check_notes text,
  corrective_action text, outcome_notes text, priority text, impact text,
  risk text, owner_profile_id uuid, responsible_profile_id uuid, start_date date
) returns public.pdcas language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.pdcas; after_row public.pdcas;
begin
  select * into before_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  update public.pdcas set title = btrim(update_pdca.title), problem_statement = update_pdca.problem_statement,
    objective = update_pdca.objective, root_cause_or_hypothesis = update_pdca.root_cause_or_hypothesis,
    expected_result = update_pdca.expected_result, actual_result = update_pdca.actual_result,
    check_notes = update_pdca.check_notes, corrective_action = update_pdca.corrective_action,
    outcome_notes = update_pdca.outcome_notes, priority = update_pdca.priority, impact = update_pdca.impact,
    risk = update_pdca.risk, owner_profile_id = update_pdca.owner_profile_id,
    responsible_profile_id = update_pdca.responsible_profile_id, start_date = update_pdca.start_date,
    last_activity_at = now(), version = version + 1
  where id = pdca_id and version = expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set version = version + 1 where id = before_row.security_object_id;
  if before_row.owner_profile_id is distinct from after_row.owner_profile_id then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.owner.changed', actor, null, to_jsonb(before_row.owner_profile_id), to_jsonb(after_row.owner_profile_id)); end if;
  if before_row.responsible_profile_id is distinct from after_row.responsible_profile_id then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.responsible.changed', actor, null, to_jsonb(before_row.responsible_profile_id), to_jsonb(after_row.responsible_profile_id)); end if;
  if before_row.priority is distinct from after_row.priority then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.priority.changed', actor, null, to_jsonb(before_row.priority), to_jsonb(after_row.priority)); end if;
  if before_row.impact is distinct from after_row.impact then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.impact.changed', actor, null, to_jsonb(before_row.impact), to_jsonb(after_row.impact)); end if;
  if before_row.risk is distinct from after_row.risk then perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.risk.changed', actor, null, to_jsonb(before_row.risk), to_jsonb(after_row.risk)); end if;
  perform private.write_execution_audit(after_row.company_id, after_row.security_object_id, 'PDCA', pdca_id, 'pdca.updated', actor, null, to_jsonb(before_row), to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.add_pdca_blocker(pdca_id uuid, reason text)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); pdca_row public.pdcas; blocker_id uuid := extensions.gen_random_uuid();
begin
  select * into pdca_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, pdca_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  insert into public.pdca_blockers (id, pdca_id, reason, blocked_by_profile_id) values (blocker_id, pdca_id, btrim(reason), actor);
  update public.pdcas set last_activity_at = now(), version = version + 1 where id = pdca_id;
  perform private.write_execution_audit(pdca_row.company_id, pdca_row.security_object_id, 'PDCA', pdca_id, 'pdca.blocker.added', actor, reason, null, jsonb_build_object('blocker_id', blocker_id));
  return blocker_id;
end $$;

create or replace function public.resolve_pdca_blocker(blocker_id uuid, resolution_notes text default null)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); blocker_row public.pdca_blockers; pdca_row public.pdcas;
begin
  select * into blocker_row from public.pdca_blockers where id = blocker_id and resolved_at is null;
  select * into pdca_row from public.pdcas where id = blocker_row.pdca_id;
  if not found or not private.can_access_security_object(actor, pdca_row.security_object_id, 'pdca.update') then raise exception 'blocker not found or access denied'; end if;
  update public.pdca_blockers set resolved_at = now(), resolved_by_profile_id = actor, resolution_notes = resolve_pdca_blocker.resolution_notes where id = blocker_id;
  update public.pdcas set last_activity_at = now(), version = version + 1 where id = pdca_row.id;
  perform private.write_execution_audit(pdca_row.company_id, pdca_row.security_object_id, 'PDCA', pdca_row.id, 'pdca.blocker.resolved', actor, resolution_notes, null, jsonb_build_object('blocker_id', blocker_id));
end $$;

create or replace function public.add_pdca_dependency(pdca_id uuid, dependency_kind public.pdca_dependency_kind, depends_on_pdca_id uuid default null, depends_on_task_id uuid default null, external_label text default null)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); pdca_row public.pdcas; dependency_id uuid := extensions.gen_random_uuid(); target_object uuid; target_company uuid;
begin
  select * into pdca_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, pdca_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  if dependency_kind = 'PDCA' then select security_object_id, company_id into target_object, target_company from public.pdcas where id = depends_on_pdca_id;
  elsif dependency_kind = 'TASK' then select security_object_id, company_id into target_object, target_company from public.tasks where id = depends_on_task_id; end if;
  if dependency_kind <> 'EXTERNAL' and (target_company <> pdca_row.company_id or not private.can_access_security_object(actor, target_object, lower(dependency_kind::text) || '.read')) then raise exception 'dependency target not found or access denied'; end if;
  insert into public.pdca_dependencies (id, pdca_id, dependency_kind, depends_on_pdca_id, depends_on_task_id, external_label, created_by_profile_id)
  values (dependency_id, pdca_id, dependency_kind, depends_on_pdca_id, depends_on_task_id, external_label, actor);
  perform private.write_execution_audit(pdca_row.company_id, pdca_row.security_object_id, 'PDCA', pdca_id, 'pdca.dependency.added', actor, null, null, jsonb_build_object('dependency_id', dependency_id, 'kind', dependency_kind));
  return dependency_id;
end $$;

create or replace function public.replace_object_scope(security_object_id uuid, expected_version bigint, unit_ids uuid[], restaurant_ids uuid[], reason text)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_row public.security_objects; target_id uuid; permission_key text; before_scope jsonb;
begin
  select * into object_row from public.security_objects where id = security_object_id and archived_at is null;
  permission_key := case when object_row.object_type in ('MEETING_SERIES','MEETING_SESSION') then 'meeting.scope.update' else lower(object_row.object_type) || '.scope.update' end;
  if not found or object_row.object_type not in ('DECISION','TASK','PDCA','MEETING_SERIES','MEETING_SESSION') or object_row.version <> expected_version or not private.can_access_security_object(actor, security_object_id, permission_key) then raise exception 'object not found, access denied or concurrency conflict'; end if;
  select jsonb_build_object('units', coalesce(jsonb_agg(organizational_unit_id) filter (where organizational_unit_id is not null), '[]'::jsonb), 'restaurants', (select coalesce(jsonb_agg(restaurant_id), '[]'::jsonb) from public.object_scope_restaurants where object_scope_restaurants.security_object_id = replace_object_scope.security_object_id)) into before_scope from public.object_scope_organizational_units where object_scope_organizational_units.security_object_id = replace_object_scope.security_object_id;
  delete from public.object_scope_organizational_units where object_scope_organizational_units.security_object_id = replace_object_scope.security_object_id;
  delete from public.object_scope_restaurants where object_scope_restaurants.security_object_id = replace_object_scope.security_object_id;
  foreach target_id in array coalesce(unit_ids, array[]::uuid[]) loop insert into public.object_scope_organizational_units values (security_object_id, target_id, now(), actor); end loop;
  foreach target_id in array coalesce(restaurant_ids, array[]::uuid[]) loop insert into public.object_scope_restaurants values (security_object_id, target_id, now(), actor); end loop;
  if not private.actor_has_full_scope_permission(actor, security_object_id, permission_key) then raise exception 'insufficient permission for the complete proposed scope'; end if;
  update public.security_objects set version = version + 1 where id = security_object_id;
  perform private.write_execution_audit(object_row.company_id, security_object_id, object_row.object_type, security_object_id, lower(object_row.object_type) || '.scope.changed', actor, reason, before_scope, jsonb_build_object('units', unit_ids, 'restaurants', restaurant_ids));
end $$;

create or replace function public.add_comment(security_object_id uuid, body text)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_row public.security_objects; comment_id uuid := extensions.gen_random_uuid();
begin
  select * into object_row from public.security_objects where id = security_object_id;
  if not found or object_row.object_type not in ('DECISION','TASK','PDCA') or not private.can_access_security_object(actor, security_object_id, 'comment.create') then raise exception 'object not found or access denied'; end if;
  insert into public.comments (id, security_object_id, author_profile_id, body) values (comment_id, security_object_id, actor, btrim(body));
  if object_row.object_type = 'TASK' then update public.tasks set first_action_at = coalesce(first_action_at, now()), last_activity_at = now(), version = version + 1 where tasks.security_object_id = add_comment.security_object_id;
  elsif object_row.object_type = 'PDCA' then update public.pdcas set first_action_at = coalesce(first_action_at, now()), last_activity_at = now(), version = version + 1 where pdcas.security_object_id = add_comment.security_object_id; end if;
  perform private.write_execution_audit(object_row.company_id, security_object_id, 'COMMENT', comment_id, 'comment.created', actor, null, null, jsonb_build_object('comment_id', comment_id));
  return comment_id;
end $$;

create or replace function public.edit_comment(comment_id uuid, body text)
returns public.comments language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.comments; after_row public.comments; object_row public.security_objects;
begin
  select * into before_row from public.comments where id = comment_id and hidden_at is null;
  select * into object_row from public.security_objects where id = before_row.security_object_id;
  if not found or before_row.author_profile_id <> actor or not private.can_access_security_object(actor, before_row.security_object_id, 'comment.create') then raise exception 'comment not found or access denied'; end if;
  update public.comments set body = btrim(edit_comment.body), edited_at = now() where id = comment_id returning * into after_row;
  perform private.write_execution_audit(object_row.company_id, object_row.id, 'COMMENT', comment_id, 'comment.edited', actor, null, jsonb_build_object('body_changed', true), jsonb_build_object('body_changed', true));
  return after_row;
end $$;

create or replace function public.hide_comment(comment_id uuid, reason text)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); comment_row public.comments; object_row public.security_objects;
begin
  select * into comment_row from public.comments where id = comment_id and hidden_at is null;
  select * into object_row from public.security_objects where id = comment_row.security_object_id;
  if not found or (comment_row.author_profile_id <> actor and not private.can_access_security_object(actor, object_row.id, lower(object_row.object_type) || '.update')) then raise exception 'comment not found or access denied'; end if;
  update public.comments set hidden_at = now(), hidden_by_profile_id = actor where id = comment_id;
  perform private.write_execution_audit(object_row.company_id, object_row.id, 'COMMENT', comment_id, 'comment.hidden', actor, reason, null, jsonb_build_object('hidden', true));
end $$;

create or replace function public.add_object_member(security_object_id uuid, profile_id uuid, membership_role public.object_membership_role)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_row public.security_objects; membership_id uuid := extensions.gen_random_uuid();
begin
  select * into object_row from public.security_objects where id = security_object_id;
  if not found or not private.can_access_security_object(actor, security_object_id, lower(object_row.object_type) || '.update') then raise exception 'object not found or access denied'; end if;
  insert into public.object_memberships (id, security_object_id, profile_id, membership_role, added_by_profile_id) values (membership_id, security_object_id, profile_id, membership_role, actor);
  perform private.write_execution_audit(object_row.company_id, security_object_id, 'OBJECT_MEMBERSHIP', membership_id, 'membership.added', actor, null, null, jsonb_build_object('profile_id', profile_id, 'role', membership_role));
  return membership_id;
end $$;

create or replace function public.get_assignable_profiles(security_object_id uuid)
returns table (profile_id uuid, display_name text)
language sql stable security definer set search_path = '' set row_security = off as $$
  select profile.id, profile.display_name
  from public.profiles profile
  join public.security_objects object_row on object_row.id = security_object_id
  where profile.is_active
    and private.can_access_security_object(private.current_profile_id(), object_row.id, lower(object_row.object_type) || '.update')
    and private.can_access_security_object(profile.id, object_row.id, lower(object_row.object_type) || '.read')
  order by profile.display_name
$$;

create or replace function public.assign_execution_people(security_object_id uuid, expected_version bigint, owner_profile_id uuid, responsible_profile_id uuid)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_row public.security_objects; aggregate_id uuid; aggregate_version bigint; before_owner uuid; before_responsible uuid;
begin
  select * into object_row from public.security_objects where id = security_object_id and archived_at is null;
  if not found or object_row.object_type not in ('TASK','PDCA')
    or not private.can_access_security_object(actor, object_row.id, lower(object_row.object_type) || '.update') then
    raise exception 'object not found or access denied';
  end if;
  if object_row.object_type = 'TASK' then
    select task.id, task.version, task.owner_profile_id, task.responsible_profile_id into aggregate_id, aggregate_version, before_owner, before_responsible from public.tasks task where task.security_object_id = assign_execution_people.security_object_id;
    if aggregate_version <> expected_version then raise exception 'optimistic concurrency conflict'; end if;
    update public.tasks set owner_profile_id = assign_execution_people.owner_profile_id, responsible_profile_id = assign_execution_people.responsible_profile_id, last_activity_at = now(), version = version + 1
      where tasks.id = aggregate_id and tasks.version = expected_version;
  else
    select pdca.id, pdca.version, pdca.owner_profile_id, pdca.responsible_profile_id into aggregate_id, aggregate_version, before_owner, before_responsible from public.pdcas pdca where pdca.security_object_id = assign_execution_people.security_object_id;
    if aggregate_version <> expected_version then raise exception 'optimistic concurrency conflict'; end if;
    update public.pdcas set owner_profile_id = assign_execution_people.owner_profile_id, responsible_profile_id = assign_execution_people.responsible_profile_id, last_activity_at = now(), version = version + 1
      where pdcas.id = aggregate_id and pdcas.version = expected_version;
  end if;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set version = version + 1 where id = security_object_id;
  if before_owner is distinct from owner_profile_id then perform private.write_execution_audit(object_row.company_id, object_row.id, object_row.object_type, aggregate_id, lower(object_row.object_type) || '.owner.changed', actor, null, to_jsonb(before_owner), to_jsonb(owner_profile_id)); end if;
  if before_responsible is distinct from responsible_profile_id then perform private.write_execution_audit(object_row.company_id, object_row.id, object_row.object_type, aggregate_id, lower(object_row.object_type) || '.responsible.changed', actor, null, to_jsonb(before_responsible), to_jsonb(responsible_profile_id)); end if;
end $$;

create or replace function public.register_attachment(security_object_id uuid, filename text, mime_type text, size_bytes bigint, storage_path text)
returns uuid language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); object_row public.security_objects; attachment_id uuid := extensions.gen_random_uuid(); expected_prefix text;
begin
  select * into object_row from public.security_objects where id = security_object_id;
  if not found or object_row.object_type not in ('DECISION','TASK','PDCA','MEETING_SERIES','MEETING_SESSION') or not private.can_access_security_object(actor, security_object_id, 'attachment.upload') then raise exception 'object not found or access denied'; end if;
  expected_prefix := object_row.company_id::text || '/' || security_object_id::text || '/';
  if left(storage_path, char_length(expected_prefix)) <> expected_prefix then raise exception 'storage path must be scoped to company and object'; end if;
  insert into public.attachments (id, security_object_id, filename, mime_type, size_bytes, storage_path, uploaded_by_profile_id) values (attachment_id, security_object_id, btrim(filename), btrim(mime_type), size_bytes, storage_path, actor);
  perform private.write_execution_audit(object_row.company_id, security_object_id, 'ATTACHMENT', attachment_id, 'attachment.added', actor, null, null, jsonb_build_object('attachment_id', attachment_id, 'filename', filename));
  return attachment_id;
end $$;

create or replace function public.add_decision_task_link(decision_id uuid, task_id uuid)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); decision_row public.decisions; task_row public.tasks;
begin
  select * into decision_row from public.decisions where id = decision_id; select * into task_row from public.tasks where id = task_id;
  if decision_row.company_id <> task_row.company_id or not private.can_access_security_object(actor, decision_row.security_object_id, 'decision.update') or not private.can_access_security_object(actor, task_row.security_object_id, 'task.read') then raise exception 'relationship objects not found or access denied'; end if;
  insert into public.decision_task_links values (decision_id, task_id, actor, now());
  perform private.write_execution_audit(decision_row.company_id, decision_row.security_object_id, 'DECISION', decision_id, 'decision.task.linked', actor, null, null, jsonb_build_object('task_id', task_id));
end $$;

create or replace function public.add_decision_pdca_link(decision_id uuid, pdca_id uuid)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); decision_row public.decisions; pdca_row public.pdcas;
begin
  select * into decision_row from public.decisions where id = decision_id; select * into pdca_row from public.pdcas where id = pdca_id;
  if decision_row.company_id <> pdca_row.company_id or not private.can_access_security_object(actor, decision_row.security_object_id, 'decision.update') or not private.can_access_security_object(actor, pdca_row.security_object_id, 'pdca.read') then raise exception 'relationship objects not found or access denied'; end if;
  insert into public.decision_pdca_links values (decision_id, pdca_id, actor, now());
  perform private.write_execution_audit(decision_row.company_id, decision_row.security_object_id, 'DECISION', decision_id, 'decision.pdca.linked', actor, null, null, jsonb_build_object('pdca_id', pdca_id));
end $$;

create or replace function public.my_work()
returns table (object_type text, object_id uuid, security_object_id uuid, title text, status text, priority text, due_date date, relationship text, last_activity_at timestamptz)
language sql stable security definer set search_path = '' set row_security = off as $$
  with actor as (select private.current_profile_id() id), candidates as (
    select 'TASK'::text object_type, task.id object_id, task.security_object_id, task.title, task.status::text, task.priority::text, task.due_date, relation.relationship, task.last_activity_at
    from public.tasks task cross join actor
    cross join lateral (values
      ('RESPONSIBLE'::text, task.responsible_profile_id = actor.id),
      ('OWNER'::text, task.owner_profile_id = actor.id)
    ) relation(relationship, applies) where relation.applies
    union all
    select 'TASK', task.id, task.security_object_id, task.title, task.status::text, task.priority::text, task.due_date, member.membership_role::text, task.last_activity_at
    from public.tasks task cross join actor join public.object_memberships member on member.security_object_id = task.security_object_id and member.profile_id = actor.id and member.ended_at is null
    union all
    select 'PDCA', pdca.id, pdca.security_object_id, pdca.title, pdca.status::text, pdca.priority::text, pdca.due_date, relation.relationship, pdca.last_activity_at
    from public.pdcas pdca cross join actor
    cross join lateral (values
      ('RESPONSIBLE'::text, pdca.responsible_profile_id = actor.id),
      ('OWNER'::text, pdca.owner_profile_id = actor.id)
    ) relation(relationship, applies) where relation.applies
    union all
    select 'PDCA', pdca.id, pdca.security_object_id, pdca.title, pdca.status::text, pdca.priority::text, pdca.due_date, member.membership_role::text, pdca.last_activity_at
    from public.pdcas pdca cross join actor join public.object_memberships member on member.security_object_id = pdca.security_object_id and member.profile_id = actor.id and member.ended_at is null
  ) select * from candidates where private.can_access_security_object((select id from actor), candidates.security_object_id, lower(candidates.object_type) || '.read')
$$;

revoke all on function public.create_decision(uuid,text,text,date,uuid,public.visibility_mode,uuid[],uuid[],text) from public;
revoke all on function public.update_decision(uuid,bigint,text,text,date,uuid) from public;
revoke all on function public.archive_decision(uuid,bigint,text) from public;
revoke all on function public.activate_decision(uuid,bigint) from public;
revoke all on function public.create_task(uuid,text,text,text,uuid,uuid,date,date,uuid,uuid,public.visibility_mode,uuid[],uuid[]) from public;
revoke all on function public.transition_task(uuid,bigint,text,text,text) from public;
revoke all on function public.change_task_due_date(uuid,bigint,date,text) from public;
revoke all on function public.update_task(uuid,bigint,text,text,text,uuid,uuid,date) from public;
revoke all on function public.add_task_blocker(uuid,text) from public;
revoke all on function public.resolve_task_blocker(uuid,text) from public;
revoke all on function public.add_task_dependency(uuid,uuid) from public;
revoke all on function public.create_pdca(uuid,text,text,text,text,text,text,text,uuid,uuid,date,date,uuid,public.visibility_mode,uuid[],uuid[]) from public;
revoke all on function public.transition_pdca(uuid,bigint,text,text,text) from public;
revoke all on function public.change_pdca_phase(uuid,bigint,public.pdca_phase,text) from public;
revoke all on function public.change_pdca_due_date(uuid,bigint,date,text) from public;
revoke all on function public.update_pdca(uuid,bigint,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,date) from public;
revoke all on function public.add_pdca_blocker(uuid,text) from public;
revoke all on function public.resolve_pdca_blocker(uuid,text) from public;
revoke all on function public.add_pdca_dependency(uuid,public.pdca_dependency_kind,uuid,uuid,text) from public;
revoke all on function public.replace_object_scope(uuid,bigint,uuid[],uuid[],text) from public;
revoke all on function public.add_comment(uuid,text) from public;
revoke all on function public.edit_comment(uuid,text) from public;
revoke all on function public.hide_comment(uuid,text) from public;
revoke all on function public.add_object_member(uuid,uuid,public.object_membership_role) from public;
revoke all on function public.get_assignable_profiles(uuid) from public;
revoke all on function public.assign_execution_people(uuid,bigint,uuid,uuid) from public;
revoke all on function public.register_attachment(uuid,text,text,bigint,text) from public;
revoke all on function public.add_decision_task_link(uuid,uuid) from public;
revoke all on function public.add_decision_pdca_link(uuid,uuid) from public;
revoke all on function public.my_work() from public;

grant execute on function public.create_decision(uuid,text,text,date,uuid,public.visibility_mode,uuid[],uuid[],text) to authenticated;
grant execute on function public.update_decision(uuid,bigint,text,text,date,uuid) to authenticated;
grant execute on function public.archive_decision(uuid,bigint,text) to authenticated;
grant execute on function public.activate_decision(uuid,bigint) to authenticated;
grant execute on function public.create_task(uuid,text,text,text,uuid,uuid,date,date,uuid,uuid,public.visibility_mode,uuid[],uuid[]) to authenticated;
grant execute on function public.transition_task(uuid,bigint,text,text,text) to authenticated;
grant execute on function public.change_task_due_date(uuid,bigint,date,text) to authenticated;
grant execute on function public.update_task(uuid,bigint,text,text,text,uuid,uuid,date) to authenticated;
grant execute on function public.add_task_blocker(uuid,text) to authenticated;
grant execute on function public.resolve_task_blocker(uuid,text) to authenticated;
grant execute on function public.add_task_dependency(uuid,uuid) to authenticated;
grant execute on function public.create_pdca(uuid,text,text,text,text,text,text,text,uuid,uuid,date,date,uuid,public.visibility_mode,uuid[],uuid[]) to authenticated;
grant execute on function public.transition_pdca(uuid,bigint,text,text,text) to authenticated;
grant execute on function public.change_pdca_phase(uuid,bigint,public.pdca_phase,text) to authenticated;
grant execute on function public.change_pdca_due_date(uuid,bigint,date,text) to authenticated;
grant execute on function public.update_pdca(uuid,bigint,text,text,text,text,text,text,text,text,text,text,text,text,uuid,uuid,date) to authenticated;
grant execute on function public.add_pdca_blocker(uuid,text) to authenticated;
grant execute on function public.resolve_pdca_blocker(uuid,text) to authenticated;
grant execute on function public.add_pdca_dependency(uuid,public.pdca_dependency_kind,uuid,uuid,text) to authenticated;
grant execute on function public.replace_object_scope(uuid,bigint,uuid[],uuid[],text) to authenticated;
grant execute on function public.add_comment(uuid,text) to authenticated;
grant execute on function public.edit_comment(uuid,text) to authenticated;
grant execute on function public.hide_comment(uuid,text) to authenticated;
grant execute on function public.add_object_member(uuid,uuid,public.object_membership_role) to authenticated;
grant execute on function public.get_assignable_profiles(uuid) to authenticated;
grant execute on function public.assign_execution_people(uuid,bigint,uuid,uuid) to authenticated;
grant execute on function public.register_attachment(uuid,text,text,bigint,text) to authenticated;
grant execute on function public.add_decision_task_link(uuid,uuid) to authenticated;
grant execute on function public.add_decision_pdca_link(uuid,uuid) to authenticated;
grant execute on function public.my_work() to authenticated;
