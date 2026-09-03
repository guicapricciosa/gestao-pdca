import {
  GatewayError,
  type GatewayErrorCategory,
  type ModelGateway,
} from "@/modules/ai/application/gateway";
import {
  PROMPT_TEMPLATE_VERSION,
  instructionsFor,
} from "@/modules/ai/application/prompts";
import type { AiRepository } from "@/modules/ai/application/repository";
import type {
  AiContext,
  AiUseCase,
  ProposalPayload,
  ProposalType,
  RejectedProposal,
} from "@/modules/ai/domain/types";

export interface ValidatedProposal {
  readonly type: ProposalType;
  readonly payload: ProposalPayload;
}

export interface ValidationOutcome {
  readonly proposals: readonly ValidatedProposal[];
  readonly rejected: readonly RejectedProposal[];
}

export interface RunUseCaseInput {
  readonly repository: AiRepository;
  readonly gateway: ModelGateway;
  readonly useCase: AiUseCase;
  readonly companyId: string;
  readonly targetSecurityObjectId: string;
  readonly context: AiContext;
  readonly validate: (raw: unknown, context: AiContext) => ValidationOutcome;
}

export interface RunUseCaseResult {
  readonly runId: string;
  readonly proposals: readonly (ValidatedProposal & { readonly id: string })[];
  readonly rejected: readonly RejectedProposal[];
  readonly truncated: boolean;
}

export class AiRunFailure extends Error {
  constructor(
    readonly category: GatewayErrorCategory | "AUTHORIZATION",
    message: string,
    readonly runId: string | null,
  ) {
    super(message);
    this.name = "AiRunFailure";
  }
}

/**
 * The single pipeline every use case goes through:
 * authorize (start_ai_run) -> record sources -> infer -> validate strictly ->
 * persist proposals -> close the run. A failure at any point leaves a FAILED
 * run with a category and never a half-persisted proposal set that looks
 * complete.
 */
export async function runUseCase(
  input: RunUseCaseInput,
): Promise<RunUseCaseResult> {
  const runId = await input.repository.startRun({
    companyId: input.companyId,
    useCase: input.useCase,
    targetSecurityObjectId: input.targetSecurityObjectId,
    provider: input.gateway.provider,
    model: input.gateway.model,
    templateVersion: PROMPT_TEMPLATE_VERSION,
  });
  try {
    await input.repository.recordSources(runId, input.context.sources);
    const result = await input.gateway.complete({
      useCase: input.useCase,
      templateVersion: PROMPT_TEMPLATE_VERSION,
      instructions: instructionsFor(input.useCase),
      segments: input.context.segments,
      candidates: input.context.candidates,
    });
    let outcome: ValidationOutcome;
    try {
      outcome = input.validate(result.output, input.context);
    } catch (error) {
      throw new GatewayError(
        "SCHEMA",
        error instanceof Error ? error.message : "Model output rejected",
      );
    }
    const proposals = [];
    for (const proposal of outcome.proposals) {
      const id = await input.repository.addProposal(
        runId,
        proposal.type,
        proposal.payload,
      );
      proposals.push({ ...proposal, id });
    }
    await input.repository.completeRun(runId, {
      status: "SUCCEEDED",
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      latencyMs: result.latencyMs,
    });
    return {
      runId,
      proposals,
      rejected: outcome.rejected,
      truncated: input.context.truncated,
    };
  } catch (error) {
    const category =
      error instanceof GatewayError ? error.category : "PROVIDER";
    const message =
      error instanceof Error ? error.message : "AI run failed unexpectedly";
    await input.repository
      .completeRun(runId, { status: "FAILED", errorCategory: category })
      .catch(() => undefined);
    throw new AiRunFailure(category, message, runId);
  }
}
