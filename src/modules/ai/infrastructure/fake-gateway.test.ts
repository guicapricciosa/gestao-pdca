import { describe, expect, it } from "vitest";

import type { GatewayRequest } from "../application/gateway";
import { FakeModelGateway } from "./fake-gateway";

const candidates = {
  people: [
    { id: "11111111-1111-1111-1111-111111111111", name: "CEO" },
    {
      id: "22222222-2222-2222-2222-222222222222",
      name: "Restaurant Manager A",
    },
  ],
  agendaItems: [
    { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", title: "Limpeza" },
  ],
  today: "2026-09-03",
};

function request(
  useCase: GatewayRequest["useCase"],
  segments: GatewayRequest["segments"],
): GatewayRequest {
  return {
    useCase,
    templateVersion: "v1",
    instructions: "ignored by the fake gateway",
    segments,
    candidates,
  };
}

describe("FakeModelGateway", () => {
  it("extracts marked lines from notes into typed proposals with citations", async () => {
    const gateway = new FakeModelGateway();
    const result = await gateway.complete(
      request("MEETING_ASSISTANT", [
        {
          id: "note:n1",
          role: "NOTE",
          text: [
            "Decisão: Fechar a esplanada às 23h",
            "Tarefa: Rever escala de limpeza | responsável: Restaurant Manager A | prazo: 2026-09-30",
            "PDCA: Reduzir desperdício | objetivo: -10% em 3 meses",
            "Nada a assinalar",
          ].join("\n"),
        },
      ]),
    );
    const output = result.output as {
      proposals: {
        type: string;
        title: string;
        responsibleCandidateId: string | null;
        dueDate: string | null;
        objective: string | null;
        citations: string[];
      }[];
    };
    expect(output.proposals.map((item) => item.type)).toEqual([
      "DECISION",
      "TASK",
      "PDCA",
    ]);
    expect(output.proposals[1]).toMatchObject({
      title: "Rever escala de limpeza",
      responsibleCandidateId: "22222222-2222-2222-2222-222222222222",
      dueDate: "2026-09-30",
      citations: ["note:n1"],
    });
    expect(output.proposals[2]?.objective).toBe("-10% em 3 meses");
    expect(result.model).toBe("fake");
  });

  it("reports unresolved names instead of inventing identifiers", async () => {
    const gateway = new FakeModelGateway();
    const result = await gateway.complete(
      request("MEETING_ASSISTANT", [
        {
          id: "input:1",
          role: "INPUT",
          text: "Tarefa: Comprar fardas | responsável: Pessoa Inexistente",
        },
      ]),
    );
    const output = result.output as {
      proposals: {
        responsibleCandidateId: string | null;
        unresolvedNames: string[];
      }[];
    };
    expect(output.proposals[0]?.responsibleCandidateId).toBeNull();
    expect(output.proposals[0]?.unresolvedNames).toEqual([
      "Pessoa Inexistente",
    ]);
  });

  it("summarizes agenda and notes deterministically", async () => {
    const gateway = new FakeModelGateway();
    const result = await gateway.complete(
      request("MEETING_SUMMARY", [
        { id: "agenda:a1", role: "AGENDA", text: "Limpeza · DISCUSSED" },
        { id: "note:n1", role: "NOTE", text: "Escala revista." },
      ]),
    );
    const output = result.output as { summary: string; citations: string[] };
    expect(output.summary).toContain("Limpeza");
    expect(output.citations).toEqual(["agenda:a1", "note:n1"]);
  });

  it("raises a qualitative finding for a vague objective", async () => {
    const gateway = new FakeModelGateway();
    const result = await gateway.complete(
      request("EXECUTION_VALIDATOR", [
        { id: "record:t1", role: "TARGET", text: "objective: Melhorar" },
      ]),
    );
    const output = result.output as { findings: { code: string }[] };
    expect(output.findings.map((finding) => finding.code)).toEqual([
      "OBJECTIVE_UNCLEAR",
    ]);
  });
});
