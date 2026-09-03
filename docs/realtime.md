# Realtime in Meeting Mode

_Decided and implemented 2026-09-03 (Gate A of "Realtime Meetings + PWA + Notifications")._

## Goal

Everyone in the same meeting sees the current state without refreshing, each
person strictly within their own permissions. No shared editing, no CRDT.

## Design

**Signals, not data.** The database emits a Broadcast message on the private
channel `meeting:<session id>` whenever something relevant changes:

| Table                                                                | Signal `area`  |
| -------------------------------------------------------------------- | -------------- |
| `meeting_sessions` (update)                                          | `session`      |
| `meeting_agenda_items` (insert/update)                               | `agenda`       |
| `meeting_notes` (insert/update)                                      | `notes`        |
| `meeting_object_links` (insert/update)                               | `links`        |
| `meeting_participants` (insert/update)                               | `participants` |
| `tasks` / `pdcas` / `decisions` linked to an active meeting (update) | `links`        |

The payload is `{ area, at }` — no ids, titles or content
(`private.meeting_broadcast`, migration `202609030013_realtime_meetings.sql`).
On a signal the browser (`src/ui/components/meeting-live.tsx`) asks Next.js to
re-render the page (`router.refresh()`, debounced 250 ms). Every byte a person
sees still comes from their own authorized server render through RLS and the
central authorization rule, so Realtime cannot reveal more than a normal query.
Own actions already re-render through the Server Action redirect.

**Channel authorization.** Joining `meeting:<id>` is decided by RLS on
`realtime.messages` with `private.can_join_meeting_channel(topic)`, which
requires `meeting.read` on the session through `can_access_security_object` —
the same rule as opening the meeting. Presence writes need the same check.
Topics that do not match `meeting:<uuid>` are never joinable.

**Presence.** The same channel tracks `{ profileId, name }` (display name only)
and shows "Na reunião · A · B". Nothing else is exchanged.

**Reconnect.** On `SUBSCRIBED` after a previous connection, on the browser's
`online` event and when the tab becomes visible again, the page re-renders so
the state converges with the database. While the live link is down a quiet
notice is shown and a slow catch-up refresh (30 s) runs; there is no polling
while the channel is healthy.

**Scope loss during a meeting.** Realtime stops delivering meeting signals to
someone who lost `meeting.read`, so a second private channel
`profile:<profile id>` (joinable only by that person, migration
`202609030014_profile_access_signals.sql`) carries an "access changed" signal
whenever their assignments, restaurant coverage or explicit grants change. The
browser re-renders through the authorized path and the page becomes
"Não tens acesso a este conteúdo"; any later navigation is denied.

**Notes.** Notes keep autosave + optimistic concurrency + versioning. When a
newer version arrives while the author is typing on another device, the editor
shows "Versão mais recente — rever" with the newer text below and two explicit
choices (use the newer version / keep my text). A save with a stale version is
rejected by the database as a conflict and the typed text stays on screen. No
automatic merge.

**Direct links.** "Copiar ligação" copies `/meetings/<id>/run`. The link only
navigates: unauthenticated users go through `/login?next=…` (same-origin paths
only, see `src/app/login/next-path.ts`) and the page is then authorized as
usual. Unauthorized users see a neutral message without title or participants.

## What is deliberately not done

- No `postgres_changes` subscriptions (row payloads would need per-subscriber
  RLS evaluation and would ship data to the client).
- No client-side merging of state; no chat, cursors or typing indicators.
- No polling while the channel is connected.

## Tests

- `supabase/tests/realtime_meetings_test.sql` — topic parsing, join rule for
  an authorized and an unauthorized profile, signal emission without content.
- `e2e/realtime.spec.ts` — two browsers: deep link + login, presence, task /
  PDCA / decision / agenda / participant propagation without reload, PRIVATE
  object invisible to the other participant, reconnect convergence, scope loss,
  note staleness and stale-save conflict.
