import { describe, expect, it } from "vitest";

import { describeCommandError } from "./describe";

describe("describeCommandError", () => {
  it("translates domain rule failures into actionable Portuguese", () => {
    expect(describeCommandError("optimistic concurrency conflict")).toMatch(
      /alterou este registo/,
    );
    expect(
      describeCommandError(
        "production task requires owner, responsible and due date",
      ),
    ).toMatch(/Owner, Responsible e prazo/);
    expect(
      describeCommandError(
        "all agenda items require an outcome before publication",
      ),
    ).toMatch(/agenda/);
    expect(describeCommandError("task not found or access denied")).toMatch(
      /Sem permissão/,
    );
  });

  it("never echoes raw SQL or unknown provider text", () => {
    const message = describeCommandError(
      'ERROR: column "x" does not exist at character 12',
    );
    expect(message).not.toMatch(/column|ERROR/);
    expect(message).toMatch(/Não foi possível/);
  });

  it("treats network failures as a service problem", () => {
    expect(describeCommandError("TypeError: fetch failed")).toMatch(/servidor/);
  });
});
