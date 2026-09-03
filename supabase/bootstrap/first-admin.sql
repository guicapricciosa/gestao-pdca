-- Creates the profile and the Global Executive assignment for a person who
-- already exists in Supabase Auth (invited from the dashboard). Idempotent.
--   supabase db query --linked --file supabase/bootstrap/first-admin.sql
-- Edit the two values below before running.
begin;

with target as (
  select id as auth_user_id, email
  from auth.users
  where lower(email) = lower('gui.rainho@grupocpa.pt')
),
profile as (
  insert into public.profiles (auth_user_id, display_name, email_snapshot)
  select auth_user_id, 'Gui Rainho', email from target
  on conflict (auth_user_id) do update set display_name = excluded.display_name
  returning id
)
insert into public.organizational_assignments (
  profile_id, company_id, organizational_unit_id, role_id, title,
  unit_scope_mode, restaurant_scope_mode, valid_from
)
select profile.id, '10000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
       '60000000-0000-0000-0000-000000000001', 'Administrador da plataforma', 'COMPANY_WIDE', 'COMPANY_WIDE', current_date
from profile
where not exists (
  select 1 from public.organizational_assignments oa
  where oa.profile_id = profile.id and oa.role_id = '60000000-0000-0000-0000-000000000001'
);

commit;
