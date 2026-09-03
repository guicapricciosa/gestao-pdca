begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

create temporary table finish_ids(kind text primary key,id uuid not null);
grant select on finish_ids to authenticated;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);

insert into finish_ids values('series',public.create_meeting_series('10000000-0000-0000-0000-000000000001','Finish Series','Semanal','OPERATIONS','21000000-0000-0000-0000-000000000001','weekly','{}','NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
insert into finish_ids values('session',public.create_meeting_session('10000000-0000-0000-0000-000000000001','Finish Session',now()-interval '1 hour',now(),'21000000-0000-0000-0000-000000000001',(select id from finish_ids where kind='series'),'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
insert into finish_ids values('next',public.create_meeting_session('10000000-0000-0000-0000-000000000001','Next Session',now()+interval '7 days',now()+interval '7 days 1 hour','21000000-0000-0000-0000-000000000001',(select id from finish_ids where kind='series'),'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select public.transition_meeting_session((select id from finish_ids where kind='next'),1,'SCHEDULED',null);
select public.transition_meeting_session((select id from finish_ids where kind='session'),1,'SCHEDULED',null);
select public.transition_meeting_session((select id from finish_ids where kind='session'),2,'IN_PROGRESS',null);

insert into finish_ids values('discussed',public.add_meeting_agenda_item((select id from finish_ids where kind='session'),'Tema discutido',null,null,10,null));
insert into finish_ids values('pending',public.add_meeting_agenda_item((select id from finish_ids where kind='session'),'Tema por decidir',null,null,10,null));
insert into finish_ids values('to_next',public.add_meeting_agenda_item((select id from finish_ids where kind='session'),'Tema para a próxima',null,null,10,null));
select public.set_meeting_agenda_status((select id from finish_ids where kind='discussed'),1,'DISCUSSED',null);

-- A task with a responsible but no Owner and no due date is now distributable.
insert into finish_ids values('task',public.create_meeting_task((select id from finish_ids where kind='session'),'10000000-0000-0000-0000-000000000001','Tarefa só com responsável','',
  'MEDIUM',null,'21000000-0000-0000-0000-000000000001',null,'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[],null));
select extensions.is((select status from public.tasks where id=(select id from finish_ids where kind='task')),'DRAFT','Meeting task starts as Draft');
select extensions.lives_ok(format('select public.transition_task(%L,1,%L)',(select id from finish_ids where kind='task'),'OPEN'),'A task with only a responsible can leave Draft');
select extensions.lives_ok(format('select public.transition_task(%L,2,%L)',(select id from finish_ids where kind='task'),'IN_PROGRESS'),'Transitions still work after relaxing the rule');

-- Atomicity: a PDCA without Owner blocks the whole finish and nothing is applied.
insert into finish_ids values('pdca',public.create_meeting_pdca((select id from finish_ids where kind='session'),'10000000-0000-0000-0000-000000000001','PDCA sem Owner','Problema','Objetivo',
  'MEDIUM',null,'21000000-0000-0000-0000-000000000001',null,'NORMAL',array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[],null));
select extensions.throws_ok(format('select public.finish_meeting(%L,%s,%L::jsonb)',(select id from finish_ids where kind='session'),(select version from public.meeting_sessions where id=(select id from finish_ids where kind='session')),
  format('[{"agenda_item_id":"%s","outcome":"DISCUSSED"},{"agenda_item_id":"%s","outcome":"POSTPONED"}]',(select id from finish_ids where kind='pending'),(select id from finish_ids where kind='to_next'))),
  'linked PDCA is incomplete','A PDCA without Owner blocks terminar e distribuir');
select extensions.is((select status from public.meeting_sessions where id=(select id from finish_ids where kind='session')),'IN_PROGRESS','Failed finish leaves the meeting untouched');
select extensions.is((select status from public.meeting_agenda_items where id=(select id from finish_ids where kind='pending')),'PENDING','Failed finish applies no agenda outcome');
select extensions.is((select count(*)::integer from public.meeting_agenda_items where meeting_session_id=(select id from finish_ids where kind='next')),0,'Failed finish carries nothing forward');

-- Fix the PDCA (Owner) and finish. Due date stays empty on purpose: it is a warning now.
select public.assign_execution_people((select security_object_id from public.pdcas where id=(select id from finish_ids where kind='pdca')),(select version from public.pdcas where id=(select id from finish_ids where kind='pdca')),'21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001');
select extensions.throws_ok(format('select public.finish_meeting(%L,%s,%L::jsonb)',(select id from finish_ids where kind='session'),999,'[]'),'optimistic concurrency conflict','Stale version is refused');
select extensions.lives_ok(format('select public.finish_meeting(%L,%s,%L::jsonb)',(select id from finish_ids where kind='session'),(select version from public.meeting_sessions where id=(select id from finish_ids where kind='session')),
  format('[{"agenda_item_id":"%s","outcome":"DISCUSSED"},{"agenda_item_id":"%s","outcome":"POSTPONED"}]',(select id from finish_ids where kind='pending'),(select id from finish_ids where kind='to_next'))),
  'Terminar e distribuir succeeds once blocking issues are fixed');
select extensions.is((select status from public.meeting_sessions where id=(select id from finish_ids where kind='session')),'CLOSED','Meeting ends CLOSED in one operation');
select extensions.is((select count(*)::integer from public.meeting_publications where meeting_session_id=(select id from finish_ids where kind='session')),1,'Publication snapshot written');
select extensions.is((select status from public.meeting_agenda_items where id=(select id from finish_ids where kind='pending')),'DISCUSSED','Chosen outcome applied to pending item');
select extensions.is((select status from public.meeting_agenda_items where id=(select id from finish_ids where kind='to_next')),'POSTPONED','Postponed outcome applied');
select extensions.is((select count(*)::integer from public.meeting_agenda_items where meeting_session_id=(select id from finish_ids where kind='next') and carried_forward_from_id=(select id from finish_ids where kind='to_next')),1,'Explicitly postponed topic is carried to the next scheduled session');
select extensions.is((select status from public.pdcas where id=(select id from finish_ids where kind='pdca')),'OPEN','Distributed PDCA without due date is active');
select extensions.ok(exists(select 1 from public.audit_events where subject_id=(select id from finish_ids where kind='session') and action='meeting.finished'),'Finish is audited as one operation');
select extensions.ok((select count(*) from public.audit_events where subject_id=(select id from finish_ids where kind='session') and action in ('meeting.review','meeting.published','meeting.closed')) = 3,'Internal transitions remain individually audited');

select * from finish();
rollback;
