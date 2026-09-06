# Permission Model

## Execution Core implementation note

Decisions, Tasks and PDCAs now use domain permission keys (`decision.*`, `task.*`, `pdca.*`) plus transversal `comment.create`, `attachment.read` and `attachment.upload`. Create and `.scope.update` permissions use `COVER_ALL`; ordinary read/update permissions use the existing path-preserving intersection policy.

Each aggregate has a validated one-to-one security object. Direct authenticated mutation of domain and history tables is revoked; transactional RPC commands resolve the current profile, authorize the persisted/proposed scope and write audit/history atomically. RLS filters strong tables, list views, child records, relationships, comments, attachment metadata and activity.

Owner, Responsible, Collaborator and Watcher insertion is rejected when the target lacks current read access. The caller must separately create a valid explicit grant through the existing grant workflow; no Execution Core command creates a grant.

## 1. Purpose and invariants

Authorization is a deterministic backend capability shared by application pages, APIs, search, exports, analytics, attachments and AI. The same actor, action and persisted object state must produce the same decision across entry points.

Core invariants:

- deny by default;
- authentication is necessary but never sufficient;
- roles grant functional capabilities, not implicit global scope;
- organizational scope and object scope are separate;
- visibility can narrow normal access but never broaden it;
- frontend visibility is not authorization;
- assignee relationships do not automatically override visibility;
- authorization is re-evaluated at read time and immediately before mutation;
- list filtering occurs before pagination, aggregation and export;
- no rule is based on a current person's name or a hardcoded restaurant/department.

## 2. Vocabulary

### Role

A configurable bundle of functional permissions, assigned to a user in an organizational context and validity period. Examples may be seeded for convenience, but names have no special meaning in code.

### Functional permission

An atomic capability expressed as `resource.action`, such as `task.read`, `task.update`, `meeting.publish`, `organization.assign` or `analytics.read`. It answers **what action** may be attempted, not **where**.

### Organizational assignment

A temporal relationship between a profile, a company/organizational unit, a role and optional scope mode. It establishes organizational membership and the context in which role permissions apply.

### Department/service scope

The set of organizational units, usually departments or shared services, in which the actor's permissions are effective. Descendant inheritance is explicit in policy; it is not inferred from labels.

### Restaurant scope

The set of restaurants directly assigned to the actor or inherited through active hierarchy relationships. A policy may express all active restaurants in a company, a configured subset, or no restaurant restriction.

### Hierarchy

Temporal reporting/responsibility relationships between assignments or organizational positions. Hierarchy can expand restaurant scope upward when the applicable policy allows inheritance. It does not automatically grant new functional permissions.

### Object scope

Normalized relationships from a securable object to companies, organizational units, restaurants and, where relevant, projects. Multiple values within the same dimension are normally treated as a set; access policy defines whether intersection or full coverage is required for each action.

For normal read access, the proposed rule is:

- actor must have company membership/global scope;
- actor must have at least one applicable functional permission context whose organizational dimension is compatible with the object;
- actor's restaurant dimension must intersect the object's restaurant scope when the object has restaurant scope;
- dimensions absent from the object do not create arbitrary global visibility: an explicit company-/unit-level policy must cover them.

Write actions may require stronger coverage, for example permission over **all** selected scope values, to prevent creating or moving an object partly outside the actor's authority.

### Explicit access grant

A revocable, temporal grant for a subject user or group to perform a bounded action set on one object. It records grantor, reason and validity. A grant cannot convey an action the granting actor is not allowed to delegate.

### Visibility mode

An object-level policy that narrows the eligible audience after basic functional permission evaluation.

## 3. Permission evaluation dimensions

Conceptually, an access path is a tuple:

```text
(actor, role assignment, functional permission, organization scope,
 restaurant scope, object scope, visibility, explicit grant, action, state)
```

An actor may have several active access paths. Access is allowed if at least one complete path authorizes the action and no immutable security constraint blocks it. Paths must not be incorrectly combined: a permission from one role assignment cannot silently borrow scope from an unrelated assignment unless policy explicitly permits aggregation.

## 4. Visibility semantics

### NORMAL

Read access requires an applicable functional permission and compatible effective organizational/restaurant scope. Explicit grants may add bounded access to a specific object if the recipient also has base product access and the grant action is permitted.

Create/update/delete/publish actions additionally require the corresponding functional permission, valid workflow transition and authority over the resulting full object scope.

