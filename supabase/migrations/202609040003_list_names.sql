-- Lists sort by people names, not identifiers: expose the responsible and
-- owner display names on the list projections. Names come through the
-- caller's own profile visibility (security_invoker), so a name the caller
-- cannot see is simply null.

create or replace view public.task_list_items with (security_invoker = true) as
select task.id, task.security_object_id, task.title, task.description, task.status, task.priority,
  task.owner_profile_id, task.responsible_profile_id, task.due_date, task.completed_at, task.version, task.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id = task.security_object_id), array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id = task.security_object_id), array[]::uuid[]) restaurant_ids,
  (select display_name from public.profiles where id = task.responsible_profile_id) responsible_name,
  (select display_name from public.profiles where id = task.owner_profile_id) owner_name
from public.tasks task;

create or replace view public.pdca_list_items with (security_invoker = true) as
select pdca.id, pdca.security_object_id, pdca.title, pdca.problem_statement, pdca.objective, pdca.status, pdca.phase,
  pdca.priority, pdca.impact, pdca.risk, pdca.owner_profile_id, pdca.responsible_profile_id, pdca.due_date,
  pdca.version, pdca.updated_at,
  coalesce((select array_agg(scope.organizational_unit_id) from public.object_scope_organizational_units scope where scope.security_object_id = pdca.security_object_id), array[]::uuid[]) unit_ids,
  coalesce((select array_agg(scope.restaurant_id) from public.object_scope_restaurants scope where scope.security_object_id = pdca.security_object_id), array[]::uuid[]) restaurant_ids,
  (select display_name from public.profiles where id = pdca.responsible_profile_id) responsible_name,
  (select display_name from public.profiles where id = pdca.owner_profile_id) owner_name
from public.pdcas pdca;
