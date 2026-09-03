-- Foundation permission catalogue.
--
-- These keys are referenced by authorization code (security.restricted.read,
-- work_item.*, organization.*) and must exist in every environment. They lived
-- only in the development seed until now; the seed keeps the same ids and uses
-- `on conflict do nothing`, so local resets are unaffected.
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
