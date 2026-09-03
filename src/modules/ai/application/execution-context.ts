import type {
  AiContext,
  ContextSegment,
  ExecutionRecordSnapshot,
} from "@/modules/ai/domain/types";

export interface ExecutionContextInput {
  readonly snapshot: ExecutionRecordSnapshot;
  readonly securityObjectId: string;
  readonly description: string | null;
  readonly comments: readonly { readonly id: string; readonly body: string }[];
}

export interface ExecutionContextOptions {
  readonly today: string;
  readonly maxChars: number;
}

/** Minimized context for the qualitative (AI) part of the Execution Validator. */
export function buildExecutionContext(
  input: ExecutionContextInput,
  options: ExecutionContextOptions,
): AiContext {
  const record = input.snapshot;
  const lines = [
    `kind: ${record.kind}`,
    `title: ${record.title}`,
    `status: ${record.status}`,
    `description: ${input.description ?? ""}`,
    `objective: ${record.objective ?? ""}`,
    `problem_statement: ${record.problemStatement ?? ""}`,
    `expected_result: ${record.expectedResult ?? ""}`,
    `actual_result: ${record.actualResult ?? ""}`,
    `owner_assigned: ${record.ownerProfileId !== null}`,
    `responsible_assigned: ${record.responsibleProfileId !== null}`,
    `due_date: ${record.dueDate ?? ""}`,
    `last_activity_at: ${record.lastActivityAt}`,
    `due_date_changes: ${record.dueDateChangeCount}`,
    `attachments: ${record.attachmentCount}`,
  ];
  const segments: ContextSegment[] = [
    {
      id: `record:${record.kind.toLowerCase()}:${record.id}`,
      role: "TARGET",
      text: lines.join("\n"),
    },
    ...input.comments.map((comment) => ({
      id: `comment:${comment.id}`,
      role: "NOTE" as const,
      text: comment.body,
    })),
  ];
  let budget = options.maxChars;
  let truncated = false;
  const bounded: ContextSegment[] = [];
  for (const segment of segments) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    const text = segment.text.slice(0, budget);
    if (text.length < segment.text.length) truncated = true;
    bounded.push({ ...segment, text });
    budget -= text.length;
  }
  return {
    segments: bounded,
    candidates: { people: [], agendaItems: [], today: options.today },
    sources: [],
    truncated,
  };
}
