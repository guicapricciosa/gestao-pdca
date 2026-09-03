-- Simplicity review, approved 2026-09-03: accountability rules and a single
-- transactional "terminar e distribuir" command.
--
-- Task: leaving DRAFT and being distributed from a meeting requires only a
-- Responsible; Owner and due date become quality warnings (docs/tasks.md).
-- PDCA: problem, objective, Owner and Responsible stay mandatory; the due
-- date becomes a warning (docs/pdca.md). Everything else is unchanged.

create or replace function public.transition_task(task_id uuid, expected_version bigint, new_status text, reason text default null, completion_notes text default null)
returns public.tasks language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.tasks; after_row public.tasks; completion_cycle integer;
begin
  select * into before_row from public.tasks where id = task_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'task.update') then raise exception 'task not found or access denied'; end if;
  if not private.task_transition_allowed(before_row.status, new_status) then raise exception 'invalid task status transition'; end if;
  if new_status in ('OPEN','PLANNED') and before_row.responsible_profile_id is null then raise exception 'production task requires a responsible'; end if;
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

create or replace function public.transition_pdca(pdca_id uuid, expected_version bigint, new_status text, reason text default null, closure_notes text default null)
returns public.pdcas language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); before_row public.pdcas; after_row public.pdcas; completion_cycle integer;
begin
  select * into before_row from public.pdcas where id = pdca_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'pdca.update') then raise exception 'pdca not found or access denied'; end if;
  if not private.pdca_transition_allowed(before_row.status, new_status) then raise exception 'invalid pdca status transition'; end if;
  if new_status in ('OPEN','PLANNED') and (before_row.problem_statement is null or before_row.objective is null or before_row.owner_profile_id is null or before_row.responsible_profile_id is null) then raise exception 'production PDCA requires problem, objective, owner and responsible'; end if;
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

create or replace function private.validate_meeting_publish(session_id uuid,actor uuid)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare session_row public.meeting_sessions; linked record;
begin
  select * into session_row from public.meeting_sessions where id=session_id;
  if session_row.chair_profile_id<>actor then raise exception 'only the current Chair can publish'; end if;
  if exists(select 1 from public.meeting_agenda_items where meeting_session_id=session_id and status='PENDING') then raise exception 'all agenda items require an outcome before publication'; end if;
  for linked in select object_row.id,object_row.object_type from public.meeting_object_links link join public.security_objects object_row on object_row.id=link.security_object_id where link.meeting_session_id=session_id and link.relation_type='CREATED' and link.unlinked_at is null loop
    if linked.object_type='TASK' and exists(select 1 from public.tasks task where task.security_object_id=linked.id and (task.responsible_profile_id is null or not private.can_access_security_object(task.responsible_profile_id,linked.id,'task.read') or (task.owner_profile_id is not null and not private.can_access_security_object(task.owner_profile_id,linked.id,'task.read')))) then raise exception 'linked Task is incomplete'; end if;
    if linked.object_type='PDCA' and exists(select 1 from public.pdcas pdca where pdca.security_object_id=linked.id and (pdca.problem_statement is null or pdca.objective is null or pdca.owner_profile_id is null or pdca.responsible_profile_id is null or not private.can_access_security_object(pdca.owner_profile_id,linked.id,'pdca.read') or not private.can_access_security_object(pdca.responsible_profile_id,linked.id,'pdca.read'))) then raise exception 'linked PDCA is incomplete'; end if;
    if not private.meeting_link_target_readable(actor,linked.id) then raise exception 'linked object is no longer accessible'; end if;
  end loop;
end $$;

