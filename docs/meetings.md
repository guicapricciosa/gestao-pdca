# Meetings

## 1. Domain intent

Meetings are shared organizational workspaces that transform discussion into traceable decisions and execution. They are not personal note copies and they do not become a permanent authorization shortcut for the objects discussed or created within them.

## 2. Concepts

### Meeting Series

A Meeting Series defines the continuing meeting purpose, default Chair, default participant set, recurrence rule, meeting type and default scope/visibility. It may also exist without automatic recurrence as a reusable conceptual series.

Changing series defaults affects future sessions only unless an authorized user explicitly applies a reviewed change to existing scheduled sessions.

### Meeting Session

A Meeting Session is one occurrence with its own schedule, participants, agenda, notes, links, status and publication record. Ad-hoc meetings are sessions without a series.

### Chair

The Chair owns meeting facilitation and the review/publish process. Chair status grants only meeting-specific workflow capabilities configured by policy. It does not grant global access to generated objects or permission to delegate scope beyond the Chair's authority.

An acting Chair may be assigned for one session, preserving the series Chair.

### Participants

Participants are explicit session relationships with invitation and attendance status. They may view or contribute only while current organizational scope or a separate explicit grant authorizes the session. Participation itself grants no access and never transfers to linked execution objects.

### Agenda and notes

Agenda items are ordered subjects with presenter, state, time allocation and carry-forward lineage. Notes are attributed to a session and optionally an agenda item. A note may be a personal unpublished draft only while clearly separated from the shared meeting record; published meeting notes are shared and audited.

### Meeting subject links

Existing decisions, PDCAs, tasks and projects appear in sessions through `meeting_subject_links`. The link records whether the object originated, was discussed, reviewed or carried forward. The linked object retains its identity, history and scope.

## 3. Session lifecycle

Recommended semantic states:

```text
SCHEDULED -> IN_PROGRESS -> REVIEW -> PUBLISHED -> CLOSED
                     \-> CANCELLED
CLOSED/PUBLISHED -> REOPENED -> REVIEW -> PUBLISHED -> CLOSED
```

- **SCHEDULED:** preparation and agenda editing.
- **IN_PROGRESS:** shared meeting mode; notes and proposals are captured.
- **REVIEW:** Chair validates the record and proposed actions.
- **PUBLISHED:** validated meeting record and selected actions become visible through their own authorized workflows.
- **CLOSED:** administrative finalization after publication; ordinary editing stops.
- **REOPENED:** exceptional controlled correction/addendum flow, never erasing the prior published version.

`PUBLISHED` and `CLOSED` may occur in one user flow but remain distinct facts. Status definitions can be configured, while these semantic categories remain stable for domain logic and analytics.

## 4. Before the meeting

1. Create or select a series and generate/create a session.
2. Resolve session defaults: Chair, scope, visibility, participants and meeting type.
3. Authorize every participant addition and create bounded session access when required.
4. Build the agenda and assign presenters.
5. Surface previous pending items by querying existing linked objects the current viewer may access.
6. Link relevant decisions, PDCAs, tasks and projects without copying them.
7. Record documents as protected attachments.

“Previous pending” is a dynamic, permission-aware read model plus explicit carry-forward links. A viewer may see fewer linked items than another participant. The UI must not disclose hidden titles or counts in a way that reveals restricted information.

## 5. During the meeting

The Chair or authorized participant starts the session. The application records actual start time and exposes Meeting Mode.

Participants may, according to functional permission:

- update permitted agenda state;
- create shared notes and comments;
- link an existing authorized object;
- propose a decision, task or PDCA;
- suggest owner, responsible, deadline, priority and scope;
- mark an agenda item resolved or postponed.

New execution items begin as **Draft proposals** associated with the session. A draft has its own proposed scope and visibility. It is not assumed to inherit the meeting scope; defaults are convenience only and require review.

Concurrent writes use record versions and clear conflict resolution. Live presence does not replace persistence. If AI assists, its extracted items remain attributed proposals with source-note provenance.

## 6. Review and close

Moving to REVIEW freezes normal participant edits or limits them to comments. The Chair reviews each item independently:

- title and description/problem statement;
- item type;
- owner and responsible;
- collaborators/watchers;
- complete organizational and restaurant scope;
- visibility and explicit grants;
- deadline and priority/impact/risk;
- relationship to decision, project or existing PDCA/task;
- duplicates and existing-object alternatives.

For each proposal, the Chair can publish, return for changes, merge/link to an existing object, or reject with reason. Publishing invokes the target domain service and rechecks the reviewing actor's authority over the entire proposed scope.

The meeting can be published only when configured validation rules pass. It may retain rejected/draft proposals outside dashboards, clearly marked as such. Publication records an immutable summary version, decision/action links and audit event.

Closing records actual end time, unresolved agenda dispositions and carry-forward links. Future notification delivery will consume the transactional outbox after commit; external notifications are not implemented in this phase.

## 7. After the meeting

