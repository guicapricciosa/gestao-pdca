# Security

## Execution Core implementation note

The new execution tables are deny-by-default: authenticated clients receive SELECT only through RLS and execute reviewed command functions for mutation. Command functions are `SECURITY DEFINER` with an empty `search_path`, resolve the authenticated profile internally and re-run authorization. Optimistic versions prevent silent lost updates.

The `execution-attachments` Storage bucket is private. Metadata paths must be namespaced by company and `security_object_id`; upload/download policies resolve metadata and authorize the parent object. Application downloads re-authorize and issue a 60-second signed URL. Public permanent URLs and malware-scanning claims are absent; scanning remains a future adapter.

List/search views are `security_invoker` and apply RLS before database filtering, count and pagination. Child-table policies require parent access, preventing comments, attachments, activity and relationships from disclosing inaccessible object existence.

## 1. Security objectives

- confidentiality across companies, departments/services, restaurants and visibility modes;
- integrity of assignments, permissions, workflow transitions, evidence and audit history;
- availability of core execution functions independently of AI/integrations;
- accountability through attributable, tamper-resistant records;
- least privilege for users, server processes, jobs and external adapters.

## 2. Trust boundaries and assets

Trust boundaries exist between browser and Next.js server, server and Supabase, authenticated-user and service-role database contexts, private Storage and signed delivery, application and model provider, application and future integrations, and job runner and domain commands.

Critical assets include authentication sessions, service secrets, organization/permission configuration, PRIVATE/RESTRICTED content, personnel information, meeting records, attachments, exports, analytics, AI contexts and audit events.

## 3. Initial threat model

### Horizontal privilege escalation

**Threat:** an authorized user accesses another restaurant, department, service, company or private object by changing an ID/filter.

**Controls:** centralized scope predicates; RLS defense in depth; full-object authorization after canonical lookup; UUIDs only as identifiers, never authorization; negative permission tests; no client-side filtering; not-found response where appropriate.

### Vertical privilege escalation

**Threat:** a normal user invokes admin/publish/permission operations or grants powers beyond their own.

**Controls:** atomic functional permissions; scope-constrained delegation; high-risk recent-auth/MFA policy; server commands; deny-by-default RLS; immutable audit; approval/separation of duties for permission administration where required.

### IDOR/BOLA

**Threat:** direct object reference reveals or mutates inaccessible records.

**Controls:** every detail, subresource, comment, attachment and mutation resolves `actor + action + object`; parent access does not automatically imply child access; opaque identifiers plus authorization; batch endpoints authorize every member and reject/return safe partial results by contract.

### Frontend-only authorization

**Threat:** hidden controls or routes are called directly.

**Controls:** UI capability hints are convenience only; all reads/writes run server/RLS checks; domain state machine validates transitions.

### Export leakage

**Threat:** exports bypass row/column filters, include hidden worksheets or continue after access revocation.

**Controls:** generate server-side from authorized query builder; re-authorize at job start and delivery; minimize columns; short-lived download token; audit requester, filters, row count and download; cap volume; never place exports in public buckets.

### Search leakage

**Threat:** titles/snippets/counts/autocomplete reveal inaccessible objects.

**Controls:** security object ID retained in index; authorization predicate before ranking/result; no global autocomplete over protected text; safe zero-result behavior; restricted snippet generation; re-authorize on open.

### Analytics leakage

**Threat:** precomputed aggregates or small groups expose hidden records/person data.

**Controls:** filter facts before aggregation; retain scope dimensions; access-controlled drilldowns; minimum-group suppression where appropriate; no cache shared across incompatible authorization versions.

### AI context leakage

**Threat:** global context, tool output, conversation memory, prompts or citations reveal unauthorized data.

**Controls:** pipeline in `ai.md`; per-call authorization; minimized context; no global-dataset filtering by model; provider retention policy; bounded tools; source logging; access recheck on citations and confirmation.

### Attachment access and signed URLs

**Threat:** predictable storage paths, public buckets, long-lived URLs, MIME confusion or sharing after permission revocation.

