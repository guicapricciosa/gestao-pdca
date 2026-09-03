create type public.meeting_participant_role as enum ('CHAIR', 'PARTICIPANT');
create type public.meeting_object_relation as enum ('CREATED', 'REVIEWED', 'DISCUSSED', 'FOLLOW_UP', 'CLOSED_IN_MEETING');

create table public.meeting_type_definitions (
  code text primary key,
  label text not null,
  is_active boolean not null default true,
  sort_order smallint not null,
  constraint meeting_type_code check (code ~ '^[A-Z][A-Z0-9_]{1,31}$')
);
insert into public.meeting_type_definitions values
  ('OPERATIONS','Operations',true,10), ('MANAGEMENT','Management',true,20),
  ('SUPPORT','Support',true,30), ('ONE_TO_ONE','One-to-one',true,40), ('AD_HOC','Ad-hoc',true,50);

create table public.meeting_status_definitions (
  code text primary key,
  label text not null,
  is_active boolean not null default true,
  sort_order smallint not null,
  constraint meeting_status_code check (code in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW','PUBLISHED','CLOSED','CANCELLED'))
);
insert into public.meeting_status_definitions values
  ('DRAFT','Draft',true,10), ('SCHEDULED','Scheduled',true,20), ('IN_PROGRESS','In progress',true,30),
  ('REVIEW','Review',true,40), ('PUBLISHED','Published',true,50), ('CLOSED','Closed',true,60), ('CANCELLED','Cancelled',true,70);

create table public.meeting_agenda_status_definitions (
  code text primary key,
  label text not null,
  is_active boolean not null default true,
  sort_order smallint not null,
  constraint meeting_agenda_status_code check (code in ('PENDING','DISCUSSED','POSTPONED','CLOSED'))
);
insert into public.meeting_agenda_status_definitions values
  ('PENDING','Pending',true,10), ('DISCUSSED','Discussed',true,20), ('POSTPONED','Postponed',true,30), ('CLOSED','Closed',true,40);

create table public.meeting_series (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid not null unique references public.security_objects(id) on delete restrict,
  title text not null,
  description text,
  meeting_type text not null references public.meeting_type_definitions(code) on update restrict,
  default_chair_profile_id uuid references public.profiles(id) on delete restrict,
  recurrence_rule text,
  recurrence_metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint meeting_series_title check (char_length(btrim(title)) between 2 and 240),
  constraint meeting_series_version check (version > 0),
  constraint meeting_series_active_consistent check (is_active = (deactivated_at is null))
);
create index meeting_series_company_active_idx on public.meeting_series(company_id, is_active, updated_at desc);

create table public.meeting_series_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_series_id uuid not null references public.meeting_series(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  participant_role public.meeting_participant_role not null default 'PARTICIPANT',
  added_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint meeting_series_participant_end check ((ended_at is null) = (ended_by_profile_id is null))
);
create unique index meeting_series_participants_active_unique on public.meeting_series_participants(meeting_series_id, profile_id) where ended_at is null;

create table public.meeting_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_series_id uuid references public.meeting_series(id) on delete restrict,
  company_id uuid not null references public.companies(id) on delete restrict,
  security_object_id uuid not null unique references public.security_objects(id) on delete restrict,
  title text not null,
  scheduled_start_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  chair_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'DRAFT' references public.meeting_status_definitions(code) on update restrict,
  published_at timestamptz,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_sessions_title check (char_length(btrim(title)) between 2 and 240),
  constraint meeting_sessions_schedule check (scheduled_end_at > scheduled_start_at),
  constraint meeting_sessions_actual check (actual_end_at is null or (actual_start_at is not null and actual_end_at >= actual_start_at)),
  constraint meeting_sessions_version check (version > 0),
  constraint meeting_sessions_published check (status not in ('PUBLISHED','CLOSED') or published_at is not null),
  constraint meeting_sessions_closed check (status <> 'CLOSED' or closed_at is not null)
);
create index meeting_sessions_company_schedule_idx on public.meeting_sessions(company_id, scheduled_start_at desc, id);
create index meeting_sessions_series_schedule_idx on public.meeting_sessions(meeting_series_id, scheduled_start_at desc) where meeting_series_id is not null;
create index meeting_sessions_chair_status_idx on public.meeting_sessions(chair_profile_id, status, scheduled_start_at);

create table public.meeting_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  participant_role public.meeting_participant_role not null default 'PARTICIPANT',
  invitation_status text not null default 'INVITED' check (invitation_status in ('INVITED','CONFIRMED','DECLINED')),
  attended boolean,
  joined_at timestamptz,
  left_at timestamptz,
  added_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  removed_at timestamptz,
  removed_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint meeting_participant_presence check (left_at is null or (joined_at is not null and left_at >= joined_at)),
  constraint meeting_participant_removed check ((removed_at is null) = (removed_by_profile_id is null))
);
create unique index meeting_participants_active_unique on public.meeting_participants(meeting_session_id, profile_id) where removed_at is null;
create index meeting_participants_profile_idx on public.meeting_participants(profile_id, meeting_session_id) where removed_at is null;

