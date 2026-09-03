-- RESTRICTED: the creator keeps access to what they created.
--
-- Approved rule (2026-09-03): "O creator de um objecto RESTRICTED mantém
-- acesso ao objecto que criou. Não criar explicit grant silencioso. Integrar
-- esta condição na regra determinística central de autorização."
--
-- The creator still needs the functional permission (task.update, pdca.read…)
-- through a current organizational assignment that covers the object; only the
-- extra `security.restricted.read` requirement is waived for them. PRIVATE is
-- unchanged: creator (read) + explicit grants. Nothing is written: no grant,
-- no membership, so revoking the creator's assignment revokes this access too.

create or replace function private.can_access_security_object(
  p_profile_id uuid,
  p_target_object_id uuid,
  p_requested_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  object_row public.security_objects;
  require_full boolean;
begin
  if p_profile_id is null or not exists (
    select 1 from public.profiles where id = p_profile_id and is_active
  ) then return false; end if;

  select * into object_row from public.security_objects
  where id = p_target_object_id and archived_at is null;
  if not found then return false; end if;

  if private.has_explicit_grant(p_profile_id, p_target_object_id, p_requested_permission) then
    return true;
  end if;

  if object_row.visibility = 'PRIVATE' then
    return object_row.created_by_profile_id = p_profile_id and p_requested_permission like '%.read';
  end if;

  require_full := private.permission_requires_full_coverage(p_requested_permission);

  return exists (
    select 1
    from public.organizational_assignments oa
    where oa.profile_id = p_profile_id
      and oa.company_id = object_row.company_id
      and private.assignment_is_current(oa)
      and private.assignment_has_permission(oa.id, p_requested_permission)
      and private.assignment_covers_object(oa.id, p_target_object_id, require_full)
      and (
        object_row.visibility = 'NORMAL'
        or (
          object_row.visibility = 'RESTRICTED'
          and (
            object_row.created_by_profile_id = p_profile_id
            or private.assignment_has_permission(oa.id, 'security.restricted.read')
          )
        )
      )
  );
end;
$$;

grant execute on function private.can_access_security_object(uuid, uuid, text) to authenticated;
