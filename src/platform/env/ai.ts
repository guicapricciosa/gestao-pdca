import "server-only";

import { z } from "zod";

const aiEnvironmentSchema = z.object({
  AI_PROVIDER: z.enum(["disabled", "fake", "openai"]).default("disabled"),
  OPENAI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  AI_MAX_INPUT_CHARS: z.coerce.number().int().positive().default(40_000),
});

export type AiEnvironment = z.infer<typeof aiEnvironmentSchema>;

export function getAiEnvironment(): AiEnvironment {
  return aiEnvironmentSchema.parse({
    AI_PROVIDER: process.env.AI_PROVIDER || undefined,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || undefined,
    AI_MODEL: process.env.AI_MODEL || undefined,
    AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS || undefined,
    AI_MAX_INPUT_CHARS: process.env.AI_MAX_INPUT_CHARS || undefined,
  });
}
