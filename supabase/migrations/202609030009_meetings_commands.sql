insert into public.permissions(permission_key,description,risk_level,scope_requirement,is_delegable) values
  ('meeting.create','Create meeting series and sessions in the complete proposed scope',2,'COVER_ALL',false),
  ('meeting.read','Read meetings',1,'INTERSECT',true),
  ('meeting.update','Update authorized meetings',2,'INTERSECT',true),
  ('meeting.scope.update','Change the complete meeting scope',3,'COVER_ALL',true),
  ('meeting.publish','Publish reviewed meetings',3,'COVER_ALL',true),
  ('meeting.close','Close published meetings',3,'COVER_ALL',true),
  ('meeting.reopen','Reopen published or closed meetings',3,'COVER_ALL',true),
  ('meeting.participant.manage','Manage meeting participants and Chair',2,'INTERSECT',true),
  ('meeting.agenda.manage','Manage meeting agenda',2,'INTERSECT',true),
  ('meeting.note.create','Create and edit meeting notes',1,'INTERSECT',true),
  ('meeting.link.manage','Link independently authorized execution objects',2,'INTERSECT',true)
on conflict(permission_key) do nothing;

create or replace function private.validate_meeting_security_object()
returns trigger language plpgsql set search_path='' as $$
declare object_row public.security_objects;
begin
  select * into object_row from public.security_objects where id=new.security_object_id;
  if not found or object_row.company_id<>new.company_id or object_row.object_type<>tg_argv[0] then raise exception 'invalid meeting security object'; end if;
  if object_row.created_by_profile_id<>new.created_by_profile_id then raise exception 'meeting creator must match security object creator'; end if;
  return new;
end $$;
create trigger meeting_series_validate_security before insert or update on public.meeting_series for each row execute function private.validate_meeting_security_object('MEETING_SERIES');
create trigger meeting_sessions_validate_security before insert or update on public.meeting_sessions for each row execute function private.validate_meeting_security_object('MEETING_SESSION');

create or replace function private.profile_can_read_meeting(profile_id uuid,security_object_id uuid)
returns boolean language sql stable security definer set search_path='' set row_security=off as $$
  select private.can_access_security_object(profile_id,security_object_id,'meeting.read')
$$;

create or replace function public.create_meeting_series(
  company_id uuid,title text,description text default null,meeting_type text default 'OPERATIONS',
  default_chair_profile_id uuid default null,recurrence_rule text default null,recurrence_metadata jsonb default '{}'::jsonb,
  visibility public.visibility_mode default 'NORMAL',unit_ids uuid[] default array[]::uuid[],restaurant_ids uuid[] default array[]::uuid[]
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); object_id uuid; series_id uuid:=extensions.gen_random_uuid(); row_after public.meeting_series;
begin
  object_id:=private.create_scoped_security_object(actor,company_id,'MEETING_SERIES',visibility,unit_ids,restaurant_ids,'meeting.create');
  if default_chair_profile_id is not null and not private.profile_can_read_meeting(default_chair_profile_id,object_id) then raise exception 'default Chair must already have meeting access'; end if;
  insert into public.meeting_series(id,company_id,security_object_id,title,description,meeting_type,default_chair_profile_id,recurrence_rule,recurrence_metadata,created_by_profile_id)
  values(series_id,company_id,object_id,btrim(title),description,meeting_type,default_chair_profile_id,recurrence_rule,coalesce(recurrence_metadata,'{}'::jsonb),actor) returning * into row_after;
  perform private.write_execution_audit(company_id,object_id,'MEETING_SERIES',series_id,'meeting_series.created',actor,null,null,to_jsonb(row_after));
  return series_id;
end $$;

