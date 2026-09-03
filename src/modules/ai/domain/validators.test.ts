import { describe, expect, it } from "vitest";

import type { ExecutionRecordSnapshot } from "./types";
import { findSimilarOpenItems, validateExecutionRecord } from "./validators";

const today = new Date("2026-09-03T12:00:00Z");

function snapshot(
  overrides: Partial<ExecutionRecordSnapshot> = {},
): ExecutionRecordSnapshot {
  return {
    kind: "TASK",
    id: "task-1",
    title: "Rever escala de limpeza",
    status: "OPEN",
    ownerProfileId: "owner",
    responsibleProfileId: "responsible",
    dueDate: "2026-09-30",
    objective: null,
    problemStatement: null,
    expectedResult: null,
    actualResult: null,
    lastActivityAt: "2026-09-02T09:00:00Z",
    dueDateChangeCount: 0,
    activeBlockerSince: null,
    attachmentCount: 0,
    completedAt: null,
    ...overrides,
  };
}

function codes(record: ExecutionRecordSnapshot) {
  return validateExecutionRecord(record, { today }).map(
    (finding) => finding.code,
  );
}

describe("validateExecutionRecord", () => {
  it("reports nothing for a healthy open Task", () => {
    expect(codes(snapshot())).toEqual([]);
  });

  it("flags missing accountability as critical outside Draft", () => {
    const findings = validateExecutionRecord(
      snapshot({ ownerProfileId: null, responsibleProfileId: null }),
      { today },
    );
    expect(findings.map((finding) => [finding.code, finding.severity])).toEqual(
      expect.arrayContaining([
        ["MISSING_OWNER", "CRITICAL"],
        ["MISSING_RESPONSIBLE", "CRITICAL"],
      ]),
    );
    expect(
      findings.every((finding) => finding.source === "DETERMINISTIC"),
    ).toBe(true);
  });

  it("downgrades missing fields to warnings while the record is a Draft", () => {
    const findings = validateExecutionRecord(
      snapshot({ status: "DRAFT", responsibleProfileId: null, dueDate: null }),
      { today },
    );
    expect(findings.map((finding) => finding.severity)).toEqual([
      "WARNING",
      "WARNING",
    ]);
    expect(findings.map((finding) => finding.code)).toEqual([
      "MISSING_RESPONSIBLE",
      "MISSING_DUE_DATE",
    ]);
  });

  it("stays silent for terminal records", () => {
    expect(
      codes(
        snapshot({
          status: "CANCELLED",
          responsibleProfileId: null,
          dueDate: null,
        }),
      ),
    ).toEqual([]);
  });

  it("requires PDCA problem statement and objective", () => {
    expect(codes(snapshot({ kind: "PDCA" }))).toEqual([
      "PDCA_MISSING_PROBLEM",
      "PDCA_MISSING_OBJECTIVE",
    ]);
  });

  it("asks for an expected result once a PDCA is executing", () => {
    expect(
      codes(
        snapshot({
          kind: "PDCA",
          status: "IN_PROGRESS",
          problemStatement: "Desperdício elevado",
          objective: "Reduzir desperdício em 10%",
        }),
      ),
    ).toEqual(["PDCA_MISSING_EXPECTED_RESULT"]);
  });

  it("distinguishes overdue with recent update from overdue without update", () => {
    expect(
      codes(snapshot({ dueDate: "2026-09-01", lastActivityAt: "2026-09-02" })),
    ).toEqual(["OVERDUE"]);
    expect(
      codes(
        snapshot({
          dueDate: "2026-09-01",
          lastActivityAt: "2026-08-15T00:00:00Z",
        }),
      ),
    ).toEqual(["OVERDUE_WITHOUT_UPDATE", "STALE"]);
  });

  it("flags inactivity beyond the stale threshold", () => {
    expect(codes(snapshot({ lastActivityAt: "2026-08-10T00:00:00Z" }))).toEqual(
      ["STALE"],
    );
    expect(
      validateExecutionRecord(
        snapshot({ lastActivityAt: "2026-08-25T00:00:00Z" }),
        { today, staleDays: 5 },
      ).map((finding) => finding.code),
    ).toEqual(["STALE"]);
  });

  it("flags repeated postponement and long blockers", () => {
    expect(codes(snapshot({ dueDateChangeCount: 2 }))).toEqual([
      "REPEATED_POSTPONEMENT",
    ]);
    expect(codes(snapshot({ dueDateChangeCount: 1 }))).toEqual([]);
    expect(
      codes(
        snapshot({
          status: "BLOCKED",
          activeBlockerSince: "2026-08-20T00:00:00Z",
        }),
      ),
    ).toEqual(["LONG_BLOCKED"]);
  });

  it("flags a completed PDCA without evidence", () => {
    expect(
      codes(
        snapshot({
          kind: "PDCA",
          status: "COMPLETED",
          completedAt: "2026-09-01T00:00:00Z",
          problemStatement: "p",
          objective: "o",
          actualResult: null,
          attachmentCount: 0,
        }),
      ),
    ).toEqual(["COMPLETED_WITHOUT_EVIDENCE"]);
    expect(
      codes(
        snapshot({
          kind: "PDCA",
          status: "COMPLETED",
          completedAt: "2026-09-01T00:00:00Z",
          problemStatement: "p",
          objective: "o",
          actualResult: "Desperdício reduzido 12%",
        }),
      ),
    ).toEqual([]);
  });
});

describe("findSimilarOpenItems", () => {
  it("returns open items whose normalized titles overlap strongly", () => {
    const similar = findSimilarOpenItems("Rever escala de limpeza da cozinha", [
      {
        id: "a",
        title: "Rever a escala de limpeza na cozinha",
        status: "OPEN",
      },
      { id: "b", title: "Comprar fardas novas", status: "OPEN" },
      {
        id: "c",
        title: "Rever escala de limpeza da cozinha",
        status: "COMPLETED",
      },
    ]);
    expect(similar.map((item) => item.id)).toEqual(["a"]);
  });

  it("never returns the record itself", () => {
    expect(
      findSimilarOpenItems(
        "Rever escala",
        [{ id: "self", title: "Rever escala", status: "OPEN" }],
        "self",
      ),
    ).toEqual([]);
  });
});
