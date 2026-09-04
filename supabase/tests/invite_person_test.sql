begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

-- A fresh auth user, as the admin API would create it.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values ('20000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nova.pessoa@example.test', '', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}');

-- Manager A has no organization.manage.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
set local role authenticated;
select extensions.throws_ok(
  $$select public.invite_person('20000000-0000-0000-0000-0000000000aa', 'Nova Pessoa', 'nova.pessoa@example.test', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', null, 'ASSIGNED', 'ASSIGNED', array['40000000-0000-0000-0000-000000000001']::uuid[])$$,
  'permission denied: organization.manage required',
  'a manager cannot invite people'
);
reset role;

-- The CEO (GLOBAL_EXECUTIVE) can.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select extensions.lives_ok(
  $$select public.invite_person('20000000-0000-0000-0000-0000000000aa', 'Nova Pessoa', 'Nova.Pessoa@example.test', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', 'Directora DOL', 'ASSIGNED', 'ASSIGNED', array['40000000-0000-0000-0000-000000000001']::uuid[])$$,
  'an executive invites a person with a scoped assignment'
);
select extensions.is((select email_snapshot from public.profiles where auth_user_id = '20000000-0000-0000-0000-0000000000aa'), 'nova.pessoa@example.test', 'e-mail is normalised');
select extensions.is((select count(*)::integer from public.people_directory where display_name = 'Nova Pessoa'), 1, 'the person appears in the directory');
select extensions.is((select restaurant_names from public.people_directory where display_name = 'Nova Pessoa'), (select array[name] from public.restaurants where id = '40000000-0000-0000-0000-000000000001'), 'restaurant scope is recorded');
select extensions.is((select role_code from public.people_directory where display_name = 'Nova Pessoa'), 'DOL_DIRECTOR', 'role is recorded');
select extensions.throws_ok(
  $$select public.invite_person('20000000-0000-0000-0000-0000000000aa', 'Nova Pessoa', 'nova.pessoa@example.test', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000007', null, 'ASSIGNED', 'ASSIGNED', '{}'::uuid[])$$,
  'at least one restaurant is required for an assigned restaurant scope',
  'assigned restaurant scope needs restaurants'
);
select extensions.throws_ok(
  $$select public.invite_person('20000000-0000-0000-0000-0000000000aa', 'Nova Pessoa', 'nova.pessoa@example.test', '10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000003', '00000000-0000-4000-8000-000000000000', null, 'ASSIGNED', 'NONE', '{}'::uuid[])$$,
  'unknown organizational unit',
  'unit must belong to the company'
);
reset role;

select * from finish();
rollback;
