begin;
create extension if not exists pgtap with schema extensions;
select plan(52);

select extensions.has_table('public','meeting_series','meeting_series is a strong protected table');
select extensions.has_table('public','meeting_sessions','meeting_sessions is a strong protected table');
select extensions.has_table('public','meeting_participants','participants are session relationships');
select extensions.has_table('public','meeting_agenda_items','agenda is structured');
select extensions.has_table('public','meeting_notes','notes are separate rows');
select extensions.has_table('public','meeting_object_links','meeting object links are relational');

create temporary table meeting_test_ids(kind text primary key,id uuid not null);
grant select on meeting_test_ids to authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into meeting_test_ids values('series',public.create_meeting_series(
  '10000000-0000-0000-0000-000000000001','Weekly Operations','Execution review','OPERATIONS',
  '21000000-0000-0000-0000-000000000001','weekly','{}','NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.ok((select id is not null from meeting_test_ids where kind='series'),'Meeting Series creation succeeds');
select extensions.ok(exists(select 1 from public.audit_events where subject_id=(select id from meeting_test_ids where kind='series') and action='meeting_series.created'),'Series creation is audited');

insert into meeting_test_ids values('session',public.create_meeting_session(
  '10000000-0000-0000-0000-000000000001','Weekly Operations 1',now()+interval '1 day',now()+interval '2 hours 1 day',
  '21000000-0000-0000-0000-000000000001',(select id from meeting_test_ids where kind='series'),'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.is((select status from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),'DRAFT','Session starts Draft');
select extensions.is((select count(*)::integer from public.meeting_participants where meeting_session_id=(select id from meeting_test_ids where kind='session') and participant_role='CHAIR'),1,'Chair is a participant relation');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),'meeting.read'),'Restaurant A manager reads Restaurant A meeting');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000018',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),'meeting.read'),'Restaurant B manager is denied Restaurant A meeting');

select extensions.lives_ok(format('select public.add_meeting_participant(%L,%L,%L)',(select id from meeting_test_ids where kind='session'),'21000000-0000-0000-0000-000000000017','PARTICIPANT'),'Authorized participant can be added without a grant');
select extensions.throws_ok(format('select public.add_meeting_participant(%L,%L,%L)',(select id from meeting_test_ids where kind='session'),'21000000-0000-0000-0000-000000000018','PARTICIPANT'),'participant must already have meeting access; adjust scope or create an explicit grant separately');
select extensions.is((select count(*)::integer from public.explicit_access_grants where security_object_id=(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session'))),0,'Participant addition creates no grant');
update public.organizational_assignments set valid_to=current_date-1 where profile_id='21000000-0000-0000-0000-000000000017';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),'meeting.read'),'Former participant loses meeting access after scope expiry');
select extensions.ok(exists(select 1 from public.meeting_participants where meeting_session_id=(select id from meeting_test_ids where kind='session') and profile_id='21000000-0000-0000-0000-000000000017'),'Former participant remains in meeting history');
update public.organizational_assignments set valid_to=null where profile_id='21000000-0000-0000-0000-000000000017';

insert into meeting_test_ids values('agenda',public.add_meeting_agenda_item((select id from meeting_test_ids where kind='session'),'Execution follow-up','Review open actions',null,30,null));
select extensions.is((select position from public.meeting_agenda_items where id=(select id from meeting_test_ids where kind='agenda')),1,'Agenda positions are structured');
select extensions.lives_ok(format('select public.add_meeting_note(%L,%L,%L)',(select id from meeting_test_ids where kind='session'),'Preparation note',(select id from meeting_test_ids where kind='agenda')),'Meeting note can target an agenda item');

insert into public.security_objects(id,company_id,object_type,visibility,created_by_profile_id) values('f1000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','TASK','NORMAL','21000000-0000-0000-0000-000000000001');
insert into public.object_scope_organizational_units values('f1000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000007',now(),'21000000-0000-0000-0000-000000000001');
insert into public.object_scope_restaurants values('f1000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002',now(),'21000000-0000-0000-0000-000000000001');
insert into public.tasks(id,company_id,security_object_id,title,created_by_profile_id) values('f2000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-000000000001','Restaurant B protected Task','21000000-0000-0000-0000-000000000001');
select extensions.lives_ok(format('select public.link_meeting_object(%L,%L,%L,null,null)',(select id from meeting_test_ids where kind='session'),'f1000000-0000-0000-0000-000000000001','DISCUSSED'),'Global executive can link independently authorized object');

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),1,'Meeting is visible through RLS');
select extensions.is((select count(*)::integer from public.meeting_object_links where meeting_session_id=(select id from meeting_test_ids where kind='session')),0,'Meeting link hides target inaccessible to viewer');
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000018',true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.tasks where id='f2000000-0000-0000-0000-000000000001'),1,'Linked object may be visible independently');
select extensions.is((select count(*)::integer from public.meeting_sessions where id=(select id from meeting_test_ids where kind='session')),0,'Visible object does not imply meeting access');
select extensions.is((select count(*)::integer from public.meeting_object_links where meeting_session_id=(select id from meeting_test_ids where kind='session')),0,'Link remains hidden without meeting access');
reset role;

