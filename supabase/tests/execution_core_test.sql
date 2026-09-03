begin;

create extension if not exists pgtap with schema extensions;
select plan(67);

select extensions.has_table('public', 'decisions', 'decisions is a strong table');
select extensions.has_table('public', 'tasks', 'tasks is a strong table');
select extensions.has_table('public', 'pdcas', 'pdcas is a strong table');
select extensions.has_table('public', 'execution_status_definitions', 'execution statuses are configurable lookup records');
select extensions.has_table('public', 'decision_status_definitions', 'decision statuses are configurable lookup records');
select extensions.has_table('public', 'severity_definitions', 'priority, impact and risk share configurable severity definitions');

insert into public.security_objects (id, company_id, object_type, visibility, created_by_profile_id)
values
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'TASK', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'TASK', 'RESTRICTED', '21000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'TASK', 'PRIVATE', '21000000-0000-0000-0000-000000000003'),
  ('b0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DECISION', 'NORMAL', '21000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'PDCA', 'NORMAL', '21000000-0000-0000-0000-000000000001');

insert into public.object_scope_organizational_units (security_object_id, organizational_unit_id)
select id, '30000000-0000-0000-0000-000000000007' from public.security_objects where id in (
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005');
insert into public.object_scope_restaurants (security_object_id, restaurant_id)
select id, '40000000-0000-0000-0000-000000000001' from public.security_objects where id in (
  'b0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000004','b0000000-0000-0000-0000-000000000005');

insert into public.tasks (id, company_id, security_object_id, title, owner_profile_id, responsible_profile_id, due_date, created_by_profile_id)
values
  ('c0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','Restaurant A task','21000000-0000-0000-0000-000000000017','21000000-0000-0000-0000-000000000017',current_date + 10,'21000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','Restricted task',null,null,null,'21000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','Private task',null,null,null,'21000000-0000-0000-0000-000000000003');
insert into public.decisions (id, company_id, security_object_id, title, created_by_profile_id)
values ('d0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000004','Operational decision','21000000-0000-0000-0000-000000000001');
insert into public.pdcas (id, company_id, security_object_id, title, owner_profile_id, responsible_profile_id, due_date, created_by_profile_id)
values ('e0000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000005','Operational PDCA','21000000-0000-0000-0000-000000000017','21000000-0000-0000-0000-000000000017',current_date + 30,'21000000-0000-0000-0000-000000000001');

select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000017','b0000000-0000-0000-0000-000000000001','task.read'), 'manager A reads normal Task in restaurant A');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000018','b0000000-0000-0000-0000-000000000001','task.read'), 'manager B denied cross-restaurant Task');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000002','task.read'), 'restricted permission allows global executive');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017','b0000000-0000-0000-0000-000000000002','task.read'), 'normal scoped manager cannot read Restricted');
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000003','task.read'), 'PRIVATE creator can read');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000003','task.read'), 'global executive cannot bypass PRIVATE');

select extensions.throws_ok($$ update public.tasks set owner_profile_id = '21000000-0000-0000-0000-000000000018' where id = 'c0000000-0000-0000-0000-000000000001' $$, 'owner must already have access; create an explicit grant separately if authorized');
select extensions.throws_ok($$ insert into public.object_memberships (security_object_id,profile_id,membership_role,added_by_profile_id) values ('b0000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000018','COLLABORATOR','21000000-0000-0000-0000-000000000001') $$, 'member must already have access; explicit grants are separate');
select extensions.throws_ok($$ insert into public.object_memberships (security_object_id,profile_id,membership_role,added_by_profile_id) values ('b0000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000017','WATCHER','21000000-0000-0000-0000-000000000003') $$, 'member must already have access; explicit grants are separate');

