begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

-- The CEO creates a Restaurant A meeting; manager B (0018) is scoped to
-- Restaurant B only, so this meeting is invisible to them.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
create temporary table fixture as
select public.create_meeting_session(
  '10000000-0000-0000-0000-000000000001', 'Realtime · reunião de teste',
  now(), now() + interval '1 hour', '21000000-0000-0000-0000-000000000001', null,
  'NORMAL', array['30000000-0000-0000-0000-000000000007']::uuid[],
  array['40000000-0000-0000-0000-000000000001']::uuid[]
) as id;

select extensions.ok((select count(*) from fixture) = 1, 'fixture: one Restaurant A meeting exists');

select extensions.is(private.meeting_channel_session_id('meeting:' || (select id::text from fixture)), (select id from fixture), 'topic parses to the session id');
select extensions.is(private.meeting_channel_session_id('meeting:not-a-uuid'), null, 'malformed topic yields no session');
select extensions.is(private.meeting_channel_session_id('tasks:' || (select id::text from fixture)), null, 'other topic prefixes are never meeting channels');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select extensions.ok(private.can_join_meeting_channel('meeting:' || (select id::text from fixture)), 'CEO can join the meeting channel');
select extensions.ok(not private.can_join_meeting_channel('meeting:00000000-0000-0000-0000-000000000000'), 'unknown meeting cannot be joined');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000018', true);
select extensions.ok(not private.can_join_meeting_channel('meeting:' || (select id::text from fixture)), 'manager B (Restaurant B only) cannot join a Restaurant A meeting channel');

-- Triggers emit signals without content.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select public.add_meeting_agenda_item((select id from fixture), 'Realtime · tema sensível de teste');
select extensions.ok(
  exists (
    select 1 from realtime.messages
    where topic = 'meeting:' || (select id::text from fixture)
      and event = 'changed'
      and payload->>'area' = 'agenda'
  ),
  'adding an agenda item broadcasts an agenda signal on the meeting channel'
);
select extensions.ok(
  not exists (
    select 1 from realtime.messages
    where topic = 'meeting:' || (select id::text from fixture)
      and payload::text ilike '%sensível%'
  ),
  'signals carry no titles or content'
);

-- Per-person access channel.
select extensions.ok(private.can_join_profile_channel('profile:21000000-0000-0000-0000-000000000001'), 'a person can join their own access channel');
select extensions.ok(not private.can_join_profile_channel('profile:21000000-0000-0000-0000-000000000017'), 'nobody can join another person''s access channel');
update public.organizational_assignments set valid_to = current_date - 1 where id = '70000000-0000-0000-0000-000000000017';
select extensions.ok(
  exists (select 1 from realtime.messages where topic = 'profile:21000000-0000-0000-0000-000000000017' and payload->>'area' = 'access'),
  'expiring an assignment signals that person''s access channel'
);

select * from extensions.finish();
rollback;
