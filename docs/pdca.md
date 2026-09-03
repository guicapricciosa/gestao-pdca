# PDCA

## Implementation status — Execution Core

Implemented in migrations `202609030005` and `202609030006` as a strong aggregate independent from Task:

- current status and `PLAN/DO/CHECK/ACT` phase are separate, with immutable status and phase transition histories;
- Plan, Check and Act fields remain explicit columns, including expected/actual result and a deliberately small current KPI representation;
- priority, impact and risk use independent configurable lookup codes;
- due-date, completion and reopening facts are immutable history records;
- blockers have interval history; dependencies support PDCA, Task and structured external targets, with cycles rejected for PDCA-to-PDCA edges;
- a Task has at most one primary `pdca_id`; its lifecycle stays independent and completion never closes the PDCA automatically;
- completion requires ACT, an actual result, closure notes and no active blockers. Generic approval workflow remains prepared but disabled.

Progressive editing is allowed: Draft and phase changes do not require every previous phase field to be complete. Stronger configurable phase gates remain future work.

## 1. Domain intent

A PDCA is a structured improvement or problem-solving cycle. It captures the reasoning from problem definition through execution, verification and standardization/correction. It may contain multiple tasks and can span meetings and projects. It is not a task with a different label.

## 2. Core responsibilities

A PDCA owns:

- problem statement, objective and root-cause hypothesis;
- Plan, Do, Check and Act maturity;
- accountable Owner and executing/coordinating Responsible;
- department/service and restaurant scope;
- priority, impact and risk as independent dimensions;
- expected result, KPI definitions and actual result;
- due date and its full change history;
- blockers, dependencies, evidence and closure approval;
- related task collection and meeting/project traceability;
- completion and reopening cycles.

## 3. Lifecycle and phase

Status and PDCA phase are separate axes.

- **Status** describes execution state: Draft, Open/Planned, In Progress, Blocked, Waiting, Under Review, Completed, Cancelled or Archived.
- **Phase** describes methodological focus: Plan, Do, Check or Act.

A blocked PDCA can be in any phase. A PDCA in Check is not necessarily completed. Configuration may rename display statuses, but stable semantic categories support workflows and analytics.

Typical lifecycle:

```text
DRAFT -> OPEN/PLANNED -> IN_PROGRESS <-> BLOCKED/WAITING
                              -> UNDER_REVIEW -> COMPLETED -> ARCHIVED
                                      ^              |
                                      |---- REOPENED-|
Any non-terminal state -> CANCELLED (with reason)
```

Phase generally progresses `PLAN -> DO -> CHECK -> ACT`, but authorized users may return to a previous phase with reason. Phase transitions are audited.

## 4. Progressive completion

The application must allow incomplete early drafts while increasing validation at transitions:

- **Draft:** title and author/context are sufficient.
- **Open/Planned:** problem statement, objective, Owner, Responsible, scope and visibility required (since 2026-09-03 the due date is a warning, not a blocker; migration `202609030011`).
- **Do/In Progress:** actionable plan or at least one task/manual action, responsible and start evidence required by policy.
- **Check/Under Review:** expected result and KPI/evaluation method must be defined; actual observations begin.
- **Act/Completion:** actual result, conclusion and required evidence/standardization or corrective action are supplied.

These are configurable validation profiles with stable minimum safety rules. Missing fields are explicit, not fabricated by AI.

## 5. Plan

Plan captures:

- observable problem statement;
- desired objective;
- scope and affected areas/restaurants;
- root cause or hypothesis, clearly marked if unverified;
- plan summary and proposed actions;
- KPI or evaluation method;
- baseline when known;
- expected result and target;
- Owner, Responsible, dates, priority, impact and risk.

Problem, hypothesis and decision should not be collapsed into one free-text field.

## 6. Do

Do records execution through child Tasks, comments, evidence and activity. A PDCA may also record lightweight actions in its narrative, but accountable work with an assignee/deadline should normally be a Task.

Task progress can inform PDCA progress but does not automatically determine PDCA completion. The Owner/Responsible reviews whether executed actions address the objective.

`first_action_at` is set once on the first qualifying execution event and is never recalculated from edited text.

## 7. Check

Check compares actual result with baseline, expected result and KPI target. It records measurement time, method, evidence and interpretation. A completed set of tasks does not imply a successful Check.

Possible outcomes:

- target achieved and ready to standardize/close;
- partial result requiring Act adjustments;
- hypothesis disproved, return to Plan;
- insufficient evidence, remain Under Review;
- negative/unintended result, corrective action required.

## 8. Act

