# Notifications

_Gate C (Notification Center) and Gate D (Web Push) of "Realtime Meetings + PWA +
Notifications", 2026-09-03._

## Pipeline

```
DOMAIN EVENT (audit_events, same transaction as the command)
  → outbox_events                       trigger private.audit_to_outbox
  → public.process_outbox()             dispatcher (pg_cron or job route)
  → private.notify_from_event()         event → recipients, authorized now
  → notifications                       in-app inbox, live badge
  → (Gate D) notification_deliveries    push per device
```

- **Outbox payload** carries references only (`audit_event_id`, `subject_type`,
  `subject_id`, `actor_profile_id`, before/after as recorded by the audit). The
  processor reads the _current_ state of the object when it builds the
  notification.
- **Idempotency:** one outbox row per audit event (`idempotency_key =
audit:<id>`); notifications coalesce on `(recipient, dedupe_key)` while
  unread, so five changes in thirty seconds are one entry.
- **Retries:** a failing event records `attempt_count` and `last_error`, is
  retried with exponential backoff (1, 2, 4, 8 min) and parked after 5
  attempts (`available_at = infinity`) for inspection. Reprocessing never
  duplicates.
- **Observability:** `outbox_events.processed_at / attempt_count / last_error`,
  `notifications.source_event_id / created_at / read_at`, and in Gate D
  `notification_deliveries` per attempt. No payload bodies are stored for
  debugging; ids are enough to reconstruct from the audit trail.

## Dispatcher

The minimum that works everywhere:

1. **Inside the database (default).** When `pg_cron` is available the
   migration schedules `process_outbox(200)` every minute,
   `generate_meeting_reminders(30)` every 5 minutes and
   `generate_deadline_notifications()` daily at 07:00 UTC. Supabase hosted and
   the local CLI both provide `pg_cron`.
2. **External scheduler (optional).** `GET|POST /api/jobs/process` runs the
   same three functions with the service role. It is enabled only when
   `CRON_SECRET` is set and requires `Authorization: Bearer <secret>`. Vercel
   Cron or any scheduler can call it; calls are idempotent.

No separate service, queue or worker process is introduced.

## Authorization — when decisions are taken

| Moment                | Decision                                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Event                 | The domain command already authorized the actor and recorded the audit row.                                                            |
| Notification creation | Recipient must read the object _now_ via the central rule; disabled categories are skipped; the actor never notifies themself.         |
| Deep link opened      | The target page authorizes again. A notification never grants access; if access was lost the page shows the neutral not-found message. |
| Push (Gate D)         | Preference + subscription checks; payload policy by visibility; the app re-authenticates and re-authorizes on tap.                     |

Old notifications are not deleted when access is lost; they are inert links.

## Events → notifications

| Event (audit action)                                                             | Recipients (never the actor)                   | Type                                                                       | Category              |
| -------------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------- | --------------------- |
| `task.status.changed` DRAFT → active                                             | Responsável, Owner                             | `task.assigned`, `task.owner_assigned`                                     | tasks                 |
| `task.responsible.changed` / `task.owner.changed` (non-draft)                    | new Responsável / Owner                        | same                                                                       | tasks                 |
| `task.due_date.changed`, `task.blocker.added`, `task.completed`, `task.reopened` | Responsável and/or Owner                       | `task.due_date_changed`, `task.blocked`, `task.completed`, `task.reopened` | tasks                 |
| PDCA equivalents + `pdca.phase.changed`                                          | Responsável / Owner                            | `pdca.*`                                                                   | pdcas                 |
| `meeting.participant.added`                                                      | the participant                                | `meeting.invited`                                                          | meeting_participation |
| `meeting.schedule.changed`, `meeting.in_progress`, `meeting.cancelled`           | participants + Chair                           | `meeting.rescheduled`, `meeting.started`, `meeting.cancelled`              | meeting_changes       |
| `meeting.review`                                                                 | Chair                                          | `meeting.awaiting_validation`                                              | meeting_changes       |
| `comment.created`                                                                | mentioned people (`@Nome`), Responsável, Owner | `mention`, `comment`                                                       | collaboration         |
| scheduled: 30 min before a meeting                                               | participants + Chair                           | `meeting.reminder`                                                         | meeting_reminders     |
| scheduled: due tomorrow / in 2 days (preference), overdue (weekly)               | Responsável, Owner                             | `*.due_soon`, `*.overdue`                                                  | deadlines             |

Actions created inside a meeting stay drafts until **Terminar e distribuir**;
the activation performed there is what notifies the responsible people, so
nobody is told about a draft.

Not notified: description edits, autosaves, lifecycle transitions with no
accountability change, anything the person did themself.

## Model

- `notifications` — recipient, type, category, title, minimal `metadata`
  (`due_date`, `scheduled_start_at`, `phase`, `actor`), target kind/id, `href`
  (relative, re-authorized on open), `sensitive` (object not NORMAL),
  `dedupe_key`, `source_event_id`, `created_at`, `read_at`.
- `notification_preferences` — six category switches, `deadline_days`
  (0/1/2), `push_enabled`.
- Gate D adds `push_subscriptions` and `notification_deliveries`.
- RLS: recipients read their own rows only; all writes go through
  `mark_notifications_read`, `mark_all_notifications_read`,
  `save_notification_preferences`; the processor and schedulers are
  service-role only.

## UI

- Bell in the shell with the unread count (aria-label "Notificações, N não
  lidas"); the count refreshes on the person's private channel
  (`profile:<id>`, area `notifications`) and when the tab becomes visible.
- `/notificacoes`: **Não lidas / Todas**, each entry with heading (type),
  object title, short context, time, "Abrir …" (marks read and follows the
  deep link) and "Marcar como lida"; "Marcar todas como lidas".
- `/definicoes`: preferences.

## Retention (to decide later; expected growth)

- `outbox_events`: one row per audited domain action (hundreds per day for a
  group of restaurants); processed rows older than ~30 days can be purged
  without touching `audit_events`.
- `notifications`: a few per person per day; read rows older than ~90 days can
  be purged.
- `notification_deliveries` (Gate D): one per push attempt; purge with the
  notification.
- `push_subscriptions`: cleaned when the push service reports them gone.

None of this deletes audit history.

## Tests

- `supabase/tests/notifications_test.sql` — outbox append, draft vs
  activation, actor exclusion, deep link, idempotent reprocessing, coalescing,
  recipient without access, sensitive flag, invitation, reminder once,
  preferences, mentions, poison event retry/backoff, RLS isolation, mark read.
- `e2e/notifications.spec.ts` — bell, inbox, deep links, live badge update
  after a mention, mark all, preferences, job route secret.