create or replace function public.update_meeting_series(
  meeting_series_id uuid,expected_version bigint,title text,description text,meeting_type text,
  default_chair_profile_id uuid,recurrence_rule text,recurrence_metadata jsonb
) returns public.meeting_series language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_series; after_row public.meeting_series;
begin
  select * into before_row from public.meeting_series where id=meeting_series_id and is_active;
  if not found or not private.can_access_security_object(actor,before_row.security_object_id,'meeting.update') then raise exception 'series not found or access denied'; end if;
  if default_chair_profile_id is not null and not private.profile_can_read_meeting(default_chair_profile_id,before_row.security_object_id) then raise exception 'default Chair must already have meeting access'; end if;
  update public.meeting_series set title=btrim(update_meeting_series.title),description=update_meeting_series.description,meeting_type=update_meeting_series.meeting_type,
    default_chair_profile_id=update_meeting_series.default_chair_profile_id,recurrence_rule=update_meeting_series.recurrence_rule,
    recurrence_metadata=coalesce(update_meeting_series.recurrence_metadata,'{}'::jsonb),version=version+1
  where id=meeting_series_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SERIES',meeting_series_id,'meeting_series.updated',actor,null,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.deactivate_meeting_series(meeting_series_id uuid,expected_version bigint,reason text)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_series; after_row public.meeting_series;
begin
  select * into before_row from public.meeting_series where id=meeting_series_id and is_active;
  if not found or not private.can_access_security_object(actor,before_row.security_object_id,'meeting.update') then raise exception 'series not found or access denied'; end if;
  update public.meeting_series set is_active=false,deactivated_at=now(),version=version+1 where id=meeting_series_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.security_objects set archived_at=now(),version=version+1 where id=before_row.security_object_id;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SERIES',meeting_series_id,'meeting_series.deactivated',actor,reason,to_jsonb(before_row),to_jsonb(after_row));
end $$;

create or replace function public.create_meeting_session(
  company_id uuid,title text,scheduled_start_at timestamptz,scheduled_end_at timestamptz,chair_profile_id uuid,
  meeting_series_id uuid default null,visibility public.visibility_mode default 'NORMAL',unit_ids uuid[] default array[]::uuid[],restaurant_ids uuid[] default array[]::uuid[]
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); object_id uuid; session_id uuid:=extensions.gen_random_uuid(); row_after public.meeting_sessions;
begin
  if meeting_series_id is not null and not exists(
    select 1
    from public.meeting_series series
    where series.id=create_meeting_session.meeting_series_id
      and series.company_id=create_meeting_session.company_id
      and series.is_active
      and private.can_access_security_object(actor,series.security_object_id,'meeting.read')
  ) then raise exception 'series not found or access denied'; end if;
  object_id:=private.create_scoped_security_object(actor,company_id,'MEETING_SESSION',visibility,unit_ids,restaurant_ids,'meeting.create');
  if not private.profile_can_read_meeting(chair_profile_id,object_id) then raise exception 'Chair must already have meeting access'; end if;
  insert into public.meeting_sessions(id,meeting_series_id,company_id,security_object_id,title,scheduled_start_at,scheduled_end_at,chair_profile_id,created_by_profile_id)
  values(session_id,meeting_series_id,company_id,object_id,btrim(title),scheduled_start_at,scheduled_end_at,chair_profile_id,actor) returning * into row_after;
  insert into public.meeting_session_status_transitions(meeting_session_id,from_status,to_status,changed_by_profile_id) values(session_id,null,'DRAFT',actor);
  insert into public.meeting_participants(meeting_session_id,profile_id,participant_role,invitation_status,added_by_profile_id) values(session_id,chair_profile_id,'CHAIR','CONFIRMED',actor);
  perform private.write_execution_audit(company_id,object_id,'MEETING_SESSION',session_id,'meeting.created',actor,null,null,to_jsonb(row_after));
  return session_id;
end $$;

create or replace function private.meeting_transition_allowed(from_status text,to_status text)
returns boolean language sql immutable set search_path='' as $$ select case from_status
  when 'DRAFT' then to_status in ('SCHEDULED','CANCELLED')
  when 'SCHEDULED' then to_status in ('IN_PROGRESS','CANCELLED')
  when 'IN_PROGRESS' then to_status in ('REVIEW','CANCELLED')
  when 'REVIEW' then to_status in ('IN_PROGRESS','PUBLISHED','CANCELLED')
  when 'PUBLISHED' then to_status='CLOSED'
  else false end $$;