Act records standardization, corrective action, follow-up monitoring, a new cycle or closure. If a new PDCA is warranted, create a separate linked PDCA with lineage rather than overwrite the original cycle.

## 9. Roles

### Owner

Accountable for ensuring resolution, approving material changes where configured and reviewing closure. Ownership is independent from access; assigning an Owner requires existing access or a separately reviewed explicit grant.

### Responsible

Executes or coordinates work. A change ends the prior membership interval and creates a new one, preserving history. Responsibility does not convey access outside normal/explicit policy.

### Collaborators and Watchers

Collaborators contribute; Watchers follow. Neither relationship bypasses scope/visibility. Watchers receive notifications only while authorized.

## 10. Tasks

A PDCA may contain zero tasks during early planning and multiple tasks during execution. Tasks have their own status, assignees, deadlines, blockers, evidence and scope. The task scope must be compatible with the PDCA but may be narrower. A broader or different scope requires explicit cross-scope authorization and may be better represented as a linked task rather than a child.

Deleting a PDCA never cascades away published tasks. Cancellation preserves links and asks how active child tasks should proceed; changes are explicit and audited.

## 11. KPI and results

A KPI includes name, unit, baseline, target, measurement method and actual measurement. Not every PDCA requires a numeric KPI; a structured evaluation criterion may be accepted by configuration. The system distinguishes:

- expected result set during Plan;
- actual result observed during Check;
- conclusion/action decided during Act.

Evidence links to attachments, comments or other records and remains independently authorized through the PDCA security object.

## 12. Blockers and dependencies

A blocker is a time-bounded impediment with start, reason and resolution. Setting PDCA status to Blocked opens or references an active blocker; resolving the last active blocker does not guess the next state without a confirmed transition.

Dependencies may point to tasks, other PDCAs, decisions or external parties/events. Internal dependency cycles are rejected for blocking edges. Dependency resolution may generate a notification but never silently completes work.

## 13. Deadlines and extensions

Every change to `due_date` records old date, new date, actor, timestamp, reason and change type. If an extension approval workflow is configured, a request does not change the current deadline until approved.

On completion, store a due-date snapshot in the completion event so later deadline changes or reopening cannot rewrite historical on-time metrics.

## 14. Completion and approval

Completion validation may require:

- Check and Act summaries;
- actual result;
- KPI/evaluation outcome;
- completion notes;
- required evidence;
- no unresolved critical blockers;
- disposition of open child tasks;
- Owner approval.

Where Owner approval is required, the Responsible submits for review; status becomes Under Review. Approval records actor/time and creates a completion event. The Owner cannot approve without current access and `pdca.approve_completion`.

## 15. Reopening

Reopening requires permission and reason. It creates an immutable reopening event, clears only the current completion state needed to resume work, preserves prior completion events/results and establishes a new active cycle. Metrics can therefore distinguish first completion, latest completion and reopen rate.

Reopening does not automatically reopen child Tasks or restore old blockers.

## 16. Meeting and project relationships

- `originating_session_id` identifies initial creation context.
- `meeting_subject_links` records every later discussion/review without duplication.
- A PDCA can belong to one primary Project initially; additional portfolio/tag relationships may be added later.
- Decisions may lead to a PDCA through an explicit relation/link.
- Meeting access never determines PDCA access.

## 17. Invariants and tests

Required invariants/tests include:

- PDCA and Task schemas/workflows remain distinct;
- progressive validation at each phase/status transition;
- priority, impact and risk independent;
- temporal Owner/Responsible history;
- assignee outside access requires separate grant/remediation;
- scope narrowing/broadening authorization;
- blocker intervals and duration calculation;
- due-date history and approval flow;
- completion cannot bypass configured evidence/Owner approval;
- reopening preserves previous completion facts;
- same PDCA appears in many meetings as one object;
- child Task completion does not auto-complete PDCA;
- RESTRICTED/PRIVATE access tests across every relation.

## 18. Open Architectural Decisions

| Question                                       | Recommended option                                                                      | Alternatives                                  | Impact                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Must every production PDCA have a numeric KPI? | Allow numeric KPI or an approved structured evaluation criterion                        | Numeric KPI mandatory; free-text outcome only | Balances discipline with operational cases that are not meaningfully numeric |
| Can a PDCA have multiple active Responsibles?  | One accountable Responsible plus multiple Collaborators initially                       | Multiple co-responsibles                      | Affects accountability, workload metrics and notification semantics          |
| Project membership cardinality                 | One primary Project initially, with typed links for exceptional secondary context later | Many-to-many from day one                     | Determines navigation/reporting complexity                                   |
