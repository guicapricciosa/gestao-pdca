# AI Architecture

## 1. Principles

AI is an optional assistant and analytical layer. It never authenticates users, decides authorization, becomes the system of record or performs a high-impact change without deterministic server validation and required human confirmation.

The application, meetings, execution workflows, search and analytics remain functional when AI is disabled or unavailable.

## 2. Capabilities

### Meeting Assistant

Inputs: authorized notes, transcript segments, uploaded-document extracts and selected existing records.

Outputs: proposed summary, Decisions, Tasks, PDCAs, owners, Responsibles, collaborators, scope, deadlines, priorities, blockers, dependencies and follow-ups. Proposals cite source segments and remain Draft until reviewed.

### Execution Validator

Runs deterministic validations first, then optionally applies AI judgement to authorized records. It can flag unclear objectives, likely duplicates, apparently unrelated assignees, weak evidence, repeated postponement or contradictory narrative. Each finding is a recommendation with confidence/reason/source.

### Management Assistant

Answers natural-language questions using deterministic metrics and authorized record retrieval. It should prefer internal tools that return structured results rather than placing broad raw data in a prompt.

### Executive Brief

Produces a period narrative from versioned deterministic metric results, comparisons and selected authorized source records. Important claims link to drill-down populations. Scheduled briefs are generated for an explicitly configured recipient/scope and rechecked on delivery/open.

## 3. Security pipeline

```text
authenticated user
-> active profile/session validation
-> permission engine
-> authorized query/tool execution
-> minimized structured context
-> LLM gateway
-> schema validation and provenance checks
-> response/proposal
-> human review (when applicable)
-> normal domain command + authorization recheck
```

Forbidden:

```text
global dataset -> LLM -> ask model to filter/redact
```

Permission evaluation happens for every retrieval/tool call, not only when the conversation starts. A stale chat/session cannot preserve revoked access.

## 4. Components

### AI use-case services

One application service per capability defines allowed inputs, tools, output schema, confirmation policy, retention and model class. UI code never builds privileged prompts directly.

### Context builder

The context builder accepts actor, use case and explicit filters/object IDs. It invokes authorized repositories, minimizes fields, labels data with record ID/version and enforces token/record limits. It excludes secrets, unnecessary personal data and inaccessible linked records.

### Internal tool registry

Tools/functions expose narrow operations such as:

- `get_execution_metrics(period, dimensions)`;
- `search_authorized_records(query, filters)`;
- `get_meeting_context(session_id)`;
- `get_pdca_details(pdca_id)`;
- `propose_task(payload)`;
- `validate_assignment(profile_id, proposed_scope)`.

Read tools return only authorized projections. Proposal tools persist Draft proposals, not final business changes. Execute tools are not exposed to the model for high-impact actions; confirmation invokes normal application commands outside the model loop.

### Model gateway

A provider-neutral interface handles model selection, timeouts, retries, schema mode, tracing, cost limits and redaction. Domain modules depend on use-case contracts, not provider SDK types. Prompt templates and output schemas are versioned. A future first adapter may use OpenAI, without leaking provider types into domain code.

## 5. Structured outputs

Use strict versioned schemas for model results. A Task proposal, for example, distinguishes:

- supplied/source facts;
- model-generated wording;
- referenced profile/unit/restaurant IDs drawn from authorized candidate lists;
- unresolved names requiring human mapping;
- confidence and warnings;
- citations to source segment IDs.

Unknown database IDs, invalid enum/lookup codes, dates outside policy and unauthorized candidates are rejected. The server never trusts the model to construct executable SQL, permission predicates or unrestricted record identifiers.

## 6. Provenance and source links

Each AI run records the use case, actor, authorization version, prompt/schema version, model, time and operational outcome. `ai_run_sources` links records/versions actually used. Fine-grained source segments may be stored for transcripts/documents where retention allows.

Responses include citations to application routes backed by stable `security_object_id`/domain IDs. Opening a citation re-authorizes the current viewer. A source link does not itself grant access.

Executive statements distinguish:

- deterministic fact from tool result;
- AI interpretation/inference;
- recommendation;
- missing or uncertain information.

## 7. Confirmation flows

High-impact actions follow:

```text
PROPOSE -> REVIEW -> EDIT -> CONFIRM -> RE-AUTHORIZE -> EXECUTE -> AUDIT
```

Confirmation is required for assigning/changing Responsible or Owner, changing due date or scope, publishing meetings, completing/closing PDCAs, changing permissions and creating organizational relationships.

At confirmation:

1. load current source and target versions;
2. show a human-readable diff;
3. validate actor/session freshness;
4. re-run authorization and domain invariants;
5. reject stale proposals or request re-review;
6. execute once with an idempotency key;
7. record reviewer, proposal and resulting object/audit event.

Lower-risk generation such as formatting notes or drafting a title can be applied more directly, but remains undoable and attributed where relevant.

## 8. Hallucination mitigation

- ground management answers in deterministic tools and record retrieval;
- require citations for material claims;
- use candidate IDs rather than free-form identity matching;
- validate every structured output server-side;
- distinguish “not found in authorized data” from “does not exist”;
- prohibit fabricated metric calculation when a tool fails;
- cap scope and ask the user to refine overly broad questions;
- use retrieval confidence and duplicate thresholds only as suggestions;
- regression-test prompts against permission and factuality fixtures;
- avoid causal claims unless supported by a defined analysis.

