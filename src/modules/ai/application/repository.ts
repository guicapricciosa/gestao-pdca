import type {
  AiUseCase,
  ContextSource,
  ProposalPayload,
  ProposalType,
} from "@/modules/ai/domain/types";

export interface StartRunInput {
  readonly companyId: string;
  readonly useCase: AiUseCase;
  readonly targetSecurityObjectId: string;
  readonly provider: string;
  readonly model: string;
  readonly templateVersion: string;
}

export interface RunOutcome {
  readonly status: "SUCCEEDED" | "FAILED";
  readonly errorCategory?: string | null;
  readonly inputTokens?: number | null;
  readonly outputTokens?: number | null;
  readonly latencyMs?: number | null;
}

/**
 * Persistence boundary for AI provenance. Every method maps to a
 * SECURITY DEFINER command that authorizes the current actor server-side;
 * the application never writes the AI tables directly.
 */
export interface AiRepository {
  startRun(input: StartRunInput): Promise<string>;
  recordSources(
    runId: string,
    sources: readonly ContextSource[],
  ): Promise<void>;
  completeRun(runId: string, outcome: RunOutcome): Promise<void>;
  addProposal(
    runId: string,
    type: ProposalType,
    payload: ProposalPayload,
  ): Promise<string>;
}
