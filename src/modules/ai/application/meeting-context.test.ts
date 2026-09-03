import { describe, expect, it } from "vitest";

import {
  buildMeetingContext,
  type MeetingContextInput,
} from "./meeting-context";

const input: MeetingContextInput = {
  session: {
    id: "s1",
    title: "Weekly",
    status: "IN_PROGRESS",
    scheduled_start_at: "2026-09-04T16:00:00Z",
    scheduled_end_at: "2026-09-04T17:00:00Z",
  },
  agenda: [
    {
      id: "a2",
      title: "Fardas",
      description: null,
      status: "PENDING",
      position: 2,
    },
    {
      id: "a1",
      title: "Limpeza",
      description: "Escala",
      status: "DISCUSSED",
      position: 1,
    },
  ],
  notes: [
    {
      id: "n1",
      content: "Rever escala",
      meeting_agenda_item_id: "a1",
      author: { display_name: "CEO" },
    },
  ],
  links: [
    {
      security_object_id: "obj-1",
      relation_type: "DISCUSSED",
      objectType: "PDCA",
      record: { title: "Reduzir desperdício", status: "OPEN" },
    },
  ],
  people: [{ profile_id: "p1", display_name: "CEO" }],
};

describe("buildMeetingContext", () => {
  it("labels every source as a citable segment and exposes only authorized candidates", () => {
    const context = buildMeetingContext(input, {
      extraInput: " transcript ",
      today: "2026-09-03",
      maxChars: 10_000,
    });
    expect(context.segments.map((segment) => segment.id)).toEqual([
      "meeting:s1",
      "agenda:a1",
      "agenda:a2",
      "link:obj-1",
      "note:n1",
      "input:1",
    ]);
    expect(context.candidates).toEqual({
      people: [{ id: "p1", name: "CEO" }],
      agendaItems: [
        { id: "a2", title: "Fardas" },
        { id: "a1", title: "Limpeza" },
      ],
      today: "2026-09-03",
    });
    expect(context.sources).toEqual([
      { securityObjectId: "obj-1", sourceVersion: null, contextRole: "LINK" },
    ]);
    expect(context.truncated).toBe(false);
  });

  it("respects the input budget and reports truncation", () => {
    const context = buildMeetingContext(input, {
      extraInput: null,
      today: "2026-09-03",
      maxChars: 60,
    });
    const total = context.segments.reduce(
      (sum, segment) => sum + segment.text.length,
      0,
    );
    expect(total).toBeLessThanOrEqual(60);
    expect(context.truncated).toBe(true);
  });
});
