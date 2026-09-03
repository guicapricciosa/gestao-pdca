# Tasks

## Implementation status — Execution Core

Implemented in migrations `202609030005` and `202609030006`:

- strong `tasks` table with one-to-one `security_object_id`, current Owner and Responsible pointers, lifecycle, priority, dates, metric-ready timestamps and optimistic `version`;
- immutable `task_status_transitions`, `task_due_date_changes`, `task_completion_events` and `task_reopening_events`;
- historical `task_blockers` intervals and canonical directed `task_dependencies` (`DEPENDS_ON`; `BLOCKS` is its inverse projection);
- zero-or-one primary `pdca_id` and optional originating Decision, plus an explicit Decision/Task link table for additional traceability;
- Collaborator/Watcher memberships in the transversal `object_memberships` table; membership insertion verifies pre-existing access and never creates a grant;
- transactional SQL commands enforce permission, lifecycle, completion, blockers, full-scope changes and optimistic concurrency; direct authenticated writes are revoked.

The MVP default is that a production Task entering OPEN/PLANNED requires Owner, Responsible and due date. Drafts may remain incomplete. Owner approval and recurring templates remain future work.

## 1. Domain intent

A Task is an independently executable action with explicit accountability, deadline and completion evidence. It may stand alone or relate to a PDCA, Project, Meeting or Decision. Unlike a PDCA, it does not own Plan/Do/Check/Act reasoning.

## 2. Lifecycle

Recommended semantic lifecycle:

```text
DRAFT -> OPEN/PLANNED -> IN_PROGRESS <-> BLOCKED/WAITING
                              -> UNDER_REVIEW -> COMPLETED -> ARCHIVED
                                      ^              |
                                      |---- REOPENED-|
Any non-terminal state -> CANCELLED (with reason)
```

Status labels are configurable but map to stable semantic categories. Every transition records actor, time, from/to state and optional reason.

Minimum transition rules:

- Draft may be incomplete and stays outside normal execution dashboards.
- Open/Planned requires title, scope, visibility, Responsible and due date unless an approved task type permits no deadline.
- In Progress sets `first_action_at` if not already set.
- Blocked requires an active blocker.
- Completed requires completion notes/evidence according to task policy.
- Cancelled and reopened require reasons.

## 3. Roles

### Owner

Accountable for ensuring the action reaches resolution. The Owner may be the same person as Responsible but remains a distinct dimension.

### Responsible

The single person coordinating/executing the current task. Changes preserve temporal history and can feed handover notifications.

### Collaborators

People actively contributing. Collaboration is a business relationship, not an authorization override.

### Watchers

People following changes. They receive eligible notifications while authorized. Watcher status never creates access automatically.

Owner/Responsible assignment follows `permissions.md`: if the target lacks access, the system requires remediation or a separately authorized explicit grant.

## 4. Scope and visibility

Every Task has a company owner and normalized organizational-unit/restaurant scope plus NORMAL, RESTRICTED or PRIVATE visibility. Scope can include multiple departments/services and restaurants.

Read may be allowed through compatible scope intersection; creating or moving a Task requires authority over the full proposed scope. A child task should usually have scope equal to or narrower than its parent PDCA/Project context. Cross-scope tasks need explicit validation.

## 5. Dependencies

A Task may depend on another Task, PDCA, Decision or external supplier/event. Dependencies are directed, typed and independently resolved. Blocking dependency cycles are rejected.

Dependency status can explain Waiting/Blocked but does not force status transitions without a domain command. Completing a prerequisite emits a follow-up event for dependent Tasks.

## 6. Blockers

Blockers record reason, source, start, resolution and notes. Duration is calculated from intervals, not inferred only from status history. Multiple concurrent blockers may exist; analytics must merge overlapping intervals when calculating total blocked wall-clock duration.

Resolving a blocker does not auto-complete or silently resume a Task. The actor confirms the next state.

## 7. Deadline and extension

The current due date is stored on Task for efficient queries. Every change has immutable history containing old/new values, actor, time and reason. Optional extension requests require approval before changing the date.

On completion, capture the applicable due date in the completion event. Overdue and on-time metrics use this snapshot for historical accuracy.

## 8. Completion

Completion may require:

- completion notes;
- evidence or attachment for configured task types;
- actual completion timestamp;
- resolution of required blockers/dependencies;
- review by Owner for high-impact tasks.

Completion is a transition with an immutable event, not a Boolean toggle. The UI may offer a quick action only when the same server validation runs.

## 9. Reopening

Reopening records reason, actor and time, preserves prior completion events and creates a new active execution cycle. It does not automatically revert related PDCA state, restore resolved blockers or reopen dependencies. Related owners receive an authorized notification.

## 10. Relationships

### PDCA

A Task may be a child execution action of one PDCA. Its lifecycle is independent. Completing all child Tasks may trigger a review suggestion, never automatic PDCA closure.

### Project

A Task may belong directly to a Project, including when also inside a PDCA belonging to that Project. Services validate consistent primary project lineage or require an explicit exception.

### Meeting

`originating_session_id` preserves where the Task was proposed/created. `meeting_subject_links` allows the same Task to be discussed in later sessions without duplication.

### Decision

A Task may implement a Decision through `originating_decision_id` or a typed relation. A Decision may generate several Tasks; a Task may reference one primary originating Decision initially.

## 11. Future recurrence

Do not add recurrence columns directly to Task in the MVP. Future recurrence should use a `task_templates`/`task_recurrence_rules` definition that generates independent Task occurrences with lineage. Each occurrence gets its own assignee, deadline, status, scope and audit trail. Editing a rule affects future occurrences unless explicitly applied elsewhere.

Generation runs idempotently in a background job and never creates duplicates for the same rule/occurrence key.

## 12. Invariants and tests

- one current Responsible and Owner, with preserved history;
- relationships do not bypass visibility;
- Task may exist without PDCA/Project/Meeting/Decision;
- child Task lifecycle independent from PDCA;
- full proposed scope checked on create/update;
- due-date changes immutable and completion snapshot stable;
- blocker/dependency cycles and intervals validated;
- completion requirements enforced server-side;
- reopening preserves prior completion;
- recurring appearance in meetings does not clone Task;
- restricted/private comments, files, search and notifications remain protected;
- optimistic-concurrency conflicts do not overwrite updates.

## 13. Open Architectural Decisions

| Question                                            | Recommended option                                                                | Alternatives                    | Impact                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| Are deadline-less production Tasks allowed?         | Only through an explicitly configured task type/policy; default requires due date | Always require; freely optional | Affects backlog age, overdue meaning and operational discipline  |
| Does high-impact completion require Owner approval? | Configurable by task type/risk, off by default in MVP                             | Always; never                   | Affects speed versus control and workflow complexity             |
| Multiple primary Decisions per Task                 | One originating Decision plus later typed links                                   | Many-to-many only               | Keeps primary traceability simple while retaining extension path |
