import { z } from "zod";

import { databaseUuidSchema } from "@/shared/validation/database";

import { executionStatuses, pdcaPhases, priorityLevels } from "./types";

const uuid = databaseUuidSchema;

export const scopeSchema = z.object({
  companyId: uuid,
  unitIds: z.array(uuid).max(50).default([]),
  restaurantIds: z.array(uuid).max(100).default([]),
  visibility: z.enum(["NORMAL", "RESTRICTED", "PRIVATE"]).default("NORMAL"),
});

export const listFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: z.enum([...executionStatuses, "ACTIVE"]).optional(),
  priority: z.enum(priorityLevels).optional(),
  ownerId: uuid.optional(),
  responsibleId: uuid.optional(),
  restaurantId: uuid.optional(),
  unitId: uuid.optional(),
  overdue: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const transitionSchema = z.object({
  expectedVersion: z.number().int().positive(),
  status: z.enum(executionStatuses),
  reason: z.string().trim().min(3).max(1000).optional(),
});

export const pdcaPhaseSchema = z.object({
  expectedVersion: z.number().int().positive(),
  phase: z.enum(pdcaPhases),
  reason: z.string().trim().min(3).max(1000).optional(),
});
