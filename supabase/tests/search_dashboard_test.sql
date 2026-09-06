begin;

create extension if not exists pgtap with schema extensions;
select plan(7);

-- A PRIVATE task only the CEO can see.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select public.create_task(
  company_id => '10000000-0000-0000-0000-000000000001', title => 'Xyzzy confidencial do CEO',
  description => 'Só o CEO deve encontrar isto', responsible_profile_id => '21000000-0000-0000-0000-000000000001',
  visibility => 'PRIVATE', unit_ids => array['30000000-0000-0000-0000-000000000001']::uuid[],
  restaurant_ids => array['40000000-0000-0000-0000-000000000001']::uuid[]);
select extensions.is((select count(*)::integer from public.search_everything('Xyzzy')), 1, 'the creator finds their private task');
select extensions.is((select count(*)::integer from public.search_everything('x')), 0, 'one-character queries return nothing');
reset role;

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
set local role authenticated;
select extensions.is((select count(*)::integer from public.search_everything('Xyzzy')), 0, 'a manager cannot find someone else''s private task');
select extensions.ok(
  not exists (
    select 1 from public.search_everything('a', 100) s
    where not exists (select 1 from public.tasks t where t.id = s.id) and s.kind = 'TASK'
  ),
  'every task hit is a task the manager can read (RLS parity)'
);
-- Dashboard counts match the list semantics for the same person.
select extensions.is(
  (select value from public.operational_dashboard(null, null) where metric = 'tasks_overdue'),
  (select count(*)::integer from public.task_list_items where due_date < current_date and status not in ('COMPLETED','CANCELLED','ARCHIVED')),
  'overdue tasks card equals the overdue list'
);
select extensions.is(
  (select value from public.operational_dashboard('40000000-0000-0000-0000-000000000001', null) where metric = 'pdcas_active'),
  (select count(*)::integer from public.pdca_list_items where '40000000-0000-0000-0000-000000000001' = any (restaurant_ids) and status in ('DRAFT','OPEN','PLANNED','IN_PROGRESS','BLOCKED','WAITING','UNDER_REVIEW')),
  'active PDCAs for restaurant A equal the filtered list'
);
select extensions.is((select count(*)::integer from public.operational_dashboard()), 8, 'eight metrics');
reset role;

select * from finish();
rollback;
