import { z } from "zod";
import { databaseUuidSchema } from "@/shared/validation/database";

import { priorityLevels } from "@/modules/execution/domain/types";
import { scopeSchema } from "@/modules/execution/domain/validation";

export const createPdcaSchema = scopeSchema.extend({
  title: z.string().trim().min(2).max(240),
  problemStatement: z.string().trim().max(20_000).nullable().default(null),
  objective: z.string().trim().max(20_000).nullable().default(null),
  rootCauseOrHypothesis: z.string().trim().max(20_000).nullable().default(null),
  priority: z.enum(priorityLevels).default("MEDIUM"),
  impact: z.enum(priorityLevels).default("MEDIUM"),
  risk: z.enum(priorityLevels).default("MEDIUM"),
  ownerProfileId: databaseUuidSchema.nullable().default(null),
  responsibleProfileId: databaseUuidSchema.nullable().default(null),
  startDate: z.iso.date().nullable().default(null),
  dueDate: z.iso.date().nullable().default(null),
  originatingDecisionId: databaseUuidSchema.nullable().default(null),
});

export type CreatePdca = z.infer<typeof createPdcaSchema>;

export interface PdcaSummary {
  readonly id: string;
  readonly securityObjectId: string;
  readonly title: string;
  readonly problemStatement: string | null;
  readonly objective: string | null;
  readonly status: string;
  readonly phase: "PLAN" | "DO" | "CHECK" | "ACT";
  readonly priority: string;
  readonly impact: string;
  readonly risk: string;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  /** Display names as seen by the caller; null when unset or not visible. */
  readonly ownerName?: string | null;
  readonly responsibleName?: string | null;
  readonly dueDate: string | null;
  readonly version: number;
  readonly updatedAt: string;
}
