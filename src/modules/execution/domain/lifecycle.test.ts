import { describe, expect, it } from "vitest";

import {
  assertAssigneeHasAccess,
  assertTransition,
  canTransition,
  phaseRequiresReason,
} from "./lifecycle";

describe("execution lifecycle", () => {
  it("accepts explicit forward and operating transitions", () => {
    expect(canTransition("DRAFT", "OPEN")).toBe(true);
    expect(canTransition("IN_PROGRESS", "BLOCKED")).toBe(true);
    expect(canTransition("UNDER_REVIEW", "COMPLETED")).toBe(true);
  });

  it("rejects arbitrary transitions and terminal archive changes", () => {
    expect(() => assertTransition("DRAFT", "COMPLETED")).toThrow(
      "Invalid transition",
    );
    expect(canTransition("ARCHIVED", "OPEN")).toBe(false);
  });

  it("requires a reason only when a PDCA returns to an earlier phase", () => {
    expect(phaseRequiresReason("CHECK", "PLAN")).toBe(true);
    expect(phaseRequiresReason("DO", "ACT")).toBe(false);
  });

  it("never treats a people relationship as an access grant", () => {
    expect(() => assertAssigneeHasAccess("watcher", false)).toThrow(
      "explicit grant is a separate security operation",
    );
    expect(() => assertAssigneeHasAccess("owner", true)).not.toThrow();
  });
});
