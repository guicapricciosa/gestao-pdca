import { describe, expect, it } from "vitest";

import {
  validateMeetingAssistantOutput,
  validateMeetingSummaryOutput,
  validateValidatorOutput,
} from "./output-validation";
import type { ContextCandidates } from "./types";

const candidates: ContextCandidates = {
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
const segmentIds = ["note:n1", "agenda:aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"];

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    type: "TASK",
    title: "Rever escala de limpeza",
    description: "Ajustar turnos de limpeza",
    objective: null,
    priority: "HIGH",
    ownerCandidateId: "11111111-1111-1111-1111-111111111111",
    responsibleCandidateId: "22222222-2222-2222-2222-222222222222",
    unresolvedNames: [],
    dueDate: "2026-09-30",
    agendaItemId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    citations: ["note:n1"],
    confidence: 0.8,
    rationale: "Discutido na nota 1",
    ...overrides,
  };
}

describe("validateMeetingAssistantOutput", () => {
  it("accepts a fully grounded proposal without warnings", () => {
    const result = validateMeetingAssistantOutput(
      { proposals: [proposal()] },
      candidates,
      segmentIds,
    );
    expect(result.rejected).toEqual([]);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      version: 1,
      type: "TASK",
      ownerProfileId: "11111111-1111-1111-1111-111111111111",
      responsibleProfileId: "22222222-2222-2222-2222-222222222222",
      dueDate: "2026-09-30",
      warnings: [],
    });
  });

  it("drops identifiers that are not in the authorized candidate lists", () => {
    const result = validateMeetingAssistantOutput(
      {
        proposals: [
          proposal({
            ownerCandidateId: "99999999-9999-9999-9999-999999999999",
            agendaItemId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          }),
        ],
      },
      candidates,
      segmentIds,
    );
    const [item] = result.proposals;
    expect(item?.ownerProfileId).toBeNull();
    expect(item?.agendaItemId).toBeNull();
    expect(item?.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Owner"),
        expect.stringContaining("agenda"),
      ]),
    );
  });

  it("rejects deadlines in the past or malformed and unknown enum values", () => {
    const result = validateMeetingAssistantOutput(
      {
        proposals: [
          proposal({ dueDate: "2026-01-01", priority: "URGENT" }),
          proposal({ dueDate: "next week" }),
        ],
      },
      candidates,
      segmentIds,
    );
    expect(result.proposals.map((item) => item.dueDate)).toEqual([null, null]);
    expect(result.proposals[0]?.priority).toBe("MEDIUM");
    expect(result.proposals[0]?.warnings.join(" ")).toMatch(/priority/i);
  });

  it("filters citations to known segments and warns when none remain", () => {
    const result = validateMeetingAssistantOutput(
      { proposals: [proposal({ citations: ["note:unknown"] })] },
      candidates,
      segmentIds,
    );
    expect(result.proposals[0]?.citations).toEqual([]);
    expect(result.proposals[0]?.warnings.join(" ")).toMatch(/citation/i);
  });

  it("rejects proposals with unusable titles or types instead of persisting them", () => {
    const result = validateMeetingAssistantOutput(
      {
        proposals: [
          proposal({ title: "x" }),
          proposal({ type: "PROJECT", title: "Projecto novo" }),
        ],
      },
      candidates,
      segmentIds,
    );
    expect(result.proposals).toEqual([]);
    expect(result.rejected).toHaveLength(2);
  });

  it("clamps confidence and requires an objective for PDCAs", () => {
    const result = validateMeetingAssistantOutput(
      {
        proposals: [
          proposal({ type: "PDCA", objective: null, confidence: 7 }),
          proposal({ type: "PDCA", objective: "Reduzir desperdício" }),
        ],
      },
      candidates,
      segmentIds,
    );
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0]?.confidence).toBe(1);
    expect(result.proposals[0]?.warnings.join(" ")).toMatch(/objective/i);
  });

  it("rejects payloads that do not match the schema at all", () => {
    expect(() =>
      validateMeetingAssistantOutput({ items: [] }, candidates, segmentIds),
    ).toThrow();
  });
});

describe("validateMeetingSummaryOutput", () => {
  it("keeps only known citations and trims content", () => {
    const result = validateMeetingSummaryOutput(
      {
        summary: "  Reunião focada em limpeza.  ",
        highlights: ["Escala revista"],
        openQuestions: [],
        citations: ["note:n1", "note:ghost"],
      },
      segmentIds,
    );
    expect(result).toMatchObject({
      version: 1,
      type: "SUMMARY",
      summary: "Reunião focada em limpeza.",
      citations: ["note:n1"],
    });
    expect(result.warnings).toHaveLength(1);
  });

  it("rejects an empty summary", () => {
    expect(() =>
      validateMeetingSummaryOutput(
        { summary: "  ", highlights: [], openQuestions: [], citations: [] },
        segmentIds,
      ),
    ).toThrow();
  });
});

describe("validateValidatorOutput", () => {
  it("labels findings as AI and clamps confidence", () => {
    const findings = validateValidatorOutput(
      {
        findings: [
          {
            code: "OBJECTIVE_UNCLEAR",
            severity: "WARNING",
            message: "O objetivo não é mensurável.",
            confidence: 1.4,
            citations: ["record:task-1"],
          },
        ],
      },
      ["record:task-1"],
    );
    expect(findings).toEqual([
      {
        version: 1,
        type: "FINDING",
        code: "OBJECTIVE_UNCLEAR",
        severity: "WARNING",
        message: "O objetivo não é mensurável.",
        source: "AI",
        confidence: 1,
        evidence: ["record:task-1"],
      },
    ]);
  });

  it("normalizes unknown codes and severities defensively", () => {
    const [finding] = validateValidatorOutput(
      {
        findings: [
          {
            code: "drop table",
            severity: "FATAL",
            message: "x",
            confidence: 0.2,
            citations: [],
          },
        ],
      },
      [],
    );
    expect(finding?.code).toBe("AI_OBSERVATION");
    expect(finding?.severity).toBe("INFO");
  });
});