## 9. Prompt injection and untrusted content

Meeting notes, transcripts, comments, attachments and retrieved external content are untrusted data, never system instructions. The gateway separates instructions from data, labels source boundaries and restricts available tools. Document text cannot request more permissions, change tool parameters outside schema or exfiltrate other records.

Tool calls validate actor, parameters, object access and result size independently. Outputs are escaped/sanitized before UI rendering.

## 10. Logging, privacy and retention

Do not log full prompts/responses by default. Store minimized operational metadata and structured proposals; retain source text only when necessary and authorized. Provider data-retention settings must meet company policy. Sensitive use cases may disable AI entirely or use an approved model configuration.

Audit distinguishes AI suggestion, human reviewer and executing actor. Model tokens/cost/latency are operational telemetry, not business audit.

## 11. Failure handling

- timeouts/provider errors return a clear non-destructive failure;
- retries apply only to safe/idempotent inference calls;
- structured-output validation failures do not persist domain changes;
- partial streaming never becomes an accepted proposal until final validation;
- rate/cost limits degrade gracefully to manual workflows;
- queued runs can be cancelled and are re-authorized before execution;
- model/provider fallback must preserve data-residency and sensitivity policy;
- deterministic validation and analytics continue without AI.

## 12. Testing

- inaccessible records never enter context, source lists, tool results or logs;
- access revoked between prompt and tool call/confirmation;
- restricted/private object behavior;
- malicious prompt injection in note/attachment;
- invalid IDs and mass-assignment fields in structured output;
- stale proposal conflict and idempotent confirmation;
- citation/source completeness;
- provider timeout/schema failure/manual fallback;
- deterministic metrics remain unchanged by AI narrative;
- service/job generated brief is bounded to recipient scope.

## 13. Open Architectural Decisions

| Question                                        | Recommended option                                                                                | Alternatives                            | Impact                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------------------------------------- |
| Approved provider deployment and data residency | Use the provider abstraction; an initial OpenAI adapter is acceptable after security/legal review | Another approved provider or deployment | Affects retention, regionality, contracts and model features            |
| Transcript retention values                     | Make policy configurable; define concrete default periods before transcripts are enabled          | Process then discard; fixed retention   | Affects provenance, privacy and later re-analysis                       |
| Scheduled Executive Brief                       | Introduce after deterministic analytics and recipient-scoped job authorization are stable         | Build alongside first dashboard         | Prevents premature AI dependence and leakage through scheduled delivery |

## 14. Implementation status — AI Foundation, Meeting Assistant, Meeting Summary and Execution Validator

Implemented in migration `202609030010` and the `src/modules/ai` module.

### Provider abstraction

`AI_PROVIDER` selects the gateway: `disabled` (default; every workflow stays usable, AI controls are shown disabled), `fake` (deterministic local provider used by development and end-to-end tests; it only echoes marked lines such as `Tarefa: … | responsável: … | prazo: AAAA-MM-DD`) and `openai` (Responses API with strict JSON-schema output, `store: false`, server-side key only, configurable model and timeout). Domain code depends on the `ModelGateway` contract, never on provider types. Prompt templates and output schemas are versioned (`v1`).

### Pipeline

```text
start_ai_run (permission ai.meeting.assist / ai.execution.validate on the target)
-> record_ai_run_sources (every source must be readable by the actor now)
-> minimized labelled context from the RLS-filtered detail
-> gateway (instructions separated from <segment> data)
-> strict output validation (unknown IDs, past deadlines, unknown enums, foreign citations removed with warnings; unusable items rejected)
-> add_ai_proposal (PENDING)
-> complete_ai_run (SUCCEEDED/FAILED with error category and telemetry)
```

Candidate people come from `get_meeting_accessible_profiles`, so the model can only reference identities that already have access; unmatched names are reported in `unresolvedNames` and the reviewer chooses.

### Confirmation

`confirm_ai_proposal(proposal_id, expected_version, payload)` re-authorizes the reviewer, rejects reviewed or stale proposals (the meeting security object changed since the run), and executes once through the normal commands: `create_meeting_decision`, `create_meeting_task`, `create_meeting_pdca` or `add_meeting_note` (summaries). The reviewer's edited payload wins; the created object is a Draft linked as `CREATED` and the reviewer is the audited actor. `reject_ai_proposal` requires a reason. Findings are recommendations and cannot be executed.

### Execution Validator

Deterministic rules run without any provider on every Task/PDCA detail page and, in a two-query form, on My Work: missing Owner/Responsible/deadline, PDCA problem/objective/expected result, overdue with and without update, stale, repeated postponement, long blockers, completed PDCA without evidence and possible duplicates among visible open items. The optional AI pass produces `FINDING` proposals with confidence and citations that the reader can dismiss.

### Not implemented in this gate

Management Assistant, Executive Brief, tool registry with read tools, transcript ingestion/retention, scheduled or delivered outputs, semantic search, autonomous actions and every external channel remain unstarted and require separate approval.
