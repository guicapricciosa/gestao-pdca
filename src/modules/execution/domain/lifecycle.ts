import type { ExecutionStatus, PdcaPhase } from "./types";
import { DomainRuleError } from "./types";

const transitions: Readonly<
  Record<ExecutionStatus, readonly ExecutionStatus[]>
> = {
  DRAFT: ["OPEN", "PLANNED", "CANCELLED", "ARCHIVED"],
  OPEN: [
    "PLANNED",
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING",
    "CANCELLED",
    "ARCHIVED",
  ],
  PLANNED: [
    "OPEN",
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING",
    "CANCELLED",
    "ARCHIVED",
  ],
  IN_PROGRESS: [
    "BLOCKED",
    "WAITING",
    "UNDER_REVIEW",
    "COMPLETED",
    "CANCELLED",
    "ARCHIVED",
  ],
  BLOCKED: ["IN_PROGRESS", "WAITING", "CANCELLED", "ARCHIVED"],
  WAITING: ["IN_PROGRESS", "BLOCKED", "UNDER_REVIEW", "CANCELLED", "ARCHIVED"],
  UNDER_REVIEW: ["IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"],
  COMPLETED: ["OPEN", "PLANNED", "IN_PROGRESS", "ARCHIVED"],
  CANCELLED: ["OPEN", "PLANNED", "ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(from: ExecutionStatus, to: ExecutionStatus) {
  return transitions[from].includes(to);
}

export function assertTransition(from: ExecutionStatus, to: ExecutionStatus) {
  if (!canTransition(from, to)) {
    throw new DomainRuleError(`Invalid transition from ${from} to ${to}`);
  }
}

const phaseOrder: Readonly<Record<PdcaPhase, number>> = {
  PLAN: 0,
  DO: 1,
  CHECK: 2,
  ACT: 3,
};

export function phaseRequiresReason(from: PdcaPhase, to: PdcaPhase) {
  return phaseOrder[to] < phaseOrder[from];
}

export function assertAssigneeHasAccess(
  relationship: "owner" | "responsible" | "collaborator" | "watcher",
  hasAccess: boolean,
) {
  if (!hasAccess) {
    throw new DomainRuleError(
      `${relationship} must already have access; an explicit grant is a separate security operation`,
    );
  }
}