create or replace function public.transition_meeting_session(meeting_session_id uuid,expected_version bigint,new_status text,reason text default null)
returns public.meeting_sessions language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_sessions; after_row public.meeting_sessions; linked record; publication_no integer;
begin
  select * into before_row from public.meeting_sessions where id=meeting_session_id;
  if not found or not private.can_access_security_object(actor,before_row.security_object_id,case when new_status='PUBLISHED' then 'meeting.publish' when new_status='CLOSED' then 'meeting.close' else 'meeting.update' end) then raise exception 'meeting not found or access denied'; end if;
  if not private.meeting_transition_allowed(before_row.status,new_status) then raise exception 'invalid meeting status transition'; end if;
  if new_status='PUBLISHED' then perform private.validate_meeting_publish(meeting_session_id,actor); end if;
  if new_status='CANCELLED' and char_length(btrim(coalesce(reason,'')))<3 then raise exception 'cancellation reason is required'; end if;
  update public.meeting_sessions set status=new_status,
    actual_start_at=case when new_status='IN_PROGRESS' then coalesce(actual_start_at,now()) else actual_start_at end,
    actual_end_at=case when new_status='REVIEW' then coalesce(actual_end_at,now()) else actual_end_at end,
    published_at=case when new_status='PUBLISHED' then now() else published_at end,
    closed_at=case when new_status='CLOSED' then now() else closed_at end,version=version+1
  where id=meeting_session_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  if new_status='PUBLISHED' then
    for linked in select decision.id,decision.version from public.meeting_object_links link join public.decisions decision on decision.security_object_id=link.security_object_id where link.meeting_session_id=transition_meeting_session.meeting_session_id and link.relation_type='CREATED' and link.unlinked_at is null and decision.status='DRAFT' loop
      perform public.activate_decision(linked.id,linked.version);
    end loop;
    for linked in select task.id,task.version from public.meeting_object_links link join public.tasks task on task.security_object_id=link.security_object_id where link.meeting_session_id=transition_meeting_session.meeting_session_id and link.relation_type='CREATED' and link.unlinked_at is null and task.status='DRAFT' loop
      perform public.transition_task(linked.id,linked.version,'OPEN','Published with meeting',null);
    end loop;
    for linked in select pdca.id,pdca.version from public.meeting_object_links link join public.pdcas pdca on pdca.security_object_id=link.security_object_id where link.meeting_session_id=transition_meeting_session.meeting_session_id and link.relation_type='CREATED' and link.unlinked_at is null and pdca.status='DRAFT' loop
      perform public.transition_pdca(linked.id,linked.version,'OPEN','Published with meeting',null);
    end loop;
    select coalesce(max(publication_number),0)+1 into publication_no from public.meeting_publications where meeting_publications.meeting_session_id=transition_meeting_session.meeting_session_id;
    insert into public.meeting_publications(meeting_session_id,publication_number,published_by_profile_id,snapshot)
    values(meeting_session_id,publication_no,actor,jsonb_build_object('session',to_jsonb(after_row),'agenda',(select coalesce(jsonb_agg(to_jsonb(item) order by item.position),'[]'::jsonb) from public.meeting_agenda_items item where item.meeting_session_id=transition_meeting_session.meeting_session_id),'notes',(select coalesce(jsonb_agg(to_jsonb(note) order by note.created_at),'[]'::jsonb) from public.meeting_notes note where note.meeting_session_id=transition_meeting_session.meeting_session_id and note.hidden_at is null)));
  end if;
  insert into public.meeting_session_status_transitions(meeting_session_id,from_status,to_status,changed_by_profile_id,reason) values(meeting_session_id,before_row.status,new_status,actor,reason);
  update public.security_objects set version=version+1 where id=before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SESSION',meeting_session_id,'meeting.'||lower(new_status),actor,reason,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.reopen_meeting_session(meeting_session_id uuid,expected_version bigint,reason text)
returns public.meeting_sessions language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_sessions; after_row public.meeting_sessions;
begin
  select * into before_row from public.meeting_sessions where id=meeting_session_id;
  if not found or before_row.status not in ('PUBLISHED','CLOSED') or not private.can_access_security_object(actor,before_row.security_object_id,'meeting.reopen') then raise exception 'meeting not found or access denied'; end if;
  update public.meeting_sessions set status='REVIEW',reopened_at=now(),closed_at=null,version=version+1 where id=meeting_session_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  insert into public.meeting_reopening_events(meeting_session_id,reopened_by_profile_id,reason) values(meeting_session_id,actor,reason);
  insert into public.meeting_session_status_transitions(meeting_session_id,from_status,to_status,changed_by_profile_id,reason) values(meeting_session_id,before_row.status,'REVIEW',actor,reason);
  update public.security_objects set version=version+1 where id=before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SESSION',meeting_session_id,'meeting.reopened',actor,reason,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.add_meeting_participant(meeting_session_id uuid,profile_id uuid,participant_role public.meeting_participant_role default 'PARTICIPANT')
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); session_row public.meeting_sessions; participant_id uuid:=extensions.gen_random_uuid();
begin
  select * into session_row from public.meeting_sessions where id=meeting_session_id;
  if not found or session_row.status in ('PUBLISHED','CLOSED','CANCELLED') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.participant.manage') then raise exception 'meeting not found or access denied'; end if;
  if participant_role='CHAIR' then raise exception 'use the Chair change command'; end if;
  if not private.profile_can_read_meeting(profile_id,session_row.security_object_id) then raise exception 'participant must already have meeting access; adjust scope or create an explicit grant separately'; end if;
  insert into public.meeting_participants(id,meeting_session_id,profile_id,participant_role,added_by_profile_id) values(participant_id,meeting_session_id,profile_id,participant_role,actor);
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_PARTICIPANT',participant_id,'meeting.participant.added',actor,null,null,jsonb_build_object('profile_id',profile_id));
  return participant_id;
end $$;

create or replace function public.get_meeting_accessible_profiles(meeting_security_object_id uuid)
returns table(profile_id uuid,display_name text) language sql stable security definer set search_path='' set row_security=off as $$
  select profile.id,profile.display_name from public.profiles profile
  join public.security_objects object_row on object_row.id=meeting_security_object_id
  where profile.is_active
    and private.can_access_security_object(private.current_profile_id(),object_row.id,'meeting.participant.manage')
    and private.profile_can_read_meeting(profile.id,object_row.id)
  order by profile.display_name
