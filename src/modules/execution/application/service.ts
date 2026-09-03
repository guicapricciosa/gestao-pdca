import { createDecisionSchema } from "@/modules/decisions/domain/decision";
import { listFiltersSchema } from "@/modules/execution/domain/validation";
import { createPdcaSchema } from "@/modules/pdca/domain/pdca";
import { createTaskSchema } from "@/modules/tasks/domain/task";

import type { ExecutionRepository } from "./repository";

export class ExecutionService {
  constructor(private readonly repository: ExecutionRepository) {}

  async createDecision(input: unknown) {
    return await this.repository.createDecision(
      createDecisionSchema.parse(input),
    );
  }

  async createTask(input: unknown) {
    return await this.repository.createTask(createTaskSchema.parse(input));
  }

  async createPdca(input: unknown) {
    return await this.repository.createPdca(createPdcaSchema.parse(input));
  }

  async listDecisions(input: unknown) {
    return await this.repository.listDecisions(listFiltersSchema.parse(input));
  }

  async listTasks(input: unknown) {
    return await this.repository.listTasks(listFiltersSchema.parse(input));
  }

  async listPdcas(input: unknown) {
    return await this.repository.listPdcas(listFiltersSchema.parse(input));
  }
}
