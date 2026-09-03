# Security Objects Review

## 1. Decision under review

`security_objects` is a narrow registry that gives each protected aggregate one stable cross-cutting security identity. Strong domain tables remain authoritative: `tasks`, `pdcas`, `decisions`, `meeting_series`, `meeting_sessions` and `projects` keep their own fields, constraints, lifecycles and direct business relationships.

The registry may own only concerns that genuinely apply uniformly: owning company, object type, visibility, creator, archive marker and optimistic version/security identity. It must not accumulate domain status, titles, deadlines, assignees, workflow data or arbitrary metadata.

## 2. Why it is preferable

The same transversal relationships are required for several unrelated aggregates: organizational/restaurant scope, explicit grants, comments, attachments, watchers/collaborators and audit references. A common FK-backed security identity avoids duplicating these structures per domain or using unsafe `(object_type, object_id)` pairs with no referential integrity.

## 3. Benefits

- one authorization contract across list, detail, files, grants and collaboration;
- real foreign keys from transversal tables;
- consistent visibility semantics and company boundary;
- easier RLS helper reuse;
- a stable target for audit/provenance links;
- adding a protected domain does not require duplicating every transversal table;
- removal/archive rules can be tested uniformly.

## 4. Complexity costs

- every protected aggregate creation requires two coordinated rows;
- queries may need one additional join;
- type correctness between registry row and domain table needs enforcement;
- developers could be tempted to move domain fields into the registry;
- generic transversal relations can obscure domain meaning if used where an explicit FK is better.

Mitigation: create registry and aggregate in one transaction, expose module repositories that perform the join, validate immutable `object_type`, and maintain a strict allowlist of concerns permitted on `security_objects`.

## 5. Foreign-key impact

Each strong domain table has a unique non-null `security_object_id -> security_objects.id`. Scope/grant/comment/attachment tables reference `security_objects.id`, gaining proper FK behavior. Core business relationships continue to reference strong domain keys—for example `tasks.pdca_id -> pdcas.id` and `meeting_sessions.series_id -> meeting_series.id`—rather than routing through the registry.

PostgreSQL cannot express “registry object type must equal this table” with a simple cross-table CHECK. The implementation should use transactional repository/service validation plus database enforcement where practical (for example constrained creation functions or composite type-aware keys), backed by integrity tests. Hard deletion remains exceptional and normally restricted.

## 6. Query impact

Detail and authorized list queries join the domain table to its one registry row and relevant scope/grant relations. This is predictable and indexable using the unique domain `security_object_id`, registry company/type indexes and reverse indexes on scope/grant joins.

Domain-only internal calculations need not join the registry when no protected output is produced, but any user-visible population must apply the security join before pagination or aggregation. Query-plan tests with realistic multi-scope data are required; repositories should hide repetitive join mechanics without hiding authorization intent.

## 7. RLS impact

RLS gains a uniform entry point: a domain row resolves to one security object, whose visibility, company, scopes and grants feed small shared predicates. Domain policies can reuse this visibility predicate and add action/workflow-specific checks.

The registry must not become a monolithic SQL permission engine. RLS functions stay small, schema-qualified and testable. Application authorization still validates functional permission paths and full proposed scope for mutations. PRIVATE permits only the creator or valid explicit grants in the MVP; the schema reserves no active administrator bypass.

## 8. Audit and transversal concerns

- **Audit:** `audit_events.security_object_id` provides a stable subject for domain changes; administrative entities outside this registry keep typed audit subjects.
- **Comments:** attach to the protected object and inherit its access, while comment-specific edit rules remain separate.
- **Attachments:** metadata attaches to the security object; server authorization precedes short-lived signed URL creation in private Storage.
- **Scopes:** normalized unit/restaurant/company join tables target one common object identity.
- **Grants:** one temporal grant model targets any supported object and is independently audited.
- **Watchers/collaborators:** common membership rows are acceptable because their semantics are uniform; current Owner/Responsible and domain invariants remain in strong tables/history.

These generic relations must not replace explicit business links such as PDCA-to-Task, Session-to-Series, Decision origin or Project membership.

## 9. Alternatives considered

### Separate transversal tables per domain

Strongest domain typing, but duplicates scope, grants, comments and file policies for every aggregate and makes authorization drift likely.

### Polymorphic `(object_type, object_id)` columns

Simple initially, but PostgreSQL cannot provide a real FK to several tables. Orphans and type mistakes become application-only concerns, which is unacceptable for security relations.

### One universal business-object table

Would centralize all fields and lifecycles but becomes a god entity, weakens constraints and encourages JSONB domain storage. Rejected.

### PostgreSQL inheritance/partitioning by object type

Adds database-specific complexity and does not naturally solve different domain schemas/workflows. Not justified for the MVP.

## 10. Final recommendation

Keep `security_objects`, with strict boundaries:

1. only security identity, company, type, visibility, creator, archive/version timestamps;
2. exactly one strong aggregate row per registry row;
3. domain fields and constraints stay in strong tables;
4. explicit domain FKs remain explicit;
5. only genuinely transversal tables reference the registry;
6. all creation is transactional and type integrity is tested;
7. query/RLS performance is measured before further abstraction.

Under these constraints, the registry reduces authorization duplication and improves referential integrity without becoming a god entity. It is recommended for implementation.
