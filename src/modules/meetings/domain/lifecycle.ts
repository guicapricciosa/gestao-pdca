export const meetingStatuses = [
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "REVIEW",
  "PUBLISHED",
  "CLOSED",
  "CANCELLED",
] as const;

export type MeetingStatus = (typeof meetingStatuses)[number];

const transitions: Record<MeetingStatus, readonly MeetingStatus[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "CANCELLED"],
  REVIEW: ["IN_PROGRESS", "PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

export function canTransitionMeeting(from: MeetingStatus, to: MeetingStatus) {
  return transitions[from].includes(to);
}

export interface PublishCandidate {
  readonly agendaStatuses: readonly string[];
  readonly createdObjects: readonly {
    type: "DECISION" | "TASK" | "PDCA";
    complete: boolean;
    accessible: boolean;
  }[];
}

export function meetingPublishIssues(candidate: PublishCandidate) {
  const issues: string[] = [];
  if (candidate.agendaStatuses.includes("PENDING"))
    issues.push("AGENDA_WITHOUT_OUTCOME");
  if (candidate.createdObjects.some((object) => !object.complete))
    issues.push("INCOMPLETE_DRAFT");
  if (candidate.createdObjects.some((object) => !object.accessible))
    issues.push("INACCESSIBLE_OBJECT");
  return issues;
}
