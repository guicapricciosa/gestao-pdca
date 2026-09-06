-- Deleting a meeting (decision of 2026-09-06): the chair or the person who
-- scheduled it can delete any meeting, in any state, as long as they still
-- hold meeting.update on it. Nothing is physically removed: the session is
-- marked deleted and disappears from every list, search, dashboard and page;
-- a full snapshot (session, participants, agenda with outcomes, notes,
-- linked records, publications) goes to the audit trail. Records created in
-- the meeting (tasks, PDCAs, decisions) live on as their own records.

alter table public.meeting_sessions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by_profile_id uuid references public.profiles(id) on delete restrict,
  add column if not exists deleted_reason text;

create index if not exists meeting_sessions_live_idx
  on public.meeting_sessions (scheduled_start_at) where deleted_at is null;

create or replace function public.delete_meeting_session(
  meeting_session_id uuid,
  expected_version bigint,
  reason text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
set row_security = off
as $$
declare
  actor uuid := private.current_profile_id();
  row_before public.meeting_sessions;
  snapshot jsonb;
begin
  select * into row_before from public.meeting_sessions s
  where s.id = delete_meeting_session.meeting_session_id and s.deleted_at is null;
  if not found or actor is null
     or not private.can_access_security_object(actor, row_before.security_object_id, 'meeting.update') then
    raise exception 'meeting not found or access denied';
  end if;
  if actor <> row_before.chair_profile_id and actor <> row_before.created_by_profile_id then
    raise exception 'only the chair or the person who scheduled the meeting can delete it';
  end if;
  if char_length(btrim(coalesce(reason, ''))) < 3 then
    raise exception 'a reason is required';
  end if;
  if row_before.version <> expected_version then
    raise exception 'optimistic concurrency conflict';
  end if;

  snapshot := jsonb_build_object(
    'session', to_jsonb(row_before),
    'participants', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb) from public.meeting_participants p where p.meeting_session_id = row_before.id),
    'agenda', (select coalesce(jsonb_agg(to_jsonb(a) order by a.position), '[]'::jsonb) from public.meeting_agenda_items a where a.meeting_session_id = row_before.id),
    'notes', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]'::jsonb) from public.meeting_notes n where n.meeting_session_id = row_before.id),
    'links', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb) from public.meeting_object_links l where l.meeting_session_id = row_before.id),
    'publications', (select coalesce(jsonb_agg(to_jsonb(pub) order by pub.publication_number), '[]'::jsonb) from public.meeting_publications pub where pub.meeting_session_id = row_before.id)
  );

  update public.meeting_sessions
  set deleted_at = now(), deleted_by_profile_id = actor, deleted_reason = btrim(reason), version = version + 1
  where id = row_before.id;

  insert into public.audit_events (
    company_id, security_object_id, subject_type, subject_id, action,
    actor_profile_id, actor_type, reason, before_data, metadata
  ) values (
    row_before.company_id, row_before.security_object_id, 'MEETING_SESSION', row_before.id, 'meeting.deleted',
    actor, 'USER', btrim(reason), snapshot,
    jsonb_build_object('title', row_before.title, 'status', row_before.status, 'scheduled_start_at', row_before.scheduled_start_at)
  );
end;
$$;

revoke all on function public.delete_meeting_session(uuid, bigint, text) from public, anon;
grant execute on function public.delete_meeting_session(uuid, bigint, text) to authenticated;

-- Deleted sessions are invisible to everyone through the normal reads.
drop policy if exists meeting_sessions_read on public.meeting_sessions;
create policy meeting_sessions_read on public.meeting_sessions for select to authenticated
  using (deleted_at is null and security_object_id in (select private.accessible_security_objects(private.current_profile_id(), 'meeting.read')));

create or replace function public.my_meetings()
returns table(meeting_session_id uuid,title text,status text,scheduled_start_at timestamptz,relationship text) language sql stable security definer set search_path='' set row_security=off as $$
  select session.id,session.title,session.status,session.scheduled_start_at,
    case when session.chair_profile_id=private.current_profile_id() then 'CHAIR' when exists(select 1 from public.meeting_participants participant where participant.meeting_session_id=session.id and participant.profile_id=private.current_profile_id() and participant.removed_at is null) then 'PARTICIPANT' else 'ACCESS' end
  from public.meeting_sessions session
  where session.deleted_at is null
    and private.can_access_security_object(private.current_profile_id(),session.security_object_id,'meeting.read')
    and (session.scheduled_start_at>=now() or session.status='REVIEW')
  order by session.scheduled_start_at
$$;