select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into meeting_test_ids values('restricted',public.create_meeting_session('10000000-0000-0000-0000-000000000001','Restricted Meeting',now()+interval '2 days',now()+interval '2 days 1 hour','21000000-0000-0000-0000-000000000001',null,'RESTRICTED',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='restricted')),'meeting.read'),'Restricted meeting requires restricted permission');
insert into meeting_test_ids values('private',public.create_meeting_session('10000000-0000-0000-0000-000000000001','Private Meeting',now()+interval '3 days',now()+interval '3 days 1 hour','21000000-0000-0000-0000-000000000001',null,'PRIVATE',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000001',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private')),'meeting.read'),'Private creator reads meeting');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private')),'meeting.read'),'Private meeting is not revealed by scope');
insert into public.explicit_access_grants(security_object_id,grantee_profile_id,permission_id,granted_by_profile_id,reason)
select (select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private')),'21000000-0000-0000-0000-000000000017',id,'21000000-0000-0000-0000-000000000001','Meeting access' from public.permissions where permission_key='meeting.read';
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private')),'meeting.read'),'Valid explicit grant permits meeting read');
update public.explicit_access_grants set revoked_at=now(),revoked_by_profile_id='21000000-0000-0000-0000-000000000001' where security_object_id=(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private'));
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017',(select security_object_id from public.meeting_sessions where id=(select id from meeting_test_ids where kind='private')),'meeting.read'),'Revoked grant removes meeting read');

select extensions.lives_ok(format('select public.transition_meeting_session(%L,1,%L,null)',(select id from meeting_test_ids where kind='session'),'SCHEDULED'),'Draft session can be scheduled');
select extensions.lives_ok(format('select public.transition_meeting_session(%L,2,%L,null)',(select id from meeting_test_ids where kind='session'),'IN_PROGRESS'),'Scheduled session can start');
select extensions.throws_ok(format('select public.set_meeting_agenda_status(%L,1,%L,null)',(select id from meeting_test_ids where kind='agenda'),'POSTPONED'),'postpone reason is required');
select extensions.lives_ok(format('select public.set_meeting_agenda_status(%L,1,%L,null)',(select id from meeting_test_ids where kind='agenda'),'DISCUSSED'),'Agenda item records outcome');

insert into meeting_test_ids values('decision',public.create_meeting_decision((select id from meeting_test_ids where kind='session'),'10000000-0000-0000-0000-000000000001','Meeting Decision','Approved',current_date,'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[],(select id from meeting_test_ids where kind='agenda')));
insert into meeting_test_ids values('task',public.create_meeting_task((select id from meeting_test_ids where kind='session'),'10000000-0000-0000-0000-000000000001','Meeting Task','Execute','HIGH','21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',current_date+7,'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[],(select id from meeting_test_ids where kind='agenda')));
insert into meeting_test_ids values('pdca',public.create_meeting_pdca((select id from meeting_test_ids where kind='session'),'10000000-0000-0000-0000-000000000001','Meeting PDCA','Recurring issue','Eliminate issue','HIGH','21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',current_date+30,'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[],(select id from meeting_test_ids where kind='agenda')));
select extensions.is((select status from public.decisions where id=(select id from meeting_test_ids where kind='decision')),'DRAFT','Decision created in meeting remains Draft');
select extensions.is((select status from public.tasks where id=(select id from meeting_test_ids where kind='task')),'DRAFT','Task created in meeting remains Draft');
select extensions.is((select status from public.pdcas where id=(select id from meeting_test_ids where kind='pdca')),'DRAFT','PDCA created in meeting remains Draft');
select extensions.is((select count(*)::integer from public.meeting_object_links where meeting_session_id=(select id from meeting_test_ids where kind='session') and relation_type='CREATED'),3,'Meeting creation wrappers link three strong objects atomically');

select extensions.lives_ok(format('select public.transition_meeting_session(%L,3,%L,null)',(select id from meeting_test_ids where kind='session'),'REVIEW'),'Meeting moves to Review');
select extensions.throws_ok(format('select public.transition_meeting_session(%L,3,%L,null)',(select id from meeting_test_ids where kind='session'),'PUBLISHED'),'optimistic concurrency conflict');
select extensions.lives_ok(format('select public.transition_meeting_session(%L,4,%L,null)',(select id from meeting_test_ids where kind='session'),'PUBLISHED'),'Chair publishes validated meeting');
select extensions.is((select status from public.tasks where id=(select id from meeting_test_ids where kind='task')),'OPEN','Meeting publication invokes normal Task lifecycle');
select extensions.is((select status from public.pdcas where id=(select id from meeting_test_ids where kind='pdca')),'OPEN','Meeting publication invokes normal PDCA lifecycle');
select extensions.is((select status from public.decisions where id=(select id from meeting_test_ids where kind='decision')),'ACTIVE','Meeting publication activates Decision');
select extensions.is((select count(*)::integer from public.meeting_publications where meeting_session_id=(select id from meeting_test_ids where kind='session')),1,'Publication snapshot is immutable history');
select extensions.lives_ok(format('select public.transition_meeting_session(%L,5,%L,null)',(select id from meeting_test_ids where kind='session'),'CLOSED'),'Published meeting can close');
select extensions.lives_ok(format('select public.reopen_meeting_session(%L,6,%L)',(select id from meeting_test_ids where kind='session'),'Correction required'),'Closed meeting can reopen with reason');
select extensions.is((select count(*)::integer from public.meeting_publications where meeting_session_id=(select id from meeting_test_ids where kind='session')),1,'Reopening does not remove prior publication');
select extensions.is((select status from public.tasks where id=(select id from meeting_test_ids where kind='task')),'OPEN','Reopening does not roll back published Task');

insert into meeting_test_ids values('session2',public.create_meeting_session('10000000-0000-0000-0000-000000000001','Weekly Operations 2',now()+interval '8 days',now()+interval '8 days 2 hours','21000000-0000-0000-0000-000000000001',(select id from meeting_test_ids where kind='series'),'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.ok(exists(select 1 from public.meeting_previous_followups((select id from meeting_test_ids where kind='session2')) where record_id=(select id from meeting_test_ids where kind='pdca')),'Next session surfaces accessible open PDCA without copying');
select extensions.lives_ok(format('select public.link_meeting_object(%L,%L,%L,null,null)',(select id from meeting_test_ids where kind='session2'),(select security_object_id from public.pdcas where id=(select id from meeting_test_ids where kind='pdca')),'FOLLOW_UP'),'Existing PDCA links to a second session');
select extensions.is((select count(*)::integer from public.meeting_object_links where security_object_id=(select security_object_id from public.pdcas where id=(select id from meeting_test_ids where kind='pdca'))),2,'One PDCA appears in two meetings without duplication');

select * from extensions.finish();
rollback;
