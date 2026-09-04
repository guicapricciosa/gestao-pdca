-- Development/demo data only. Names and assignments below are ordinary rows and
-- are never referenced by authorization code.

insert into public.companies (id, code, name, legal_name, timezone)
values
  ('10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA', 'Grupo Capricciosa', 'Grupo Capricciosa', 'Europe/Lisbon'),
  ('10000000-0000-0000-0000-000000000002', 'HOLDING_SERVICES', 'Holding Shared Services', 'Holding Shared Services', 'Europe/Lisbon')
on conflict (id) do nothing;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  seed.id,
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  seed.email,
  extensions.crypt('DevelopmentOnly123!', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', seed.display_name),
  now(), now(), '', '', '', ''
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'ceo@example.test', 'CEO'),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'andre.marco@example.test', 'André Março'),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'gui.rainho@example.test', 'Gui Rainho'),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'mafalda.zuzarte@example.test', 'Mafalda Zuzarte'),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'sara.barradas@example.test', 'Sara Barradas'),
  ('20000000-0000-0000-0000-000000000006'::uuid, 'margarida.vilarinho@example.test', 'Margarida Vilarinho'),
  ('20000000-0000-0000-0000-000000000007'::uuid, 'joao.novo@example.test', 'João Novo'),
  ('20000000-0000-0000-0000-000000000008'::uuid, 'tiago.carvalho@example.test', 'Tiago Carvalho'),
  ('20000000-0000-0000-0000-000000000009'::uuid, 'mariana.seabra@example.test', 'Mariana Seabra'),
  ('20000000-0000-0000-0000-000000000010'::uuid, 'monica.gomes@example.test', 'Mónica Gomes'),
  ('20000000-0000-0000-0000-000000000011'::uuid, 'ricardo.torrao@example.test', 'Ricardo Torrão'),
  ('20000000-0000-0000-0000-000000000012'::uuid, 'ana.serrano@example.test', 'Ana Serrano'),
  ('20000000-0000-0000-0000-000000000013'::uuid, 'andre.stoffel@example.test', 'André Stoffel'),
  ('20000000-0000-0000-0000-000000000014'::uuid, 'bruno.henriques@example.test', 'Bruno Henriques'),
  ('20000000-0000-0000-0000-000000000015'::uuid, 'supervisor.ops.a@example.test', 'Supervisor Operations A'),
  ('20000000-0000-0000-0000-000000000016'::uuid, 'supervisor.ops.b@example.test', 'Supervisor Operations B'),
  ('20000000-0000-0000-0000-000000000017'::uuid, 'manager.a@example.test', 'Restaurant Manager A'),
  ('20000000-0000-0000-0000-000000000018'::uuid, 'manager.b@example.test', 'Restaurant Manager B'),
  ('20000000-0000-0000-0000-000000000019'::uuid, 'kitchen.supervisor.a@example.test', 'Kitchen Supervisor A'),
  ('20000000-0000-0000-0000-000000000020'::uuid, 'kitchen.manager.a@example.test', 'Kitchen Manager A')
) as seed(id, email, display_name)
where not exists (select 1 from auth.users existing where existing.id = seed.id);

-- GoTrue password authentication resolves email users through auth.identities.
-- These rows are development/test fixtures, not application authorization data.
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  auth_user.id,
  auth_user.id,
  auth_user.id::text,
  jsonb_build_object(
    'sub', auth_user.id::text,
    'email', auth_user.email,
    'email_verified', true
  ),
  'email',
  now(), now(), now()
from auth.users auth_user
where auth_user.email like '%@example.test'
  and not exists (
    select 1 from auth.identities identity
    where identity.user_id = auth_user.id and identity.provider = 'email'
  );

insert into public.profiles (id, auth_user_id, display_name, email_snapshot)
select
  ('21000000-0000-0000-0000-' || right(seed.auth_id::text, 12))::uuid,
  seed.auth_id,
  seed.display_name,
  seed.email
from (values
  ('20000000-0000-0000-0000-000000000001'::uuid, 'ceo@example.test', 'CEO'),
  ('20000000-0000-0000-0000-000000000002'::uuid, 'andre.marco@example.test', 'André Março'),
  ('20000000-0000-0000-0000-000000000003'::uuid, 'gui.rainho@example.test', 'Gui Rainho'),
  ('20000000-0000-0000-0000-000000000004'::uuid, 'mafalda.zuzarte@example.test', 'Mafalda Zuzarte'),
  ('20000000-0000-0000-0000-000000000005'::uuid, 'sara.barradas@example.test', 'Sara Barradas'),
  ('20000000-0000-0000-0000-000000000006'::uuid, 'margarida.vilarinho@example.test', 'Margarida Vilarinho'),
  ('20000000-0000-0000-0000-000000000007'::uuid, 'joao.novo@example.test', 'João Novo'),
  ('20000000-0000-0000-0000-000000000008'::uuid, 'tiago.carvalho@example.test', 'Tiago Carvalho'),
  ('20000000-0000-0000-0000-000000000009'::uuid, 'mariana.seabra@example.test', 'Mariana Seabra'),
  ('20000000-0000-0000-0000-000000000010'::uuid, 'monica.gomes@example.test', 'Mónica Gomes'),
  ('20000000-0000-0000-0000-000000000011'::uuid, 'ricardo.torrao@example.test', 'Ricardo Torrão'),
  ('20000000-0000-0000-0000-000000000012'::uuid, 'ana.serrano@example.test', 'Ana Serrano'),
  ('20000000-0000-0000-0000-000000000013'::uuid, 'andre.stoffel@example.test', 'André Stoffel'),
  ('20000000-0000-0000-0000-000000000014'::uuid, 'bruno.henriques@example.test', 'Bruno Henriques'),
  ('20000000-0000-0000-0000-000000000015'::uuid, 'supervisor.ops.a@example.test', 'Supervisor Operations A'),
  ('20000000-0000-0000-0000-000000000016'::uuid, 'supervisor.ops.b@example.test', 'Supervisor Operations B'),
  ('20000000-0000-0000-0000-000000000017'::uuid, 'manager.a@example.test', 'Restaurant Manager A'),
  ('20000000-0000-0000-0000-000000000018'::uuid, 'manager.b@example.test', 'Restaurant Manager B'),
  ('20000000-0000-0000-0000-000000000019'::uuid, 'kitchen.supervisor.a@example.test', 'Kitchen Supervisor A'),
  ('20000000-0000-0000-0000-000000000020'::uuid, 'kitchen.manager.a@example.test', 'Kitchen Manager A')
) as seed(auth_id, email, display_name)
on conflict (id) do nothing;

