begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

select extensions.has_table('public','ai_runs','ai_runs records provenance');
select extensions.has_table('public','ai_run_sources','ai_run_sources links supplied records');
select extensions.has_table('public','ai_proposals','ai_proposals holds reviewable suggestions');

create temporary table ai_test_ids(kind text primary key,id uuid not null);
grant select on ai_test_ids to authenticated;

-- CEO prepares a Restaurant A meeting with an agenda item and a note.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into ai_test_ids values('session',public.create_meeting_session(
  '10000000-0000-0000-0000-000000000001','AI Weekly',now()+interval '1 day',now()+interval '1 day 1 hour',
  '21000000-0000-0000-0000-000000000001',null,'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
insert into ai_test_ids values('session_object',(select security_object_id from public.meeting_sessions where id=(select id from ai_test_ids where kind='session')));
insert into ai_test_ids values('agenda',public.add_meeting_agenda_item((select id from ai_test_ids where kind='session'),'Limpeza','Escala',null,15,null));
select public.add_meeting_note((select id from ai_test_ids where kind='session'),'Tarefa: Rever escala | responsável: CEO',null);

-- Restaurant B task readable by the CEO but not by the Restaurant A manager.
insert into public.security_objects(id,company_id,object_type,visibility,created_by_profile_id) values('f1000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','TASK','NORMAL','21000000-0000-0000-0000-000000000001');
insert into public.object_scope_organizational_units values('f1000000-0000-0000-0000-0000000000a1','30000000-0000-0000-0000-000000000007',now(),'21000000-0000-0000-0000-000000000001');
insert into public.object_scope_restaurants values('f1000000-0000-0000-0000-0000000000a1','40000000-0000-0000-0000-000000000002',now(),'21000000-0000-0000-0000-000000000001');
insert into public.tasks(id,company_id,security_object_id,title,created_by_profile_id) values('f2000000-0000-0000-0000-0000000000a1','10000000-0000-0000-0000-000000000001','f1000000-0000-0000-0000-0000000000a1','Restaurant B Task','21000000-0000-0000-0000-000000000001');

-- Run lifecycle -----------------------------------------------------------
insert into ai_test_ids values('run',public.start_ai_run('10000000-0000-0000-0000-000000000001','MEETING_ASSISTANT',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'));
select extensions.is((select status from public.ai_runs where id=(select id from ai_test_ids where kind='run')),'RUNNING','Run starts RUNNING');
select extensions.is((select count(*)::integer from public.ai_run_sources where ai_run_id=(select id from ai_test_ids where kind='run')),1,'Target is recorded as the first source');
select extensions.ok(exists(select 1 from public.audit_events where subject_type='AI_RUN' and subject_id=(select id from ai_test_ids where kind='run') and action='ai.run.started'),'Run start is audited');
select extensions.throws_ok(format('select public.start_ai_run(%L,%L,%L,%L,%L,%L)','10000000-0000-0000-0000-000000000001','EXECUTION_VALIDATOR',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'),'the Execution Validator requires a Task or PDCA target');

select extensions.lives_ok(format('select public.record_ai_run_sources(%L,%L::jsonb)',(select id from ai_test_ids where kind='run'),'[{"security_object_id":"f1000000-0000-0000-0000-0000000000a1","source_version":1,"context_role":"LINK"}]'),'CEO can record a readable source');
select extensions.is((select count(*)::integer from public.ai_run_sources where ai_run_id=(select id from ai_test_ids where kind='run')),2,'Sources accumulate without duplicates');

insert into ai_test_ids values('proposal',public.add_ai_proposal((select id from ai_test_ids where kind='run'),'TASK','{"version":1,"type":"TASK","title":"Rever escala","description":"Rever escala de limpeza","priority":"HIGH","citations":["note:x"],"confidence":0.7}'));
select extensions.is((select status from public.ai_proposals where id=(select id from ai_test_ids where kind='proposal')),'PENDING','Proposal waits for human review');
select extensions.throws_ok(format('select public.add_ai_proposal(%L,%L,%L::jsonb)',(select id from ai_test_ids where kind='run'),'SUMMARY','{}'),'proposal type SUMMARY is not produced by use case MEETING_ASSISTANT');

select public.complete_ai_run((select id from ai_test_ids where kind='run'),'SUCCEEDED',null,120,40,900);
select extensions.is((select status from public.ai_runs where id=(select id from ai_test_ids where kind='run')),'SUCCEEDED','Run completes with telemetry');
select extensions.throws_ok(format('select public.add_ai_proposal(%L,%L,%L::jsonb)',(select id from ai_test_ids where kind='run'),'TASK','{}'),'AI run not found, not owned or already finished');

-- Visibility follows the target object -------------------------------------
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.ai_runs where id=(select id from ai_test_ids where kind='run')),1,'Restaurant A manager reads runs about a readable meeting');
select extensions.is((select count(*)::integer from public.ai_proposals where ai_run_id=(select id from ai_test_ids where kind='run')),1,'Restaurant A manager reads proposals about a readable meeting');
select extensions.is((select count(*)::integer from public.ai_run_sources where ai_run_id=(select id from ai_test_ids where kind='run')),1,'Inaccessible source objects stay hidden from provenance');
reset role;
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000018',true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.ai_runs where id=(select id from ai_test_ids where kind='run')),0,'Restaurant B manager sees no run about Restaurant A meeting');
select extensions.is((select count(*)::integer from public.ai_proposals where ai_run_id=(select id from ai_test_ids where kind='run')),0,'Restaurant B manager sees no proposals');
reset role;
select extensions.throws_ok(format('select public.start_ai_run(%L,%L,%L,%L,%L,%L)','10000000-0000-0000-0000-000000000001','MEETING_ASSISTANT',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'),'AI target not found or access denied','Restaurant B manager cannot start a run on Restaurant A meeting');

-- Restaurant A manager may run the assistant but cannot smuggle inaccessible sources.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
insert into ai_test_ids values('manager_run',public.start_ai_run('10000000-0000-0000-0000-000000000001','MEETING_ASSISTANT',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'));
select extensions.throws_ok(format('select public.record_ai_run_sources(%L,%L::jsonb)',(select id from ai_test_ids where kind='manager_run'),'[{"security_object_id":"f1000000-0000-0000-0000-0000000000a1","source_version":1,"context_role":"LINK"}]'),'AI source not accessible: f1000000-0000-0000-0000-0000000000a1');
select public.complete_ai_run((select id from ai_test_ids where kind='manager_run'),'FAILED','TIMEOUT');

-- Review: reject needs a reason; confirm re-authorizes and reuses domain commands.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select extensions.throws_ok(format('select public.reject_ai_proposal(%L,1,%L)',(select id from ai_test_ids where kind='proposal'),''),'a reason is required to reject a proposal');
select extensions.throws_ok(format('select public.confirm_ai_proposal(%L,2,%L::jsonb)',(select id from ai_test_ids where kind='proposal'),'{}'),'stale proposal version');
insert into ai_test_ids values('task',public.confirm_ai_proposal((select id from ai_test_ids where kind='proposal'),1,
  '{"title":"Rever escala de limpeza","description":"Confirmado pelo Chair","priority":"HIGH","ownerProfileId":"21000000-0000-0000-0000-000000000001","responsibleProfileId":"21000000-0000-0000-0000-000000000001","dueDate":"2030-01-15","agendaItemId":null}'));
select extensions.is((select status from public.tasks where id=(select id from ai_test_ids where kind='task')),'DRAFT','Confirmed proposal creates a Draft Task through the normal command');
select extensions.is((select title from public.tasks where id=(select id from ai_test_ids where kind='task')),'Rever escala de limpeza','Human-edited payload wins over the model payload');
select extensions.ok(exists(select 1 from public.meeting_object_links where meeting_session_id=(select id from ai_test_ids where kind='session') and relation_type='CREATED' and security_object_id=(select security_object_id from public.tasks where id=(select id from ai_test_ids where kind='task'))),'Created Task is linked to the meeting as CREATED');
select extensions.is((select status from public.ai_proposals where id=(select id from ai_test_ids where kind='proposal')),'CONFIRMED','Proposal is marked CONFIRMED');
select extensions.is((select executed_record_type from public.ai_proposals where id=(select id from ai_test_ids where kind='proposal')),'TASK','Execution record type is preserved');
select extensions.ok(exists(select 1 from public.audit_events where subject_type='AI_PROPOSAL' and subject_id=(select id from ai_test_ids where kind='proposal') and action='ai.proposal.confirmed' and actor_profile_id='21000000-0000-0000-0000-000000000001'),'Confirmation is audited with the human reviewer as actor');
select extensions.throws_ok(format('select public.confirm_ai_proposal(%L,2,%L::jsonb)',(select id from ai_test_ids where kind='proposal'),'{}'),'proposal already reviewed','Confirmation is idempotent: a second confirmation is refused');

-- Stale proposals: the meeting changed after the run.
insert into ai_test_ids values('run2',public.start_ai_run('10000000-0000-0000-0000-000000000001','MEETING_SUMMARY',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'));
insert into ai_test_ids values('summary',public.add_ai_proposal((select id from ai_test_ids where kind='run2'),'SUMMARY','{"version":1,"type":"SUMMARY","summary":"Resumo","citations":[]}'));
select public.complete_ai_run((select id from ai_test_ids where kind='run2'),'SUCCEEDED');
update public.security_objects set version=version+1 where id=(select id from ai_test_ids where kind='session_object');
select extensions.throws_ok(format('select public.confirm_ai_proposal(%L,1,%L::jsonb)',(select id from ai_test_ids where kind='summary'),'{"summary":"Resumo revisto"}'),'proposal is stale: the meeting changed after the AI run; generate proposals again');
select extensions.lives_ok(format('select public.reject_ai_proposal(%L,1,%L)',(select id from ai_test_ids where kind='summary'),'Reunião alterada; gerar de novo'),'Stale proposals can still be rejected with a reason');
select extensions.is((select status from public.ai_proposals where id=(select id from ai_test_ids where kind='summary')),'REJECTED','Rejected proposal keeps its reason');

-- Summary confirmation writes a normal, attributed meeting note.
insert into ai_test_ids values('run3',public.start_ai_run('10000000-0000-0000-0000-000000000001','MEETING_SUMMARY',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'));
insert into ai_test_ids values('summary2',public.add_ai_proposal((select id from ai_test_ids where kind='run3'),'SUMMARY','{"version":1,"type":"SUMMARY","summary":"Resumo","citations":[]}'));
select public.complete_ai_run((select id from ai_test_ids where kind='run3'),'SUCCEEDED');
insert into ai_test_ids values('note',public.confirm_ai_proposal((select id from ai_test_ids where kind='summary2'),1,'{"summary":"Resumo revisto pelo Chair"}'));
select extensions.is((select author_profile_id from public.meeting_notes where id=(select id from ai_test_ids where kind='note')),'21000000-0000-0000-0000-000000000001'::uuid,'Confirmed summary is a meeting note authored by the reviewer');
select extensions.ok((select content like '%Resumo revisto pelo Chair' from public.meeting_notes where id=(select id from ai_test_ids where kind='note')),'Note keeps the reviewed summary text');

-- Execution Validator findings are recommendations only.
insert into ai_test_ids values('validator_run',public.start_ai_run('10000000-0000-0000-0000-000000000001','EXECUTION_VALIDATOR','f1000000-0000-0000-0000-0000000000a1','fake','fake','v1'));
insert into ai_test_ids values('finding',public.add_ai_proposal((select id from ai_test_ids where kind='validator_run'),'FINDING','{"version":1,"type":"FINDING","code":"OBJECTIVE_UNCLEAR","severity":"WARNING","message":"x","source":"AI","confidence":0.5,"evidence":[]}'));
select public.complete_ai_run((select id from ai_test_ids where kind='validator_run'),'SUCCEEDED');
select extensions.throws_ok(format('select public.confirm_ai_proposal(%L,1,%L::jsonb)',(select id from ai_test_ids where kind='finding'),'{}'),'findings are recommendations and cannot be executed');

-- Access revoked between proposal and confirmation.
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
insert into ai_test_ids values('manager_run2',public.start_ai_run('10000000-0000-0000-0000-000000000001','MEETING_ASSISTANT',(select id from ai_test_ids where kind='session_object'),'fake','fake','v1'));
insert into ai_test_ids values('manager_proposal',public.add_ai_proposal((select id from ai_test_ids where kind='manager_run2'),'DECISION','{"version":1,"type":"DECISION","title":"Fechar esplanada","description":"às 23h"}'));
select public.complete_ai_run((select id from ai_test_ids where kind='manager_run2'),'SUCCEEDED');
update public.organizational_assignments set valid_to=current_date-1 where profile_id='21000000-0000-0000-0000-000000000017';
select extensions.throws_ok(format('select public.confirm_ai_proposal(%L,1,%L::jsonb)',(select id from ai_test_ids where kind='manager_proposal'),'{"title":"Fechar esplanada","description":"às 23h"}'),'AI proposal not found or access denied','Confirmation re-authorizes the reviewer at confirmation time');
update public.organizational_assignments set valid_to=null where profile_id='21000000-0000-0000-0000-000000000017';

select * from finish();
rollback;