create table public.meeting_agenda_items (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  title text not null,
  description text,
  position integer not null,
  presenter_profile_id uuid references public.profiles(id) on delete restrict,
  status text not null default 'PENDING' references public.meeting_agenda_status_definitions(code) on update restrict,
  estimated_minutes integer,
  carried_forward_from_id uuid references public.meeting_agenda_items(id) on delete restrict,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meeting_agenda_title check (char_length(btrim(title)) between 2 and 240),
  constraint meeting_agenda_position check (position > 0),
  constraint meeting_agenda_duration check (estimated_minutes is null or estimated_minutes between 1 and 1440),
  constraint meeting_agenda_version check (version > 0),
  unique(meeting_session_id, position)
);
create index meeting_agenda_session_status_idx on public.meeting_agenda_items(meeting_session_id, status, position);

create table public.meeting_notes (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  meeting_agenda_item_id uuid references public.meeting_agenda_items(id) on delete restrict,
  author_profile_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  hidden_at timestamptz,
  hidden_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint meeting_note_content check (char_length(btrim(content)) between 1 and 20000),
  constraint meeting_note_version check (version > 0),
  constraint meeting_note_hidden check ((hidden_at is null) = (hidden_by_profile_id is null))
);
create index meeting_notes_session_time_idx on public.meeting_notes(meeting_session_id, created_at, id) where hidden_at is null;

create table public.meeting_object_links (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  meeting_agenda_item_id uuid references public.meeting_agenda_items(id) on delete restrict,
  security_object_id uuid not null references public.security_objects(id) on delete restrict,
  relation_type public.meeting_object_relation not null,
  outcome_notes text,
  linked_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default now(),
  unlinked_at timestamptz,
  unlinked_by_profile_id uuid references public.profiles(id) on delete restrict,
  constraint meeting_object_link_unlinked check ((unlinked_at is null) = (unlinked_by_profile_id is null))
);
create unique index meeting_object_links_active_unique on public.meeting_object_links(meeting_session_id, security_object_id, relation_type) where unlinked_at is null;
create index meeting_object_links_object_idx on public.meeting_object_links(security_object_id, linked_at desc) where unlinked_at is null;

create table public.meeting_session_status_transitions (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  from_status text references public.meeting_status_definitions(code) on update restrict,
  to_status text not null references public.meeting_status_definitions(code) on update restrict,
  changed_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text,
  changed_at timestamptz not null default now()
);
create index meeting_session_transitions_idx on public.meeting_session_status_transitions(meeting_session_id, changed_at, id);

create table public.meeting_publications (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  publication_number integer not null,
  published_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  snapshot jsonb not null,
  published_at timestamptz not null default now(),
  constraint meeting_publication_number check (publication_number > 0),
  unique(meeting_session_id, publication_number)
);

create table public.meeting_reopening_events (
  id uuid primary key default extensions.gen_random_uuid(),
  meeting_session_id uuid not null references public.meeting_sessions(id) on delete restrict,
  reopened_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null,
  reopened_at timestamptz not null default now(),
  constraint meeting_reopening_reason check (char_length(btrim(reason)) between 3 and 1000)
);

create trigger meeting_series_updated_at before update on public.meeting_series for each row execute function public.set_updated_at();
create trigger meeting_sessions_updated_at before update on public.meeting_sessions for each row execute function public.set_updated_at();
create trigger meeting_agenda_updated_at before update on public.meeting_agenda_items for each row execute function public.set_updated_at();
create trigger meeting_notes_updated_at before update on public.meeting_notes for each row execute function public.set_updated_at();

create or replace function private.meeting_link_target_readable(p_profile_id uuid, p_security_object_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select case object_row.object_type
    when 'DECISION' then private.can_access_security_object(p_profile_id, object_row.id, 'decision.read')
    when 'TASK' then private.can_access_security_object(p_profile_id, object_row.id, 'task.read')
    when 'PDCA' then private.can_access_security_object(p_profile_id, object_row.id, 'pdca.read')
    else false end
  from public.security_objects object_row where object_row.id = p_security_object_id
$$;

create or replace view public.meeting_list_items with (security_invoker = true) as
select session.id, session.meeting_series_id, session.security_object_id, session.title, session.scheduled_start_at,
  session.scheduled_end_at, session.chair_profile_id, session.status, session.version, session.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id=session.security_object_id),array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id=session.security_object_id),array[]::uuid[]) restaurant_ids,
  coalesce((select array_agg(participant.profile_id) from public.meeting_participants participant where participant.meeting_session_id=session.id and participant.removed_at is null),array[]::uuid[]) participant_ids
from public.meeting_sessions session;