### RESTRICTED

Access is limited to:

- users with a valid explicit grant for the requested action; or
- users whose current organizational assignment covers the object, holds the functional permission for the action **and** holds `security.restricted.read`; or
- **the creator of the object** (decision of 2026-09-03), through a current organizational assignment that covers the object and holds the functional permission for the action. The creator is exempt only from `security.restricted.read`; nothing is written (no explicit grant, no membership), so when the creator's assignment ends, expires or stops covering the object, this access ends with it.

Normal scope intersection, meeting participation, collaborator/watcher status, ownership or responsibility is insufficient. The creator condition lives inside `private.can_access_security_object` (migration `202609030012_restricted_creator_access.sql`), so lists, My Work, meeting links, attachments and AI sources all inherit it through RLS and `filter_accessible_security_objects` without any per-feature logic. Tests: `supabase/tests/restricted_creator_test.sql`.

### PRIVATE

Read access is limited to:

- the creator, represented by a system-created explicit creator grant;
- users with valid explicit grants; or
- no other access path in the MVP.

The creator may also act on their private object with whatever functional
permissions their current assignments hold (activate, edit, complete, comment);
they gain nothing they do not already hold, and nobody else gains anything
(decision of 2026-09-06, migration `202609060005`). Ordinary administrators do
not automatically receive private content. The schema and authorization boundary may later support a break-glass operation, but that path is disabled in the MVP. A future implementation must require a specific administrative permission, mandatory reason, actor identity, timestamp and immutable audit event. Private metadata should also be minimized in lists and audit projections.

Changing an object from NORMAL to RESTRICTED/PRIVATE must validate the retained access list and prevent accidental orphaning. Changing to a broader mode is a high-impact audited action.

## 5. Baseline access profiles

These behaviors arise from configuration, not special role names or people.

| Business profile                                   | Configured functional/scope behavior                                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CEO/global executive                               | Global company policy plus broad functional permissions; restricted/private remain subject to their special rules                                            |
| Expansion/global executive (currently André Março) | Same configurable global policy as the CEO, not a name-based exception                                                                                       |
| Support department director                        | Authorized department domain across all configured restaurants; no automatic access to other department domains                                              |
| DOL director                                       | Authorized operational domains across all DOL restaurants inherited/configured under the assignment                                                          |
| Subdirector                                        | Authorized domains across restaurants inherited from active subordinate branches                                                                             |
| Supervisor                                         | Authorized domains across directly assigned and inherited subordinate restaurants                                                                            |
| Restaurant manager                                 | Authorized domains for assigned restaurant(s) only                                                                                                           |
| Kitchen supervisor                                 | Authorized kitchen/operational domains for assigned/inherited restaurants, without unrelated global domain access                                            |
| Kitchen manager                                    | Authorized kitchen/operational domains for assigned restaurant(s)                                                                                            |
| Shared service user                                | Authorized service domain across restaurants covered by that service assignment                                                                              |
| Collaborator                                       | Relationship enables collaboration actions only if base/explicit access exists; does not independently bypass visibility                                     |
| Watcher                                            | Receives eligible follow-up/notifications only while access remains valid; never grants content access by itself                                             |
| Meeting participant                                | Participation is historical context only; access requires current organizational scope or a separate explicit grant and never transfers to generated objects |
| Object owner                                       | Accountability relationship; access must come from normal scope or an intentional explicit grant                                                             |
| Object responsible                                 | Execution relationship; access must come from normal scope or an intentional explicit grant                                                                  |

## 6. Assignment and explicit-grant policy

Assigning an owner, responsible or collaborator requires the command actor to:

1. have permission to change that relationship;
2. control the entire resulting object scope;
3. select a target eligible for assignment under organizational rules; and
4. decide, through an explicit product option/policy, whether access must also be shared.

Recommended behavior:

- If the target already has NORMAL access, create only the business relationship.
- If the target lacks access, do not silently expand access. Show a blocking validation: change scope, choose another person, or request/create a bounded explicit grant if the actor may delegate it.
- For RESTRICTED/PRIVATE objects, assignment and access are always separate explicit choices. Assignment must fail unless an appropriate grant already exists or is created in the same reviewed transaction.
- A watcher never causes a grant automatically.
- A meeting participant may receive a session-specific participant grant, not access to derived objects.
- Revoking a grant does not delete owner/responsible history; the UI flags an inaccessible active assignee for remediation.

