import "server-only";

import {
  GatewayError,
  type ModelGateway,
} from "@/modules/ai/application/gateway";
import { FakeModelGateway } from "@/modules/ai/infrastructure/fake-gateway";
import { OpenAiGateway } from "@/modules/ai/infrastructure/openai-gateway";
import { getAiEnvironment, type AiEnvironment } from "@/platform/env/ai";

export interface AiAvailability {
  readonly enabled: boolean;
  readonly provider: AiEnvironment["AI_PROVIDER"];
  readonly model: string;
}

export function describeAiAvailability(): AiAvailability {
  const environment = getAiEnvironment();
  return {
    enabled: environment.AI_PROVIDER !== "disabled",
    provider: environment.AI_PROVIDER,
    model: environment.AI_PROVIDER === "fake" ? "fake" : environment.AI_MODEL,
  };
}

/**
 * Chooses the configured gateway. `disabled` (the default) keeps every
 * workflow usable without a provider; `fake` is deterministic for local
 * development and tests; `openai` needs a server-side key.
 */
export function resolveModelGateway(): ModelGateway {
  const environment = getAiEnvironment();
  switch (environment.AI_PROVIDER) {
    case "disabled":
      throw new GatewayError(
        "DISABLED",
        "AI is disabled in this environment (AI_PROVIDER=disabled)",
      );
    case "fake":
      return new FakeModelGateway();
    case "openai":
      if (environment.OPENAI_API_KEY === undefined)
        throw new GatewayError(
          "CONFIGURATION",
          "AI_PROVIDER=openai requires OPENAI_API_KEY on the server",
        );
      return new OpenAiGateway({
        apiKey: environment.OPENAI_API_KEY,
        model: environment.AI_MODEL,
        timeoutMs: environment.AI_TIMEOUT_MS,
      });
  }
}