create or replace view public.meeting_activity with (security_invoker = true) as
select id, company_id, security_object_id, action, actor_profile_id, reason, before_data, after_data, metadata, occurred_at
from public.audit_events where security_object_id is not null and subject_type in ('MEETING_SERIES','MEETING_SESSION','MEETING_PARTICIPANT','MEETING_AGENDA_ITEM','MEETING_NOTE','MEETING_OBJECT_LINK');

alter table public.meeting_type_definitions enable row level security;
alter table public.meeting_status_definitions enable row level security;
alter table public.meeting_agenda_status_definitions enable row level security;
alter table public.meeting_series enable row level security;
alter table public.meeting_series_participants enable row level security;
alter table public.meeting_sessions enable row level security;
alter table public.meeting_participants enable row level security;
alter table public.meeting_agenda_items enable row level security;
alter table public.meeting_notes enable row level security;
alter table public.meeting_object_links enable row level security;

-- The generic security-object policies derive `<object_type>.read`. Both
-- meeting aggregates deliberately share the functional `meeting.read` key,
-- so these additive policies bridge only that naming difference.
create policy meeting_security_objects_read on public.security_objects
  for select to authenticated
  using (
    object_type in ('MEETING_SERIES','MEETING_SESSION')
    and private.can_access_security_object(private.current_profile_id(),id,'meeting.read')
  );
create policy meeting_scope_units_read on public.object_scope_organizational_units
  for select to authenticated
  using (exists (
    select 1 from public.security_objects object_row
    where object_row.id=security_object_id
      and object_row.object_type in ('MEETING_SERIES','MEETING_SESSION')
      and private.can_access_security_object(private.current_profile_id(),object_row.id,'meeting.read')
  ));
create policy meeting_scope_restaurants_read on public.object_scope_restaurants
  for select to authenticated
  using (exists (
    select 1 from public.security_objects object_row
    where object_row.id=security_object_id
      and object_row.object_type in ('MEETING_SERIES','MEETING_SESSION')
      and private.can_access_security_object(private.current_profile_id(),object_row.id,'meeting.read')
  ));
create policy meeting_explicit_grants_read on public.explicit_access_grants
  for select to authenticated
  using (exists (
    select 1 from public.security_objects object_row
    where object_row.id=security_object_id
      and object_row.object_type in ('MEETING_SERIES','MEETING_SESSION')
      and private.can_access_security_object(private.current_profile_id(),object_row.id,'meeting.read')
  ));
alter table public.meeting_session_status_transitions enable row level security;
alter table public.meeting_publications enable row level security;
alter table public.meeting_reopening_events enable row level security;

create policy meeting_types_read on public.meeting_type_definitions for select to authenticated using (private.current_profile_id() is not null);
create policy meeting_statuses_read on public.meeting_status_definitions for select to authenticated using (private.current_profile_id() is not null);
create policy agenda_statuses_read on public.meeting_agenda_status_definitions for select to authenticated using (private.current_profile_id() is not null);
create policy meeting_series_read on public.meeting_series for select to authenticated using (private.can_access_security_object(private.current_profile_id(),security_object_id,'meeting.read'));
create policy meeting_sessions_read on public.meeting_sessions for select to authenticated using (private.can_access_security_object(private.current_profile_id(),security_object_id,'meeting.read'));
create policy meeting_series_participants_read on public.meeting_series_participants for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_series where id=meeting_series_id),'meeting.read'));
create policy meeting_participants_read on public.meeting_participants for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy meeting_agenda_read on public.meeting_agenda_items for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy meeting_notes_read on public.meeting_notes for select to authenticated using (hidden_at is null and private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy meeting_links_read on public.meeting_object_links for select to authenticated using (unlinked_at is null and private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read') and private.meeting_link_target_readable(private.current_profile_id(),security_object_id));
create policy meeting_transitions_read on public.meeting_session_status_transitions for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy meeting_publications_read on public.meeting_publications for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy meeting_reopenings_read on public.meeting_reopening_events for select to authenticated using (private.can_access_security_object(private.current_profile_id(),(select security_object_id from public.meeting_sessions where id=meeting_session_id),'meeting.read'));
create policy audit_meeting_activity_read on public.audit_events for select to authenticated using (
  security_object_id is not null and exists (
    select 1 from public.security_objects object_row where object_row.id=security_object_id
      and object_row.object_type in ('MEETING_SERIES','MEETING_SESSION')
      and private.can_access_security_object(private.current_profile_id(),object_row.id,'meeting.read')
  )
);

revoke insert,update,delete on public.meeting_type_definitions,public.meeting_status_definitions,public.meeting_agenda_status_definitions,
  public.meeting_series,public.meeting_series_participants,public.meeting_sessions,public.meeting_participants,
  public.meeting_agenda_items,public.meeting_notes,public.meeting_object_links,public.meeting_session_status_transitions,
  public.meeting_publications,public.meeting_reopening_events from authenticated;