The only automatic explicit grants recommended are deterministic lifecycle grants:

- creator grant for PRIVATE objects;
- proposal author grant bounded to their draft proposal until review, if policy requires it.

Each must be visible in audit history and removable subject to orphan-prevention rules.

## 7. Effective scope representation

An effective scope result should preserve permission paths rather than flatten everything into unsafe global unions:

```text
EffectiveScope {
  actorId
  companyIds
  paths: [
    {
      assignmentId
      permissionKeys
      organizationalUnitIds
      restaurantIds
      companyWideUnitScope
      companyWideRestaurantScope
      delegablePermissionKeys
    }
  ]
  explicitObjectGrants
}
```

Caching is permitted per actor and authorization version. Changes to roles, permissions, hierarchy, restaurant assignments, grants or profile activation increment/invalidate the relevant version.

## 8. Pseudocode

### `getAccessibleScope(user)`

```text
function getAccessibleScope(user, now): EffectiveScope
  require authenticated(user)
  profile = loadActiveProfile(user.authId)
  if profile is null: deny

  assignments = loadActiveAssignments(profile.id, now)
  roleBindings = loadRoleBindings(assignments, now)
  hierarchy = loadActiveHierarchyClosure(assignments, now)
  restaurantAssignments = loadActiveRestaurantAssignments(assignments, now)

  paths = []
  for binding in roleBindings:
    permissions = permissionsFor(binding.role, binding.policy)
    units = unitsAllowedBy(binding.assignment, binding.policy, hierarchy)
    restaurants = restaurantsAllowedBy(
      binding.assignment,
      binding.policy,
      restaurantAssignments,
      hierarchy
    )

    paths.add({
      assignmentId: binding.assignment.id,
      permissionKeys: permissions,
      organizationalUnitIds: units.ids,
      restaurantIds: restaurants.ids,
      companyWideUnitScope: units.isCompanyWide,
      companyWideRestaurantScope: restaurants.isCompanyWide,
      delegablePermissionKeys: binding.policy.delegablePermissions
    })

  return {
    actorId: profile.id,
    companyIds: distinct(paths.companyId),
    paths,
    explicitObjectGrants: loadActiveGrantIndex(profile.id, now)
  }
```

### `can(user, action, object)`

```text
function can(user, action, object): Decision
  scope = getAccessibleScope(user, now)
  require object exists and is not inaccessible by lifecycle policy

  if validExplicitGrant(scope.actorId, action, object):
    return allow if grantPolicyAllows(action, object.visibility)

  if object.visibility == PRIVATE:
    # Rule of 2026-09-06 (approved): the creator keeps the functional
    # permissions a current assignment of theirs grants; nobody else.
    return allow if user is object.createdBy
                 and (action is a read or some current path holds the action)
    return DENY

  if object.visibility == RESTRICTED:
    return allow only if some current path covers the object, holds the action
           and (user is object.createdBy or path holds security.restricted.read)

  for path in scope.paths:
    if action not in path.permissionKeys: continue
    if object.companyId not covered by path: continue
    if not organizationalScopeCompatible(path, object.scope, action): continue
    if not restaurantScopeCompatible(path, object.scope, action): continue
    if not workflowPolicyAllows(user, action, object): continue
    return ALLOW(path.assignmentId)

  return DENY(reasonCodeWithoutSensitiveDetails)
```

Explicit grants are evaluated first only as an independent bounded path; immutable constraints, profile activation, grant validity, action coverage and workflow checks still apply.

### `filterAccessibleObjects(user, query)`

```text
function filterAccessibleObjects(user, action, baseQuery, filters, page): Page
  scope = getAccessibleScope(user, now)
  validate filters against allowlist

  authorizedQuery = baseQuery
    .where(profile is active)
    .where(
      exists NORMAL permission path compatible with object scope and action
      OR exists active explicit object grant covering action
      OR exists applicable restricted/private elevated path
    )
    .where(domain workflow/read policy)
    .apply(filters)
    .orderBy(stableAllowlistedOrder)
    .paginate(page)

  return execute(authorizedQuery)
```

Never fetch IDs broadly and filter them in application memory for normal list, search, export or analytics paths.

## 9. Example decision matrix

Assume each actor has the functional `read` permission described by their profile; special modes have no grants unless stated.

