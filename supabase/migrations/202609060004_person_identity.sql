-- Editing who a person is: name and e-mail by whoever manages the
-- organization; one's own name by oneself. The Auth e-mail is changed by the
-- server with the service key before this runs; this keeps the profile in step.
create or replace function public.update_person_identity(
  p_profile_id uuid,
  p_display_name text,
  p_email text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare actor uuid := private.current_profile_id();
begin
  if actor is null or not exists (
    select 1 from public.organizational_assignments oa
    where oa.profile_id = p_profile_id
      and private.has_company_permission(actor, oa.company_id, 'organization.manage')
  ) then
    raise exception 'permission denied: organization.manage required';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) < 2 then raise exception 'name too short'; end if;
  if position('@' in coalesce(p_email, '')) = 0 then raise exception 'invalid e-mail'; end if;
  update public.profiles
  set display_name = btrim(p_display_name), email_snapshot = lower(btrim(p_email))
  where id = p_profile_id;
  if not found then raise exception 'profile not found'; end if;
end;
$$;

create or replace function public.update_my_name(p_display_name text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.profiles
  set display_name = btrim(p_display_name)
  where auth_user_id = auth.uid() and char_length(btrim(coalesce(p_display_name, ''))) >= 2;
$$;

revoke all on function public.update_person_identity(uuid, text, text) from public, anon;
revoke all on function public.update_my_name(text) from public, anon;
grant execute on function public.update_person_identity(uuid, text, text) to authenticated;
grant execute on function public.update_my_name(text) to authenticated;
