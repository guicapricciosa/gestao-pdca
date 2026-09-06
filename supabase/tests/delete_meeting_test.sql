begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
create temporary table t as
select public.create_meeting_session(
  '10000000-0000-0000-0000-000000000001', 'Reunião a apagar', now() + interval '2 days', now() + interval '2 days 1 hour',
  '21000000-0000-0000-0000-000000000001', null, 'NORMAL', array['30000000-0000-0000-0000-000000000001']::uuid[], array['40000000-0000-0000-0000-000000000001']::uuid[]
) as id;
select public.add_meeting_agenda_item((select id from t), 'Tema com decisão');
select public.add_meeting_participant((select id from t), '21000000-0000-0000-0000-000000000017');

select extensions.throws_ok(
  format($$select public.delete_meeting_session(%L, 1, 'x')$$, (select id from t)),
  'a reason is required', 'a reason is required');
select extensions.throws_ok(
  format($$select public.delete_meeting_session(%L, 99, 'marcada por engano')$$, (select id from t)),
  'optimistic concurrency conflict', 'stale versions are refused');
reset role;

-- A participant who is neither chair nor creator cannot delete it.
select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
set local role authenticated;
select extensions.throws_ok(
  format($$select public.delete_meeting_session(%L, (select version from public.meeting_sessions where id = %L), 'não é minha')$$, (select id from t), (select id from t)),
  'only the chair or the person who scheduled the meeting can delete it', 'a participant who is neither chair nor creator cannot delete');
reset role;

select set_config('request.jwt.claims', '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select extensions.lives_ok(
  format($$select public.delete_meeting_session(%L, (select version from public.meeting_sessions where id = %L), 'marcada por engano')$$, (select id from t), (select id from t)),
  'the creator deletes the meeting with a reason');
select extensions.is((select count(*)::integer from public.meeting_sessions where id = (select id from t)), 0, 'a deleted meeting is invisible to reads');
select extensions.is((select count(*)::integer from public.my_meetings() where meeting_session_id = (select id from t)), 0, 'and gone from My Work');
select extensions.throws_ok(
  format($$select public.delete_meeting_session(%L, 3, 'outra vez')$$, (select id from t)),
  'meeting not found or access denied', 'cannot delete twice');
reset role;

select extensions.ok(
  (select before_data #> '{agenda,0,title}' = to_jsonb('Tema com decisão'::text)
     and jsonb_array_length(before_data -> 'participants') >= 1
   from public.audit_events where action = 'meeting.deleted' and subject_id = (select id from t)),
  'the audit trail keeps the full snapshot (agenda, participants)'
);

select * from finish();
rollback;