insert into public.explicit_access_grants (security_object_id,grantee_profile_id,permission_id,granted_by_profile_id,reason)
select 'b0000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000018',id,'21000000-0000-0000-0000-000000000001','Reviewed access for assignment' from public.permissions where permission_key='task.read';
select extensions.ok(private.can_access_security_object('21000000-0000-0000-0000-000000000018','b0000000-0000-0000-0000-000000000001','task.read'),'A separately issued valid grant enables read');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select extensions.ok(exists(select 1 from public.get_assignable_profiles('b0000000-0000-0000-0000-000000000001') where profile_id='21000000-0000-0000-0000-000000000018'),'Assignable options include only a target with existing access');
select extensions.lives_ok($$ select public.assign_execution_people('b0000000-0000-0000-0000-000000000001',1,'21000000-0000-0000-0000-000000000017','21000000-0000-0000-0000-000000000018') $$,'An assignee can be set after a separate valid grant');
update public.tasks set version = version + 1 where id = 'c0000000-0000-0000-0000-000000000001';
select extensions.lives_ok($$ select public.assign_execution_people('b0000000-0000-0000-0000-000000000001',3,'21000000-0000-0000-0000-000000000017','21000000-0000-0000-0000-000000000018') $$,'Assignee concurrency follows aggregate version even when security metadata version differs');