**Controls:** private buckets; server-generated random paths; attachment metadata authorization; short-lived signed URLs; content-disposition and safe MIME; size/type checks; checksum; malware scan/quarantine before download; no secret-bearing filenames in URLs; audit sensitive downloads. A signed URL is a bearer token, so keep TTL minimal and do not log it.

### Audit manipulation

**Threat:** user edits/deletes audit records or rich server process omits incriminating actions.

**Controls:** append-only DB privileges/RLS; no normal update/delete API; atomic writes with business transaction; trigger-based fallback for critical admin tables; restricted audit writer role; immutable external log export later; monitoring for gaps/sequence anomalies; payload minimization.

### Admin permission changes

**Threat:** malicious/mistaken grant creates global access or self-escalation.

**Controls:** dedicated capabilities; cannot delegate beyond authority; show effective-access diff before confirm; reason required; recent authentication; notify security/admin recipients; invalidate caches/sessions as needed; full before/after audit. Dual approval is not part of the MVP, but commands/history must not prevent a future approval workflow.

### Service-role key exposure

**Threat:** Supabase service-role key bypasses RLS.

**Controls:** never expose in browser, repository, logs or preview environment variables accessible to clients; server secret manager only; separate keys/environments; rotate; restrict runtime access; prefer user-session client for user operations; alert on unusual service-role access; jobs declare capabilities and scopes.

### Injection

**Threat:** SQL, command, HTML, template or prompt injection through text/filter/document fields.

**Controls:** parameterized queries/query builder; allowlisted sort/filter fields; schema validation; no shell construction from user data; output escaping/sanitized rich text; CSP; safe file handling; prompt/tool separation; webhook signature validation.

### Mass assignment

**Threat:** client supplies protected fields such as company, creator, visibility, owner, status, approval or audit actor.

**Controls:** per-command input schemas; map explicit writable fields; derive actor/company/server timestamps; separately authorize relationship/scope changes; reject unknown properties; never spread request bodies into persistence models.

## 4. Authentication and session controls

- Supabase Auth with secure HTTP-only session handling in server context.
- Verify JWT server-side and enforce active application profile.
- Configure email/domain/invitation policy; avoid self-signup unless explicitly intended.
- MFA for global admins/security-sensitive roles when available.
- Session expiry/revocation and recent-auth challenge for high-risk actions.
- CSRF protection appropriate to cookie-based mutation transports, strict origin checks and SameSite cookies.
- Rate limits for authentication, search, export, AI and administrative endpoints.

## 5. Authorization and RLS

- Enable RLS on all protected tables and Storage objects.
- Use authenticated JWT context for normal server user operations.
- Central application authorization remains mandatory for domain actions.
- Keep security-definer functions few, schema-qualified and fixed `search_path`.
- Test direct REST/database access, not only application endpoints.
- Prevent permission-path mixing and validate proposed full scope for writes.
- Invalidate effective-scope caches promptly after security changes.

## 6. Input, output and API design

- Runtime-validate all boundary inputs with strict schemas and size limits.
- Use explicit command DTOs and optimistic concurrency versions.
- Return minimal DTOs and suppress existence details for denied objects.
- Avoid sensitive data in URLs, analytics events and error messages.
- Paginate and cap list/batch requests.
- Apply security headers: CSP, HSTS, frame restrictions, referrer policy and MIME sniffing protection.
- Sanitize rich text with an allowlist; treat Markdown/HTML as untrusted.

## 7. Database and secrets

- Separate database roles for migrations, application/user context, jobs and read-only operations.
- Versioned migrations only; production changes through controlled CI/CD.
- Encrypt in transit and at rest using managed platform controls.
- Backups/PITR with restore exercises and access controls.
- Secret manager/environment injection; no secrets in client bundles or source.
- Consider column-level encryption/tokenization only after identifying fields with requirements beyond platform encryption; do not invent custom cryptography.

## 8. Files

Upload flow:

1. authorize attachment creation against target object;
2. create server-controlled metadata/path and constrained upload token;
3. validate size/type/checksum;
4. quarantine and scan;
5. mark available only after successful checks;
6. authorize each download and mint short-lived signed URL;
7. audit sensitive access and retention actions.