create or replace function public.update_meeting_session(meeting_session_id uuid,expected_version bigint,title text,scheduled_start_at timestamptz,scheduled_end_at timestamptz)
returns public.meeting_sessions language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_sessions; after_row public.meeting_sessions;
begin
  select * into before_row from public.meeting_sessions where id=meeting_session_id;
  if not found or before_row.status not in ('DRAFT','SCHEDULED','REVIEW') or not private.can_access_security_object(actor,before_row.security_object_id,'meeting.update') then raise exception 'meeting not found or access denied'; end if;
  update public.meeting_sessions set title=btrim(update_meeting_session.title),scheduled_start_at=update_meeting_session.scheduled_start_at,scheduled_end_at=update_meeting_session.scheduled_end_at,version=version+1 where id=meeting_session_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SESSION',meeting_session_id,case when before_row.scheduled_start_at is distinct from after_row.scheduled_start_at or before_row.scheduled_end_at is distinct from after_row.scheduled_end_at then 'meeting.schedule.changed' else 'meeting.updated' end,actor,null,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function private.validate_meeting_publish(session_id uuid,actor uuid)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare session_row public.meeting_sessions; linked record;
begin
  select * into session_row from public.meeting_sessions where id=session_id;
  if session_row.chair_profile_id<>actor then raise exception 'only the current Chair can publish'; end if;
  if exists(select 1 from public.meeting_agenda_items where meeting_session_id=session_id and status='PENDING') then raise exception 'all agenda items require an outcome before publication'; end if;
  for linked in select object_row.id,object_row.object_type from public.meeting_object_links link join public.security_objects object_row on object_row.id=link.security_object_id where link.meeting_session_id=session_id and link.relation_type='CREATED' and link.unlinked_at is null loop
    if linked.object_type='TASK' and exists(select 1 from public.tasks task where task.security_object_id=linked.id and (task.owner_profile_id is null or task.responsible_profile_id is null or task.due_date is null or not private.can_access_security_object(task.owner_profile_id,linked.id,'task.read') or not private.can_access_security_object(task.responsible_profile_id,linked.id,'task.read'))) then raise exception 'linked Task is incomplete'; end if;
    if linked.object_type='PDCA' and exists(select 1 from public.pdcas pdca where pdca.security_object_id=linked.id and (pdca.problem_statement is null or pdca.objective is null or pdca.owner_profile_id is null or pdca.responsible_profile_id is null or pdca.due_date is null or not private.can_access_security_object(pdca.owner_profile_id,linked.id,'pdca.read') or not private.can_access_security_object(pdca.responsible_profile_id,linked.id,'pdca.read'))) then raise exception 'linked PDCA is incomplete'; end if;
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

create or replace function public.remove_meeting_participant(participant_id uuid,reason text default null)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); participant_row public.meeting_participants; session_row public.meeting_sessions;
begin
  select * into participant_row from public.meeting_participants where id=participant_id and removed_at is null;
  select * into session_row from public.meeting_sessions where id=participant_row.meeting_session_id;
  if not found or participant_row.participant_role='CHAIR' or session_row.status in ('PUBLISHED','CLOSED','CANCELLED') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.participant.manage') then raise exception 'participant not found or access denied'; end if;
  update public.meeting_participants set removed_at=now(),removed_by_profile_id=actor where id=participant_id;
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_PARTICIPANT',participant_id,'meeting.participant.removed',actor,reason,to_jsonb(participant_row),null);
end $$;