insert into public.organizational_units (id, company_id, unit_type, code, name)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'EXECUTIVE', 'Executive Management'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'EXPANSION', 'Expansion and Management Support'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'SUPPORT_IT', 'Support & IT'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'MARKETING', 'Marketing'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'HAPPY_PEOPLE', 'Happy People'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'COMMERCIAL', 'Commercial'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'DOL', 'Operations and Logistics'),
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'HACCP', 'HACCP'),
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'CONTROL_PURCHASING', 'Management Control & Purchasing'),
  ('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'MAINTENANCE', 'Maintenance'),
  ('30000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'DAF', 'DAF')
on conflict (id) do nothing;

insert into public.departments (organizational_unit_id)
select id from public.organizational_units where unit_type = 'DEPARTMENT'
on conflict (organizational_unit_id) do nothing;

insert into public.shared_services (organizational_unit_id, provider_company_id)
select id, '10000000-0000-0000-0000-000000000002'
from public.organizational_units where unit_type = 'SHARED_SERVICE'
on conflict (organizational_unit_id) do nothing;

insert into public.restaurants (id, company_id, code, name)
values
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_A', 'Restaurant A'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_B', 'Restaurant B'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_C', 'Restaurant C'),
  ('40000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_D', 'Restaurant D')
on conflict (id) do nothing;

insert into public.permissions (id, permission_key, description, risk_level, scope_requirement, is_delegable)
values
  ('50000000-0000-0000-0000-000000000001', 'organization.read', 'Read organization configuration', 1, 'INTERSECT', false),
  ('50000000-0000-0000-0000-000000000002', 'organization.manage', 'Manage organization configuration', 4, 'COVER_ALL', false),
  ('50000000-0000-0000-0000-000000000003', 'authorization.manage', 'Manage roles and functional permissions', 4, 'COVER_ALL', false),
  ('50000000-0000-0000-0000-000000000004', 'audit.read', 'Read authorized audit events', 3, 'INTERSECT', false),
  ('50000000-0000-0000-0000-000000000005', 'work_item.read', 'Read authorization test/future execution objects', 1, 'INTERSECT', true),
  ('50000000-0000-0000-0000-000000000006', 'work_item.update', 'Update authorized execution objects', 2, 'INTERSECT', true),
  ('50000000-0000-0000-0000-000000000007', 'work_item.scope.update', 'Change full object scope', 3, 'COVER_ALL', true),
  ('50000000-0000-0000-0000-000000000008', 'security.grant.manage', 'Issue explicit grants within controlled scope', 4, 'COVER_ALL', false),
  ('50000000-0000-0000-0000-000000000009', 'security.restricted.read', 'Read restricted objects within controlled scope', 4, 'INTERSECT', false)
on conflict (id) do nothing;

insert into public.roles (id, company_id, code, name)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'GLOBAL_EXECUTIVE', 'Global Executive'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'SUPPORT_DIRECTOR', 'Support Department Director'),
  ('60000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'DOL_DIRECTOR', 'DOL Director'),
  ('60000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DOL_SUBDIRECTOR', 'DOL Subdirector'),
  ('60000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'OPS_SUPERVISOR', 'Operations Supervisor'),
  ('60000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_MANAGER', 'Restaurant Manager'),
  ('60000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'KITCHEN_SUPERVISOR', 'Kitchen Supervisor'),
  ('60000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'KITCHEN_MANAGER', 'Kitchen Manager'),
  ('60000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'Shared Service User')
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.code = 'GLOBAL_EXECUTIVE'
   or (role.code <> 'GLOBAL_EXECUTIVE' and permission.permission_key in ('organization.read', 'work_item.read', 'work_item.update'))
on conflict do nothing;

-- Scoped leaders can manage object scope and grants only inside the full scope
-- resolved from their own assignment path.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission
  on permission.permission_key in ('work_item.scope.update', 'security.grant.manage')
where role.code in ('SUPPORT_DIRECTOR', 'DOL_DIRECTOR', 'DOL_SUBDIRECTOR')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.permission_key = 'meeting.template.manage'
where role.code in ('GLOBAL_EXECUTIVE', 'SUPPORT_DIRECTOR', 'DOL_DIRECTOR', 'DOL_SUBDIRECTOR')
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
join public.permissions permission on permission.permission_key = 'work_item.scope.update'
where role.code in ('OPS_SUPERVISOR', 'RESTAURANT_MANAGER', 'KITCHEN_SUPERVISOR', 'KITCHEN_MANAGER')
on conflict do nothing;

-- Execution permissions are data, not role-name checks in application code. These
-- demo mappings make the representative development roles usable for this phase.
insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where permission.permission_key in (
  'decision.create', 'decision.read', 'decision.update', 'decision.archive',
  'decision.scope.update', 'task.create', 'task.read', 'task.update', 'task.archive',
  'task.scope.update', 'pdca.create', 'pdca.read', 'pdca.update', 'pdca.archive',
  'pdca.scope.update',
  'comment.create', 'attachment.read', 'attachment.upload',
  'meeting.create', 'meeting.read', 'meeting.update', 'meeting.scope.update',
  'meeting.publish', 'meeting.close', 'meeting.reopen', 'meeting.participant.manage',
  'meeting.agenda.manage', 'meeting.note.create', 'meeting.link.manage',
  'ai.meeting.assist', 'ai.execution.validate'
)
on conflict do nothing;

insert into public.organizational_assignments (
  id, profile_id, company_id, organizational_unit_id, role_id, title,
  unit_scope_mode, restaurant_scope_mode, valid_from
)
values
  ('70000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'CEO', 'COMPANY_WIDE', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000001', 'Expansion and Management Support', 'COMPANY_WIDE', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000002', 'Support & IT Director', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-000000000002', 'Marketing Director', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000005', '60000000-0000-0000-0000-000000000002', 'Happy People Director', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000006', '60000000-0000-0000-0000-000000000002', 'Commercial Director', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000003', 'DOL Director', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', 'DOL Subdirector', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', 'DOL Subdirector', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000004', 'DOL Subdirector', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011', '60000000-0000-0000-0000-000000000009', 'HACCP Lead', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000012', '60000000-0000-0000-0000-000000000009', 'Management Control & Purchasing Lead', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000013', '21000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000013', '60000000-0000-0000-0000-000000000009', 'Maintenance Lead', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000014', '21000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000014', '60000000-0000-0000-0000-000000000009', 'DAF Lead', 'ASSIGNED', 'COMPANY_WIDE', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000015', '21000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', 'Operations Supervisor A', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000016', '21000000-0000-0000-0000-000000000016', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000005', 'Operations Supervisor B', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000017', '21000000-0000-0000-0000-000000000017', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000006', 'Restaurant Manager A', 'COMPANY_WIDE', 'ASSIGNED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000018', '21000000-0000-0000-0000-000000000018', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000006', 'Restaurant Manager B', 'COMPANY_WIDE', 'ASSIGNED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000019', '21000000-0000-0000-0000-000000000019', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000007', 'Kitchen Supervisor A', 'COMPANY_WIDE', 'INHERITED', '2026-01-01'),
  ('70000000-0000-0000-0000-000000000020', '21000000-0000-0000-0000-000000000020', '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000007', '60000000-0000-0000-0000-000000000008', 'Kitchen Manager A', 'COMPANY_WIDE', 'ASSIGNED', '2026-01-01')
on conflict (id) do nothing;

insert into public.hierarchy_relationships (id, parent_assignment_id, child_assignment_id, relationship_type, valid_from)
values
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000008', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000009', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000010', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000015', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000016', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000017', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000015', '70000000-0000-0000-0000-000000000018', 'REPORTS_TO', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000019', 'OPERATIONAL_RESPONSIBILITY', '2026-01-01'),
  ('80000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000019', '70000000-0000-0000-0000-000000000020', 'REPORTS_TO', '2026-01-01')
on conflict (id) do nothing;

insert into public.restaurant_assignments (
  id, organizational_assignment_id, restaurant_id, responsibility_type, valid_from
)
values
  ('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000001', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000002', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000003', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000004', '70000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000004', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000005', '70000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000003', 'SECONDARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000006', '70000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000001', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000007', '70000000-0000-0000-0000-000000000018', '40000000-0000-0000-0000-000000000002', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000008', '70000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000001', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000009', '70000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000002', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000010', '70000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000001', 'PRIMARY', '2026-01-01')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Demo data (development only). Everything below is created through the same
-- domain commands the application uses, acting as seeded development users,
-- so audit, links and history are real. Names are ordinary rows: nothing in
-- authorization code references them.
-- ---------------------------------------------------------------------------

insert into public.restaurants (id, company_id, code, name)
values
  ('40000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_E', 'Restaurant E'),
  ('40000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_F', 'Restaurant F'),
  ('40000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_G', 'Restaurant G'),
  ('40000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'RESTAURANT_H', 'Restaurant H')
on conflict (id) do nothing;

-- Supervisor B also covers E and F; Mónica Gomes supervises G and H directly
-- (a restaurant without an intermediate supervisor).
insert into public.restaurant_assignments (
  id, organizational_assignment_id, restaurant_id, responsibility_type, valid_from
)
values
  ('90000000-0000-0000-0000-000000000011', '70000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000005', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000012', '70000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000006', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000013', '70000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000007', 'PRIMARY', '2026-01-01'),
  ('90000000-0000-0000-0000-000000000014', '70000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000008', 'PRIMARY', '2026-01-01')
on conflict (id) do nothing;

-- Session-level helpers for the demo block. They only exist while seeding.
create or replace function pg_temp.demo_as(p_suffix text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-0000000000' || p_suffix, false);
$$;
create or replace function pg_temp.demo_task_to(p_task uuid, p_status text, p_reason text default null, p_notes text default null) returns void language plpgsql as $$
declare v bigint; begin
  select version into v from public.tasks where id = p_task;
  perform public.transition_task(p_task, v, p_status, p_reason, p_notes);
end $$;
create or replace function pg_temp.demo_pdca_to(p_pdca uuid, p_status text, p_reason text default null, p_notes text default null) returns void language plpgsql as $$
declare v bigint; begin
  select version into v from public.pdcas where id = p_pdca;
  perform public.transition_pdca(p_pdca, v, p_status, p_reason, p_notes);
end $$;
create or replace function pg_temp.demo_meeting_to(p_session uuid, p_status text, p_reason text default null) returns void language plpgsql as $$
declare v bigint; begin
  select version into v from public.meeting_sessions where id = p_session;
  perform public.transition_meeting_session(p_session, v, p_status, p_reason);
end $$;
create or replace function pg_temp.demo_agenda(p_item uuid, p_status text, p_reason text default null) returns void language plpgsql as $$
declare v bigint; begin
  select version into v from public.meeting_agenda_items where id = p_item;
  perform public.set_meeting_agenda_status(p_item, v, p_status, p_reason);
end $$;
create or replace function pg_temp.demo_object(p_table text, p_id uuid) returns uuid language plpgsql as $$
declare o uuid; begin
  execute format('select security_object_id from public.%I where id = $1', p_table) into o using p_id;
  return o;
end $$;

do $$
declare
  company constant uuid := '10000000-0000-0000-0000-000000000001';
  u_exec constant uuid := '30000000-0000-0000-0000-000000000001';
  u_expansion constant uuid := '30000000-0000-0000-0000-000000000002';
  u_it constant uuid := '30000000-0000-0000-0000-000000000003';
  u_marketing constant uuid := '30000000-0000-0000-0000-000000000004';
  u_people constant uuid := '30000000-0000-0000-0000-000000000005';
  u_commercial constant uuid := '30000000-0000-0000-0000-000000000006';
  u_dol constant uuid := '30000000-0000-0000-0000-000000000007';
  u_haccp constant uuid := '30000000-0000-0000-0000-000000000011';
  u_control constant uuid := '30000000-0000-0000-0000-000000000012';
  u_maint constant uuid := '30000000-0000-0000-0000-000000000013';
  u_daf constant uuid := '30000000-0000-0000-0000-000000000014';
  r_a constant uuid := '40000000-0000-0000-0000-000000000001';
  r_b constant uuid := '40000000-0000-0000-0000-000000000002';
  r_c constant uuid := '40000000-0000-0000-0000-000000000003';
  r_d constant uuid := '40000000-0000-0000-0000-000000000004';
  r_e constant uuid := '40000000-0000-0000-0000-000000000005';
  r_g constant uuid := '40000000-0000-0000-0000-000000000007';
  all_r constant uuid[] := array['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000003','40000000-0000-0000-0000-000000000004','40000000-0000-0000-0000-000000000005','40000000-0000-0000-0000-000000000006','40000000-0000-0000-0000-000000000007','40000000-0000-0000-0000-000000000008']::uuid[];
  p_ceo constant uuid := '21000000-0000-0000-0000-000000000001';
  p_andre constant uuid := '21000000-0000-0000-0000-000000000002';
  p_gui constant uuid := '21000000-0000-0000-0000-000000000003';
  p_mafalda constant uuid := '21000000-0000-0000-0000-000000000004';
  p_sara constant uuid := '21000000-0000-0000-0000-000000000005';
  p_margarida constant uuid := '21000000-0000-0000-0000-000000000006';
  p_joao constant uuid := '21000000-0000-0000-0000-000000000007';
  p_tiago constant uuid := '21000000-0000-0000-0000-000000000008';
  p_monica constant uuid := '21000000-0000-0000-0000-000000000010';
  p_ricardo constant uuid := '21000000-0000-0000-0000-000000000011';
  p_ana constant uuid := '21000000-0000-0000-0000-000000000012';
  p_stoffel constant uuid := '21000000-0000-0000-0000-000000000013';
  p_bruno constant uuid := '21000000-0000-0000-0000-000000000014';
  p_sup_a constant uuid := '21000000-0000-0000-0000-000000000015';
  p_sup_b constant uuid := '21000000-0000-0000-0000-000000000016';
  p_mgr_a constant uuid := '21000000-0000-0000-0000-000000000017';
  p_mgr_b constant uuid := '21000000-0000-0000-0000-000000000018';
  p_kit_sup constant uuid := '21000000-0000-0000-0000-000000000019';
  p_kit_mgr constant uuid := '21000000-0000-0000-0000-000000000020';
  d1 uuid; d2 uuid; d3 uuid; d4 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid; p6 uuid;
  t uuid; t1 uuid; t2 uuid; t3 uuid; t4 uuid; t9 uuid; t12 uuid;
  s_ops uuid; s_mgmt uuid; m uuid; a1 uuid; a2 uuid; a3 uuid; b uuid; v bigint;
begin
  if exists (select 1 from public.meeting_series where title = 'Weekly Operations') then
    return;
  end if;

  -- ===== Decisions ==========================================================
  perform pg_temp.demo_as('01');
  d1 := public.create_decision(company, 'Fechar esplanadas às 23h em todos os restaurantes',
    'Decidido na reunião de direção de Agosto para reduzir queixas de ruído e custos de pessoal.',
    current_date - 20, p_ceo, 'NORMAL', array[u_dol], all_r, 'ACTIVE');
  perform pg_temp.demo_as('11');
  d2 := public.create_decision(company, 'Adotar checklist HACCP digital em todas as cozinhas',
    'Substituição progressiva dos registos em papel; auditoria trimestral valida a adoção.',
    current_date - 45, p_ricardo, 'NORMAL', array[u_haccp], all_r, 'ACTIVE');
  perform pg_temp.demo_as('04');
  d3 := public.create_decision(company, 'Campanha de Outono arranca a 1 de Outubro',
    'Menu sazonal e comunicação nas redes sociais para os restaurantes de Lisboa.',
    current_date - 10, p_mafalda, 'NORMAL', array[u_marketing], array[r_a, r_b, r_c, r_d], 'ACTIVE');
  perform pg_temp.demo_as('05');
  d4 := public.create_decision(company, 'Rever política de gorjetas e prémios de equipa',
    'Assunto sensível: só a direção e Happy People acompanham até à decisão final.',
    current_date, p_sara, 'RESTRICTED', array[u_people], all_r, 'DRAFT');

  -- ===== PDCAs ==============================================================
  perform pg_temp.demo_as('07');
  p1 := public.create_pdca(company, 'Reduzir desperdício alimentar no Restaurant A',
    'O desperdício pesado em Agosto foi 9% do custo de mercadoria, acima dos 5% de referência.',
    'Baixar o desperdício para 5% do custo de mercadoria até ao fim do trimestre.',
    'Doses inconsistentes ao almoço e produção excessiva de pão; falta de pesagem diária.',
    'HIGH', 'HIGH', 'MEDIUM', p_joao, p_mgr_a, current_date - 20, current_date + 30,
    null, 'NORMAL', array[u_dol], array[r_a]);
  perform pg_temp.demo_pdca_to(p1, 'OPEN');
  perform pg_temp.demo_pdca_to(p1, 'IN_PROGRESS');
  select version into v from public.pdcas where id = p1;
  perform public.change_pdca_phase(p1, v, 'DO', null);
  t1 := public.create_task(company, 'Standardizar doses do menu de almoço', 'Fichas técnicas revistas e afixadas na linha.',
    'HIGH', p_joao, p_mgr_a, current_date - 10, current_date + 7, p1, null, 'NORMAL', array[u_dol], array[r_a]);
  perform pg_temp.demo_task_to(t1, 'OPEN'); perform pg_temp.demo_task_to(t1, 'IN_PROGRESS');
  t2 := public.create_task(company, 'Pesagem diária de desperdício', 'Registo ao fecho em folha partilhada.',
    'MEDIUM', p_joao, p_kit_mgr, current_date - 18, current_date - 3, p1, null, 'NORMAL', array[u_dol], array[r_a]);
  perform pg_temp.demo_task_to(t2, 'OPEN'); perform pg_temp.demo_task_to(t2, 'IN_PROGRESS');
  perform pg_temp.demo_task_to(t2, 'COMPLETED', null, 'Balança instalada e registos diários desde dia 1.');
  t3 := public.create_task(company, 'Reduzir produção de pão ao almoço em 20%', 'Ajustar plano de produção com a padaria.',
    'MEDIUM', p_joao, p_mgr_a, current_date - 2, current_date, p1, null, 'NORMAL', array[u_dol], array[r_a]);
  perform pg_temp.demo_task_to(t3, 'OPEN');
  perform public.add_comment(pg_temp.demo_object('pdcas', p1), 'Primeira semana de pesagem: 7,4%. Continuar a monitorizar.');
  perform pg_temp.demo_as('17');
  perform public.add_comment(pg_temp.demo_object('pdcas', p1), 'Fichas técnicas afixadas. A equipa de almoço já está a usar as doses novas.');

  perform pg_temp.demo_as('08');
  p2 := public.create_pdca(company, 'Tempo de espera ao almoço no Restaurant B',
    'Espera média de 22 minutos entre pedido e serviço nas segundas e terças.',
    'Espera média abaixo de 15 minutos nos dias úteis.',
    'Um único POS na sala; pedidos acumulam no pico das 13h.',
    'CRITICAL', 'HIGH', 'HIGH', p_tiago, p_mgr_b, current_date - 30, current_date - 5,
    null, 'NORMAL', array[u_dol], array[r_b]);
  perform pg_temp.demo_pdca_to(p2, 'OPEN'); perform pg_temp.demo_pdca_to(p2, 'IN_PROGRESS');
  select version into v from public.pdcas where id = p2;
  perform public.change_pdca_phase(p2, v, 'DO', null);
  b := public.add_pdca_blocker(p2, 'Aguarda orçamento aprovado para um segundo POS.');
  perform pg_temp.demo_pdca_to(p2, 'BLOCKED');
  perform public.add_comment(pg_temp.demo_object('pdcas', p2), 'Orçamento pedido ao Management Control há duas semanas; sem resposta.');

  perform pg_temp.demo_as('05');
  p3 := public.create_pdca(company, 'Onboarding estruturado de novos colaboradores',
    'Novos colaboradores demoram 6 semanas até autonomia; 30% saem no primeiro trimestre.',
    'Autonomia em 3 semanas e retenção a 90 dias acima de 85%.',
    'Sem plano de integração por função nem tutor designado.',
    'MEDIUM', 'HIGH', 'MEDIUM', p_sara, p_sara, current_date, current_date + 45,
    null, 'NORMAL', array[u_people], all_r);
  perform pg_temp.demo_pdca_to(p3, 'OPEN');

  perform pg_temp.demo_as('11');
  p4 := public.create_pdca(company, 'Auditorias HACCP trimestrais nas oito unidades',
    'Duas unidades sem auditoria interna no último semestre.',
    'Todas as unidades auditadas a cada trimestre com plano de ação fechado em 30 dias.',
    'Calendário de auditorias não estava centralizado.',
    'HIGH', 'CRITICAL', 'HIGH', p_ricardo, p_ricardo, current_date - 90, current_date - 30,
    null, 'NORMAL', array[u_haccp], all_r);
  perform pg_temp.demo_pdca_to(p4, 'OPEN'); perform pg_temp.demo_pdca_to(p4, 'IN_PROGRESS');
  select version into v from public.pdcas where id = p4;
  perform public.change_pdca_phase(p4, v, 'DO', null);
  select version into v from public.pdcas where id = p4;
  perform public.change_pdca_phase(p4, v, 'CHECK', null);
  select version into v from public.pdcas where id = p4;
  perform public.update_pdca(p4, v, 'Auditorias HACCP trimestrais nas oito unidades',
    'Duas unidades sem auditoria interna no último semestre.',
    'Todas as unidades auditadas a cada trimestre com plano de ação fechado em 30 dias.',
    'Calendário de auditorias não estava centralizado.',
    'Oito auditorias por trimestre, zero não conformidades críticas em aberto.',
    'Oito auditorias realizadas; duas não conformidades menores fechadas em 12 dias.',
    'Planos de ação acompanhados nas reuniões semanais.',
    'Calendário anual publicado e partilhado com os gerentes.',
    'Auditoria interna passa a ser standard trimestral.',
    'HIGH', 'CRITICAL', 'HIGH', p_ricardo, p_ricardo, current_date - 90);
  select version into v from public.pdcas where id = p4;
  perform public.change_pdca_phase(p4, v, 'ACT', null);
  perform pg_temp.demo_pdca_to(p4, 'COMPLETED', null, 'Ciclo fechado com evidência das auditorias.');

  perform pg_temp.demo_as('04');
  p5 := public.create_pdca(company, 'Campanha de Outono', null, null, null,
    'MEDIUM', 'MEDIUM', 'LOW', p_mafalda, p_mafalda, null, current_date + 20,
    null, 'NORMAL', array[u_marketing], array[r_a, r_b, r_c, r_d]);

  perform pg_temp.demo_as('13');
  p6 := public.create_pdca(company, 'Manutenção preventiva das câmaras frigoríficas',
    'Três avarias de câmaras em dois meses, com perda de mercadoria.',
    'Zero avarias não planeadas nos próximos seis meses.',
    'Sem plano de manutenção preventiva; filtros e vedantes nunca substituídos.',
    'HIGH', 'HIGH', 'HIGH', p_stoffel, p_stoffel, current_date - 40, current_date + 14,
    null, 'NORMAL', array[u_maint], all_r);
  perform pg_temp.demo_pdca_to(p6, 'OPEN'); perform pg_temp.demo_pdca_to(p6, 'IN_PROGRESS');
  select version into v from public.pdcas where id = p6;
  perform public.change_pdca_due_date(p6, v, current_date + 7, 'Fornecedor atrasou a entrega dos vedantes.');
  select version into v from public.pdcas where id = p6;
  perform public.change_pdca_due_date(p6, v, current_date + 14, 'Segunda remessa só chega na próxima semana.');

  -- ===== Standalone Tasks ===================================================
  perform pg_temp.demo_as('03');
  t4 := public.create_task(company, 'Substituir impressoras de cozinha do Restaurant C', 'Duas impressoras térmicas com falhas intermitentes.',
    'HIGH', p_gui, p_gui, current_date - 8, current_date - 3, null, null, 'NORMAL', array[u_it], array[r_c]);
  perform pg_temp.demo_task_to(t4, 'OPEN'); perform pg_temp.demo_task_to(t4, 'IN_PROGRESS');
  perform public.add_comment(pg_temp.demo_object('tasks', t4), 'Equipamento chegou; instalação marcada para terça de manhã.');
  t := public.create_task(company, 'Renovar contrato de internet do Restaurant D', 'Contrato termina no fim do mês; pedir propostas.',
    'MEDIUM', p_gui, p_gui, current_date, current_date + 5, null, null, 'NORMAL', array[u_it], array[r_d]);
  perform pg_temp.demo_task_to(t, 'OPEN');

  perform pg_temp.demo_as('11');
  t := public.create_task(company, 'Formação de segurança alimentar — turma de Setembro', 'Sessão de 3 horas para as equipas de cozinha de A e B.',
    'MEDIUM', p_ricardo, p_kit_sup, current_date + 1, current_date + 2, null, null, 'NORMAL', array[u_haccp], array[r_a, r_b]);
  perform pg_temp.demo_task_to(t, 'PLANNED');

  perform pg_temp.demo_as('06');
  t := public.create_task(company, 'Atualizar preçário de bebidas', 'Novos preços de fornecedor a partir de Setembro.',
    'MEDIUM', p_margarida, p_margarida, current_date - 6, current_date - 1, null, null, 'NORMAL', array[u_commercial], all_r);
  perform pg_temp.demo_task_to(t, 'OPEN'); perform pg_temp.demo_task_to(t, 'IN_PROGRESS'); perform pg_temp.demo_task_to(t, 'WAITING');

  perform pg_temp.demo_as('14');
  t := public.create_task(company, 'Fecho de contas de Agosto', 'Conciliação bancária e fecho de fornecedores.',
    'HIGH', p_bruno, p_bruno, current_date - 12, current_date - 7, null, null, 'NORMAL', array[u_daf], all_r);
  perform pg_temp.demo_task_to(t, 'OPEN'); perform pg_temp.demo_task_to(t, 'IN_PROGRESS');
  perform pg_temp.demo_task_to(t, 'COMPLETED', null, 'Fecho enviado à contabilidade a tempo.');

  perform pg_temp.demo_as('13');
  t9 := public.create_task(company, 'Reparar exaustor da cozinha do Restaurant A', 'Motor com ruído anormal; risco de paragem.',
    'CRITICAL', p_stoffel, p_kit_mgr, current_date - 4, current_date + 1, null, null, 'NORMAL', array[u_maint], array[r_a]);
  perform pg_temp.demo_task_to(t9, 'OPEN'); perform pg_temp.demo_task_to(t9, 'IN_PROGRESS');
  b := public.add_task_blocker(t9, 'Peça em backorder no fornecedor; previsão de 10 dias.');
  perform pg_temp.demo_task_to(t9, 'BLOCKED');
  perform public.add_comment(pg_temp.demo_object('tasks', t9), 'Fornecedor alternativo contactado para acelerar.');
  t12 := public.create_task(company, 'Verificar extintores do Restaurant G', 'Inspeção anual em atraso.',
    'MEDIUM', p_stoffel, p_monica, current_date - 20, current_date - 2, null, null, 'NORMAL', array[u_maint], array[r_g]);
  perform pg_temp.demo_task_to(t12, 'OPEN');

  perform pg_temp.demo_as('18');
  t := public.create_task(company, 'Escala de férias do Q4 no Restaurant B', 'Recolher pedidos e fechar escala com o supervisor.',
    'MEDIUM', p_mgr_b, p_mgr_b, current_date - 5, current_date + 10, null, null, 'NORMAL', array[u_dol], array[r_b]);
  perform pg_temp.demo_task_to(t, 'OPEN'); perform pg_temp.demo_task_to(t, 'IN_PROGRESS'); perform pg_temp.demo_task_to(t, 'UNDER_REVIEW');

  perform pg_temp.demo_as('16');
  t := public.create_task(company, 'Inventário mensal do Restaurant E', 'Contagem de bar e economato.',
    'LOW', p_sup_b, p_sup_b, current_date, current_date + 3, null, null, 'NORMAL', array[u_dol], array[r_e]);
  perform pg_temp.demo_task_to(t, 'OPEN');

  perform pg_temp.demo_as('02');
  t := public.create_task(company, 'Preparar reunião de direção de Outubro', 'Agenda, indicadores e propostas de expansão.',
    'MEDIUM', p_andre, p_andre, null, current_date + 12, null, null, 'NORMAL', array[u_exec, u_expansion], array[]::uuid[]);
  t := public.create_task(company, 'Rever KPIs de vendas de Setembro', 'Comparar com o plano e preparar comentários para a direção.',
    'HIGH', p_andre, p_ceo, current_date - 1, current_date, null, null, 'NORMAL', array[u_expansion], all_r);
  perform pg_temp.demo_task_to(t, 'OPEN'); perform pg_temp.demo_task_to(t, 'IN_PROGRESS');

  -- ===== Meeting Series and Sessions ========================================
  perform pg_temp.demo_as('07');
  s_ops := public.create_meeting_series(company, 'Weekly Operations', 'Reunião semanal de operações do DOL com os supervisores.',
    'OPERATIONS', p_joao, 'Semanal, segunda-feira às 10:00', '{}', 'NORMAL', array[u_dol], array[r_a, r_b, r_c, r_d]);

  -- Closed session, two weeks ago
  m := public.create_meeting_session(company, 'Weekly Operations · há duas semanas',
    date_trunc('day', now()) - interval '14 days' + interval '10 hours', date_trunc('day', now()) - interval '14 days' + interval '11 hours',
    p_joao, s_ops, 'NORMAL', array[u_dol], array[r_a, r_b, r_c, r_d]);
  perform public.add_meeting_participant(m, p_tiago); perform public.add_meeting_participant(m, p_sup_a); perform public.add_meeting_participant(m, p_mgr_a);
  a1 := public.add_meeting_agenda_item(m, 'Desperdício alimentar', 'Resultados da pesagem e próximos passos.', p_mgr_a, 20, null);
  a2 := public.add_meeting_agenda_item(m, 'Tempos de espera ao almoço', 'Restaurant B continua acima dos 20 minutos.', p_tiago, 15, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED'); perform pg_temp.demo_meeting_to(m, 'IN_PROGRESS');
  perform public.add_meeting_note(m, 'Pesagem diária a funcionar; equipa pede balança para a copa.', a1);
  perform public.add_meeting_note(m, 'Tiago apresenta dados de espera; decidido pedir orçamento de POS.', a2);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p1), 'DISCUSSED', a1, null);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p2), 'DISCUSSED', a2, null);
  t := public.create_meeting_task(m, company, 'Instalar balança de desperdício na copa', 'Balança de 5 kg com registo diário.',
    'MEDIUM', p_joao, p_mgr_a, current_date - 2, 'NORMAL', array[u_dol], array[r_a], a1);
  perform pg_temp.demo_agenda(a1, 'DISCUSSED'); perform pg_temp.demo_agenda(a2, 'DISCUSSED');
  perform pg_temp.demo_meeting_to(m, 'REVIEW'); perform pg_temp.demo_meeting_to(m, 'PUBLISHED'); perform pg_temp.demo_meeting_to(m, 'CLOSED');
  perform pg_temp.demo_as('17');
  perform pg_temp.demo_task_to(t, 'IN_PROGRESS');
  perform pg_temp.demo_task_to(t, 'COMPLETED', null, 'Balança instalada e em uso.');
  perform pg_temp.demo_as('07');

  -- Published session, one week ago
  m := public.create_meeting_session(company, 'Weekly Operations · semana passada',
    date_trunc('day', now()) - interval '7 days' + interval '10 hours', date_trunc('day', now()) - interval '7 days' + interval '11 hours',
    p_joao, s_ops, 'NORMAL', array[u_dol], array[r_a, r_b, r_c, r_d]);
  perform public.add_meeting_participant(m, p_tiago); perform public.add_meeting_participant(m, p_sup_a); perform public.add_meeting_participant(m, p_sup_b); perform public.add_meeting_participant(m, p_mgr_b);
  a1 := public.add_meeting_agenda_item(m, 'Follow-up do desperdício', 'Evolução semanal do Restaurant A.', p_mgr_a, 10, null);
  a2 := public.add_meeting_agenda_item(m, 'Escalas de Outubro', 'Cobertura de fins-de-semana.', p_sup_a, 15, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED'); perform pg_temp.demo_meeting_to(m, 'IN_PROGRESS');
  perform public.add_meeting_note(m, 'Desperdício desceu para 7,4%; manter pesagem.', a1);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p1), 'FOLLOW_UP', a1, null);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p2), 'FOLLOW_UP', null, null);
  perform public.create_meeting_decision(m, company, 'Reforço de equipa aos fins-de-semana no Restaurant B',
    'Um empregado de mesa adicional aos sábados e domingos até resolver o tempo de espera.', current_date - 7, 'NORMAL', array[u_dol], array[r_b], a2);
  perform pg_temp.demo_agenda(a1, 'DISCUSSED'); perform pg_temp.demo_agenda(a2, 'POSTPONED', 'Faltam os pedidos de férias de duas equipas.');
  perform pg_temp.demo_meeting_to(m, 'REVIEW'); perform pg_temp.demo_meeting_to(m, 'PUBLISHED');

  -- Session in progress right now (open Meeting Mode immediately)
  m := public.create_meeting_session(company, 'Weekly Operations · esta semana',
    now() - interval '30 minutes', now() + interval '30 minutes',
    p_joao, s_ops, 'NORMAL', array[u_dol], array[r_a, r_b, r_c, r_d]);
  perform public.add_meeting_participant(m, p_tiago); perform public.add_meeting_participant(m, p_sup_a); perform public.add_meeting_participant(m, p_mgr_a); perform public.add_meeting_participant(m, p_mgr_b);
  a1 := public.add_meeting_agenda_item(m, 'Escalas de Outubro', 'Retomado da semana passada.', p_sup_a, 15, null);
  a2 := public.add_meeting_agenda_item(m, 'Manutenção das câmaras frigoríficas', 'Ponto de situação com a Maintenance.', p_tiago, 10, null);
  a3 := public.add_meeting_agenda_item(m, 'Inventários de Setembro', 'Calendário por restaurante.', p_sup_b, 10, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED'); perform pg_temp.demo_meeting_to(m, 'IN_PROGRESS');
  perform public.add_meeting_note(m, 'Supervisor A traz as escalas revistas; falta validar o Restaurant B.', a1);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p6), 'DISCUSSED', a2, null);
  perform public.link_meeting_object(m, pg_temp.demo_object('tasks', t9), 'FOLLOW_UP', a2, null);

  -- Next week, scheduled
  m := public.create_meeting_session(company, 'Weekly Operations · próxima semana',
    date_trunc('day', now()) + interval '7 days' + interval '10 hours', date_trunc('day', now()) + interval '7 days' + interval '11 hours',
    p_joao, s_ops, 'NORMAL', array[u_dol], array[r_a, r_b, r_c, r_d]);
  perform public.add_meeting_participant(m, p_tiago); perform public.add_meeting_participant(m, p_sup_a); perform public.add_meeting_participant(m, p_sup_b);
  perform public.add_meeting_agenda_item(m, 'Preparação da Campanha de Outono', 'Impacto operacional do menu sazonal.', p_tiago, 20, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED');

  -- Management Meeting series (CEO)
  perform pg_temp.demo_as('01');
  s_mgmt := public.create_meeting_series(company, 'Management Meeting', 'Reunião mensal de direção com os departamentos e serviços partilhados.',
    'MANAGEMENT', p_ceo, 'Mensal, primeira quinta-feira às 15:00', '{}', 'NORMAL',
    array[u_exec, u_expansion, u_it, u_marketing, u_people, u_commercial, u_dol, u_haccp, u_control, u_maint, u_daf], all_r);

  m := public.create_meeting_session(company, 'Management Meeting · Agosto',
    date_trunc('day', now()) - interval '21 days' + interval '15 hours', date_trunc('day', now()) - interval '21 days' + interval '17 hours',
    p_ceo, s_mgmt, 'NORMAL', array[u_exec, u_expansion, u_it, u_marketing, u_people, u_commercial, u_dol, u_haccp, u_control, u_maint, u_daf], all_r);
  perform public.add_meeting_participant(m, p_andre); perform public.add_meeting_participant(m, p_gui); perform public.add_meeting_participant(m, p_mafalda);
  perform public.add_meeting_participant(m, p_sara); perform public.add_meeting_participant(m, p_margarida); perform public.add_meeting_participant(m, p_joao);
  perform public.add_meeting_participant(m, p_ricardo); perform public.add_meeting_participant(m, p_ana); perform public.add_meeting_participant(m, p_stoffel); perform public.add_meeting_participant(m, p_bruno);
  a1 := public.add_meeting_agenda_item(m, 'Resultados de Agosto', 'Vendas, margem e custo de pessoal por restaurante.', p_andre, 30, null);
  a2 := public.add_meeting_agenda_item(m, 'Horário das esplanadas', 'Queixas de ruído e custo das horas extra.', p_joao, 15, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED'); perform pg_temp.demo_meeting_to(m, 'IN_PROGRESS');
  perform public.add_meeting_note(m, 'Vendas +4% face a Julho; margem estável; custo de pessoal acima do plano em B e C.', a1);
  perform public.link_meeting_object(m, pg_temp.demo_object('decisions', d1), 'DISCUSSED', a2, null);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p4), 'REVIEWED', null, null);
  perform pg_temp.demo_agenda(a1, 'DISCUSSED'); perform pg_temp.demo_agenda(a2, 'DISCUSSED');
  perform pg_temp.demo_meeting_to(m, 'REVIEW'); perform pg_temp.demo_meeting_to(m, 'PUBLISHED'); perform pg_temp.demo_meeting_to(m, 'CLOSED');

  -- Yesterday, awaiting the Chair's review
  m := public.create_meeting_session(company, 'Management Meeting · Setembro',
    date_trunc('day', now()) - interval '1 day' + interval '15 hours', date_trunc('day', now()) - interval '1 day' + interval '17 hours',
    p_ceo, s_mgmt, 'NORMAL', array[u_exec, u_expansion, u_it, u_marketing, u_people, u_commercial, u_dol, u_haccp, u_control, u_maint, u_daf], all_r);
  perform public.add_meeting_participant(m, p_andre); perform public.add_meeting_participant(m, p_gui); perform public.add_meeting_participant(m, p_mafalda);
  perform public.add_meeting_participant(m, p_sara); perform public.add_meeting_participant(m, p_joao); perform public.add_meeting_participant(m, p_ricardo); perform public.add_meeting_participant(m, p_bruno);
  a1 := public.add_meeting_agenda_item(m, 'Plano de formação HACCP', 'Calendário das turmas até Dezembro.', p_ricardo, 15, null);
  a2 := public.add_meeting_agenda_item(m, 'Campanha de Outono', 'Estado da preparação e necessidades operacionais.', p_mafalda, 15, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED'); perform pg_temp.demo_meeting_to(m, 'IN_PROGRESS');
  perform public.add_meeting_note(m, 'Ricardo propõe três turmas; direção pede prioridade às unidades novas.', a1);
  perform public.link_meeting_object(m, pg_temp.demo_object('pdcas', p5), 'DISCUSSED', a2, null);
  perform public.create_meeting_task(m, company, 'Calendarizar turmas de formação HACCP até Dezembro', 'Uma turma por mês, começando pelos restaurantes E a H.',
    'HIGH', p_ricardo, p_ricardo, current_date + 14, 'NORMAL', array[u_haccp], all_r, a1);
  perform pg_temp.demo_agenda(a1, 'DISCUSSED'); perform pg_temp.demo_agenda(a2, 'DISCUSSED');
  perform pg_temp.demo_meeting_to(m, 'REVIEW');

  m := public.create_meeting_session(company, 'Management Meeting · Outubro',
    date_trunc('day', now()) + interval '14 days' + interval '15 hours', date_trunc('day', now()) + interval '14 days' + interval '17 hours',
    p_ceo, s_mgmt, 'NORMAL', array[u_exec, u_expansion, u_it, u_marketing, u_people, u_commercial, u_dol, u_haccp, u_control, u_maint, u_daf], all_r);
  perform public.add_meeting_participant(m, p_andre); perform public.add_meeting_participant(m, p_joao); perform public.add_meeting_participant(m, p_gui);
  perform public.add_meeting_agenda_item(m, 'Resultados de Setembro', null, p_andre, 30, null);
  perform pg_temp.demo_meeting_to(m, 'SCHEDULED');

  -- Backdate activity so stale/overdue rules have something to show.
  update public.tasks set last_activity_at = now() - interval '20 days' where id = t12;
  update public.pdcas set last_activity_at = now() - interval '12 days' where id = p2;

  perform set_config('request.jwt.claim.sub', '', false);
end $$;
