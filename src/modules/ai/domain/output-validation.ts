import { z } from "zod";

import type {
  ContextCandidates,
  ExecutionProposalPayload,
  FindingProposalPayload,
  RejectedProposal,
  SummaryProposalPayload,
} from "./types";

/**
 * Versioned structured-output schemas. They are strict objects with every key
 * required (nullable where optional) so the same definition can be handed to a
 * provider in strict JSON-schema mode and re-validated here.
 */
export const meetingAssistantOutputSchemaV1 = z.strictObject({
  proposals: z.array(
    z.strictObject({
      type: z.string(),
      title: z.string(),
      description: z.string(),
      objective: z.string().nullable(),
      priority: z.string().nullable(),
      ownerCandidateId: z.string().nullable(),
      responsibleCandidateId: z.string().nullable(),
      unresolvedNames: z.array(z.string()),
      dueDate: z.string().nullable(),
      agendaItemId: z.string().nullable(),
      citations: z.array(z.string()),
      confidence: z.number(),
      rationale: z.string(),
    }),
  ),
});

export const meetingSummaryOutputSchemaV1 = z.strictObject({
  summary: z.string(),
  highlights: z.array(z.string()),
  openQuestions: z.array(z.string()),
  citations: z.array(z.string()),
});

export const executionValidatorOutputSchemaV1 = z.strictObject({
  findings: z.array(
    z.strictObject({
      code: z.string(),
      severity: z.string(),
      message: z.string(),
      confidence: z.number(),
      citations: z.array(z.string()),
    }),
  ),
});

export const outputSchemas = {
  MEETING_ASSISTANT: meetingAssistantOutputSchemaV1,
  MEETING_SUMMARY: meetingSummaryOutputSchemaV1,
  EXECUTION_VALIDATOR: executionValidatorOutputSchemaV1,
} as const;

const PROPOSAL_TYPES = new Set(["DECISION", "TASK", "PDCA"]);
const SEVERITIES = new Set(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
const FINDING_SEVERITIES = new Set(["INFO", "WARNING", "CRITICAL"]);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function clamp01(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function keepKnownCitations(
  citations: readonly string[],
  segmentIds: ReadonlySet<string>,
  warnings: string[],
) {
  const known = citations.filter((citation) => segmentIds.has(citation));
  if (known.length !== citations.length)
    warnings.push(
      "Some citations referenced unknown segments and were dropped.",
    );
  if (known.length === 0)
    warnings.push("No valid citation: verify the source.");
  return known;
}

export interface MeetingAssistantValidation {
  readonly proposals: ExecutionProposalPayload[];
  readonly rejected: RejectedProposal[];
}

/**
 * Turns raw model output into persistable proposals. Anything the model
 * invented (unknown IDs, past deadlines, unknown enums) is removed with a
 * visible warning; unusable items are rejected rather than repaired.
 */
export function validateMeetingAssistantOutput(
  raw: unknown,
  candidates: ContextCandidates,
  segmentIds: readonly string[],
): MeetingAssistantValidation {
  const output = meetingAssistantOutputSchemaV1.parse(raw);
  const people = new Set(candidates.people.map((person) => person.id));
  const agenda = new Set(candidates.agendaItems.map((item) => item.id));
  const segments = new Set(segmentIds);
  const proposals: ExecutionProposalPayload[] = [];
  const rejected: RejectedProposal[] = [];

  for (const item of output.proposals) {
    const title = item.title.trim();
    if (!PROPOSAL_TYPES.has(item.type)) {
      rejected.push({
        title,
        reason: `Unsupported proposal type ${item.type}`,
      });
      continue;
    }
    if (title.length < 2 || title.length > 240) {
      rejected.push({
        title,
        reason: "Title must have between 2 and 240 characters",
      });
      continue;
    }
    const warnings: string[] = [];
    const type = item.type as ExecutionProposalPayload["type"];

    let ownerProfileId = item.ownerCandidateId;
    if (ownerProfileId !== null && !people.has(ownerProfileId)) {
      ownerProfileId = null;
      warnings.push(
        "Owner candidate is not in the authorized list; choose one.",
      );
    }
    let responsibleProfileId = item.responsibleCandidateId;
    if (responsibleProfileId !== null && !people.has(responsibleProfileId)) {
      responsibleProfileId = null;
      warnings.push(
        "Responsible candidate is not in the authorized list; choose one.",
      );
    }
    let agendaItemId = item.agendaItemId;
    if (agendaItemId !== null && !agenda.has(agendaItemId)) {
      agendaItemId = null;
      warnings.push("Referenced agenda item does not belong to this meeting.");
    }
    let dueDate = item.dueDate;
    if (dueDate !== null) {
      if (!ISO_DATE.test(dueDate) || Number.isNaN(Date.parse(dueDate))) {
        dueDate = null;
        warnings.push("Deadline was not a valid ISO date and was cleared.");
      } else if (dueDate < candidates.today) {
        dueDate = null;
        warnings.push("Deadline was in the past and was cleared.");
      }
    }
    let priority = item.priority ?? "MEDIUM";
    if (!SEVERITIES.has(priority)) {
      warnings.push(`Unknown priority ${priority}; defaulted to MEDIUM.`);
      priority = "MEDIUM";
    }
    const objective = item.objective?.trim() ? item.objective.trim() : null;
    if (type === "PDCA" && objective === null)
      warnings.push(
        "PDCA proposal lacks an objective; add one before confirming.",
      );
    const citations = keepKnownCitations(item.citations, segments, warnings);

    proposals.push({
      version: 1,
      type,
      title,
      description: item.description.trim(),
      objective,
      priority: priority as ExecutionProposalPayload["priority"],
      ownerProfileId,
      responsibleProfileId,
      dueDate,
      agendaItemId,
      unresolvedNames: item.unresolvedNames
        .map((name) => name.trim())
        .filter(Boolean),
      citations,
      confidence: clamp01(item.confidence),
      rationale: item.rationale.trim(),
      warnings,
    });
  }
  return { proposals, rejected };
}

export function validateMeetingSummaryOutput(
  raw: unknown,
  segmentIds: readonly string[],
): SummaryProposalPayload {
  const output = meetingSummaryOutputSchemaV1.parse(raw);
  const summary = output.summary.trim();
  if (summary.length === 0) throw new Error("Summary is empty");
  const warnings: string[] = [];
  const citations = keepKnownCitations(
    output.citations,
    new Set(segmentIds),
    warnings,
  );
  return {
    version: 1,
    type: "SUMMARY",
    summary: summary.slice(0, 20_000),
    highlights: output.highlights.map((line) => line.trim()).filter(Boolean),
    openQuestions: output.openQuestions
      .map((line) => line.trim())
      .filter(Boolean),
    citations,
    warnings,
  };
}

export function validateValidatorOutput(
  raw: unknown,
  segmentIds: readonly string[],
): FindingProposalPayload[] {
  const output = executionValidatorOutputSchemaV1.parse(raw);
  const segments = new Set(segmentIds);
  return output.findings.map((item) => ({
    version: 1,
    type: "FINDING",
    code: /^[A-Z][A-Z0-9_]{2,63}$/.test(item.code)
      ? item.code
      : "AI_OBSERVATION",
    severity: (FINDING_SEVERITIES.has(item.severity)
      ? item.severity
      : "INFO") as FindingProposalPayload["severity"],
    message: item.message.trim().slice(0, 2000),
    source: "AI",
    confidence: clamp01(item.confidence),
    evidence: item.citations.filter((citation) => segments.has(citation)),
  }));
}