| Actor                 | Object                                | Visibility | Extra condition                        | Decision | Reason                                   |
| --------------------- | ------------------------------------- | ---------- | -------------------------------------- | -------- | ---------------------------------------- |
| Global executive      | Marketing / Restaurant A              | NORMAL     | company covered                        | ALLOW    | global configured path                   |
| Global executive      | HR sensitive item                     | RESTRICTED | no grant/admin sensitivity permission  | DENY     | global scope does not bypass restriction |
| Support & IT director | IT / Restaurant B                     | NORMAL     | all restaurants covered                | ALLOW    | vertical department scope                |
| Support & IT director | Marketing / Restaurant B              | NORMAL     | no Marketing path                      | DENY     | domain mismatch                          |
| DOL subdirector       | Operations / subordinate Restaurant A | NORMAL     | inherited restaurant                   | ALLOW    | horizontal operational scope             |
| DOL subdirector       | Operations / Restaurant Z             | NORMAL     | outside branch                         | DENY     | restaurant mismatch                      |
| Restaurant A manager  | Maintenance / Restaurant A            | NORMAL     | domain authorized                      | ALLOW    | assigned restaurant and domain           |
| Restaurant A manager  | Maintenance / Restaurant B            | NORMAL     | none                                   | DENY     | wrong restaurant                         |
| HACCP service user    | HACCP / covered Restaurant B          | NORMAL     | service covers B                       | ALLOW    | service scope path                       |
| HACCP service user    | Maintenance / Restaurant B            | NORMAL     | none                                   | DENY     | wrong service domain                     |
| Collaborator          | Item outside normal scope             | NORMAL     | collaborator only                      | DENY     | relationship is not access               |
| Collaborator          | Same item                             | NORMAL     | explicit read/update grant             | ALLOW    | bounded grant                            |
| Watcher               | Private item                          | PRIVATE    | watcher only                           | DENY     | watcher cannot bypass visibility         |
| Meeting participant   | Derived PDCA outside scope            | NORMAL     | participant only                       | DENY     | meeting access does not transfer         |
| Responsible           | Restricted item                       | RESTRICTED | assignment only                        | DENY     | responsibility and access are separate   |
| Creator               | Restricted item they created          | RESTRICTED | current covering path + action         | ALLOW    | creator keeps access; no grant written   |
| Creator               | Restricted item they created          | RESTRICTED | assignment expired or no longer covers | DENY     | creator access is not a standing grant   |
| Responsible           | Restricted item                       | RESTRICTED | explicit read/update grant             | ALLOW    | grant covers action                      |
| Creator               | Private item                          | PRIVATE    | active creator grant                   | ALLOW    | lifecycle grant                          |

## 10. Creation and scope mutation

For create or scope-change actions, authorization applies to the proposed object state. The actor must normally have write authority over every selected company, unit and restaurant, not merely one intersection. The server loads canonical target IDs, rejects inactive or cross-company relationships and records old/new scope in audit history.

Moving an object into a scope that would strand its active owner/responsible requires explicit review. Broadening visibility, adding explicit users or granting delegate rights are separate permissions.

## 11. RLS and application authorization in Supabase

Use a hybrid model.

### Recommended RLS responsibilities

- enable RLS on every protected application table;
- tenant/company isolation for all authenticated reads/writes;
- row visibility for direct browser-safe access only through stable authorization SQL functions;
- explicit-grant and visibility checks for securable objects;
- protected Storage policies that reference attachment metadata and authorization functions;
- deny direct client writes to core domain tables unless a narrowly defined policy and database function enforce the full invariant.

### Recommended application responsibilities

- all domain mutations through server-side services using the authenticated user's JWT context;
- functional/action permissions and workflow transitions;
- full-scope validation for creates and updates;
- cross-entity consistency, confirmation workflows and rich audit intent;
- authorized list/query composition, exports, analytics, search and AI context;
- signed attachment URL issuance.

### Service role

The service-role key exists only in trusted server/job environments and bypasses RLS, so its use is exceptional. Normal user-facing queries should prefer a server Supabase client carrying the user's session so RLS remains active. If a server process uses service role for a justified task, it must pass an explicit actor/system capability, apply the same authorization service and write elevated audit records.

### SQL functions

Keep SQL security functions small and composable, for example active profile resolution, company membership, active explicit grant and object visibility. Avoid duplicating an entire fast-changing workflow engine inside RLS. `SECURITY DEFINER` functions must set a safe `search_path`, use schema-qualified objects and expose no arbitrary SQL inputs.

## 12. Testing strategy

