import { describe, expect, it, vi } from "vitest";

import type { ExecutionRepository } from "./repository";
import { ExecutionService } from "./service";

function repository(): ExecutionRepository {
  return {
    createDecision: vi.fn(async () => "decision-id"),
    createTask: vi.fn(async () => "task-id"),
    createPdca: vi.fn(async () => "pdca-id"),
    listDecisions: vi.fn(async (filters) => ({
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    })),
    listTasks: vi.fn(async (filters) => ({
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    })),
    listPdcas: vi.fn(async (filters) => ({
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 25,
    })),
  };
}

const scope = {
  companyId: "10000000-0000-4000-8000-000000000001",
  unitIds: [],
  restaurantIds: [],
  visibility: "NORMAL" as const,
};

describe("ExecutionService", () => {
  it("validates a Task before invoking persistence", async () => {
    const repo = repository();
    const service = new ExecutionService(repo);
    await expect(
      service.createTask({ ...scope, title: "Ação concreta" }),
    ).resolves.toBe("task-id");
    await expect(
      service.createTask({ ...scope, title: "x" }),
    ).rejects.toThrow();
    expect(repo.createTask).toHaveBeenCalledTimes(1);
  });

  it("keeps PDCA dimensions independent", async () => {
    const repo = repository();
    const service = new ExecutionService(repo);
    await service.createPdca({
      ...scope,
      title: "Melhorar processo",
      priority: "LOW",
      impact: "CRITICAL",
      risk: "HIGH",
    });
    expect(repo.createPdca).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: "LOW",
        impact: "CRITICAL",
        risk: "HIGH",
      }),
    );
  });

  it("rejects unbounded pagination", async () => {
    const service = new ExecutionService(repository());
    await expect(service.listTasks({ pageSize: 101 })).rejects.toThrow();
  });
});
