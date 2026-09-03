-- Per-person access signals.
--
-- When someone's organizational assignments, restaurant coverage or explicit
-- grants change, the screens they have open must re-authorize. Realtime stops
-- delivering meeting signals to a person who lost access, so a private
-- channel `profile:<profile id>` (joinable only by that person) carries an
-- "access changed" signal with no payload; the browser then re-renders through
-- the normal authorized path.

create or replace function private.can_join_profile_channel(p_topic text)
returns boolean
language sql
stable
security definer
set search_path = ''
set row_security = off
as $$
  select p_topic = 'profile:' || coalesce(private.current_profile_id()::text, '')
$$;
grant execute on function private.can_join_profile_channel(text) to authenticated;

drop policy if exists "profile channel read" on realtime.messages;
create policy "profile channel read" on realtime.messages
  for select to authenticated
  using (private.can_join_profile_channel(realtime.topic()));

create or replace function private.profile_access_broadcast(p_profile_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_profile_id is null then return; end if;
  perform realtime.send(
    jsonb_build_object('area', 'access', 'at', extract(epoch from clock_timestamp())),
    'changed',
    'profile:' || p_profile_id::text,
    true
  );
exception when others then
  raise warning 'profile broadcast skipped: %', sqlerrm;
end;
$$;

create or replace function private.assignment_access_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.profile_access_broadcast(coalesce(new.profile_id, old.profile_id));
  return null;
end;
$$;

create or replace function private.restaurant_assignment_access_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_profile uuid;
begin
  select oa.profile_id into owner_profile
  from public.organizational_assignments oa
  where oa.id = coalesce(new.organizational_assignment_id, old.organizational_assignment_id);
  perform private.profile_access_broadcast(owner_profile);
  return null;
end;
$$;

create or replace function private.grant_access_broadcast()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.profile_access_broadcast(coalesce(new.grantee_profile_id, old.grantee_profile_id));
  return null;
end;
$$;

create trigger organizational_assignments_access_broadcast
  after insert or update or delete on public.organizational_assignments
  for each row execute function private.assignment_access_broadcast();
create trigger restaurant_assignments_access_broadcast
  after insert or update or delete on public.restaurant_assignments
  for each row execute function private.restaurant_assignment_access_broadcast();
create trigger explicit_access_grants_access_broadcast
  after insert or update or delete on public.explicit_access_grants
  for each row execute function private.grant_access_broadcast();
