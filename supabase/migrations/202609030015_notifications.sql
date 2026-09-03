-- Notification Center on the transactional outbox.
--
--   DOMAIN EVENT (audit_events)  →  outbox_events (same transaction)
--   → process_outbox()           →  notifications (in-app)
--   → (Gate D) push deliveries
--
-- Authorization is decided three times, deliberately:
--   1. at the event: the domain command already authorized the actor;
--   2. at notification creation: the recipient must be able to read the object
--      *now* (central rule) and have the category enabled;
--   3. when the deep link is opened: the page authorizes again.
-- Notifications store the object title and minimal metadata only; PRIVATE and
-- RESTRICTED objects are flagged `sensitive` so pushes stay generic.

-- ---------------------------------------------------------------------------
-- 1. Domain events feed the outbox (same transaction as the audit row).
-- ---------------------------------------------------------------------------
create or replace function private.audit_to_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.outbox_events (company_id, security_object_id, event_type, payload, idempotency_key, occurred_at)
  values (
    new.company_id,
    new.security_object_id,
    new.action,
    jsonb_build_object(
      'audit_event_id', new.id,
      'subject_type', new.subject_type,
      'subject_id', new.subject_id,
      'actor_profile_id', new.actor_profile_id,
      'before', new.before_data,
      'after', new.after_data
    ),
    'audit:' || new.id::text,
    new.occurred_at
  )
  on conflict (idempotency_key) do nothing;
  return null;
end;
$$;

drop trigger if exists audit_events_to_outbox on public.audit_events;
create trigger audit_events_to_outbox
  after insert on public.audit_events
  for each row execute function private.audit_to_outbox();

-- ---------------------------------------------------------------------------
-- 2. Model
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  tasks boolean not null default true,
  pdcas boolean not null default true,
  collaboration boolean not null default true,
  meeting_participation boolean not null default true,
  meeting_changes boolean not null default true,
  meeting_reminders boolean not null default true,
  deadline_days smallint not null default 1,
  push_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint notification_preferences_deadline_days check (deadline_days in (0, 1, 2))
);

create table public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete restrict,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  category text not null,
  title text not null,
  metadata jsonb not null default '{}'::jsonb,
  security_object_id uuid references public.security_objects(id) on delete cascade,
  target_kind text not null,
  target_id uuid not null,
  href text not null,
  sensitive boolean not null default false,
  dedupe_key text not null,
  source_event_id uuid references public.outbox_events(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_type_format check (type ~ '^[a-z][a-z0-9_.]{2,63}$'),
  constraint notifications_href_relative check (href ~ '^/[^/]'),
  constraint notifications_category check (category in (
    'tasks', 'pdcas', 'collaboration', 'meeting_participation', 'meeting_changes', 'meeting_reminders', 'deadlines'))
);
create unique index notifications_unread_dedupe_idx
  on public.notifications (recipient_profile_id, dedupe_key) where read_at is null;
create index notifications_recipient_idx
  on public.notifications (recipient_profile_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_profile_id) where read_at is null;

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

create policy "own notifications" on public.notifications
  for select to authenticated
  using (recipient_profile_id = private.current_profile_id());
create policy "own preferences" on public.notification_preferences
  for select to authenticated
  using (profile_id = private.current_profile_id());

-- Live badge: signal the recipient's own channel (no content in the payload).
create or replace function private.notification_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('area', 'notifications', 'at', extract(epoch from clock_timestamp())),
    'changed', 'profile:' || new.recipient_profile_id::text, true);
  return null;
exception when others then
  return null;
end;
$$;
create trigger notifications_broadcast
  after insert or update of read_at on public.notifications
  for each row execute function private.notification_broadcast();

-- ---------------------------------------------------------------------------
-- 3. Creating a notification (authorized, preference-aware, coalescing)
-- ---------------------------------------------------------------------------
create or replace function private.preferences_for(p_profile_id uuid)
returns public.notification_preferences
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select p from public.notification_preferences p where p.profile_id = p_profile_id),
    (select (p_profile_id, true, true, true, true, true, true, 1::smallint, true, now())::public.notification_preferences)
  )
$$;

