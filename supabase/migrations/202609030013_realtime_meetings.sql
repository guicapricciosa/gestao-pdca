-- Realtime for Meeting Mode.
--
-- Design (see docs/realtime.md):
--   * one private Broadcast channel per meeting session: topic `meeting:<id>`;
--   * the database emits change *signals* (area only, never object data) from
--     triggers, and each browser re-reads the meeting through its own
--     authorized server render — Realtime can never reveal more than a query;
--   * joining the channel is authorized by RLS on realtime.messages using the
--     same central rule as reading the meeting (`meeting.read`);
--   * Presence rides on the same channel (display name only).

create or replace function private.meeting_channel_session_id(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^meeting:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then substring(p_topic from 9)::uuid
    else null
  end
$$;

create or replace function private.can_join_meeting_channel(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select exists (
    select 1
    from public.meeting_sessions session
    where session.id = private.meeting_channel_session_id(p_topic)
      and private.can_access_security_object(
        private.current_profile_id(), session.security_object_id, 'meeting.read')
  )
$$;

grant execute on function private.meeting_channel_session_id(text) to authenticated;
grant execute on function private.can_join_meeting_channel(text) to authenticated;

-- Realtime evaluates these policies with the subscriber's JWT when the
-- channel is joined (select) and when presence/broadcast is sent (insert).
drop policy if exists "meeting channel read" on realtime.messages;
create policy "meeting channel read" on realtime.messages
  for select to authenticated
  using (private.can_join_meeting_channel(realtime.topic()));

drop policy if exists "meeting channel presence" on realtime.messages;
create policy "meeting channel presence" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and private.can_join_meeting_channel(realtime.topic())
  );

-- Signal only: which area of the meeting changed. No titles, ids or content.
create or replace function private.meeting_broadcast(p_session_id uuid, p_area text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('area', p_area, 'at', extract(epoch from clock_timestamp())),
    'changed',
    'meeting:' || p_session_id::text,
    true
  );
exception when others then
  -- Realtime must never break a domain transaction.
  raise warning 'meeting broadcast skipped: %', sqlerrm;
end;
$$;

create or replace function private.meeting_change_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  if TG_TABLE_NAME = 'meeting_sessions' then
    session_id := new.id;
  else
    session_id := new.meeting_session_id;
  end if;
  perform private.meeting_broadcast(session_id, TG_ARGV[0]);
  return null;
end;
$$;

-- Execution objects visible inside an active meeting: signal their sessions.
create or replace function private.linked_meeting_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_id uuid;
begin
  for session_id in
    select link.meeting_session_id
    from public.meeting_object_links link
    join public.meeting_sessions session on session.id = link.meeting_session_id
    where link.security_object_id = new.security_object_id
      and link.unlinked_at is null
      and session.status in ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'REVIEW')
  loop
    perform private.meeting_broadcast(session_id, 'links');
  end loop;
  return null;
end;
$$;

create trigger meeting_sessions_broadcast
  after update on public.meeting_sessions
  for each row execute function private.meeting_change_broadcast('session');
create trigger meeting_agenda_items_broadcast
  after insert or update on public.meeting_agenda_items
  for each row execute function private.meeting_change_broadcast('agenda');
create trigger meeting_notes_broadcast
  after insert or update on public.meeting_notes
  for each row execute function private.meeting_change_broadcast('notes');
create trigger meeting_object_links_broadcast
  after insert or update on public.meeting_object_links
  for each row execute function private.meeting_change_broadcast('links');
create trigger meeting_participants_broadcast
  after insert or update on public.meeting_participants
  for each row execute function private.meeting_change_broadcast('participants');
create trigger tasks_meeting_broadcast
  after update on public.tasks
  for each row execute function private.linked_meeting_broadcast();
create trigger pdcas_meeting_broadcast
  after update on public.pdcas
  for each row execute function private.linked_meeting_broadcast();
create trigger decisions_meeting_broadcast
  after update on public.decisions
  for each row execute function private.linked_meeting_broadcast();
