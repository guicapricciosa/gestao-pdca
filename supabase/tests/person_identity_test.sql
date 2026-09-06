begin;

create extension if not exists pgtap with schema extensions;
select plan(5);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
set local role authenticated;
select extensions.throws_ok(
  $$select public.update_person_identity('21000000-0000-0000-0000-000000000018', 'Outro Nome', 'outro@example.test')$$,
  'permission denied: organization.manage required', 'a manager cannot rename others');
select public.update_my_name('Gerente A Renomeado');
select extensions.is((select display_name from public.profiles where id = '21000000-0000-0000-0000-000000000017'), 'Gerente A Renomeado', 'a person renames themselves');
reset role;

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select extensions.lives_ok(
  $$select public.update_person_identity('21000000-0000-0000-0000-000000000018', 'Gerente B Renomeado', 'Gerente.B@Example.test')$$,
  'the executive renames and re-mails a person');
select extensions.is((select email_snapshot from public.profiles where id = '21000000-0000-0000-0000-000000000018'), 'gerente.b@example.test', 'e-mail is normalised');
select extensions.throws_ok(
  $$select public.update_person_identity('21000000-0000-0000-0000-000000000018', 'X', 'gerente.b@example.test')$$,
  'name too short', 'names need two characters');
reset role;

select * from finish();
rollback;
