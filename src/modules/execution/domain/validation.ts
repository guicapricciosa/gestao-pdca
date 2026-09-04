import { z } from "zod";

import { databaseUuidSchema } from "@/shared/validation/database";

import {
  executionStatuses,
  listSortKeys,
  pdcaPhases,
  priorityLevels,
} from "./types";

const uuid = databaseUuidSchema;

export const scopeSchema = z.object({
  companyId: uuid,
  unitIds: z.array(uuid).max(50).default([]),
  restaurantIds: z.array(uuid).max(100).default([]),
  visibility: z.enum(["NORMAL", "RESTRICTED", "PRIVATE"]).default("NORMAL"),
});

const many = <T extends z.ZodTypeAny>(item: T) =>
  z.array(item).max(50).min(1).optional();

export const listFiltersSchema = z.object({
  query: z.string().trim().max(200).optional(),
  status: many(z.enum([...executionStatuses, "ACTIVE"])),
  priority: many(z.enum(priorityLevels)),
  ownerId: many(uuid),
  responsibleId: many(uuid),
  restaurantId: many(uuid),
  unitId: many(uuid),
  overdue: z.boolean().optional(),
  sort: z.enum(listSortKeys).optional(),
  direction: z.enum(["asc", "desc"]).optional(),
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
