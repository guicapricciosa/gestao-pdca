import type {
  AiUseCase,
  ContextCandidates,
  ContextSegment,
} from "@/modules/ai/domain/types";

/**
 * Provider-neutral inference request. Instructions come from versioned
 * templates owned by the application; segments are untrusted data and must
 * be presented to the model as such, never merged into the instructions.
 */
export interface GatewayRequest {
  readonly useCase: AiUseCase;
  readonly templateVersion: string;
  readonly instructions: string;
  readonly segments: readonly ContextSegment[];
  readonly candidates: ContextCandidates;
}

export interface GatewayResult {
  /** Raw structured output; the caller validates it against the use-case schema. */
  readonly output: unknown;
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly latencyMs: number;
}

export type GatewayErrorCategory =
  "TIMEOUT" | "PROVIDER" | "SCHEMA" | "CONFIGURATION" | "DISABLED";

export class GatewayError extends Error {
  constructor(
    readonly category: GatewayErrorCategory,
    message: string,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

export interface ModelGateway {
  readonly provider: string;
  readonly model: string;
  complete(request: GatewayRequest): Promise<GatewayResult>;
}

/** Renders segments as clearly delimited untrusted data for any provider. */
export function renderSegments(segments: readonly ContextSegment[]): string {
  return segments
    .map(
      (segment) =>
        `<segment id="${segment.id}" role="${segment.role}">\n${segment.text.replaceAll("</segment>", "")}\n</segment>`,
    )
    .join("\n");
}
