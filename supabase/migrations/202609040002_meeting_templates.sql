-- Meeting templates and structured recurrence.
--
-- A template ("Reunião de Direção", "Visita técnica", …) pre-fills a new
-- meeting: subject, usual duration, participants, where it applies, base
-- agenda, suggested repetition and visibility. Everything can still be changed
-- on the meeting itself. Templates are company reference data managed by
-- people with `meeting.template.manage`; anyone who can create meetings in
-- the company can use them.

insert into public.permissions (permission_key, description, risk_level, scope_requirement, is_delegable)
values ('meeting.template.manage', 'Create and edit meeting templates for the company', 3, 'COVER_ALL', false)
on conflict (permission_key) do nothing;

-- Directors and executives manage templates.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.permission_key = 'meeting.template.manage'
where role.code in ('GLOBAL_EXECUTIVE', 'SUPPORT_DIRECTOR', 'DOL_DIRECTOR', 'DOL_SUBDIRECTOR')
on conflict do nothing;

create table public.meeting_templates (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  name text not null,
  meeting_type text not null default 'OPERATIONS' references public.meeting_type_definitions(code) on update restrict,
  default_duration_minutes integer not null default 60,
  visibility public.visibility_mode not null default 'NORMAL',
  participant_profile_ids uuid[] not null default array[]::uuid[],
  unit_ids uuid[] not null default array[]::uuid[],
  restaurant_ids uuid[] not null default array[]::uuid[],
  all_restaurants boolean not null default false,
  agenda jsonb not null default '[]'::jsonb,
  recurrence jsonb not null default '{"freq":"NONE"}'::jsonb,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_templates_name check (char_length(btrim(name)) between 2 and 120),
  constraint meeting_templates_duration check (default_duration_minutes between 10 and 480 and default_duration_minutes % 10 = 0),
  constraint meeting_templates_agenda_array check (jsonb_typeof(agenda) = 'array'),
  constraint meeting_templates_version check (version > 0)
);
create index meeting_templates_company_idx on public.meeting_templates (company_id, is_active, sort_order, name);

alter table public.meeting_templates enable row level security;

-- private.has_company_permission(profile, company, permission) already exists (migration 0002).
grant execute on function private.has_company_permission(uuid, uuid, text) to authenticated;

create policy "templates readable by meeting creators" on public.meeting_templates
  for select to authenticated
  using (private.has_company_permission(private.current_profile_id(), company_id, 'meeting.create'));