$$;

-- Terminar e distribuir: uma única operação transaccional. Aplica os
-- resultados decididos para os temas ainda por discutir, leva os adiados para
-- a próxima reunião agendada da série (só quando o utilizador o escolheu), e
-- encadeia REVIEW → PUBLISHED → CLOSED. Qualquer falha reverte tudo; cada
-- transição interna continua a ser auditada pelos comandos que já existem.
create or replace function public.finish_meeting(meeting_session_id uuid, expected_version bigint, agenda_outcomes jsonb default '[]'::jsonb)
returns public.meeting_sessions language plpgsql volatile security definer set search_path='' set row_security=off as $$
#variable_conflict use_variable
declare
  actor uuid := private.current_profile_id();
  session_row public.meeting_sessions;
  item jsonb; agenda_row public.meeting_agenda_items; outcome text; next_session uuid; v bigint;
  created_tasks integer; created_pdcas integer; created_decisions integer;
begin
  select * into session_row from public.meeting_sessions where id = meeting_session_id for update;
  if not found or actor is null or not private.can_access_security_object(actor, session_row.security_object_id, 'meeting.publish') then
    raise exception 'meeting not found or access denied';
  end if;
  if session_row.version <> expected_version then raise exception 'optimistic concurrency conflict'; end if;
  if session_row.status not in ('IN_PROGRESS','REVIEW') then raise exception 'invalid meeting status transition'; end if;
  if jsonb_typeof(agenda_outcomes) <> 'array' then raise exception 'agenda outcomes must be a JSON array'; end if;

  for item in select * from jsonb_array_elements(agenda_outcomes) loop
    select * into agenda_row from public.meeting_agenda_items
      where id = (item->>'agenda_item_id')::uuid and meeting_agenda_items.meeting_session_id = session_row.id;
    if not found then raise exception 'agenda item does not belong to meeting'; end if;
    outcome := item->>'outcome';
    if outcome not in ('DISCUSSED','POSTPONED') then raise exception 'agenda outcome must be DISCUSSED or POSTPONED'; end if;
    if agenda_row.status = 'PENDING' then
      perform public.set_meeting_agenda_status(agenda_row.id, agenda_row.version, outcome,
        case when outcome = 'POSTPONED' then coalesce(nullif(btrim(item->>'reason'),''), 'Levar para a próxima reunião') else null end);
    end if;
    if outcome = 'POSTPONED' and session_row.meeting_series_id is not null then
      select id into next_session from public.meeting_sessions candidate
        where candidate.meeting_series_id = session_row.meeting_series_id
          and candidate.status = 'SCHEDULED'
          and candidate.scheduled_start_at > session_row.scheduled_start_at
        order by candidate.scheduled_start_at limit 1;
      if next_session is not null and not exists (
        select 1 from public.meeting_agenda_items carried where carried.meeting_session_id = next_session and carried.carried_forward_from_id = agenda_row.id
      ) then
        perform public.add_meeting_agenda_item(next_session, agenda_row.title, agenda_row.description, agenda_row.presenter_profile_id, agenda_row.estimated_minutes, agenda_row.id);
      end if;
    end if;
  end loop;

  if session_row.status = 'IN_PROGRESS' then
    select version into v from public.meeting_sessions where id = session_row.id;
    perform public.transition_meeting_session(session_row.id, v, 'REVIEW', null);
  end if;
  select version into v from public.meeting_sessions where id = session_row.id;
  perform public.transition_meeting_session(session_row.id, v, 'PUBLISHED', null);
  select version into v from public.meeting_sessions where id = session_row.id;
  perform public.transition_meeting_session(session_row.id, v, 'CLOSED', null);

  select count(*) filter (where so.object_type = 'TASK'), count(*) filter (where so.object_type = 'PDCA'), count(*) filter (where so.object_type = 'DECISION')
    into created_tasks, created_pdcas, created_decisions
    from public.meeting_object_links link join public.security_objects so on so.id = link.security_object_id
    where link.meeting_session_id = session_row.id and link.relation_type = 'CREATED' and link.unlinked_at is null;
  perform private.write_execution_audit(session_row.company_id, session_row.security_object_id, 'MEETING_SESSION', session_row.id, 'meeting.finished', actor, null, null, null,
    jsonb_build_object('tasks', created_tasks, 'pdcas', created_pdcas, 'decisions', created_decisions, 'agenda_outcomes', agenda_outcomes));

  select * into session_row from public.meeting_sessions where id = session_row.id;
  return session_row;
end $$;

revoke all on function public.finish_meeting(uuid,bigint,jsonb) from public;
grant execute on function public.finish_meeting(uuid,bigint,jsonb) to authenticated;
