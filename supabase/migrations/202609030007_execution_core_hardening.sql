create or replace function public.remove_object_member(membership_id uuid, reason text default null)
returns void language plpgsql volatile security definer set search_path = '' set row_security = off as $$
declare actor uuid := private.current_profile_id(); member_row public.object_memberships; object_row public.security_objects;
begin
  select * into member_row from public.object_memberships where id = membership_id and ended_at is null;
  select * into object_row from public.security_objects where id = member_row.security_object_id;
  if not found or not private.can_access_security_object(actor, object_row.id, lower(object_row.object_type) || '.update') then
    raise exception 'membership not found or access denied';
  end if;
  update public.object_memberships set ended_at = now(), ended_by_profile_id = actor where id = membership_id and ended_at is null;
  perform private.write_execution_audit(object_row.company_id, object_row.id, 'OBJECT_MEMBERSHIP', membership_id, 'membership.removed', actor, reason, to_jsonb(member_row), jsonb_build_object('ended_at', now()));
end $$;

revoke all on function public.remove_object_member(uuid,text) from public;
grant execute on function public.remove_object_member(uuid,text) to authenticated;