create or replace function private.notify(
  p_recipient uuid,
  p_actor uuid,
  p_company_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_metadata jsonb,
  p_security_object_id uuid,
  p_target_kind text,
  p_target_id uuid,
  p_href text,
  p_dedupe_key text,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  prefs public.notification_preferences;
  object_row public.security_objects;
  read_permission text;
  existing uuid;
  created uuid;
begin
  if p_recipient is null or p_recipient = p_actor then return null; end if;
  if not exists (select 1 from public.profiles where id = p_recipient and is_active) then return null; end if;

  prefs := private.preferences_for(p_recipient);
  if (p_category = 'tasks' and not prefs.tasks)
     or (p_category = 'pdcas' and not prefs.pdcas)
     or (p_category = 'collaboration' and not prefs.collaboration)
     or (p_category = 'meeting_participation' and not prefs.meeting_participation)
     or (p_category = 'meeting_changes' and not prefs.meeting_changes)
     or (p_category = 'meeting_reminders' and not prefs.meeting_reminders)
     or (p_category = 'deadlines' and prefs.deadline_days = 0) then
    return null;
  end if;

  if p_security_object_id is not null then
    select * into object_row from public.security_objects where id = p_security_object_id and archived_at is null;
    if not found then return null; end if;
    read_permission := case object_row.object_type
      when 'MEETING_SESSION' then 'meeting.read'
      when 'MEETING_SERIES' then 'meeting.read'
      else lower(object_row.object_type) || '.read' end;
    if not private.can_access_security_object(p_recipient, p_security_object_id, read_permission) then
      return null;
    end if;
  end if;

  -- Coalesce with an unread notification about the same thing.
  select id into existing from public.notifications
  where recipient_profile_id = p_recipient and dedupe_key = p_dedupe_key and read_at is null;
  if existing is not null then
    update public.notifications
    set title = p_title, metadata = p_metadata, created_at = now(), type = p_type,
        source_event_id = coalesce(p_source_event_id, source_event_id)
    where id = existing;
    return existing;
  end if;

  insert into public.notifications (
    company_id, recipient_profile_id, type, category, title, metadata, security_object_id,
    target_kind, target_id, href, sensitive, dedupe_key, source_event_id)
  values (
    p_company_id, p_recipient, p_type, p_category, p_title, coalesce(p_metadata, '{}'::jsonb), p_security_object_id,
    p_target_kind, p_target_id, p_href,
    coalesce(object_row.visibility <> 'NORMAL', false), p_dedupe_key, p_source_event_id)
  returning id into created;
  return created;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Event → notifications
-- ---------------------------------------------------------------------------
create or replace function private.actor_name(p_profile_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select display_name from public.profiles where id = p_profile_id
$$;

create or replace function private.notify_from_event(e public.outbox_events)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  actor uuid := (e.payload->>'actor_profile_id')::uuid;
  subject uuid := (e.payload->>'subject_id')::uuid;
  before_status text;
  t public.tasks;
  p public.pdcas;
  s public.meeting_sessions;
  c public.comments;
  object_row public.security_objects;
  participant uuid;
  target_kind text;
  target_id uuid;
  href text;
  title text;
  category text;
  count integer := 0;
  meta jsonb;
  mentioned record;
begin
  -- ---------------------------------------------------------------- Tasks
  if e.event_type in ('task.status.changed', 'task.responsible.changed', 'task.owner.changed',
                      'task.due_date.changed', 'task.blocker.added', 'task.completed', 'task.reopened') then
    select * into t from public.tasks where id = subject;
    if not found then return 0; end if;
    meta := jsonb_build_object('due_date', t.due_date, 'actor', private.actor_name(actor));
    href := '/tasks/' || t.id::text;
    if e.event_type = 'task.status.changed' then
      before_status := coalesce(e.payload->'before'->>'status', trim(both '"' from (e.payload->'before')::text));
      if before_status = 'DRAFT' and t.status <> 'DRAFT' then
        count := count + (private.notify(t.responsible_profile_id, actor, t.company_id, 'task.assigned', 'tasks', t.title, meta,
          t.security_object_id, 'TASK', t.id, href, 'task.assigned:' || t.id::text, e.id) is not null)::int;
        count := count + (private.notify(t.owner_profile_id, actor, t.company_id, 'task.owner_assigned', 'tasks', t.title, meta,
          t.security_object_id, 'TASK', t.id, href, 'task.owner_assigned:' || t.id::text, e.id) is not null)::int;
      end if;
    elsif e.event_type = 'task.responsible.changed' and t.status <> 'DRAFT' then
      count := count + (private.notify(t.responsible_profile_id, actor, t.company_id, 'task.assigned', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.assigned:' || t.id::text, e.id) is not null)::int;
    elsif e.event_type = 'task.owner.changed' and t.status <> 'DRAFT' then
      count := count + (private.notify(t.owner_profile_id, actor, t.company_id, 'task.owner_assigned', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.owner_assigned:' || t.id::text, e.id) is not null)::int;
    elsif e.event_type = 'task.due_date.changed' then
      count := count + (private.notify(t.responsible_profile_id, actor, t.company_id, 'task.due_date_changed', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
      count := count + (private.notify(t.owner_profile_id, actor, t.company_id, 'task.due_date_changed', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
    elsif e.event_type = 'task.blocker.added' then
      count := count + (private.notify(t.owner_profile_id, actor, t.company_id, 'task.blocked', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
      count := count + (private.notify(t.responsible_profile_id, actor, t.company_id, 'task.blocked', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
    elsif e.event_type = 'task.completed' then
      count := count + (private.notify(t.owner_profile_id, actor, t.company_id, 'task.completed', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
    elsif e.event_type = 'task.reopened' then
      count := count + (private.notify(t.responsible_profile_id, actor, t.company_id, 'task.reopened', 'tasks', t.title, meta,
        t.security_object_id, 'TASK', t.id, href, 'task.changed:' || t.id::text, e.id) is not null)::int;
    end if;
    return count;
  end if;

  -- ---------------------------------------------------------------- PDCAs
  if e.event_type in ('pdca.status.changed', 'pdca.responsible.changed', 'pdca.owner.changed',
                      'pdca.due_date.changed', 'pdca.blocker.added', 'pdca.completed', 'pdca.reopened', 'pdca.phase.changed') then
    select * into p from public.pdcas where id = subject;
    if not found then return 0; end if;
    meta := jsonb_build_object('due_date', p.due_date, 'phase', p.phase, 'actor', private.actor_name(actor));
    href := '/pdcas/' || p.id::text;
    if e.event_type = 'pdca.status.changed' then
      before_status := coalesce(e.payload->'before'->>'status', trim(both '"' from (e.payload->'before')::text));
      if before_status = 'DRAFT' and p.status <> 'DRAFT' then
        count := count + (private.notify(p.responsible_profile_id, actor, p.company_id, 'pdca.assigned', 'pdcas', p.title, meta,
          p.security_object_id, 'PDCA', p.id, href, 'pdca.assigned:' || p.id::text, e.id) is not null)::int;
        count := count + (private.notify(p.owner_profile_id, actor, p.company_id, 'pdca.owner_assigned', 'pdcas', p.title, meta,
          p.security_object_id, 'PDCA', p.id, href, 'pdca.owner_assigned:' || p.id::text, e.id) is not null)::int;
      end if;
    elsif e.event_type = 'pdca.responsible.changed' and p.status <> 'DRAFT' then
      count := count + (private.notify(p.responsible_profile_id, actor, p.company_id, 'pdca.assigned', 'pdcas', p.title, meta,
        p.security_object_id, 'PDCA', p.id, href, 'pdca.assigned:' || p.id::text, e.id) is not null)::int;
    elsif e.event_type = 'pdca.owner.changed' and p.status <> 'DRAFT' then
      count := count + (private.notify(p.owner_profile_id, actor, p.company_id, 'pdca.owner_assigned', 'pdcas', p.title, meta,
        p.security_object_id, 'PDCA', p.id, href, 'pdca.owner_assigned:' || p.id::text, e.id) is not null)::int;
    elsif e.event_type in ('pdca.due_date.changed', 'pdca.phase.changed', 'pdca.completed', 'pdca.reopened') then
      count := count + (private.notify(p.owner_profile_id, actor, p.company_id,
        case e.event_type when 'pdca.due_date.changed' then 'pdca.due_date_changed' when 'pdca.phase.changed' then 'pdca.phase_changed'
                          when 'pdca.completed' then 'pdca.completed' else 'pdca.reopened' end,
        'pdcas', p.title, meta, p.security_object_id, 'PDCA', p.id, href, 'pdca.changed:' || p.id::text, e.id) is not null)::int;
      if e.event_type in ('pdca.due_date.changed', 'pdca.reopened') then
        count := count + (private.notify(p.responsible_profile_id, actor, p.company_id,
          case e.event_type when 'pdca.due_date.changed' then 'pdca.due_date_changed' else 'pdca.reopened' end,
          'pdcas', p.title, meta, p.security_object_id, 'PDCA', p.id, href, 'pdca.changed:' || p.id::text, e.id) is not null)::int;
      end if;
    elsif e.event_type = 'pdca.blocker.added' then
      count := count + (private.notify(p.owner_profile_id, actor, p.company_id, 'pdca.blocked', 'pdcas', p.title, meta,
        p.security_object_id, 'PDCA', p.id, href, 'pdca.changed:' || p.id::text, e.id) is not null)::int;
      count := count + (private.notify(p.responsible_profile_id, actor, p.company_id, 'pdca.blocked', 'pdcas', p.title, meta,
        p.security_object_id, 'PDCA', p.id, href, 'pdca.changed:' || p.id::text, e.id) is not null)::int;
    end if;
    return count;
  end if;

  -- ------------------------------------------------------------- Meetings
  if e.event_type = 'meeting.participant.added' then
    select * into s from public.meeting_sessions where security_object_id = e.security_object_id;
    if not found then return 0; end if;
    participant := (e.payload->'after'->>'profile_id')::uuid;
    meta := jsonb_build_object('scheduled_start_at', s.scheduled_start_at, 'actor', private.actor_name(actor));
    count := count + (private.notify(participant, actor, s.company_id, 'meeting.invited', 'meeting_participation', s.title, meta,
      s.security_object_id, 'MEETING', s.id, '/meetings/' || s.id::text || '/run', 'meeting.invited:' || s.id::text, e.id) is not null)::int;
    return count;
  end if;

  if e.event_type in ('meeting.schedule.changed', 'meeting.in_progress', 'meeting.review', 'meeting.cancelled') then
    select * into s from public.meeting_sessions where id = subject;
    if not found then return 0; end if;
    meta := jsonb_build_object('scheduled_start_at', s.scheduled_start_at, 'actor', private.actor_name(actor));
    href := '/meetings/' || s.id::text || '/run';
    if e.event_type = 'meeting.review' then
      count := count + (private.notify(s.chair_profile_id, actor, s.company_id, 'meeting.awaiting_validation', 'meeting_changes', s.title, meta,
        s.security_object_id, 'MEETING', s.id, '/meetings/' || s.id::text || '/finish', 'meeting.changed:' || s.id::text, e.id) is not null)::int;
      return count;
    end if;
    for participant in
      select mp.profile_id from public.meeting_participants mp where mp.meeting_session_id = s.id and mp.removed_at is null
      union select s.chair_profile_id
    loop
      count := count + (private.notify(participant, actor, s.company_id,
        case e.event_type when 'meeting.schedule.changed' then 'meeting.rescheduled' when 'meeting.in_progress' then 'meeting.started' else 'meeting.cancelled' end,
        'meeting_changes', s.title, meta, s.security_object_id, 'MEETING', s.id, href, 'meeting.changed:' || s.id::text, e.id) is not null)::int;
    end loop;
    return count;
  end if;

  -- -------------------------------------------------------- Collaboration
  if e.event_type = 'comment.created' then
    select * into c from public.comments where id = subject;
    if not found then return 0; end if;
    select * into object_row from public.security_objects where id = c.security_object_id;
    if not found then return 0; end if;
    target_kind := object_row.object_type;
    if target_kind = 'TASK' then
      select * into t from public.tasks where security_object_id = object_row.id;
      target_id := t.id; title := t.title; href := '/tasks/' || t.id::text;
    elsif target_kind = 'PDCA' then
      select * into p from public.pdcas where security_object_id = object_row.id;
      target_id := p.id; title := p.title; href := '/pdcas/' || p.id::text;
    elsif target_kind = 'DECISION' then
      select d.id, d.title into target_id, title from public.decisions d where d.security_object_id = object_row.id;
      href := '/decisions/' || target_id::text;
    else
      return 0;
    end if;
    meta := jsonb_build_object('actor', private.actor_name(actor));
    -- Mentions: "@Nome Apelido" for people who can read the object.
    for mentioned in
      select pr.id from public.profiles pr
      where pr.is_active and position(lower('@' || pr.display_name) in lower(c.body)) > 0
    loop
      count := count + (private.notify(mentioned.id, actor, object_row.company_id, 'mention', 'collaboration', title, meta,
        object_row.id, target_kind, target_id, href, 'mention:' || c.id::text, e.id) is not null)::int;
    end loop;
    if target_kind in ('TASK', 'PDCA') then
      count := count + (private.notify(coalesce(t.responsible_profile_id, p.responsible_profile_id), actor, object_row.company_id, 'comment', 'collaboration', title, meta,
        object_row.id, target_kind, target_id, href, 'comment:' || object_row.id::text, e.id) is not null)::int;
      count := count + (private.notify(coalesce(t.owner_profile_id, p.owner_profile_id), actor, object_row.company_id, 'comment', 'collaboration', title, meta,
        object_row.id, target_kind, target_id, href, 'comment:' || object_row.id::text, e.id) is not null)::int;
    end if;
    return count;
  end if;

  return 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Processor (idempotent, retrying, observable)
-- ---------------------------------------------------------------------------
create or replace function public.process_outbox(p_limit integer default 200)
returns table(processed integer, failed integer, notifications_created integer)
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  event public.outbox_events;
  created integer;
  ok integer := 0;
  bad integer := 0;
  made integer := 0;
begin
  for event in
    select * from public.outbox_events
    where processed_at is null and available_at <= now()
    order by occurred_at
    limit greatest(1, least(p_limit, 1000))
    for update skip locked
  loop
    begin
      created := private.notify_from_event(event);
      update public.outbox_events
      set processed_at = now(), attempt_count = attempt_count + 1, last_error = null
      where id = event.id;
      ok := ok + 1;
      made := made + coalesce(created, 0);
    exception when others then
      bad := bad + 1;
      update public.outbox_events
      set attempt_count = attempt_count + 1,
          last_error = left(sqlerrm, 500),
          -- exponential backoff; after 5 attempts the event is parked as dead
          available_at = case when attempt_count + 1 >= 5 then 'infinity'::timestamptz
                              else now() + (interval '1 minute' * power(2, attempt_count)) end
      where id = event.id;
    end;
  end loop;
  return query select ok, bad, made;
end;
$$;
revoke all on function public.process_outbox(integer) from public, anon, authenticated;
grant execute on function public.process_outbox(integer) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Scheduled notifications: meeting reminders and deadlines
-- ---------------------------------------------------------------------------
create or replace function public.generate_meeting_reminders(p_minutes integer default 30)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  s public.meeting_sessions;
  participant uuid;
  made integer := 0;
begin
  for s in
    select * from public.meeting_sessions
    where status in ('SCHEDULED', 'DRAFT')
      and scheduled_start_at between now() and now() + make_interval(mins => p_minutes)
  loop
    for participant in
      select mp.profile_id from public.meeting_participants mp where mp.meeting_session_id = s.id and mp.removed_at is null
      union select s.chair_profile_id
    loop
      made := made + (private.notify(participant, null, s.company_id, 'meeting.reminder', 'meeting_reminders', s.title,
        jsonb_build_object('scheduled_start_at', s.scheduled_start_at),
        s.security_object_id, 'MEETING', s.id, '/meetings/' || s.id::text || '/run', 'meeting.reminder:' || s.id::text) is not null)::int;
    end loop;
  end loop;
  return made;
end;
$$;

create or replace function public.generate_deadline_notifications()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  r record;
  made integer := 0;
  prefs public.notification_preferences;
  recipient uuid;
  week text := to_char(current_date, 'IYYY-IW');
begin
  for r in
    select 'TASK' as kind, t.id, t.title, t.due_date, t.responsible_profile_id, t.owner_profile_id, t.security_object_id, t.company_id, '/tasks/' || t.id::text as href
    from public.tasks t where t.status not in ('DRAFT', 'COMPLETED', 'CANCELLED', 'ARCHIVED') and t.due_date is not null and t.due_date <= current_date + 2
    union all
    select 'PDCA', p.id, p.title, p.due_date, p.responsible_profile_id, p.owner_profile_id, p.security_object_id, p.company_id, '/pdcas/' || p.id::text
    from public.pdcas p where p.status not in ('DRAFT', 'COMPLETED', 'CANCELLED', 'ARCHIVED') and p.due_date is not null and p.due_date <= current_date + 2
  loop
    for recipient in select unnest(array[r.responsible_profile_id, r.owner_profile_id]) loop
      if recipient is null then continue; end if;
      prefs := private.preferences_for(recipient);
      if r.due_date < current_date then
        made := made + (private.notify(recipient, null, r.company_id, lower(r.kind) || '.overdue', 'deadlines', r.title,
          jsonb_build_object('due_date', r.due_date), r.security_object_id, r.kind, r.id, r.href,
          lower(r.kind) || '.overdue:' || r.id::text || ':' || week) is not null)::int;
      elsif prefs.deadline_days > 0 and r.due_date = current_date + prefs.deadline_days then
        made := made + (private.notify(recipient, null, r.company_id, lower(r.kind) || '.due_soon', 'deadlines', r.title,
          jsonb_build_object('due_date', r.due_date), r.security_object_id, r.kind, r.id, r.href,
          lower(r.kind) || '.due_soon:' || r.id::text || ':' || r.due_date::text) is not null)::int;
      end if;
    end loop;
  end loop;
  return made;
end;
$$;
revoke all on function public.generate_meeting_reminders(integer) from public, anon, authenticated;
revoke all on function public.generate_deadline_notifications() from public, anon, authenticated;
grant execute on function public.generate_meeting_reminders(integer) to service_role;
grant execute on function public.generate_deadline_notifications() to service_role;

-- ---------------------------------------------------------------------------
-- 7. Reading and acting on notifications (own rows only)
-- ---------------------------------------------------------------------------
create or replace function public.unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select count(*)::integer from public.notifications
  where recipient_profile_id = private.current_profile_id() and read_at is null
$$;

create or replace function public.mark_notifications_read(notification_ids uuid[])
returns integer
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  touched integer;
begin
  update public.notifications set read_at = now()
  where recipient_profile_id = private.current_profile_id()
    and id = any(notification_ids) and read_at is null;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns integer
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  touched integer;
begin
  update public.notifications set read_at = now()
  where recipient_profile_id = private.current_profile_id() and read_at is null;
  get diagnostics touched = row_count;
  return touched;
end;
$$;

create or replace function public.get_notification_preferences()
returns public.notification_preferences
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select private.preferences_for(private.current_profile_id())
$$;

create or replace function public.save_notification_preferences(
  tasks boolean, pdcas boolean, collaboration boolean, meeting_participation boolean,
  meeting_changes boolean, meeting_reminders boolean, deadline_days smallint, push_enabled boolean
)
returns public.notification_preferences
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  me uuid := private.current_profile_id();
  saved public.notification_preferences;
begin
  if me is null then raise exception 'profile not found'; end if;
  insert into public.notification_preferences as np (profile_id, tasks, pdcas, collaboration, meeting_participation, meeting_changes, meeting_reminders, deadline_days, push_enabled)
  values (me, tasks, pdcas, collaboration, meeting_participation, meeting_changes, meeting_reminders, deadline_days, push_enabled)
  on conflict (profile_id) do update set
    tasks = excluded.tasks, pdcas = excluded.pdcas, collaboration = excluded.collaboration,
    meeting_participation = excluded.meeting_participation, meeting_changes = excluded.meeting_changes,
    meeting_reminders = excluded.meeting_reminders, deadline_days = excluded.deadline_days,
    push_enabled = excluded.push_enabled, updated_at = now()
  returning * into saved;
  return saved;
end;
$$;

revoke all on function public.unread_notification_count() from public;
revoke all on function public.mark_notifications_read(uuid[]) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.get_notification_preferences() from public;
revoke all on function public.save_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, smallint, boolean) from public;
grant execute on function public.unread_notification_count() to authenticated;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_notification_preferences() to authenticated;
grant execute on function public.save_notification_preferences(boolean, boolean, boolean, boolean, boolean, boolean, smallint, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Dispatcher: pg_cron inside the database when available. The same
--    functions are also exposed to a secured HTTP job route for hosts that
--    prefer an external scheduler (see docs/notifications.md).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('notifications-process-outbox', '* * * * *', 'select public.process_outbox(200)');
    perform cron.schedule('notifications-meeting-reminders', '*/5 * * * *', 'select public.generate_meeting_reminders(30)');
    perform cron.schedule('notifications-deadlines', '0 7 * * *', 'select public.generate_deadline_notifications()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled: %', sqlerrm;
end;
$$;
