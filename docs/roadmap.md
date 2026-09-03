# Implementation Roadmap

## Current implementation status

Foundation, Organization, Permission Engine and Security Tests are approved. The Execution Core is implemented as the current delivery gate: shared execution infrastructure, Decisions, Tasks, PDCAs, minimal permission-aware lists/details/forms and My Work. Meetings, Executive Analytics, AI and external notification channels remain unstarted and require separate approval.

## 1. Delivery principles

- Deliver vertical, testable increments rather than a single oversized Phase 1.
- Stabilize organization and permission semantics before deep execution features.
- Every increment includes schema migrations, server authorization, tests, minimal usable UI and documentation updates when implementation begins.
- Do not build AI on data paths that lack permission parity.
- Feature flags may hide incomplete modules, but cannot replace authorization.
- Each increment must be deployable to a non-production environment and leave existing functionality usable.

The roadmap below describes future implementation only; no code or migrations are part of this architectural documentation task.

## 2. Increment 0 — Engineering foundation

### Objective

Create the smallest secure application skeleton and delivery pipeline.

### Entities

No business entities beyond environment/migration metadata.

### Functionality

- Next.js/TypeScript strict project;
- Supabase local/staging setup and migration workflow;
- test runners, lint/typecheck and CI;
- server/client Supabase factories with no exposed service role;
- observability/correlation IDs and baseline security headers;
- design tokens and accessible shell only, not product pages.

### Mandatory tests

- CI executes lint, typecheck and tests;
- server-only secret cannot enter client bundle;
- unauthenticated protected test route denied;
- migration apply/rollback strategy verified in disposable DB.

### Dependencies

Approved hosting/environment strategy and Supabase projects.

### Acceptance criteria

One reproducible deployment with environment separation, no business functionality and documented local setup.

## 3. Increment 1 — Identity and company boundary

### Objective

Authenticate invited users and establish hard company isolation.

### Entities

`companies`, `profiles`, minimal `audit_events`.

### Functionality

- Supabase Auth invitation/login/logout/session;
- profile activation/deactivation;
- company membership foundation;
- protected server read and minimal admin bootstrap procedure;
- RLS enabled from first protected table.

### Mandatory tests

- unauthenticated denial;
- deactivated profile denial with valid session;
- cross-company read/write denial;
- service-role not used in normal browser/server user path;
- profile/admin changes audited.

### Dependencies

Increment 0; bootstrap administrator process decision.

### Acceptance criteria

An invited active user can sign in and see only a minimal authorized company context; all other access is denied.

## 4. Increment 2 — Organization configuration

### Objective

Represent companies, departments, shared services, restaurants and temporal assignments without hardcoding current names.

### Entities

`organizational_units`, `departments`, `shared_services`, `restaurants`, `roles`, `permissions`, `role_permissions`, `organizational_assignments`, `restaurant_assignments`.

### Functionality

- restricted administration of organization records;
- activation/deactivation and validity periods;
- basic role/permission catalog;
- assignment validation and audit history;
- seeded data only as configurable records.

### Mandatory tests

- subtype/company consistency;
- multiple assignments per user;
- overlapping/expired assignments;
- restaurant assignment company constraint;
- deactivated entities excluded from new assignments;
- no name-based authorization behavior.

### Dependencies

Increment 1; confirmation of organizational-unit supertype decision.

### Acceptance criteria

The current organization can be configured and changed without code, with complete audit attribution.

## 5. Increment 3 — Hierarchy and effective scope explorer

### Objective

Resolve direct and inherited organizational/restaurant scope deterministically before protecting execution data.

### Entities

`hierarchy_relationships`; optional derived closure after performance measurement.

### Functionality

- temporal hierarchy edge management;
- cycle prevention;
- effective-scope service returning permission paths;
- admin-only scope preview/explanation (“why access would apply”);
- cache invalidation/versioning.

### Mandatory tests

- global executive configuration;
- support department across all restaurants;
- DOL director/subdirector/supervisor/manager inheritance;
- kitchen branch behavior;
- shared service across covered restaurants;
- optional hierarchy levels;
- cycles, expiry and path-mixing denial.

### Dependencies

Increment 2.

### Acceptance criteria

Fixtures reproduce required organizational access scopes with explainable paths and no protected business objects yet.

## 6. Increment 4 — Securable objects and permission engine

