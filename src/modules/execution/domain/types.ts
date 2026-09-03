export const executionStatuses = [
  "DRAFT",
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "UNDER_REVIEW",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type ExecutionStatus = (typeof executionStatuses)[number];

export const priorityLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type PriorityLevel = (typeof priorityLevels)[number];

export const pdcaPhases = ["PLAN", "DO", "CHECK", "ACT"] as const;
export type PdcaPhase = (typeof pdcaPhases)[number];

export type Visibility = "NORMAL" | "RESTRICTED" | "PRIVATE";

export interface ScopeInput {
  readonly companyId: string;
  readonly unitIds: readonly string[];
  readonly restaurantIds: readonly string[];
  readonly visibility: Visibility;
}

export interface ListFilters {
  readonly query?: string | undefined;
  readonly status?: ExecutionStatus | "ACTIVE" | undefined;
  readonly priority?: PriorityLevel | undefined;
  readonly ownerId?: string | undefined;
  readonly responsibleId?: string | undefined;
  readonly restaurantId?: string | undefined;
  readonly unitId?: string | undefined;
  readonly overdue?: boolean | undefined;
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
}

export class DomainRuleError extends Error {
  override readonly name = "DomainRuleError";
}