create or replace function public.change_meeting_chair(meeting_session_id uuid,expected_version bigint,new_chair_profile_id uuid)
returns public.meeting_sessions language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_sessions; after_row public.meeting_sessions;
begin
  select * into before_row from public.meeting_sessions where id=meeting_session_id;
  if not found or before_row.status in ('PUBLISHED','CLOSED','CANCELLED') or not private.can_access_security_object(actor,before_row.security_object_id,'meeting.participant.manage') then raise exception 'meeting not found or access denied'; end if;
  if not private.profile_can_read_meeting(new_chair_profile_id,before_row.security_object_id) then raise exception 'Chair must already have meeting access'; end if;
  update public.meeting_sessions set chair_profile_id=new_chair_profile_id,version=version+1 where id=meeting_session_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  update public.meeting_participants as participant
  set participant_role='PARTICIPANT'
  where participant.meeting_session_id=change_meeting_chair.meeting_session_id
    and participant.profile_id=before_row.chair_profile_id
    and participant.removed_at is null;
  update public.meeting_participants as participant
  set participant_role='CHAIR',invitation_status='CONFIRMED'
  where participant.meeting_session_id=change_meeting_chair.meeting_session_id
    and participant.profile_id=change_meeting_chair.new_chair_profile_id
    and participant.removed_at is null;
  if not found then
    insert into public.meeting_participants(meeting_session_id,profile_id,participant_role,invitation_status,added_by_profile_id)
    values(change_meeting_chair.meeting_session_id,change_meeting_chair.new_chair_profile_id,'CHAIR','CONFIRMED',actor);
  end if;
  perform private.write_execution_audit(after_row.company_id,after_row.security_object_id,'MEETING_SESSION',meeting_session_id,'meeting.chair.changed',actor,null,jsonb_build_object('chair',before_row.chair_profile_id),jsonb_build_object('chair',new_chair_profile_id));
  return after_row;
end $$;

create or replace function public.add_meeting_agenda_item(meeting_session_id uuid,title text,description text default null,presenter_profile_id uuid default null,estimated_minutes integer default null,carried_forward_from_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); session_row public.meeting_sessions; item_id uuid:=extensions.gen_random_uuid(); next_position integer;
begin
  select * into session_row from public.meeting_sessions where id=meeting_session_id;
  if not found or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.agenda.manage') then raise exception 'meeting not found or access denied'; end if;
  if presenter_profile_id is not null and not private.profile_can_read_meeting(presenter_profile_id,session_row.security_object_id) then raise exception 'presenter must already have meeting access'; end if;
  if carried_forward_from_id is not null and not exists(
    select 1
    from public.meeting_agenda_items previous
    join public.meeting_sessions previous_session on previous_session.id=previous.meeting_session_id
    where previous.id=add_meeting_agenda_item.carried_forward_from_id
      and previous.status='POSTPONED'
      and previous_session.meeting_series_id=session_row.meeting_series_id
      and private.can_access_security_object(actor,previous_session.security_object_id,'meeting.read')
  ) then raise exception 'carry-forward item not found or access denied'; end if;
  select coalesce(max(position),0)+1 into next_position from public.meeting_agenda_items where meeting_agenda_items.meeting_session_id=add_meeting_agenda_item.meeting_session_id;
  insert into public.meeting_agenda_items(id,meeting_session_id,title,description,position,presenter_profile_id,estimated_minutes,carried_forward_from_id,created_by_profile_id) values(item_id,meeting_session_id,btrim(title),description,next_position,presenter_profile_id,estimated_minutes,carried_forward_from_id,actor);
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_AGENDA_ITEM',item_id,case when carried_forward_from_id is null then 'meeting.agenda.created' else 'meeting.agenda.carried_forward' end,actor,null,null,jsonb_build_object('position',next_position));
  return item_id;
end $$;