### Objective

Prove the complete authorization model on a small neutral test resource before Tasks/PDCAs.

### Entities

`security_objects`, scope joins, `explicit_access_grants`, status/configuration foundations, expanded audit.

### Functionality

- `getAccessibleScope`, `can`, `filterAccessibleObjects`;
- NORMAL/RESTRICTED/PRIVATE;
- explicit grant/revoke flow;
- full-scope validation for writes;
- hybrid RLS/application enforcement;
- authorization explanation available only to authorized admins.

### Mandatory tests

All mandatory cases from `CONTEXT.md`, plus expired grant, visibility change, scope mutation, pagination/count leaks, direct PostgREST/RLS path and cache invalidation.

### Dependencies

Increment 3; human decisions on private admin access, read intersection/full coverage and grant delegation.

### Acceptance criteria

Application and SQL/RLS suites agree on the full decision matrix. No execution module begins until this gate passes.

## 7. Increment 5 — Task vertical slice

### Objective

Deliver one complete execution object to validate lifecycle, scope, accountability and history.

### Entities

`tasks`, `object_memberships`, `status_transitions`, `due_date_changes`, `completion_events`, `reopening_events`, minimal `comments`, `audit_events`.

### Functionality

- create/list/detail/update authorized Tasks;
- Owner/Responsible/Collaborator/Watcher semantics;
- lifecycle, deadlines, completion and reopening;
- personal “My Tasks” view;
- restricted/private handling.

### Mandatory tests

- server/RLS permission matrix for every action;
- assignee does not gain implicit access;
- full-scope writes;
- transition invariants and concurrency;
- deadline/completion history;
- personal list/search-ready filtering without leakage.

### Dependencies

Increment 4.

### Acceptance criteria

An authorized user can execute a Task end-to-end with reliable history; unauthorized actors cannot infer it.

## 8. Increment 6 — Blockers, dependencies, files and notifications

### Objective

Add operational follow-up capabilities around the Task slice.

### Entities

`blockers`, `execution_dependencies`, `attachments`, `notifications`, `notification_preferences`, `outbox_events`.

### Functionality

- block/unblock and dependency resolution;
- private attachment upload/download with quarantine/scan policy;
- in-app assignment/deadline/block notifications;
- transactional outbox;
- authorized activity feed.

### Mandatory tests

- dependency cycles and overlapping blockers;
- signed URL/access revocation;
- quarantined file denial;
- notification content after access loss;
- outbox idempotency and retry;
- comment/file child authorization.

### Dependencies

Increment 5; malware-scanning launch decision.

### Acceptance criteria

Task execution supports evidence and impediments safely; delivery failures never roll back business state.

## 9. Increment 7 — PDCA vertical slice

### Objective

Deliver structured PDCA lifecycle and child Tasks without collapsing the domains.

### Entities

`pdcas`, `pdca_kpis`, PDCA history/relations, existing Task relation.

### Functionality

- progressive Plan/Do/Check/Act;
- KPI/expected/actual result;
- Owner approval option;
- child Task creation/linking;
- completion/reopening;
- personal PDCA views.

### Mandatory tests

All invariants in `pdca.md`, permission parity, child-scope compatibility, closure/evidence approval and reopened-cycle metrics facts.

### Dependencies

Increments 5–6; KPI and multi-Responsible decisions.

### Acceptance criteria

A PDCA moves from incomplete Draft through evidenced closure while retaining phase, task, deadline, assignee and reopening history.

## 10. Increment 8 — Meetings and Decisions, preparation slice

### Objective

Create shared scheduled/ad-hoc meetings, agenda, participants and durable Decisions without live Meeting Mode complexity.

### Entities

`meeting_series`, `meeting_sessions`, `meeting_participants`, `meeting_agenda_items`, `meeting_notes`, `decisions`, `meeting_subject_links`, `meeting_types`.

### Functionality

- series/session creation;
- participant/Chair policy;
- agenda preparation and notes;
- link existing authorized Task/PDCA;
- record Draft Decision;
- prior-pending read model.

### Mandatory tests

- participant grant boundaries;
- meeting versus linked-object permission separation;
- recurrence generation idempotency;
- same object in multiple sessions;
- inaccessible pending items/counts hidden;
- Restricted/Private meetings.

### Dependencies

Increment 7.

### Acceptance criteria