- Published decisions, PDCAs and tasks enter their own workflows and dashboards.
- The session page queries each linked object under current user permissions.
- Pending items remain the same records as they reappear in later sessions.
- Follow-up sessions can link and review progress without cloning objects.
- Corrections use addenda/reopening, version history and audit rather than silent edits.

## 8. Existing PDCA in multiple meetings

A PDCA has one stable ID. Each occurrence creates a `meeting_object_links` row with session, optional agenda item, link type and timestamp. The PDCA page can therefore show a meeting timeline and recurrence count.

Meeting-specific discussion belongs to that session; PDCA status and work history remain on the PDCA. A note may reference the PDCA without copying its current state. This preserves accurate “what was known at the time” through published meeting snapshots and audit history.

## 9. Exceptional scenarios

### Responsible is not a participant

Participation is not required for assignment. Before publication:

1. validate the proposed Responsible's organizational eligibility;
2. check whether they already have access to the proposed object;
3. if not, require scope correction, another assignee, or a separately authorized explicit grant;
4. notify them only after publication and only with content they may access.

The system must not silently add them to the meeting or silently grant object access.

### Item scope differs from meeting scope

This is allowed and expected. The item is authorized independently. Users lacking access to the item may see a neutral indication that a protected action was recorded only if meeting policy requires it; otherwise even its existence is hidden. Publishing actor must control the item's full scope.

### Participant later loses permission

Access is evaluated at read time. If organizational scope is lost, the person loses session and linked-object access unless a valid explicit grant exists. Historical participation and authorship remain, but are not themselves access paths. Audit records are retained and protected independently.

### Meeting is reopened

Reopening requires `meeting.reopen`, a reason and audit event. It creates a new revision/addendum context. Already published objects are not rolled back or duplicated. Any proposed changes to those objects use their own authorized workflows. Republishing creates a new publication version and targeted notifications describing the delta.

### Chair becomes unavailable

An authorized user may assign an acting/replacement Chair. The change is audited and does not transfer unrelated organizational permissions.

## 10. Invariants

- A session belongs to zero or one series.
- One object may appear in many sessions; a link never duplicates it.
- Meeting publication cannot bypass target-domain authorization.
- Participant lists do not determine derived-object access.
- Published records are versioned and cannot be silently overwritten.
- A session cannot be closed with an invalid temporal range.
- Every proposal has author and source session.
- Every high-impact AI proposal receives human review.

## 11. Required tests

- recurring and ad-hoc session creation;
- participant-specific access and later revocation;
- agenda carry-forward lineage;
- same PDCA linked to multiple sessions without duplication;
- publish only selected validated proposals;
- reject publication outside actor's full scope;
- Responsible outside meeting with and without valid object access;
- RESTRICTED/PRIVATE session and generated-object separation;
- reopening preserves previous publication and does not roll back actions;
- concurrent edit conflict;
- previous-pending query does not leak inaccessible objects/counts;
- AI proposals cannot publish directly.

## 12. Open Architectural Decisions

| Question                                         | Recommended option                                                 | Alternatives                             | Impact                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------------------- |
| Publication and closure as separate user actions | Keep separate domain facts but allow one UI action to perform both | One status only; always two manual steps | Preserves review/audit semantics without forcing extra clicks |

Meeting collaboration is fixed for the initial implementation: version/`updated_at` optimistic concurrency with explicit conflict detection; no CRDT infrastructure.

## 13. Implemented workflow

The initial lifecycle is `DRAFT → SCHEDULED → IN_PROGRESS → REVIEW → PUBLISHED → CLOSED`, with explicit cancellation paths and controlled reopening from `PUBLISHED`/`CLOSED` back to `REVIEW`. Every transition compares `version`, records a transition row, updates the security-object version and emits an audit event. Reopening requires a reason, preserves prior publication snapshots and does not roll back published execution objects.

Agenda items are separate ordered rows with `PENDING`, `DISCUSSED`, `POSTPONED` and `CLOSED`. Reordering swaps positions under optimistic concurrency. Carry-forward creates a new agenda row referencing a POSTPONED item in an earlier accessible session of the same series; it does not mutate history. Notes are separately versioned and can be associated with a session or agenda item.

Meeting Mode now offers quick Decision, Task and PDCA creation through the normal domain commands. These objects are linked as `CREATED` and remain DRAFT until meeting publication. Existing accessible objects can be linked as `DISCUSSED`, `REVIEWED`, `FOLLOW_UP` or `CLOSED_IN_MEETING`. Publication rejects pending agenda outcomes, invalid/inaccessible linked targets, incomplete Tasks/PDCAs, invalid assignees and stale versions. It activates the created objects through their normal lifecycle commands and writes a publication snapshot.

The operational UI includes `/meeting-series`, `/meetings`, session detail, `/meetings/[id]/run` and `/meetings/[id]/review`. My Work includes accessible upcoming meetings, Chair review queues and authorized execution follow-ups. All lists are server-filtered and paginated where the operational population can grow.