create or replace function public.set_meeting_agenda_status(agenda_item_id uuid,expected_version bigint,new_status text,reason text default null)
returns public.meeting_agenda_items language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_agenda_items; after_row public.meeting_agenda_items; session_row public.meeting_sessions;
begin
  select * into before_row from public.meeting_agenda_items where id=agenda_item_id;
  select * into session_row from public.meeting_sessions where id=before_row.meeting_session_id;
  if not found or session_row.status not in ('IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.agenda.manage') then raise exception 'agenda item not found or access denied'; end if;
  if new_status='POSTPONED' and char_length(btrim(coalesce(reason,'')))<3 then raise exception 'postpone reason is required'; end if;
  update public.meeting_agenda_items set status=new_status,version=version+1 where id=agenda_item_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_AGENDA_ITEM',agenda_item_id,'meeting.agenda.status.changed',actor,reason,to_jsonb(before_row),to_jsonb(after_row));
  return after_row;
end $$;

create or replace function public.reorder_meeting_agenda_item(agenda_item_id uuid,expected_version bigint,new_position integer)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); item_row public.meeting_agenda_items; session_row public.meeting_sessions; other_id uuid;
begin
  select * into item_row from public.meeting_agenda_items where id=agenda_item_id;
  select * into session_row from public.meeting_sessions where id=item_row.meeting_session_id;
  if not found or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or item_row.version<>expected_version or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.agenda.manage') then raise exception 'agenda item not found, access denied or concurrency conflict'; end if;
  select id into other_id from public.meeting_agenda_items where meeting_session_id=item_row.meeting_session_id and position=new_position;
  if other_id is null then raise exception 'target position does not exist'; end if;
  update public.meeting_agenda_items set position=2147483647 where id=item_row.id;
  update public.meeting_agenda_items set position=item_row.position,version=version+1 where id=other_id;
  update public.meeting_agenda_items set position=new_position,version=version+1 where id=item_row.id;
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_AGENDA_ITEM',agenda_item_id,'meeting.agenda.reordered',actor,null,jsonb_build_object('position',item_row.position),jsonb_build_object('position',new_position));
end $$;

create or replace function public.add_meeting_note(meeting_session_id uuid,content text,meeting_agenda_item_id uuid default null)
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); session_row public.meeting_sessions; note_id uuid:=extensions.gen_random_uuid();
begin
  select * into session_row from public.meeting_sessions where id=meeting_session_id;
  if not found or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.note.create') then raise exception 'meeting not found or access denied'; end if;
  if meeting_agenda_item_id is not null and not exists(select 1 from public.meeting_agenda_items where id=meeting_agenda_item_id and meeting_agenda_items.meeting_session_id=add_meeting_note.meeting_session_id) then raise exception 'agenda item does not belong to meeting'; end if;
  insert into public.meeting_notes(id,meeting_session_id,meeting_agenda_item_id,author_profile_id,content) values(note_id,meeting_session_id,meeting_agenda_item_id,actor,btrim(content));
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_NOTE',note_id,'meeting.note.created',actor,null,null,jsonb_build_object('agenda_item_id',meeting_agenda_item_id));
  return note_id;
end $$;

create or replace function public.update_meeting_note(note_id uuid,expected_version bigint,content text)
returns public.meeting_notes language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); before_row public.meeting_notes; after_row public.meeting_notes; session_row public.meeting_sessions;
begin
  select * into before_row from public.meeting_notes where id=note_id and hidden_at is null;
  select * into session_row from public.meeting_sessions where id=before_row.meeting_session_id;
  if not found or before_row.author_profile_id<>actor or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.note.create') then raise exception 'note not found or access denied'; end if;
  update public.meeting_notes set content=btrim(update_meeting_note.content),version=version+1 where id=note_id and version=expected_version returning * into after_row;
  if not found then raise exception 'optimistic concurrency conflict'; end if;
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_NOTE',note_id,'meeting.note.updated',actor,null,jsonb_build_object('content_changed',true),jsonb_build_object('content_changed',true));
  return after_row;
end $$;

