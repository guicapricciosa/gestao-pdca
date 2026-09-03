import "server-only";

import { z } from "zod";

const serverEnvironmentSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ATTACHMENT_MAX_BYTES: z.coerce.number().int().positive().default(10_485_760),
  ATTACHMENT_MAX_PER_OBJECT: z.coerce.number().int().positive().default(25),
  ATTACHMENT_ALLOWED_MIME_TYPES: z
    .string()
    .default("application/pdf,image/png,image/jpeg,text/plain"),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function getServerEnvironment(): ServerEnvironment {
  return serverEnvironmentSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ATTACHMENT_MAX_BYTES: process.env.ATTACHMENT_MAX_BYTES,
    ATTACHMENT_MAX_PER_OBJECT: process.env.ATTACHMENT_MAX_PER_OBJECT,
    ATTACHMENT_ALLOWED_MIME_TYPES: process.env.ATTACHMENT_ALLOWED_MIME_TYPES,
  });
}
