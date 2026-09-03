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

## Web Push (Gate D)

```
person → grants browser permission → PushManager subscription
       → POST /api/push/subscriptions (own profile, endpoint must be https)
notification insert → notification_deliveries (one per active device, only if push_enabled)
job route → claim_push_deliveries → provider.send → complete_push_delivery
```

- **Devices.** `push_subscriptions` is per endpoint; re-registering an endpoint
  moves it to the person registering now (shared devices), revoking is by the
  owner (Definições → Remover / Desactivar neste dispositivo) or automatically
  when the push service answers 404/410 (`revoked_reason = 'gone'`).
- **Provider abstraction.** `PushProvider` (`src/modules/notifications/application/push.ts`)
  with `webpush` (VAPID keys from `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`,
  `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`), `fake` (tests; deterministic by
  endpoint and logged to `PUSH_LOG_FILE`) and `disabled` (deliveries are
  recorded as skipped).
- **Retries.** Transient failures (429/5xx/network) retry at 1, 2 and 4
  minutes, at most 3 attempts; rejections fail once; gone endpoints revoke the
  device. A notification already read in the app is skipped.
- **Payload policy.** NORMAL: heading + object title + short context (e.g.
  "Nova tarefa atribuída — Rever proposta · Prazo: 10/09/2026"). RESTRICTED
  and PRIVATE: always "Assunto reservado — Tem uma nova actualização num
  assunto reservado." The deep link is relative; the app authenticates and
  authorizes on tap, so a push is never a capability.
- **Where it runs.** Sending needs Node, so it happens in the job route
  (`/api/jobs/process`, `CRON_SECRET`), called by Vercel Cron or any
  scheduler; `pg_cron` can also trigger it with `pg_net` if the host prefers a
  single scheduler. In-app notifications never depend on it.
- **Multiple devices.** Every active device of the recipient gets its own
  delivery row and outcome; Definições lists them.

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
- `supabase/tests/web_push_test.sql` — device registration/update, RLS,
  queueing per device, single claim, sent/gone/retry outcomes, preference off,
  user revocation, browser cannot claim.
- `e2e/push.spec.ts` (fake provider) — API registration and validation,
  isolation between people, delivery with title for NORMAL, gone-device
  cleanup, generic payload for RESTRICTED, push preference off, wrong secret.