create or replace function public.link_meeting_object(meeting_session_id uuid,security_object_id uuid,relation_type public.meeting_object_relation,meeting_agenda_item_id uuid default null,outcome_notes text default null)
returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); session_row public.meeting_sessions; target public.security_objects; link_id uuid:=extensions.gen_random_uuid();
begin
  select * into session_row from public.meeting_sessions where id=meeting_session_id;
  select * into target from public.security_objects where id=security_object_id and archived_at is null;
  if not found or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.link.manage') or target.company_id<>session_row.company_id or target.object_type not in ('DECISION','TASK','PDCA') or not private.meeting_link_target_readable(actor,target.id) then raise exception 'meeting or target not found or access denied'; end if;
  if meeting_agenda_item_id is not null and not exists(select 1 from public.meeting_agenda_items where id=meeting_agenda_item_id and meeting_agenda_items.meeting_session_id=link_meeting_object.meeting_session_id) then raise exception 'agenda item does not belong to meeting'; end if;
  insert into public.meeting_object_links(id,meeting_session_id,meeting_agenda_item_id,security_object_id,relation_type,outcome_notes,linked_by_profile_id) values(link_id,meeting_session_id,meeting_agenda_item_id,security_object_id,relation_type,outcome_notes,actor);
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_OBJECT_LINK',link_id,'meeting.object.linked',actor,null,null,jsonb_build_object('target_object_id',security_object_id,'relation_type',relation_type));
  return link_id;
end $$;

create or replace function public.unlink_meeting_object(link_id uuid,reason text)
returns void language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare actor uuid:=private.current_profile_id(); link_row public.meeting_object_links; session_row public.meeting_sessions;
begin
  select * into link_row from public.meeting_object_links where id=link_id and unlinked_at is null;
  select * into session_row from public.meeting_sessions where id=link_row.meeting_session_id;
  if not found or session_row.status not in ('DRAFT','SCHEDULED','IN_PROGRESS','REVIEW') or not private.can_access_security_object(actor,session_row.security_object_id,'meeting.link.manage') then raise exception 'link not found or access denied'; end if;
  update public.meeting_object_links set unlinked_at=now(),unlinked_by_profile_id=actor where id=link_id;
  perform private.write_execution_audit(session_row.company_id,session_row.security_object_id,'MEETING_OBJECT_LINK',link_id,'meeting.object.unlinked',actor,reason,to_jsonb(link_row),null);
end $$;