Maintain one scenario fixture language usable by application authorization tests and SQL/RLS tests. Required suites include all cases listed in `CONTEXT.md`, plus:

- expired assignment/hierarchy/grant;
- deactivated user or restaurant;
- multi-assignment paths that must not be incorrectly combined;
- full-scope validation on create/update;
- visibility transitions;
- grant delegation and revocation;
- pagination/counts without hidden-row leakage;
- attachment, comments, audit and notification projections;
- cache invalidation after permission changes;
- service-role job capability restrictions.

## 13. Open Architectural Decisions

No permission-model decision remains open for the MVP. Break-glass is an intentionally disabled extension point: if introduced later, it requires its own reviewed specification and security tests.

## 14. Implemented Meeting authorization

Meetings use the shared engine with `meeting.create`, `meeting.read`, `meeting.update`, `meeting.scope.update`, `meeting.publish`, `meeting.close`, `meeting.reopen`, `meeting.participant.manage`, `meeting.agenda.manage`, `meeting.note.create` and `meeting.link.manage`. Reads retain the approved intersection semantics; create and scope replacement require full coverage of all proposed units and restaurants.

Both Meeting Series and Meeting Session map to the single functional `meeting.*` namespace. Additive RLS policies bridge this mapping for `security_objects`, scope rows and explicit grants; all meeting-domain child policies resolve authorization through the parent session/series security object.

Participant and Chair relationships never create grants. The participant picker is produced by `get_meeting_accessible_profiles`, and the mutation checks the target person again. Historical participation remains after assignment expiry, but no longer supplies an access path. `meeting_object_links` is visible only when the viewer can independently read both the meeting and the target; title, type, count and metadata of inaccessible targets are therefore not leaked.

Publication requires the current Chair and `meeting.publish`, checks assignments and target access, and then invokes normal target-domain commands. Meeting access never substitutes for `decision.read`, `task.read` or `pdca.read`, and target access never substitutes for `meeting.read`.

## 15. Implemented AI authorization

Two configurable permissions gate the use cases: `ai.meeting.assist` (Meeting Assistant and Meeting Summary, INTERSECT scope on the meeting session) and `ai.execution.validate` (Execution Validator, INTERSECT scope on the Task/PDCA). Starting a run requires both the use-case permission and read access to the target; read policies on `ai_runs`, `ai_run_sources` and `ai_proposals` derive from the current ability to read the target object, and a source row is hidden when the source object itself is not readable. Confirmation and rejection re-run the same checks at review time, and the created Decision/Task/PDCA inherits nothing from the proposal: the normal create commands validate full-scope coverage and assignee access again.

Operational rule learnt while implementing: any function referenced from a row-level policy must grant EXECUTE to `authenticated` (as `private.can_access_security_object` does). A helper without that grant does not fail cleanly; it crashed the local PostgreSQL 17 backend during policy evaluation.

## Realtime, notifications and push (2026-09-03)

The central rule also governs joining a meeting's Realtime channel
(`private.can_join_meeting_channel`), creating a notification for a recipient
(checked at creation time) and opening any deep link (checked by the page).
A Realtime signal, a notification or a push never carries a capability.

`meeting.template.manage` (2026-09-04): create/edit/deactivate meeting
templates for a company; granted to Global Executive and the director roles.
Using a template only needs `meeting.create`.

## Implementation note — set-based read access (2026-09-04)

`private.can_access_security_object(profile, object, permission)` remains the
single rule for commands, triggers and single checks. For reads, calling it per
row cost about 1.2 ms per object in production (180 ms for 152 PDCAs, twice
per list because of the exact count), growing linearly with data.

Migration `202609040004_accessible_objects.sql` adds
`private.accessible_security_objects(profile, permission default null)`: the
set of objects the rule accepts, computed once per query (explicit grants,
PRIVATE creator reads, assignment coverage by unit and restaurant, RESTRICTED
gating). `permission = null` means each object's own `<type>.read`. The read
policies on decisions, tasks, pdcas, comments, memberships, attachments,
security_objects, meeting_series and meeting_sessions use
`security_object_id in (select private.accessible_security_objects(…))`, which
Postgres evaluates as one hashed sub-plan. `supabase/tests/accessible_objects_test.sql`
asserts the set equals the per-row rule for every seeded profile × object and
seven permissions, so the rule itself did not change. History and event tables
keep the per-row check (they are read for one record at a time).
