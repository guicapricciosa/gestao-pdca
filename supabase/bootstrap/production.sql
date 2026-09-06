-- Production bootstrap (run once, idempotent):
--   supabase db query --linked --file supabase/bootstrap/production.sql
--
-- Reference data that is real organization structure, not demo: the company,
-- the holding that provides shared services, departments and shared services,
-- the role catalogue with its permissions, and the restaurants. No people, no
-- passwords, no execution objects. People are created afterwards from Auth
-- invitations (see docs/deployment.md §6).

begin;

insert into public.companies (id, code, name, legal_name, timezone)
values
  ('10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA', 'Grupo Capricciosa', 'Grupo Capricciosa', 'Europe/Lisbon'),
  ('10000000-0000-0000-0000-000000000002', 'HOLDING_SERVICES', 'Holding Shared Services', 'Holding Shared Services', 'Europe/Lisbon')
on conflict (id) do nothing;

insert into public.organizational_units (id, company_id, unit_type, code, name)
values
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'EXECUTIVE', 'Direcção Geral'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'EXPANSION', 'Expansão e Apoio à Gestão'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'SUPPORT_IT', 'Suporte & IT'),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'MARKETING', 'Marketing'),
  ('30000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'HAPPY_PEOPLE', 'Happy People'),
  ('30000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'COMMERCIAL', 'Comercial'),
  ('30000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'DOL', 'Operações e Logística (DOL)'),
  ('30000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'HACCP', 'HACCP'),
  ('30000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'CONTROL_PURCHASING', 'Controlo de Gestão & Compras'),
  ('30000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'MAINTENANCE', 'Manutenção'),
  ('30000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000001', 'SHARED_SERVICE', 'DAF', 'DAF')
on conflict (id) do nothing;

insert into public.departments (organizational_unit_id)
select id from public.organizational_units where unit_type = 'DEPARTMENT'
on conflict (organizational_unit_id) do nothing;

insert into public.shared_services (organizational_unit_id, provider_company_id)
select id, '10000000-0000-0000-0000-000000000002'
from public.organizational_units where unit_type = 'SHARED_SERVICE'
on conflict (organizational_unit_id) do nothing;

-- Restaurants (list of 2025-10, source: main-gcpa). Codes are stable ids.
insert into public.restaurants (id, company_id, code, name)
values
  ('40000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA_CARCAVELOS', 'Capricciosa Carcavelos'),
  ('40000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA_EXPO', 'Capricciosa Expo'),
  ('40000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA_CASCAIS', 'Capricciosa Cascais'),
  ('40000000-0000-0000-0000-000000000104', '10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA_CAIS', 'Capricciosa Cais'),
  ('40000000-0000-0000-0000-000000000105', '10000000-0000-0000-0000-000000000001', 'CAPRICCIOSA_DOCAS', 'Capricciosa Docas'),
  ('40000000-0000-0000-0000-000000000106', '10000000-0000-0000-0000-000000000001', 'DOCA_DE_SANTO', 'Doca de Santo'),
  ('40000000-0000-0000-0000-000000000107', '10000000-0000-0000-0000-000000000001', 'LAT_A', 'Lat.a'),
  ('40000000-0000-0000-0000-000000000108', '10000000-0000-0000-0000-000000000001', 'SOPHIA_PIZOTECA', 'Sophia Pizoteca'),
  ('40000000-0000-0000-0000-000000000109', '10000000-0000-0000-0000-000000000001', 'SOPHIA_NATURAL', 'Sophia Natural'),
  ('40000000-0000-0000-0000-000000000110', '10000000-0000-0000-0000-000000000001', 'IRISH', 'Irish'),
  ('40000000-0000-0000-0000-000000000111', '10000000-0000-0000-0000-000000000001', 'JANGAL_ALLO', 'Jangal Allo'),
  ('40000000-0000-0000-0000-000000000112', '10000000-0000-0000-0000-000000000001', 'JANGAL_CASCAIS', 'Jangal Cascais'),
  ('40000000-0000-0000-0000-000000000113', '10000000-0000-0000-0000-000000000001', 'SELVA_CO', 'Selva CO'),
  ('40000000-0000-0000-0000-000000000114', '10000000-0000-0000-0000-000000000001', 'SELVA_MZ', 'Selva MZ'),
  ('40000000-0000-0000-0000-000000000115', '10000000-0000-0000-0000-000000000001', 'SELVA_LX', 'Selva Lx')
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

commit;
