begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

-- Manager A cannot manage the organization.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
set local role authenticated;
select extensions.throws_ok(
  $$select public.save_restaurant(null, '10000000-0000-0000-0000-000000000001', 'NOVO', 'Restaurante Novo', true)$$,
  'permission denied: organization.manage required', 'a manager cannot create restaurants');
reset role;

-- The CEO can.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select extensions.lives_ok(
  $$select public.save_restaurant(null, '10000000-0000-0000-0000-000000000001', 'novo', 'Restaurante Novo', true)$$,
  'creates a restaurant');
select extensions.is((select code from public.restaurants where name = 'Restaurante Novo'), 'NOVO', 'code is upper-cased');
select extensions.lives_ok(
  format($$select public.save_restaurant(%L, '10000000-0000-0000-0000-000000000001', 'NOVO', 'Restaurante Renomeado', false)$$,
    (select id from public.restaurants where name = 'Restaurante Novo')),
  'renames and deactivates a restaurant');
select extensions.is((select is_active from public.restaurants where name = 'Restaurante Renomeado'), false, 'restaurant deactivated');

select extensions.lives_ok(
  $$select public.save_organizational_unit(null, '10000000-0000-0000-0000-000000000001', 'DEPARTMENT', 'QUALIDADE', 'Qualidade', true)$$,
  'creates a department');
select extensions.is((select count(*)::integer from public.departments d join public.organizational_units u on u.id = d.organizational_unit_id where u.code = 'QUALIDADE'), 1, 'department subtype row exists');

-- Restaurant Manager A (assignment 0017) moves to restaurants A and B and reports to Supervisor A.
select extensions.lives_ok(
  $$select public.update_person_assignment('70000000-0000-0000-0000-000000000017', '60000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000007', 'Gerente A e B', 'COMPANY_WIDE', 'ASSIGNED', array['40000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002']::uuid[], '70000000-0000-0000-0000-000000000015')$$,
  'updates an assignment');
select extensions.is((select restaurant_names from public.people_directory where assignment_id = '70000000-0000-0000-0000-000000000017'), array['Restaurant A', 'Restaurant B'], 'restaurants updated');
select extensions.throws_ok(
  $$select public.update_person_assignment('70000000-0000-0000-0000-000000000015', '60000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000007', null, 'COMPANY_WIDE', 'INHERITED', '{}'::uuid[], '70000000-0000-0000-0000-000000000017')$$,
  'hierarchy cycle', 'refuses a reporting cycle');

-- Deactivate Restaurant Manager B; not yourself.
select extensions.throws_ok($$select public.deactivate_person('21000000-0000-0000-0000-000000000001')$$, 'cannot deactivate yourself', 'no self-deactivation');
select extensions.lives_ok($$select public.deactivate_person('21000000-0000-0000-0000-000000000018')$$, 'deactivates a person');
reset role;

select * from finish();
rollback;