create or replace function public.save_meeting_template(
  template_id uuid,
  expected_version bigint,
  company_id uuid,
  name text,
  default_duration_minutes integer,
  meeting_type text,
  visibility public.visibility_mode,
  participant_profile_ids uuid[],
  unit_ids uuid[],
  restaurant_ids uuid[],
  all_restaurants boolean,
  agenda jsonb,
  recurrence jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
#variable_conflict use_column
declare
  actor uuid := private.current_profile_id();
  saved uuid;
  before_row public.meeting_templates;
begin
  if actor is null or not private.has_company_permission(actor, save_meeting_template.company_id, 'meeting.template.manage') then
    raise exception 'access denied';
  end if;
  if save_meeting_template.template_id is null then
    insert into public.meeting_templates (
      company_id, name, meeting_type, default_duration_minutes, visibility, participant_profile_ids,
      unit_ids, restaurant_ids, all_restaurants, agenda, recurrence, created_by_profile_id)
    values (
      save_meeting_template.company_id, btrim(save_meeting_template.name), save_meeting_template.meeting_type,
      save_meeting_template.default_duration_minutes, save_meeting_template.visibility,
      coalesce(save_meeting_template.participant_profile_ids, array[]::uuid[]),
      coalesce(save_meeting_template.unit_ids, array[]::uuid[]), coalesce(save_meeting_template.restaurant_ids, array[]::uuid[]),
      coalesce(save_meeting_template.all_restaurants, false), coalesce(save_meeting_template.agenda, '[]'::jsonb),
      coalesce(save_meeting_template.recurrence, '{"freq":"NONE"}'::jsonb), actor)
    returning id into saved;
    perform private.write_execution_audit(save_meeting_template.company_id, null, 'MEETING_TEMPLATE', saved, 'meeting.template.created', actor, null, null, jsonb_build_object('name', btrim(save_meeting_template.name)));
    return saved;
  end if;
  select * into before_row from public.meeting_templates t
  where t.id = save_meeting_template.template_id and t.company_id = save_meeting_template.company_id;
  if not found then raise exception 'template not found'; end if;
  if before_row.version <> save_meeting_template.expected_version then raise exception 'optimistic concurrency conflict'; end if;
  update public.meeting_templates t set
    name = btrim(save_meeting_template.name), meeting_type = save_meeting_template.meeting_type,
    default_duration_minutes = save_meeting_template.default_duration_minutes, visibility = save_meeting_template.visibility,
    participant_profile_ids = coalesce(save_meeting_template.participant_profile_ids, array[]::uuid[]),
    unit_ids = coalesce(save_meeting_template.unit_ids, array[]::uuid[]), restaurant_ids = coalesce(save_meeting_template.restaurant_ids, array[]::uuid[]),
    all_restaurants = coalesce(save_meeting_template.all_restaurants, false), agenda = coalesce(save_meeting_template.agenda, '[]'::jsonb),
    recurrence = coalesce(save_meeting_template.recurrence, '{"freq":"NONE"}'::jsonb), version = t.version + 1, updated_at = now()
  where t.id = save_meeting_template.template_id;
  perform private.write_execution_audit(save_meeting_template.company_id, null, 'MEETING_TEMPLATE', save_meeting_template.template_id, 'meeting.template.updated', actor, null, jsonb_build_object('name', before_row.name), jsonb_build_object('name', btrim(save_meeting_template.name)));
  return save_meeting_template.template_id;
end;
$$;

create or replace function public.deactivate_meeting_template(template_id uuid, expected_version bigint)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  actor uuid := private.current_profile_id();
  row_before public.meeting_templates;
begin
  select * into row_before from public.meeting_templates t where t.id = deactivate_meeting_template.template_id;
  if not found or not private.has_company_permission(actor, row_before.company_id, 'meeting.template.manage') then
    raise exception 'template not found or access denied';
  end if;
  if row_before.version <> deactivate_meeting_template.expected_version then raise exception 'optimistic concurrency conflict'; end if;
  update public.meeting_templates t set is_active = false, version = t.version + 1, updated_at = now() where t.id = deactivate_meeting_template.template_id;
  perform private.write_execution_audit(row_before.company_id, null, 'MEETING_TEMPLATE', row_before.id, 'meeting.template.deactivated', actor, null, jsonb_build_object('name', row_before.name), null);
end;
$$;

-- Structured recurrence on series (the text label stays for display).
alter table public.meeting_series add column if not exists recurrence jsonb not null default '{"freq":"NONE"}'::jsonb;

create or replace function public.set_meeting_series_recurrence(meeting_series_id uuid, expected_version bigint, recurrence jsonb, recurrence_rule text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
#variable_conflict use_column
declare
  actor uuid := private.current_profile_id();
  before_row public.meeting_series;
begin
  select * into before_row from public.meeting_series s where s.id = set_meeting_series_recurrence.meeting_series_id;
  if not found or not private.can_access_security_object(actor, before_row.security_object_id, 'meeting.update') then
    raise exception 'series not found or access denied';
  end if;
  if before_row.version <> set_meeting_series_recurrence.expected_version then raise exception 'optimistic concurrency conflict'; end if;
  update public.meeting_series s
  set recurrence = coalesce(set_meeting_series_recurrence.recurrence, '{"freq":"NONE"}'::jsonb),
      recurrence_rule = set_meeting_series_recurrence.recurrence_rule,
      version = s.version + 1, updated_at = now()
  where s.id = set_meeting_series_recurrence.meeting_series_id;
  perform private.write_execution_audit(before_row.company_id, before_row.security_object_id, 'MEETING_SERIES', before_row.id, 'meeting.series.recurrence.changed', actor, null, to_jsonb(before_row.recurrence_rule), to_jsonb(set_meeting_series_recurrence.recurrence_rule));
end;
$$;

revoke all on function public.save_meeting_template(uuid, bigint, uuid, text, integer, text, public.visibility_mode, uuid[], uuid[], uuid[], boolean, jsonb, jsonb) from public;
revoke all on function public.deactivate_meeting_template(uuid, bigint) from public;
revoke all on function public.set_meeting_series_recurrence(uuid, bigint, jsonb, text) from public;
grant execute on function public.save_meeting_template(uuid, bigint, uuid, text, integer, text, public.visibility_mode, uuid[], uuid[], uuid[], boolean, jsonb, jsonb) to authenticated;
grant execute on function public.deactivate_meeting_template(uuid, bigint) to authenticated;
grant execute on function public.set_meeting_series_recurrence(uuid, bigint, jsonb, text) to authenticated;
