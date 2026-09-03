-- AI Foundation: provenance, proposals and confirmation on top of the existing
-- permission engine. The model never writes business tables; humans confirm
-- proposals through the normal domain commands, re-authorized at that moment.

insert into public.permissions(permission_key,description,risk_level,scope_requirement,is_delegable) values
  ('ai.meeting.assist','Run the AI Meeting Assistant and Meeting Summary over an accessible meeting',2,'INTERSECT',true),
  ('ai.execution.validate','Run the Execution Validator over an accessible Task or PDCA',1,'INTERSECT',true)
on conflict(permission_key) do nothing;

create table public.ai_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  requested_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  use_case text not null,
  target_security_object_id uuid not null references public.security_objects(id) on delete restrict,
  target_version bigint not null,
  model_provider text not null,
  model_name text not null,
  prompt_template_version text not null,
  status text not null default 'RUNNING',
  error_category text,
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint ai_runs_use_case check (use_case in ('MEETING_ASSISTANT','MEETING_SUMMARY','EXECUTION_VALIDATOR')),
  constraint ai_runs_status check (status in ('RUNNING','SUCCEEDED','FAILED')),
  constraint ai_runs_error check (error_category is null or error_category in ('TIMEOUT','PROVIDER','SCHEMA','CONFIGURATION','DISABLED','AUTHORIZATION')),
  constraint ai_runs_finished check ((status = 'RUNNING') = (finished_at is null)),
  constraint ai_runs_tokens check ((input_tokens is null or input_tokens >= 0) and (output_tokens is null or output_tokens >= 0) and (latency_ms is null or latency_ms >= 0))
);
create index ai_runs_requester_idx on public.ai_runs(requested_by_profile_id, started_at desc);
create index ai_runs_target_idx on public.ai_runs(target_security_object_id, started_at desc);
create index ai_runs_company_use_case_idx on public.ai_runs(company_id, use_case, status, started_at desc);

create table public.ai_run_sources (
  ai_run_id uuid not null references public.ai_runs(id) on delete restrict,
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  source_version bigint not null,
  context_role text not null,
  primary key (ai_run_id, security_object_id),
  constraint ai_run_sources_role check (context_role in ('TARGET','AGENDA','NOTE','LINK','INPUT'))
);
create index ai_run_sources_object_idx on public.ai_run_sources(security_object_id, ai_run_id);

