import { describe, expect, it } from "vitest";

import {
  describeRecurrence,
  nextOccurrence,
  parseRecurrence,
  presetRecurrence,
} from "./recurrence";

const start = new Date(2026, 8, 10, 10, 0); // Thursday 10 Sep 2026 10:00

describe("recurrence", () => {
  it("describes presets and custom rules in PT-PT", () => {
    expect(describeRecurrence(presetRecurrence("NONE", start))).toBe(
      "Não se repete",
    );
    expect(describeRecurrence(presetRecurrence("WEEKLY", start))).toBe(
      "Semanalmente à quinta",
    );
    expect(describeRecurrence(presetRecurrence("BIWEEKLY", start))).toBe(
      "Quinzenalmente à quinta",
    );
    expect(describeRecurrence(presetRecurrence("MONTHLY", start))).toBe(
      "Mensalmente, dia 10",
    );
    expect(
      describeRecurrence({
        freq: "WEEKLY",
        interval: 2,
        weekdays: [2, 4],
        end: { kind: "count", count: 6 },
      }),
    ).toBe("Quinzenalmente à terça, quinta, 6 vezes");
    expect(
      describeRecurrence({
        freq: "MONTHLY",
        interval: 1,
        monthly: { kind: "nth", nth: 1, weekday: 7 },
        end: { kind: "until", date: "2026-12-31" },
      }),
    ).toBe("Mensalmente, na primeira domingo até 31/12/2026");
  });

  it("finds the next occurrence for weekly rules with several days", () => {
    const rule = {
      freq: "WEEKLY" as const,
      interval: 1,
      weekdays: [2, 4],
      end: { kind: "never" as const },
    };
    const next = nextOccurrence(rule, start, start);
    expect(next?.toISOString()).toBe(
      new Date(2026, 8, 15, 10, 0).toISOString(),
    ); // next Tuesday
    const after = nextOccurrence(rule, start, next!);
    expect(after?.toISOString()).toBe(
      new Date(2026, 8, 17, 10, 0).toISOString(),
    );
  });

  it("respects intervals, monthly day/nth rules and end conditions", () => {
    const biweekly = presetRecurrence("BIWEEKLY", start);
    expect(nextOccurrence(biweekly, start, start)?.getDate()).toBe(24);
    const nth = {
      freq: "MONTHLY" as const,
      interval: 1,
      monthly: { kind: "nth" as const, nth: 1 as const, weekday: 7 },
      end: { kind: "never" as const },
    };
    expect(nextOccurrence(nth, start, start)?.toDateString()).toBe(
      new Date(2026, 9, 4).toDateString(),
    );
    const day15 = {
      freq: "MONTHLY" as const,
      interval: 1,
      monthly: { kind: "day" as const, day: 15 },
      end: { kind: "until" as const, date: "2026-09-30" },
    };
    expect(nextOccurrence(day15, start, start)?.getDate()).toBe(15);
    expect(nextOccurrence(day15, start, new Date(2026, 8, 16))).toBeNull();
    const counted = {
      freq: "DAILY" as const,
      interval: 1,
      end: { kind: "count" as const, count: 2 },
    };
    expect(nextOccurrence(counted, start, start, 2)).toBeNull();
  });

  it("parses submitted JSON defensively", () => {
    expect(parseRecurrence("")).toEqual({ freq: "NONE" });
    expect(parseRecurrence("nope")).toEqual({ freq: "NONE" });
    expect(
      parseRecurrence(
        JSON.stringify({
          freq: "WEEKLY",
          interval: 99,
          weekdays: [1, 9],
          end: { kind: "count", count: 0 },
        }),
      ),
    ).toEqual({
      freq: "WEEKLY",
      interval: 52,
      weekdays: [1],
      end: { kind: "count", count: 1 },
    });
  });
});