A session can be prepared collaboratively and safely link existing work without duplicating or leaking it.

## 11. Increment 9 — Meeting Mode and publish workflow

### Objective

Turn live discussion into reviewed Decisions, Tasks and PDCAs.

### Entities

Existing meeting/execution tables plus publication/proposal version facts as required.

### Functionality

- start/in-progress/review/publish/close/reopen;
- participant proposals;
- per-item validation/merge/reject;
- scope/assignee/access remediation;
- publication version and post-meeting notifications;
- restrained live refresh/presence.

### Mandatory tests

Full exceptional scenarios in `meetings.md`, concurrent changes, partial publication, idempotent publish and authorization recheck.

### Dependencies

Increment 8; real-time collaboration and former-participant retention decisions.

### Acceptance criteria

A meeting produces reviewed, independently authorized execution records and can be reopened without rewriting prior outcomes.

## 12. Increment 10 — Projects, search and operational dashboards

### Objective

Organize execution and make authorized work discoverable.

### Entities

`projects`, search/read projections; no new global generic relationship unless concrete needs prove it.

### Functionality

- Project ownership/scope and related records;
- permission-aware global search;
- My Work, restaurant, department/service and DOL operational dashboards;
- filters and keyset pagination;
- saved views may follow as a separate increment.

### Mandatory tests

- search/list/detail authorization parity;
- no snippet/count leakage;
- dashboard drill-down totals match accessible records;
- cross-scope distinct/attributed behavior;
- project links do not expand access.

### Dependencies

Increments 5–9.

### Acceptance criteria

Each business profile sees a coherent operational view matching exact authorized source lists.

## 13. Increment 11 — Deterministic analytics and exports

### Objective

Deliver precisely defined management indicators before AI interpretation.

### Entities

Existing event/history tables; ordinary views, and materialized views only if measured.

### Functionality

- core metrics in `analytics.md`;
- executive dashboard and drill-down;
- authorized CSV/export job with short-lived download;
- freshness/formula metadata;
- period and dimension comparison.

### Mandatory tests

Metric edge cases, timezone boundaries, reopened cycles, blocked overlap, due-date snapshots, permission parity and export revocation/leak tests.

### Dependencies

Stable execution history; reporting timezone decision.

### Acceptance criteria

Every KPI is reproducible, documented and traceable to authorized records; exports contain exactly the same authorized population.

## 14. Increment 12 — AI foundations and Meeting Assistant pilot

### Objective

Introduce optional AI with a narrow proposal-only use case.

### Entities

`ai_runs`, `ai_run_sources`, `ai_proposals`.

### Functionality

- provider-neutral gateway;
- authorized context builder;
- structured Task/Decision/PDCA proposals from selected meeting text;
- provenance/citations;
- human review and re-authorized confirmation;
- budgets, timeout and manual fallback.

### Mandatory tests

AI security and failure cases in `ai.md`, prompt injection, access revocation, invalid structured output and idempotent confirmation.

### Dependencies

Meeting publish workflow, security/legal provider decision.

### Acceptance criteria

AI can reduce transcription/admin effort but cannot read or change anything beyond the human actor's validated authority.

## 15. Increment 13 — Execution Validator and Management Intelligence

### Objective

Add AI interpretation only after deterministic validators and analytics are trusted.

### Entities

Existing AI provenance plus optional validated findings table if findings need workflow/history.

### Functionality

- deterministic missing-field/stale validators;
- AI qualitative suggestions;
- Management Assistant using structured analytics tools;
- Executive Brief pilot;
- scheduled delivery only after recipient-scope job design.

### Mandatory tests

- deterministic/AI claim distinction;
- cited metrics only;
- hidden populations absent;
- scheduled recipient access recheck;
- provider failure/manual dashboard availability.

### Dependencies

Increment 11–12.

### Acceptance criteria

Management narratives are explainable, sourced, permission-safe and never required to operate the platform.

## 16. Later increments

- saved views and advanced notification channels;
- recurring Task templates;
- semantic search over authorized partitions;
- advanced workload/pattern analysis;
- external integrations through adapters/outbox;
- mobile/push optimization;
- measured performance work, archival and data-retention automation.

Each requires its own threat-model and authorization review.

## 17. Release gates across all increments

An increment is done only when:

