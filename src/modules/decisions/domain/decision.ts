import { z } from "zod";
import { databaseUuidSchema } from "@/shared/validation/database";

import { scopeSchema } from "@/modules/execution/domain/validation";

export const decisionStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export const decisionStatusSchema = z.enum(decisionStatuses);

export const createDecisionSchema = scopeSchema.extend({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(20_000).nullable().default(null),
  decisionDate: z.iso.date(),
  decidedByProfileId: databaseUuidSchema.nullable().default(null),
});

export type CreateDecision = z.infer<typeof createDecisionSchema>;

export interface DecisionSummary {
  readonly id: string;
  readonly securityObjectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly decisionDate: string;
  readonly status: z.infer<typeof decisionStatusSchema>;
  readonly decidedByProfileId: string | null;
  readonly createdByProfileId: string;
  readonly version: number;
  readonly updatedAt: string;
}