create or replace function public.create_meeting_decision(
  meeting_session_id uuid,company_id uuid,title text,description text,decision_date date,
  visibility public.visibility_mode,unit_ids uuid[],restaurant_ids uuid[],meeting_agenda_item_id uuid default null
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare decision_id uuid; object_id uuid;
begin
  decision_id:=public.create_decision(company_id,title,description,decision_date,null,visibility,unit_ids,restaurant_ids,'DRAFT');
  select security_object_id into object_id from public.decisions where id=decision_id;
  perform public.link_meeting_object(meeting_session_id,object_id,'CREATED',meeting_agenda_item_id,null);
  return decision_id;
end $$;

create or replace function public.create_meeting_task(
  meeting_session_id uuid,company_id uuid,title text,description text,priority text,owner_profile_id uuid,
  responsible_profile_id uuid,due_date date,visibility public.visibility_mode,unit_ids uuid[],restaurant_ids uuid[],meeting_agenda_item_id uuid default null
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare task_id uuid; object_id uuid;
begin
  task_id:=public.create_task(company_id,title,description,priority,owner_profile_id,responsible_profile_id,null,due_date,null,null,visibility,unit_ids,restaurant_ids);
  select security_object_id into object_id from public.tasks where id=task_id;
  perform public.link_meeting_object(meeting_session_id,object_id,'CREATED',meeting_agenda_item_id,null);
  return task_id;
end $$;

create or replace function public.create_meeting_pdca(
  meeting_session_id uuid,company_id uuid,title text,problem_statement text,objective text,priority text,
  owner_profile_id uuid,responsible_profile_id uuid,due_date date,visibility public.visibility_mode,
  unit_ids uuid[],restaurant_ids uuid[],meeting_agenda_item_id uuid default null
) returns uuid language plpgsql volatile security definer set search_path='' set row_security=off as $$
declare pdca_id uuid; object_id uuid;
begin
  pdca_id:=public.create_pdca(company_id,title,problem_statement,objective,null,priority,'MEDIUM','MEDIUM',owner_profile_id,responsible_profile_id,null,due_date,null,visibility,unit_ids,restaurant_ids);
  select security_object_id into object_id from public.pdcas where id=pdca_id;
  perform public.link_meeting_object(meeting_session_id,object_id,'CREATED',meeting_agenda_item_id,null);
  return pdca_id;
end $$;

create or replace function public.meeting_previous_followups(current_session_id uuid)
returns table(kind text,record_id uuid,title text,status text,source_session_id uuid) language sql stable security definer set search_path='' set row_security=off as $$
  with current_meeting as(select * from public.meeting_sessions where id=current_session_id and private.can_access_security_object(private.current_profile_id(),security_object_id,'meeting.read')),
  previous as(select candidate.* from public.meeting_sessions candidate,current_meeting current where candidate.meeting_series_id=current.meeting_series_id and candidate.scheduled_start_at<current.scheduled_start_at and private.can_access_security_object(private.current_profile_id(),candidate.security_object_id,'meeting.read') order by candidate.scheduled_start_at desc limit 1),
  linked as(
    select 'TASK'::text,task.id,task.title,task.status::text,link.meeting_session_id from previous join public.meeting_object_links link on link.meeting_session_id=previous.id and link.unlinked_at is null join public.tasks task on task.security_object_id=link.security_object_id where task.status not in ('COMPLETED','CANCELLED','ARCHIVED') and private.meeting_link_target_readable(private.current_profile_id(),link.security_object_id)
    union all select 'PDCA',pdca.id,pdca.title,pdca.status::text,link.meeting_session_id from previous join public.meeting_object_links link on link.meeting_session_id=previous.id and link.unlinked_at is null join public.pdcas pdca on pdca.security_object_id=link.security_object_id where pdca.status not in ('COMPLETED','CANCELLED','ARCHIVED') and private.meeting_link_target_readable(private.current_profile_id(),link.security_object_id)
    union all select 'AGENDA',item.id,item.title,item.status,previous.id from previous join public.meeting_agenda_items item on item.meeting_session_id=previous.id where item.status='POSTPONED'
  ) select * from linked
$$;

create or replace function public.my_meetings()
returns table(meeting_session_id uuid,title text,status text,scheduled_start_at timestamptz,relationship text) language sql stable security definer set search_path='' set row_security=off as $$
  select session.id,session.title,session.status,session.scheduled_start_at,
    case when session.chair_profile_id=private.current_profile_id() then 'CHAIR' when exists(select 1 from public.meeting_participants participant where participant.meeting_session_id=session.id and participant.profile_id=private.current_profile_id() and participant.removed_at is null) then 'PARTICIPANT' else 'ACCESS' end
  from public.meeting_sessions session
  where private.can_access_security_object(private.current_profile_id(),session.security_object_id,'meeting.read')
    and (session.scheduled_start_at>=now() or session.status='REVIEW')
  order by session.scheduled_start_at
$$;

revoke all on function public.create_meeting_series(uuid,text,text,text,uuid,text,jsonb,public.visibility_mode,uuid[],uuid[]) from public;
revoke all on function public.update_meeting_series(uuid,bigint,text,text,text,uuid,text,jsonb) from public;
revoke all on function public.deactivate_meeting_series(uuid,bigint,text) from public;
revoke all on function public.create_meeting_session(uuid,text,timestamptz,timestamptz,uuid,uuid,public.visibility_mode,uuid[],uuid[]) from public;
revoke all on function public.update_meeting_session(uuid,bigint,text,timestamptz,timestamptz) from public;
revoke all on function public.transition_meeting_session(uuid,bigint,text,text) from public;
revoke all on function public.reopen_meeting_session(uuid,bigint,text) from public;
revoke all on function public.add_meeting_participant(uuid,uuid,public.meeting_participant_role) from public;
revoke all on function public.get_meeting_accessible_profiles(uuid) from public;
revoke all on function public.remove_meeting_participant(uuid,text) from public;
revoke all on function public.change_meeting_chair(uuid,bigint,uuid) from public;
revoke all on function public.add_meeting_agenda_item(uuid,text,text,uuid,integer,uuid) from public;
revoke all on function public.set_meeting_agenda_status(uuid,bigint,text,text) from public;
revoke all on function public.reorder_meeting_agenda_item(uuid,bigint,integer) from public;
revoke all on function public.add_meeting_note(uuid,text,uuid) from public;
revoke all on function public.update_meeting_note(uuid,bigint,text) from public;
revoke all on function public.link_meeting_object(uuid,uuid,public.meeting_object_relation,uuid,text) from public;
revoke all on function public.unlink_meeting_object(uuid,text) from public;
revoke all on function public.create_meeting_decision(uuid,uuid,text,text,date,public.visibility_mode,uuid[],uuid[],uuid) from public;
revoke all on function public.create_meeting_task(uuid,uuid,text,text,text,uuid,uuid,date,public.visibility_mode,uuid[],uuid[],uuid) from public;
revoke all on function public.create_meeting_pdca(uuid,uuid,text,text,text,text,uuid,uuid,date,public.visibility_mode,uuid[],uuid[],uuid) from public;
revoke all on function public.meeting_previous_followups(uuid) from public;
revoke all on function public.my_meetings() from public;

grant execute on function public.create_meeting_series(uuid,text,text,text,uuid,text,jsonb,public.visibility_mode,uuid[],uuid[]) to authenticated;
grant execute on function public.update_meeting_series(uuid,bigint,text,text,text,uuid,text,jsonb) to authenticated;
grant execute on function public.deactivate_meeting_series(uuid,bigint,text) to authenticated;
grant execute on function public.create_meeting_session(uuid,text,timestamptz,timestamptz,uuid,uuid,public.visibility_mode,uuid[],uuid[]) to authenticated;
grant execute on function public.update_meeting_session(uuid,bigint,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.transition_meeting_session(uuid,bigint,text,text) to authenticated;
grant execute on function public.reopen_meeting_session(uuid,bigint,text) to authenticated;
grant execute on function public.add_meeting_participant(uuid,uuid,public.meeting_participant_role) to authenticated;
grant execute on function public.get_meeting_accessible_profiles(uuid) to authenticated;
grant execute on function public.remove_meeting_participant(uuid,text) to authenticated;
grant execute on function public.change_meeting_chair(uuid,bigint,uuid) to authenticated;
grant execute on function public.add_meeting_agenda_item(uuid,text,text,uuid,integer,uuid) to authenticated;
grant execute on function public.set_meeting_agenda_status(uuid,bigint,text,text) to authenticated;
grant execute on function public.reorder_meeting_agenda_item(uuid,bigint,integer) to authenticated;
grant execute on function public.add_meeting_note(uuid,text,uuid) to authenticated;
grant execute on function public.update_meeting_note(uuid,bigint,text) to authenticated;
grant execute on function public.link_meeting_object(uuid,uuid,public.meeting_object_relation,uuid,text) to authenticated;
grant execute on function public.unlink_meeting_object(uuid,text) to authenticated;
grant execute on function public.create_meeting_decision(uuid,uuid,text,text,date,public.visibility_mode,uuid[],uuid[],uuid) to authenticated;
grant execute on function public.create_meeting_task(uuid,uuid,text,text,text,uuid,uuid,date,public.visibility_mode,uuid[],uuid[],uuid) to authenticated;
grant execute on function public.create_meeting_pdca(uuid,uuid,text,text,text,text,uuid,uuid,date,public.visibility_mode,uuid[],uuid[],uuid) to authenticated;
grant execute on function public.meeting_previous_followups(uuid) to authenticated;
grant execute on function public.my_meetings() to authenticated;