create table public.ai_proposals (
  id uuid primary key default extensions.gen_random_uuid(),
  ai_run_id uuid not null references public.ai_runs(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  target_security_object_id uuid not null references public.security_objects(id) on delete restrict,
  proposal_type text not null,
  payload jsonb not null,
  payload_version smallint not null default 1,
  status text not null default 'PENDING',
  reviewed_by_profile_id uuid references public.profiles(id) on delete restrict,
  reviewed_at timestamptz,
  review_reason text,
  confirmed_payload jsonb,
  executed_record_type text,
  executed_record_id uuid,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_proposals_type check (proposal_type in ('DECISION','TASK','PDCA','SUMMARY','FINDING')),
  constraint ai_proposals_status check (status in ('PENDING','CONFIRMED','REJECTED')),
  constraint ai_proposals_payload check (jsonb_typeof(payload) = 'object'),
  constraint ai_proposals_reviewed check ((status = 'PENDING') = (reviewed_at is null)),
  constraint ai_proposals_reviewer check ((reviewed_at is null) = (reviewed_by_profile_id is null)),
  constraint ai_proposals_executed check (status = 'CONFIRMED' or executed_record_id is null),
  constraint ai_proposals_executed_pair check ((executed_record_id is null) = (executed_record_type is null)),
  constraint ai_proposals_version check (version > 0)
);
create index ai_proposals_target_idx on public.ai_proposals(target_security_object_id, status, created_at);
create index ai_proposals_run_idx on public.ai_proposals(ai_run_id);

create trigger ai_proposals_updated_at before update on public.ai_proposals for each row execute function public.set_updated_at();
create trigger ai_runs_no_delete before delete on public.ai_runs for each row execute function private.prevent_business_delete();
create trigger ai_proposals_no_delete before delete on public.ai_proposals for each row execute function private.prevent_business_delete();

-- AI provenance rows show up in the activity feeds of the objects they concern.
create or replace view public.meeting_activity with (security_invoker = true) as
select id, company_id, security_object_id, action, actor_profile_id, reason, before_data, after_data, metadata, occurred_at
from public.audit_events where security_object_id is not null and subject_type in ('MEETING_SERIES','MEETING_SESSION','MEETING_PARTICIPANT','MEETING_AGENDA_ITEM','MEETING_NOTE','MEETING_OBJECT_LINK','AI_RUN','AI_PROPOSAL');

create or replace view public.execution_activity with (security_invoker = true) as
select id, company_id, security_object_id, action, actor_profile_id, reason, before_data, after_data, metadata, occurred_at
from public.audit_events
where security_object_id is not null and subject_type in ('DECISION', 'TASK', 'PDCA', 'COMMENT', 'ATTACHMENT', 'OBJECT_MEMBERSHIP', 'AI_RUN', 'AI_PROPOSAL');

-- Helpers -------------------------------------------------------------------

create or replace function private.ai_read_permission_for(object_type text)
returns text language sql immutable set search_path='' as $$
  select case object_type
    when 'MEETING_SESSION' then 'meeting.read'
    when 'MEETING_SERIES' then 'meeting.read'
    when 'TASK' then 'task.read'
    when 'PDCA' then 'pdca.read'
    when 'DECISION' then 'decision.read'
    else null end
$$;

create or replace function private.ai_target_readable(profile_id uuid, target_object_id uuid)
returns boolean language plpgsql stable security definer set search_path='' set row_security=off as $$
declare object_type text; permission text;
begin
  if profile_id is null or target_object_id is null then return false; end if;
  select so.object_type into object_type from public.security_objects so where so.id = target_object_id;
  if not found then return false; end if;
  permission := private.ai_read_permission_for(object_type);
  if permission is null then return false; end if;
  return private.can_access_security_object(profile_id, target_object_id, permission);
end $$;

create or replace function private.ai_use_case_permission(use_case text)
returns text language sql immutable set search_path='' as $$
  select case use_case
    when 'MEETING_ASSISTANT' then 'ai.meeting.assist'
    when 'MEETING_SUMMARY' then 'ai.meeting.assist'
    when 'EXECUTION_VALIDATOR' then 'ai.execution.validate'
    else null end
$$;

-- Read policies: proposals belong to the target object's workspace. Whoever can
-- currently read the target can read the runs and proposals about it; sources
-- are additionally hidden when the source object itself is not readable.
alter table public.ai_runs enable row level security;
alter table public.ai_run_sources enable row level security;
alter table public.ai_proposals enable row level security;

create policy ai_runs_read on public.ai_runs for select to authenticated
  using (private.ai_target_readable(private.current_profile_id(), target_security_object_id));
create policy ai_run_sources_read on public.ai_run_sources for select to authenticated
  using (
    private.ai_target_readable(private.current_profile_id(), security_object_id)
    and exists (
      select 1 from public.ai_runs run
      where run.id = ai_run_id
        and private.ai_target_readable(private.current_profile_id(), run.target_security_object_id)
    )
  );
create policy ai_proposals_read on public.ai_proposals for select to authenticated
  using (private.ai_target_readable(private.current_profile_id(), target_security_object_id));

-- Commands ------------------------------------------------------------------

create or replace function public.start_ai_run(
  company_id uuid, use_case text, target_security_object_id uuid,
  model_provider text, model_name text, prompt_template_version text
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid := private.current_profile_id(); target public.security_objects; run_id uuid := extensions.gen_random_uuid(); permission text := private.ai_use_case_permission(use_case);
begin
  if actor is null or permission is null then raise exception 'unsupported AI use case or unauthenticated actor'; end if;
  select * into target from public.security_objects where id = target_security_object_id;
  if not found or target.company_id <> start_ai_run.company_id
     or not private.ai_target_readable(actor, target.id)
     or not private.can_access_security_object(actor, target.id, permission) then
    raise exception 'AI target not found or access denied';
  end if;
  if use_case in ('MEETING_ASSISTANT','MEETING_SUMMARY') and target.object_type <> 'MEETING_SESSION' then raise exception 'meeting use cases require a Meeting Session target'; end if;
  if use_case = 'EXECUTION_VALIDATOR' and target.object_type not in ('TASK','PDCA') then raise exception 'the Execution Validator requires a Task or PDCA target'; end if;
  insert into public.ai_runs(id, company_id, requested_by_profile_id, use_case, target_security_object_id, target_version, model_provider, model_name, prompt_template_version)
  values (run_id, company_id, actor, use_case, target.id, target.version, model_provider, model_name, prompt_template_version);
  insert into public.ai_run_sources(ai_run_id, security_object_id, source_version, context_role) values (run_id, target.id, target.version, 'TARGET');
  perform private.write_execution_audit(company_id, target.id, 'AI_RUN', run_id, 'ai.run.started', actor, null, null, null,
    jsonb_build_object('use_case', use_case, 'model_provider', model_provider, 'model_name', model_name, 'prompt_template_version', prompt_template_version));
  return run_id;
end $$;

create or replace function public.record_ai_run_sources(ai_run_id uuid, sources jsonb)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
#variable_conflict use_column
declare actor uuid := private.current_profile_id(); run public.ai_runs; source jsonb; object public.security_objects;
begin
  select * into run from public.ai_runs where id = record_ai_run_sources.ai_run_id;
  if not found or run.requested_by_profile_id <> actor or run.status <> 'RUNNING' then raise exception 'AI run not found, not owned or already finished'; end if;
  if jsonb_typeof(sources) <> 'array' then raise exception 'sources must be a JSON array'; end if;
  for source in select * from jsonb_array_elements(sources) loop
    select * into object from public.security_objects where id = (source->>'security_object_id')::uuid;
    if not found or object.company_id <> run.company_id or not private.ai_target_readable(actor, object.id) then raise exception 'AI source not accessible: %', source->>'security_object_id'; end if;
    if coalesce(source->>'context_role','') not in ('TARGET','AGENDA','NOTE','LINK','INPUT') then raise exception 'invalid source context role'; end if;
    insert into public.ai_run_sources(ai_run_id, security_object_id, source_version, context_role)
    values (run.id, object.id, coalesce((source->>'source_version')::bigint, object.version), source->>'context_role')
    on conflict (ai_run_id, security_object_id) do nothing;
  end loop;
end $$;

create or replace function public.complete_ai_run(
  ai_run_id uuid, status text, error_category text default null,
  input_tokens integer default null, output_tokens integer default null, latency_ms integer default null
) returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid := private.current_profile_id(); run public.ai_runs;
begin
  select * into run from public.ai_runs where id = ai_run_id;
  if not found or run.requested_by_profile_id <> actor or run.status <> 'RUNNING' then raise exception 'AI run not found, not owned or already finished'; end if;
  if status not in ('SUCCEEDED','FAILED') then raise exception 'invalid AI run outcome'; end if;
  update public.ai_runs set status = complete_ai_run.status, error_category = complete_ai_run.error_category,
    input_tokens = complete_ai_run.input_tokens, output_tokens = complete_ai_run.output_tokens,
    latency_ms = complete_ai_run.latency_ms, finished_at = now()
  where id = run.id;
  perform private.write_execution_audit(run.company_id, run.target_security_object_id, 'AI_RUN', run.id, 'ai.run.completed', actor, null, null, null,
    jsonb_build_object('status', status, 'error_category', error_category, 'input_tokens', input_tokens, 'output_tokens', output_tokens, 'latency_ms', latency_ms));
end $$;

create or replace function public.add_ai_proposal(ai_run_id uuid, proposal_type text, payload jsonb)
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid := private.current_profile_id(); run public.ai_runs; proposal_id uuid := extensions.gen_random_uuid();
begin
  select * into run from public.ai_runs where id = ai_run_id;
  if not found or run.requested_by_profile_id <> actor or run.status <> 'RUNNING' then raise exception 'AI run not found, not owned or already finished'; end if;
  if jsonb_typeof(payload) <> 'object' then raise exception 'proposal payload must be a JSON object'; end if;
  if (run.use_case = 'MEETING_ASSISTANT' and proposal_type not in ('DECISION','TASK','PDCA'))
     or (run.use_case = 'MEETING_SUMMARY' and proposal_type <> 'SUMMARY')
     or (run.use_case = 'EXECUTION_VALIDATOR' and proposal_type <> 'FINDING') then
    raise exception 'proposal type % is not produced by use case %', proposal_type, run.use_case;
  end if;
  insert into public.ai_proposals(id, ai_run_id, company_id, target_security_object_id, proposal_type, payload)
  values (proposal_id, run.id, run.company_id, run.target_security_object_id, proposal_type, payload);
  perform private.write_execution_audit(run.company_id, run.target_security_object_id, 'AI_PROPOSAL', proposal_id, 'ai.proposal.created', actor, null, null, null,
    jsonb_build_object('ai_run_id', run.id, 'proposal_type', proposal_type));
  return proposal_id;
end $$;

create or replace function private.ai_load_reviewable_proposal(actor uuid, proposal_id uuid, expected_version bigint)
returns public.ai_proposals language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare proposal public.ai_proposals; run public.ai_runs;
begin
  select * into proposal from public.ai_proposals where id = proposal_id for update;
  if not found then raise exception 'AI proposal not found or access denied'; end if;
  select * into run from public.ai_runs where id = proposal.ai_run_id;
  if actor is null or not private.ai_target_readable(actor, proposal.target_security_object_id)
     or not private.can_access_security_object(actor, proposal.target_security_object_id, private.ai_use_case_permission(run.use_case)) then
    raise exception 'AI proposal not found or access denied';
  end if;
  if proposal.status <> 'PENDING' then raise exception 'proposal already reviewed'; end if;
  if proposal.version <> expected_version then raise exception 'stale proposal version'; end if;
  return proposal;
end $$;

create or replace function public.reject_ai_proposal(proposal_id uuid, expected_version bigint, reason text)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid := private.current_profile_id(); proposal public.ai_proposals;
begin
  proposal := private.ai_load_reviewable_proposal(actor, proposal_id, expected_version);
  if char_length(btrim(coalesce(reason,''))) < 2 then raise exception 'a reason is required to reject a proposal'; end if;
  update public.ai_proposals set status = 'REJECTED', reviewed_by_profile_id = actor, reviewed_at = now(), review_reason = btrim(reason), version = version + 1
  where id = proposal.id;
  perform private.write_execution_audit(proposal.company_id, proposal.target_security_object_id, 'AI_PROPOSAL', proposal.id, 'ai.proposal.rejected', actor, btrim(reason), null, null,
    jsonb_build_object('proposal_type', proposal.proposal_type));
end $$;

create or replace function public.confirm_ai_proposal(proposal_id uuid, expected_version bigint, payload jsonb)
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare
  actor uuid := private.current_profile_id();
  proposal public.ai_proposals; run public.ai_runs; target public.security_objects; session public.meeting_sessions;
  unit_ids uuid[]; restaurant_ids uuid[]; visibility public.visibility_mode; agenda_item uuid;
  record_id uuid; record_type text;
begin
  proposal := private.ai_load_reviewable_proposal(actor, proposal_id, expected_version);
  if jsonb_typeof(payload) <> 'object' then raise exception 'confirmation payload must be a JSON object'; end if;
  if proposal.proposal_type = 'FINDING' then raise exception 'findings are recommendations and cannot be executed'; end if;
  select * into run from public.ai_runs where id = proposal.ai_run_id;
  select * into target from public.security_objects where id = proposal.target_security_object_id;
  if target.version <> run.target_version then raise exception 'proposal is stale: the meeting changed after the AI run; generate proposals again'; end if;
  select * into session from public.meeting_sessions where security_object_id = target.id;
  if not found then raise exception 'AI proposal target is not a meeting session'; end if;

  if payload ? 'unitIds' then
    select coalesce(array_agg(value::uuid), array[]::uuid[]) into unit_ids from jsonb_array_elements_text(payload->'unitIds');
  else
    select coalesce(array_agg(organizational_unit_id), array[]::uuid[]) into unit_ids from public.object_scope_organizational_units where security_object_id = target.id;
  end if;
  if payload ? 'restaurantIds' then
    select coalesce(array_agg(value::uuid), array[]::uuid[]) into restaurant_ids from jsonb_array_elements_text(payload->'restaurantIds');
  else
    select coalesce(array_agg(restaurant_id), array[]::uuid[]) into restaurant_ids from public.object_scope_restaurants where security_object_id = target.id;
  end if;
  visibility := coalesce((payload->>'visibility')::public.visibility_mode, target.visibility);
  agenda_item := (payload->>'agendaItemId')::uuid;

  if proposal.proposal_type = 'DECISION' then
    record_type := 'DECISION';
    record_id := public.create_meeting_decision(session.id, session.company_id, payload->>'title', payload->>'description',
      coalesce((payload->>'decisionDate')::date, current_date), visibility, unit_ids, restaurant_ids, agenda_item);
  elsif proposal.proposal_type = 'TASK' then
    record_type := 'TASK';
    record_id := public.create_meeting_task(session.id, session.company_id, payload->>'title', payload->>'description',
      coalesce(payload->>'priority','MEDIUM'), (payload->>'ownerProfileId')::uuid, (payload->>'responsibleProfileId')::uuid,
      (payload->>'dueDate')::date, visibility, unit_ids, restaurant_ids, agenda_item);
  elsif proposal.proposal_type = 'PDCA' then
    record_type := 'PDCA';
    record_id := public.create_meeting_pdca(session.id, session.company_id, payload->>'title', payload->>'description', payload->>'objective',
      coalesce(payload->>'priority','MEDIUM'), (payload->>'ownerProfileId')::uuid, (payload->>'responsibleProfileId')::uuid,
      (payload->>'dueDate')::date, visibility, unit_ids, restaurant_ids, agenda_item);
  elsif proposal.proposal_type = 'SUMMARY' then
    record_type := 'MEETING_NOTE';
    record_id := public.add_meeting_note(session.id, 'Resumo da reunião (proposto por AI, revisto e confirmado)' || E'\n\n' || (payload->>'summary'), null);
  else
    raise exception 'unsupported proposal type %', proposal.proposal_type;
  end if;

  update public.ai_proposals set status = 'CONFIRMED', reviewed_by_profile_id = actor, reviewed_at = now(), confirmed_payload = confirm_ai_proposal.payload,
    executed_record_type = record_type, executed_record_id = record_id, version = version + 1
  where id = proposal.id;
  perform private.write_execution_audit(proposal.company_id, proposal.target_security_object_id, 'AI_PROPOSAL', proposal.id, 'ai.proposal.confirmed', actor, null, proposal.payload, confirm_ai_proposal.payload,
    jsonb_build_object('proposal_type', proposal.proposal_type, 'executed_record_type', record_type, 'executed_record_id', record_id, 'ai_run_id', run.id));
  return record_id;
end $$;

revoke all on function private.ai_read_permission_for(text) from public;
revoke all on function private.ai_target_readable(uuid,uuid) from public;
revoke all on function private.ai_use_case_permission(text) from public;
revoke all on function private.ai_load_reviewable_proposal(uuid,uuid,bigint) from public;
revoke all on function public.start_ai_run(uuid,text,uuid,text,text,text) from public;
revoke all on function public.record_ai_run_sources(uuid,jsonb) from public;
revoke all on function public.complete_ai_run(uuid,text,text,integer,integer,integer) from public;
revoke all on function public.add_ai_proposal(uuid,text,jsonb) from public;
revoke all on function public.reject_ai_proposal(uuid,bigint,text) from public;
revoke all on function public.confirm_ai_proposal(uuid,bigint,jsonb) from public;

-- Row policies run as the querying role, so the helpers they call need EXECUTE
-- for authenticated (the same arrangement as private.can_access_security_object).
grant execute on function private.ai_read_permission_for(text) to authenticated;
grant execute on function private.ai_target_readable(uuid,uuid) to authenticated;
grant execute on function private.ai_use_case_permission(text) to authenticated;
grant execute on function public.start_ai_run(uuid,text,uuid,text,text,text) to authenticated;
grant execute on function public.record_ai_run_sources(uuid,jsonb) to authenticated;
grant execute on function public.complete_ai_run(uuid,text,text,integer,integer,integer) to authenticated;
grant execute on function public.add_ai_proposal(uuid,text,jsonb) to authenticated;
grant execute on function public.reject_ai_proposal(uuid,bigint,text) to authenticated;
grant execute on function public.confirm_ai_proposal(uuid,bigint,jsonb) to authenticated;