Document extraction runs isolated with strict resource limits. Extracted text inherits the attachment/object authorization and retention policy.

## 9. Audit, monitoring and incident readiness

Monitor authentication anomalies, repeated denies, cross-company ID probes, global permission changes, grant spikes, large exports, sensitive attachment downloads, service-role operations, job scope, AI context volumes and RLS errors.

Audit events use correlation/request IDs and distinguish actor, impersonation/system capability and reviewer. Logs avoid content and tokens. Establish alert ownership, retention, incident playbooks and tested restoration before production.

## 10. Secure development and supply chain

- strict TypeScript and dependency lockfile;
- dependency/security scanning and prompt patching policy;
- code review for RLS, authorization, migrations and security-definer SQL;
- unit, integration, SQL/RLS and end-to-end negative tests;
- isolated staging with synthetic data;
- no production datasets in local development without approved anonymization;
- static checks for secrets and unsafe SQL;
- threat-model update for every new external integration or sensitive domain.

## 11. Security acceptance gate

Before a protected feature ships:

- action and scope rules documented;
- server and RLS paths tested;
- list/detail/create/update/delete/export/search/analytics/AI cases covered as applicable;
- RESTRICTED/PRIVATE behavior covered;
- audit event defined and verified;
- error and logging content reviewed;
- attachment/integration paths reviewed;
- cache invalidation and access revocation tested.

## 12. Open Architectural Decisions

| Question                                   | Recommended option                                                                       | Alternatives                        | Impact                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------- |
| Audit immutability beyond primary database | Add periodic/streamed append-only external retention before production sensitivity grows | PostgreSQL-only append restrictions | Improves tamper evidence but adds operational cost |

Attachments are fixed to private Storage with server authorization and short-lived signed URLs. The storage adapter reserves scan state/hooks, but malware scanning is not required in the first increment.

## 13. Implemented hardening controls

- Browser E2E covers password login/session/logout, protected redirects, normal and private execution objects, explicit grant/revocation, assignment expiry and meeting/object isolation.
- Attachment upload validates configurable byte, MIME and per-object limits at the authenticated server boundary. Storage succeeds before metadata registration; metadata failure triggers compensating object removal, so valid metadata cannot point to a failed upload. Redirects are relative to prevent proxy-host changes from dropping cookies.
- Meeting child rows are never directly writable by authenticated clients. Commands derive the actor from the JWT, use fixed empty `search_path`, disable RLS only inside the reviewed invariant boundary and perform explicit authorization before mutation.
- Publication re-authorizes each linked object and assignee. RLS on links requires simultaneous access to both sides, preventing titles, types and counts from becoming an inference channel.
- Local password identities and sign-up-capable provider configuration exist only for deterministic development/E2E. Production remains an invitation/admin-provisioned environment and must not inherit local auth settings blindly.

Malware scanning/quarantine, rate-limited upload reservations and external tamper-evident audit retention remain pre-production hardening work.

## 14. Implemented AI controls

- The model never receives data the actor cannot read: context is built from the RLS-filtered meeting detail or record, candidates come from `get_meeting_accessible_profiles`, and `record_ai_run_sources` refuses unreadable sources.
- Instructions and data are separated at the gateway; segment content is rendered inside `<segment>` tags and the versioned instructions state that it is never an instruction.
- Structured output is validated server-side; unknown IDs, past deadlines, unknown enums and unknown citations are stripped with warnings, unusable items are rejected, and schema failures close the run as FAILED without persisting proposals.
- High-impact effects only happen through `confirm_ai_proposal`, which re-authorizes the reviewer, refuses stale or already reviewed proposals and reuses the normal commands; findings cannot be executed.
- `OPENAI_API_KEY` is server-only, requests use `store: false`, and no prompt or response body is logged; `ai_runs` keeps operational metadata only.
- `AI_PROVIDER=disabled` is the default; the e2e suite runs with the deterministic `fake` provider so no data leaves the machine.
