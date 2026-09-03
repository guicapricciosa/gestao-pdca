begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

-- Actors: CEO (0001) creates and assigns; manager A (0017) is the recipient;
-- manager B (0018) has no access to Restaurant A objects.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

create temporary table fx as
select public.create_task(
  '10000000-0000-0000-0000-000000000001', 'Notificações · tarefa atribuída', null, 'MEDIUM',
  null, '21000000-0000-0000-0000-000000000017', null, '2026-12-01', null, null, 'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[], array['40000000-0000-0000-0000-000000000001']::uuid[]
) as task_id;

-- 1. The domain event reached the outbox in the same transaction.
select extensions.ok(
  exists (select 1 from public.outbox_events o join public.audit_events a on o.idempotency_key = 'audit:' || a.id::text
          where a.action = 'task.created' and a.subject_id = (select task_id from fx)),
  'task.created is appended to the outbox');
select extensions.ok(
  not exists (select 1 from public.outbox_events where payload ? 'body'),
  'outbox payloads carry references, not free text bodies');

-- 2. A draft assignment does not notify yet; activation does.
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and target_id = (select task_id from fx)), 0,
  'no notification while the task is still a draft');
select public.transition_task((select task_id from fx), 1, 'OPEN', null, null);
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and type = 'task.assigned' and target_id = (select task_id from fx)), 1,
  'activating a task notifies its Responsável');
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000001' and target_id = (select task_id from fx)), 0,
  'the actor is never notified about their own action');
select extensions.is((select href from public.notifications where type = 'task.assigned' and target_id = (select task_id from fx)), '/tasks/' || (select task_id::text from fx),
  'the notification deep-links to the task');
select extensions.ok((select not sensitive from public.notifications where type = 'task.assigned' and target_id = (select task_id from fx)), 'NORMAL objects are not flagged sensitive');

-- 3. Idempotent: reprocessing creates nothing new.
update public.outbox_events set processed_at = null where processed_at is not null;
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where type = 'task.assigned' and target_id = (select task_id from fx)), 1,
  'reprocessing the same events does not duplicate notifications');
select extensions.ok(not exists (select 1 from public.outbox_events where processed_at is null and available_at <= now()), 'all events are marked processed');

-- 4. Coalescing: repeated changes about one task stay one unread notification.
select public.change_task_due_date((select task_id from fx), 2, '2026-12-05', 'primeiro ajuste');
select public.change_task_due_date((select task_id from fx), 3, '2026-12-06', 'segundo ajuste');
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and dedupe_key = 'task.changed:' || (select task_id::text from fx) and read_at is null), 1,
  'consecutive changes coalesce into one unread notification');

-- 5. Recipient who lost access gets nothing (assignment expired between creation and activation).
create temporary table fx2 as
select public.create_task(
  '10000000-0000-0000-0000-000000000001', 'Notificações · sem acesso', null, 'MEDIUM',
  null, '21000000-0000-0000-0000-000000000018', null, null, null, null, 'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[], array['40000000-0000-0000-0000-000000000002']::uuid[]
) as task_id;
update public.organizational_assignments set valid_to = current_date - 1 where profile_id = '21000000-0000-0000-0000-000000000018';
select public.transition_task((select task_id from fx2), 1, 'OPEN', null, null);
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000018' and target_id = (select task_id from fx2)), 0,
  'no notification is created for a recipient who cannot read the object any more');

-- 6. Sensitive flag for RESTRICTED objects the recipient can read.
create temporary table fx3 as
select public.create_task(
  '10000000-0000-0000-0000-000000000001', 'Notificações · restrita para o CEO', null, 'MEDIUM',
  null, '21000000-0000-0000-0000-000000000002', null, null, null, null, 'RESTRICTED',
  array['30000000-0000-0000-0000-000000000007']::uuid[], array['40000000-0000-0000-0000-000000000001']::uuid[]
) as task_id;
select public.transition_task((select task_id from fx3), 1, 'OPEN', null, null);
select * from public.process_outbox(5000);
select extensions.ok(coalesce((select sensitive from public.notifications where target_id = (select task_id from fx3) limit 1), true),
  'RESTRICTED objects produce sensitive notifications (or none)');

-- 7. Meeting participation.
create temporary table fx4 as
select public.create_meeting_session(
  '10000000-0000-0000-0000-000000000001', 'Notificações · reunião', now() + interval '20 minutes', now() + interval '80 minutes',
  '21000000-0000-0000-0000-000000000001', null, 'NORMAL',
  array['30000000-0000-0000-0000-000000000007']::uuid[], array['40000000-0000-0000-0000-000000000001']::uuid[]
) as session_id;
select public.add_meeting_participant((select session_id from fx4), '21000000-0000-0000-0000-000000000017');
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and type = 'meeting.invited' and target_id = (select session_id from fx4)), 1,
  'being added to a meeting notifies the participant');
select extensions.is((select href from public.notifications where type = 'meeting.invited' and recipient_profile_id = '21000000-0000-0000-0000-000000000017' and target_id = (select session_id from fx4)), '/meetings/' || (select session_id::text from fx4) || '/run',
  'meeting invitations deep-link into Meeting Mode');

-- 8. Reminder 30 minutes before, once.
select public.generate_meeting_reminders(30);
select public.generate_meeting_reminders(30);
select extensions.is((select count(*)::int from public.notifications where type = 'meeting.reminder' and target_id = (select session_id from fx4) and recipient_profile_id = '21000000-0000-0000-0000-000000000017'), 1,
  'a meeting reminder is created once per participant');

-- 9. Preferences silence a category.
insert into public.notification_preferences (profile_id, collaboration) values ('21000000-0000-0000-0000-000000000017', false);
select public.add_comment((select security_object_id from public.tasks where id = (select task_id from fx)), 'Comentário sem notificação');
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and category = 'collaboration' and target_id = (select task_id from fx)), 0,
  'a disabled category creates no notification');
update public.notification_preferences set collaboration = true where profile_id = '21000000-0000-0000-0000-000000000017';
select public.add_comment((select security_object_id from public.tasks where id = (select task_id from fx)), 'Olá @Restaurant Manager A, podes ver isto?');
select * from public.process_outbox(5000);
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id = '21000000-0000-0000-0000-000000000017' and type = 'mention' and target_id = (select task_id from fx)), 1,
  'a mention by display name notifies the person');

-- 10. Failure handling: a poison event is retried with backoff and parked.
insert into public.outbox_events (company_id, event_type, payload, idempotency_key)
values ('10000000-0000-0000-0000-000000000001', 'task.status.changed', '{"subject_id": "not-a-uuid"}'::jsonb, 'test:poison');
select * from public.process_outbox(5000);
select extensions.is((select attempt_count from public.outbox_events where idempotency_key = 'test:poison'), 1, 'a failing event records an attempt');
select extensions.ok((select last_error is not null and processed_at is null and available_at > now() from public.outbox_events where idempotency_key = 'test:poison'),
  'a failing event keeps its error and is scheduled for a later retry');

-- 11. Reading is private to the recipient.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000017', true);
set local role authenticated;
select extensions.ok((select count(*) from public.notifications) > 0, 'manager A sees their notifications');
select extensions.is((select count(*)::int from public.notifications where recipient_profile_id <> '21000000-0000-0000-0000-000000000017'), 0, 'RLS hides everyone else''s notifications');
select extensions.ok(public.unread_notification_count() > 0, 'unread count is available');
select extensions.ok(public.mark_all_notifications_read() > 0, 'marking all as read updates own rows');
select extensions.is(public.unread_notification_count(), 0, 'nothing unread remains');
reset role;

select * from extensions.finish();
rollback;
