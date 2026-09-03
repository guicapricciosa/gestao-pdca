import type {
  CreateDecision,
  DecisionSummary,
} from "@/modules/decisions/domain/decision";
import type { ListFilters, Page } from "@/modules/execution/domain/types";
import type { CreatePdca, PdcaSummary } from "@/modules/pdca/domain/pdca";
import type { CreateTask, TaskSummary } from "@/modules/tasks/domain/task";

export interface ExecutionRepository {
  createDecision(command: CreateDecision): Promise<string>;
  createTask(command: CreateTask): Promise<string>;
  createPdca(command: CreatePdca): Promise<string>;
  listDecisions(filters: ListFilters): Promise<Page<DecisionSummary>>;
  listTasks(filters: ListFilters): Promise<Page<TaskSummary>>;
  listPdcas(filters: ListFilters): Promise<Page<PdcaSummary>>;
}
