import { describe, expect, it, vi } from "vitest";

import type { AiContext } from "../domain/types";
import { GatewayError, type ModelGateway } from "./gateway";
import type { AiRepository } from "./repository";
import { AiRunFailure, runUseCase } from "./run-use-case";

const context: AiContext = {
  segments: [{ id: "note:n1", role: "NOTE", text: "Tarefa: Rever escala" }],
  candidates: { people: [], agendaItems: [], today: "2026-09-03" },
  sources: [
    { securityObjectId: "obj-link", sourceVersion: null, contextRole: "LINK" },
  ],
  truncated: false,
};

function repository(): AiRepository & {
  readonly calls: { readonly method: string; readonly args: unknown[] }[];
} {
  const calls: { method: string; args: unknown[] }[] = [];
  return {
    calls,
    startRun: vi.fn(async (...args) => {
      calls.push({ method: "startRun", args });
      return "run-1";
    }),
    recordSources: vi.fn(async (...args) => {
      calls.push({ method: "recordSources", args });
    }),
    completeRun: vi.fn(async (...args) => {
      calls.push({ method: "completeRun", args });
    }),
    addProposal: vi.fn(async (...args) => {
      calls.push({ method: "addProposal", args });
      return `proposal-${calls.length}`;
    }),
  };
}

function gateway(output: unknown): ModelGateway {
  return {
    provider: "test",
    model: "test",
    complete: vi.fn(async () => ({
      output,
      provider: "test",
      model: "test",
      inputTokens: 10,
      outputTokens: 5,
      latencyMs: 7,
    })),
  };
}

describe("runUseCase", () => {
  it("authorizes first, records sources, persists validated proposals and closes the run", async () => {
    const repo = repository();
    const result = await runUseCase({
      repository: repo,
      gateway: gateway({ anything: true }),
      useCase: "MEETING_ASSISTANT",
      companyId: "company",
      targetSecurityObjectId: "obj-target",
      context,
      validate: () => ({
        proposals: [
          {
            type: "TASK",
            payload: {
              version: 1,
              type: "TASK",
              title: "Rever escala",
              description: "",
              objective: null,
              priority: "MEDIUM",
              ownerProfileId: null,
              responsibleProfileId: null,
              dueDate: null,
              agendaItemId: null,
              unresolvedNames: [],
              citations: ["note:n1"],
              confidence: 0.5,
              rationale: "",
              warnings: [],
            },
          },
        ],
        rejected: [{ title: "x", reason: "too short" }],
      }),
    });
    expect(repo.calls.map((call) => call.method)).toEqual([
      "startRun",
      "recordSources",
      "addProposal",
      "completeRun",
    ]);
    expect(result.proposals[0]?.id).toBe("proposal-3");
    expect(result.rejected).toHaveLength(1);
    expect(repo.completeRun).toHaveBeenLastCalledWith("run-1", {
      status: "SUCCEEDED",
      inputTokens: 10,
      outputTokens: 5,
      latencyMs: 7,
    });
  });

  it("marks the run FAILED with the gateway category and persists nothing", async () => {
    const repo = repository();
    const failing: ModelGateway = {
      provider: "test",
      model: "test",
      complete: vi.fn(async () => {
        throw new GatewayError("TIMEOUT", "too slow");
      }),
    };
    await expect(
      runUseCase({
        repository: repo,
        gateway: failing,
        useCase: "MEETING_SUMMARY",
        companyId: "company",
        targetSecurityObjectId: "obj-target",
        context,
        validate: () => ({ proposals: [], rejected: [] }),
      }),
    ).rejects.toMatchObject({ category: "TIMEOUT", runId: "run-1" });
    expect(repo.addProposal).not.toHaveBeenCalled();
    expect(repo.completeRun).toHaveBeenCalledWith("run-1", {
      status: "FAILED",
      errorCategory: "TIMEOUT",
    });
  });

  it("treats invalid structured output as a SCHEMA failure", async () => {
    const repo = repository();
    const error = await runUseCase({
      repository: repo,
      gateway: gateway({ nonsense: 1 }),
      useCase: "MEETING_SUMMARY",
      companyId: "company",
      targetSecurityObjectId: "obj-target",
      context,
      validate: () => {
        throw new Error("schema mismatch");
      },
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(AiRunFailure);
    expect((error as AiRunFailure).category).toBe("SCHEMA");
  });

  it("does not call the model when authorization fails at run start", async () => {
    const repo = repository();
    repo.startRun = vi.fn(async () => {
      throw new Error("AI target not found or access denied");
    });
    const model = gateway({});
    await expect(
      runUseCase({
        repository: repo,
        gateway: model,
        useCase: "MEETING_ASSISTANT",
        companyId: "company",
        targetSecurityObjectId: "obj-target",
        context,
        validate: () => ({ proposals: [], rejected: [] }),
      }),
    ).rejects.toThrow(/access denied/);
    expect(model.complete).not.toHaveBeenCalled();
  });
});
