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

export const listSortKeys = [
  "title",
  "status",
  "phase",
  "priority",
  "due_date",
  "updated_at",
  "responsible",
  "owner",
  "decision_date",
] as const;
export type ListSortKey = (typeof listSortKeys)[number];
export type SortDirection = "asc" | "desc";

/**
 * Every selector accepts several values (multi-select filters). Status keeps
 * the virtual "ACTIVE" value meaning "everything except archived".
 */
export interface ListFilters {
  readonly query?: string | undefined;
  readonly status?: readonly (ExecutionStatus | "ACTIVE")[] | undefined;
  readonly priority?: readonly PriorityLevel[] | undefined;
  readonly ownerId?: readonly string[] | undefined;
  readonly responsibleId?: readonly string[] | undefined;
  readonly restaurantId?: readonly string[] | undefined;
  readonly unitId?: readonly string[] | undefined;
  readonly overdue?: boolean | undefined;
  readonly sort?: ListSortKey | undefined;
  readonly direction?: SortDirection | undefined;
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
