import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AiRepository,
  RunOutcome,
  StartRunInput,
} from "@/modules/ai/application/repository";
import type {
  ContextSource,
  ProposalPayload,
  ProposalType,
} from "@/modules/ai/domain/types";
import type { Database, Json } from "@/platform/supabase/database.types";

/**
 * Uses the authenticated user's client, so every command re-authorizes the
 * actor in PostgreSQL. No service-role access is involved.
 */
export class SupabaseAiRepository implements AiRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async startRun(input: StartRunInput): Promise<string> {
    const { data, error } = await this.client.rpc("start_ai_run", {
      company_id: input.companyId,
      use_case: input.useCase,
      target_security_object_id: input.targetSecurityObjectId,
      model_provider: input.provider,
      model_name: input.model,
      prompt_template_version: input.templateVersion,
    });
    if (error !== null) throw new Error(error.message);
    return data;
  }

  async recordSources(
    runId: string,
    sources: readonly ContextSource[],
  ): Promise<void> {
    if (sources.length === 0) return;
    const { error } = await this.client.rpc("record_ai_run_sources", {
      ai_run_id: runId,
      sources: sources.map((source) => ({
        security_object_id: source.securityObjectId,
        source_version: source.sourceVersion,
        context_role: source.contextRole,
      })),
    });
    if (error !== null) throw new Error(error.message);
  }

  async completeRun(runId: string, outcome: RunOutcome): Promise<void> {
    const { error } = await this.client.rpc("complete_ai_run", {
      ai_run_id: runId,
      status: outcome.status,
      error_category: (outcome.errorCategory ?? null) as never,
      input_tokens: (outcome.inputTokens ?? null) as never,
      output_tokens: (outcome.outputTokens ?? null) as never,
      latency_ms: (outcome.latencyMs ?? null) as never,
    });
    if (error !== null) throw new Error(error.message);
  }

  async addProposal(
    runId: string,
    type: ProposalType,
    payload: ProposalPayload,
  ): Promise<string> {
    const { data, error } = await this.client.rpc("add_ai_proposal", {
      ai_run_id: runId,
      proposal_type: type,
      payload: payload as unknown as Json,
    });
    if (error !== null) throw new Error(error.message);
    return data;
  }
}