- business invariants and permission rules are documented and implemented;
- migrations and rollback/forward strategy exist;
- strict types, validation and errors are complete;
- application and RLS negative tests pass;
- audit behavior is verified;
- accessibility and responsive behavior are reviewed;
- search/export/analytics/AI implications are explicitly handled or absent;
- docs match the implementation;
- lint, typecheck, unit, integration and relevant end-to-end tests pass.

## 18. Open Architectural Decisions

The cross-cutting human decisions that should be resolved before the corresponding implementation gate are:

| Question                                            | Recommended option                                                                         | Alternatives                         | Impact / decision point     |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------- |
| AI provider/data residency and transcript retention | Security/legal-approved provider-neutral policy with explicit transcript consent/retention | Fixed provider and default retention | Resolve before Increment 12 |

The previously open MVP authorization and collaboration decisions are now closed: PRIVATE is creator/grants only; multi-scope reads use valid intersection while writes require full coverage; grants require an independent scoped permission; participants retain no access by participation alone; collaboration uses optimistic concurrency; attachments use private Storage and short-lived signed URLs; no dual approval, CRDT, dedicated worker or active break-glass is included in the MVP.

## 19. Completed implementation gate — Increments 11–16

Execution Core hardening and Meetings are implemented and validated as one release gate:

- Increment 11: authenticated Playwright foundation; complete private attachment upload/download; due-date history UI; full-scope optimistic updates; Collaborator/Watcher add/remove with prior-access validation.
- Increment 12: protected Meeting Series and Session aggregates; temporal participants; structured agenda; versioned notes.
- Increment 13: independently authorized typed links and atomic reuse of normal Decision/Task/PDCA commands.
- Increment 14: deterministic Review/Publish/Close, immutable publication snapshots and reasoned reopening.
- Increment 15: operational Meeting Mode, review table, quick actions, previous follow-up and carry-forward controls.
- Increment 16: Upcoming/Needs Review/Follow-up additions to My Work, without Executive Analytics.

The next gate remains explicitly blocked pending human approval. No AI, Executive Analytics, semantic search, Calendar, email, Teams, WhatsApp or other external notification integration is part of this implementation.

## 20. Completed implementation gate — AI Foundation, Meeting Assistant, Meeting Summary and Execution Validator

- provider-neutral gateway with `disabled`, `fake` and `openai` providers; application remains fully usable with AI disabled;
- `ai_runs`, `ai_run_sources`, `ai_proposals` with target-bound read policies and command-only writes;
- Meeting Assistant proposals (Decision/Task/PDCA) and Meeting Summary, reviewed and confirmed through the normal domain commands;
- deterministic Execution Validator on detail pages and My Work, with optional AI findings;
- unit, pgTAP and end-to-end coverage for authorization, staleness, idempotent confirmation and provider failure.

Still excluded and blocked pending approval: Executive Analytics, global Management Chat, automatic Executive Brief, Teams, WhatsApp, email, Calendar, semantic search and autonomous actions.

## 2026-09-03 — Simplification delivered

- Full PT-PT labels layer (`src/ui/labels.ts`), codes never shown.
- Navigation: O meu trabalho / Reuniões / PDCAs / Tarefas / Decisões.
- Meeting Mode as one screen with Abrir reunião, notes with autosave, quick creation of Tarefa/PDCA/Decisão in side sheets and _Terminar e distribuir_ as a single transaction (`finish_meeting`).
- Task rule relaxed to Responsável only; PDCA to Owner + Responsável + problema + objectivo; due dates are warnings.
- RESTRICTED creator rule integrated in the central authorization function.
- Pending: user manual screenshots refresh on every UI change; Analytics and further AI work explicitly out of scope.

## 2026-09-03 — Realtime Meetings + PWA (Gates A and B)

- Private meeting channels with content-free signals, presence, reconnect convergence, per-person access signals, direct links with safe `?next=`.
- Installable PWA with shell-only caching, offline page, quiet update and install guidance per platform; branding from environment.
- Next: Notification Center on the transactional outbox (Gate C), Web Push (Gate D), polish and manual (Gate E).

## 2026-09-03 — Notification Center (Gate C)

- Audit events feed the transactional outbox; `process_outbox` (pg_cron or the secured job route) creates authorized, coalesced in-app notifications; reminders and deadlines are scheduled.
- Bell with live unread count, inbox with Não lidas/Todas and deep links, preferences in Definições.
