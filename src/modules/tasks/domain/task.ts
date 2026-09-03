import { z } from "zod";
import { databaseUuidSchema } from "@/shared/validation/database";

import { priorityLevels } from "@/modules/execution/domain/types";
import { scopeSchema } from "@/modules/execution/domain/validation";

export const createTaskSchema = scopeSchema.extend({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(20_000).nullable().default(null),
  priority: z.enum(priorityLevels).default("MEDIUM"),
  ownerProfileId: databaseUuidSchema.nullable().default(null),
  responsibleProfileId: databaseUuidSchema.nullable().default(null),
  startDate: z.iso.date().nullable().default(null),
  dueDate: z.iso.date().nullable().default(null),
  pdcaId: databaseUuidSchema.nullable().default(null),
  originatingDecisionId: databaseUuidSchema.nullable().default(null),
});

export type CreateTask = z.infer<typeof createTaskSchema>;

export interface TaskSummary {
  readonly id: string;
  readonly securityObjectId: string;
  readonly title: string;
  readonly description: string | null;
  readonly status: string;
  readonly priority: string;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  readonly dueDate: string | null;
  readonly completedAt: string | null;
  readonly version: number;
  readonly updatedAt: string;
}
