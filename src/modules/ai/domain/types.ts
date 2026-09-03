export type AiUseCase =
  "MEETING_ASSISTANT" | "MEETING_SUMMARY" | "EXECUTION_VALIDATOR";

export type ProposalType = "DECISION" | "TASK" | "PDCA" | "SUMMARY" | "FINDING";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ContextRole = "TARGET" | "AGENDA" | "NOTE" | "LINK" | "INPUT";

/** One labelled, untrusted piece of source material shown to the model. */
export interface ContextSegment {
  readonly id: string;
  readonly role: ContextRole;
  readonly text: string;
}

/**
 * Identifiers the model may reference. Anything outside these lists is
 * rejected server-side, so the model can never introduce an unknown ID.
 */
export interface ContextCandidates {
  readonly people: readonly { id: string; name: string }[];
  readonly agendaItems: readonly { id: string; title: string }[];
  /** ISO date (YYYY-MM-DD) used for deadline policy. */
  readonly today: string;
}

/** A record actually supplied to the model, for provenance. */
export interface ContextSource {
  readonly securityObjectId: string;
  readonly sourceVersion: number;
  readonly contextRole: ContextRole;
}

export interface AiContext {
  readonly segments: readonly ContextSegment[];
  readonly candidates: ContextCandidates;
  readonly sources: readonly ContextSource[];
}

export interface ExecutionProposalPayload {
  readonly version: 1;
  readonly type: "DECISION" | "TASK" | "PDCA";
  readonly title: string;
  readonly description: string;
  readonly objective: string | null;
  readonly priority: Severity;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  readonly dueDate: string | null;
  readonly agendaItemId: string | null;
  readonly unresolvedNames: readonly string[];
  readonly citations: readonly string[];
  readonly confidence: number;
  readonly rationale: string;
  readonly warnings: readonly string[];
}

export interface SummaryProposalPayload {
  readonly version: 1;
  readonly type: "SUMMARY";
  readonly summary: string;
  readonly highlights: readonly string[];
  readonly openQuestions: readonly string[];
  readonly citations: readonly string[];
  readonly warnings: readonly string[];
}

export type FindingSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface Finding {
  readonly code: string;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly source: "DETERMINISTIC" | "AI";
  readonly confidence: number | null;
  readonly evidence: readonly string[];
}

export interface FindingProposalPayload extends Finding {
  readonly version: 1;
  readonly type: "FINDING";
  readonly source: "AI";
}

export type ProposalPayload =
  ExecutionProposalPayload | SummaryProposalPayload | FindingProposalPayload;

export interface RejectedProposal {
  readonly title: string;
  readonly reason: string;
}

/** Minimal authorized snapshot of a Task or PDCA for deterministic validation. */
export interface ExecutionRecordSnapshot {
  readonly kind: "TASK" | "PDCA";
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  readonly dueDate: string | null;
  readonly objective: string | null;
  readonly problemStatement: string | null;
  readonly expectedResult: string | null;
  readonly actualResult: string | null;
  readonly lastActivityAt: string;
  readonly dueDateChangeCount: number;
  readonly activeBlockerSince: string | null;
  readonly attachmentCount: number;
  readonly completedAt: string | null;
}
