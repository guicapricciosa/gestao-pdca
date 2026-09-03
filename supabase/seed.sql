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
  'meeting.agenda.manage', 'meeting.note.create', 'meeting.link.manage'
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
