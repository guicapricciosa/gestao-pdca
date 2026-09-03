import { describe, expect, it } from "vitest";

import { canTransitionMeeting, meetingPublishIssues } from "./lifecycle";

describe("meeting lifecycle", () => {
  it("permits the review and publication path", () => {
    expect(canTransitionMeeting("IN_PROGRESS", "REVIEW")).toBe(true);
    expect(canTransitionMeeting("REVIEW", "PUBLISHED")).toBe(true);
    expect(canTransitionMeeting("PUBLISHED", "CLOSED")).toBe(true);
  });

  it("rejects skipping review", () => {
    expect(canTransitionMeeting("IN_PROGRESS", "PUBLISHED")).toBe(false);
    expect(canTransitionMeeting("CLOSED", "IN_PROGRESS")).toBe(false);
  });

  it("reports publish blockers deterministically", () => {
    expect(
      meetingPublishIssues({
        agendaStatuses: ["PENDING"],
        createdObjects: [
          { type: "TASK", complete: false, accessible: true },
          { type: "PDCA", complete: true, accessible: false },
        ],
      }),
    ).toEqual([
      "AGENDA_WITHOUT_OUTCOME",
      "INCOMPLETE_DRAFT",
      "INACCESSIBLE_OBJECT",
    ]);
  });
});