create temporary table execution_test_ids (kind text primary key, id uuid not null);
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
insert into execution_test_ids values ('decision', public.create_decision(
  '10000000-0000-0000-0000-000000000001','Created through command','Auditable',current_date,null,'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[],array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.ok((select id is not null from execution_test_ids where kind='decision'), 'Decision create command succeeds');
select extensions.ok(exists(select 1 from public.audit_events where subject_id=(select id from execution_test_ids where kind='decision') and action='decision.created'), 'Decision creation is audited');
select extensions.lives_ok(format('select public.update_decision(%L,1,%L,%L,current_date,null)',(select id from execution_test_ids where kind='decision'),'Updated decision','Updated'), 'Decision optimistic update succeeds');
select extensions.lives_ok(format('select public.archive_decision(%L,2,%L)',(select id from execution_test_ids where kind='decision'),'No longer active'), 'Decision archive succeeds');
insert into public.decision_task_links values ('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',now());
select extensions.is((select count(*)::integer from public.decision_task_links where decision_id='d0000000-0000-0000-0000-000000000001'),1,'Decision to Task relationship has domain foreign keys');

insert into execution_test_ids values ('task', public.create_task(
  company_id => '10000000-0000-0000-0000-000000000001', title => 'Lifecycle task', description => 'test',
  priority => 'HIGH', owner_profile_id => '21000000-0000-0000-0000-000000000001', responsible_profile_id => '21000000-0000-0000-0000-000000000001',
  due_date => current_date + 5, unit_ids => array['30000000-0000-0000-0000-000000000007']::uuid[], restaurant_ids => array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.is((select status::text from public.tasks where id=(select id from execution_test_ids where kind='task')),'DRAFT','Task starts Draft');
select extensions.lives_ok(format('select public.transition_task(%L,1,%L,null,null)',(select id from execution_test_ids where kind='task'),'OPEN'), 'Task can enter Open when complete enough');
select extensions.throws_ok($$ select public.transition_task('c0000000-0000-0000-0000-000000000001',1,'COMPLETED',null,null) $$, 'invalid task status transition');
select extensions.lives_ok(format('select public.change_task_due_date(%L,2,current_date+8,%L)',(select id from execution_test_ids where kind='task'),'Operational extension'), 'Task due date can change with reason');
select extensions.is((select count(*)::integer from public.task_due_date_changes where task_id=(select id from execution_test_ids where kind='task')),1,'Task due date history is immutable fact');
select extensions.lives_ok(format('select public.add_task_blocker(%L,%L)',(select id from execution_test_ids where kind='task'),'Waiting for access'), 'Task blocker can be added');
select extensions.lives_ok(format('select public.transition_task(%L,4,%L,null,null)',(select id from execution_test_ids where kind='task'),'BLOCKED'), 'Task enters Blocked only with active blocker');
select extensions.lives_ok(format('select public.resolve_task_blocker(%L,%L)',(select id from public.task_blockers where task_id=(select id from execution_test_ids where kind='task')),'Access restored'), 'Task blocker resolution is preserved');
select extensions.lives_ok(format('select public.transition_task(%L,6,%L,null,null)',(select id from execution_test_ids where kind='task'),'IN_PROGRESS'), 'Task resumes explicitly');
select extensions.lives_ok(format('select public.transition_task(%L,7,%L,null,%L)',(select id from execution_test_ids where kind='task'),'COMPLETED','Done'), 'Task completion succeeds');
select extensions.is((select count(*)::integer from public.task_completion_events where task_id=(select id from execution_test_ids where kind='task')),1,'Task completion event retains due-date snapshot');
select extensions.lives_ok(format('select public.transition_task(%L,8,%L,%L,null)',(select id from execution_test_ids where kind='task'),'IN_PROGRESS','More work found'), 'Task can reopen with reason');
select extensions.is((select count(*)::integer from public.task_reopening_events where task_id=(select id from execution_test_ids where kind='task')),1,'Task reopening preserves previous completion');

insert into public.task_dependencies values ((select id from execution_test_ids where kind='task'),'c0000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001',now());
select extensions.is((select count(*)::integer from public.task_dependencies where task_id=(select id from execution_test_ids where kind='task')),1,'Task dependency uses canonical DEPENDS_ON direction');
select extensions.throws_ok(format('insert into public.task_dependencies values (%L,%L,%L,now())','c0000000-0000-0000-0000-000000000001',(select id from execution_test_ids where kind='task'),'21000000-0000-0000-0000-000000000001'), 'task dependency cycle detected');

insert into execution_test_ids values ('pdca', public.create_pdca(
  company_id => '10000000-0000-0000-0000-000000000001', title => 'Lifecycle PDCA', problem_statement => 'Recurring loss', objective => 'Remove loss',
  root_cause_or_hypothesis => 'Process variation', owner_profile_id => '21000000-0000-0000-0000-000000000001', responsible_profile_id => '21000000-0000-0000-0000-000000000001', due_date => current_date + 30,
  unit_ids => array['30000000-0000-0000-0000-000000000007']::uuid[], restaurant_ids => array['40000000-0000-0000-0000-000000000001']::uuid[]));
select extensions.is((select phase::text from public.pdcas where id=(select id from execution_test_ids where kind='pdca')),'PLAN','PDCA starts in Plan');
update public.tasks set pdca_id=(select id from execution_test_ids where kind='pdca') where id='c0000000-0000-0000-0000-000000000001';
select extensions.is((select count(*)::integer from public.tasks where pdca_id=(select id from execution_test_ids where kind='pdca')),1,'A PDCA contains strongly linked Tasks');
select extensions.lives_ok(format('select public.transition_pdca(%L,1,%L,null,null)',(select id from execution_test_ids where kind='pdca'),'OPEN'), 'PDCA enters Open after minimum validation');
select extensions.lives_ok(format('select public.change_pdca_phase(%L,2,%L,null)',(select id from execution_test_ids where kind='pdca'),'ACT'), 'PDCA phase can mature progressively');
select extensions.lives_ok(format('select public.update_pdca(%L,3,%L,%L,%L,%L,null,%L,null,null,null,%L,%L,%L,%L,%L,null)',(select id from execution_test_ids where kind='pdca'),'Lifecycle PDCA','Recurring loss','Remove loss','Process variation','Measured improvement','MEDIUM','HIGH','LOW','21000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000001'), 'PDCA Check result can be recorded');
select extensions.lives_ok(format('select public.transition_pdca(%L,4,%L,null,null)',(select id from execution_test_ids where kind='pdca'),'IN_PROGRESS'), 'PDCA enters In Progress');
select extensions.lives_ok(format('select public.transition_pdca(%L,5,%L,null,null)',(select id from execution_test_ids where kind='pdca'),'UNDER_REVIEW'), 'PDCA enters review');
select extensions.lives_ok(format('select public.transition_pdca(%L,6,%L,null,%L)',(select id from execution_test_ids where kind='pdca'),'COMPLETED','Standardized'), 'PDCA completes only in Act with result');
select extensions.is((select count(*)::integer from public.pdca_completion_events where pdca_id=(select id from execution_test_ids where kind='pdca')),1,'PDCA completion snapshot is retained');
select extensions.lives_ok(format('select public.transition_pdca(%L,7,%L,%L,null)',(select id from execution_test_ids where kind='pdca'),'IN_PROGRESS','Result regressed'), 'PDCA reopening is explicit');
select extensions.lives_ok(format('select public.add_pdca_blocker(%L,%L)',(select id from execution_test_ids where kind='pdca'),'Pending validation'), 'PDCA blocker can be added');
select extensions.lives_ok(format('select public.resolve_pdca_blocker(%L,%L)',(select id from public.pdca_blockers where pdca_id=(select id from execution_test_ids where kind='pdca') and resolved_at is null),'Validation received'), 'PDCA blocker can be resolved');
select extensions.ok(exists(select 1 from public.pdca_blockers where pdca_id=(select id from execution_test_ids where kind='pdca') and resolved_at is not null),'PDCA blocker interval remains queryable after resolution');

select extensions.lives_ok($$ select public.add_comment('b0000000-0000-0000-0000-000000000001','Execution update') $$, 'Authorized comment succeeds');
select extensions.lives_ok(format('select public.edit_comment(%L,%L)',(select id from public.comments where security_object_id='b0000000-0000-0000-0000-000000000001' order by created_at limit 1),'Edited execution update'),'Comment author can edit while access remains valid');
select extensions.throws_ok($$ select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000018',true); select public.add_comment('b0000000-0000-0000-0000-000000000001','Leaking comment') $$, 'object not found or access denied');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000018',true);
select extensions.throws_ok($$ select public.register_attachment('b0000000-0000-0000-0000-000000000001','leak.pdf','application/pdf',100,'10000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/leak.pdf') $$, 'object not found or access denied');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000001',true);
select extensions.lives_ok($$ select public.register_attachment('b0000000-0000-0000-0000-000000000001','evidence.pdf','application/pdf',1024,'10000000-0000-0000-0000-000000000001/b0000000-0000-0000-0000-000000000001/evidence.pdf') $$, 'Authorized attachment metadata is registered');
select extensions.is((select public from storage.buckets where id='execution-attachments'),false,'Attachment bucket is private');
select extensions.ok(exists(select 1 from public.audit_events where security_object_id='b0000000-0000-0000-0000-000000000001' and action='attachment.added'),'Attachment registration is audited without public URL');

insert into public.object_memberships (security_object_id,profile_id,membership_role,added_by_profile_id)
values ('b0000000-0000-0000-0000-000000000001','21000000-0000-0000-0000-000000000017','WATCHER','21000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
select extensions.ok(exists(select 1 from public.my_work() where object_id='c0000000-0000-0000-0000-000000000001'), 'My Work returns an assigned authorized Task');
set local role authenticated;
select extensions.is((select count(*)::integer from public.tasks where id='c0000000-0000-0000-0000-000000000001'),1,'Task RLS permits authorized list/detail');
select extensions.is((select count(*)::integer from public.tasks where id='c0000000-0000-0000-0000-000000000002'),0,'Task RLS hides Restricted row');
reset role;

insert into public.explicit_access_grants (security_object_id,grantee_profile_id,permission_id,granted_by_profile_id,reason,valid_from,valid_to)
select 'b0000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000017',id,'21000000-0000-0000-0000-000000000001','Expired test grant',now()-interval '2 days',now()-interval '1 day' from public.permissions where permission_key='task.read';
insert into public.explicit_access_grants (security_object_id,grantee_profile_id,permission_id,granted_by_profile_id,reason,revoked_at,revoked_by_profile_id)
select 'b0000000-0000-0000-0000-000000000003','21000000-0000-0000-0000-000000000018',id,'21000000-0000-0000-0000-000000000001','Revoked test grant',now(),'21000000-0000-0000-0000-000000000001' from public.permissions where permission_key='task.read';
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000017','b0000000-0000-0000-0000-000000000003','task.read'),'Expired explicit grant is denied');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000018','b0000000-0000-0000-0000-000000000003','task.read'),'Revoked explicit grant is denied');
select set_config('request.jwt.claim.sub','20000000-0000-0000-0000-000000000017',true);
select extensions.throws_ok($$ select public.create_task(company_id=>'10000000-0000-0000-0000-000000000001',title=>'Unauthorized scope',unit_ids=>array['30000000-0000-0000-0000-000000000007']::uuid[],restaurant_ids=>array['40000000-0000-0000-0000-000000000002']::uuid[]) $$,'insufficient permission for the complete proposed scope');
select extensions.throws_ok($$ select public.create_task(company_id=>'10000000-0000-0000-0000-000000000002',title=>'Cross company',unit_ids=>array[]::uuid[],restaurant_ids=>array[]::uuid[]) $$,'insufficient permission for the complete proposed scope');
select extensions.ok(not private.can_access_security_object('21000000-0000-0000-0000-000000000003','b0000000-0000-0000-0000-000000000001','task.read'),'Cross-department scope is denied');

select * from extensions.finish();
rollback;
