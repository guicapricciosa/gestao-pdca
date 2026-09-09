import { z } from "zod";

/**
 * Plaud recordings are personal: what comes out of them enters as PRIVATE
 * PDCAs (with their subtasks) of the person importing, tagged with the
 * recording so the same action is never imported twice. Same payload as the
 * previous PDCA app, so existing prompts keep working.
 */

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data no formato AAAA-MM-DD")
  .optional()
  .nullable();

export const plaudSourceSchema = z.object({
  provider: z.string().optional(),
  recording_id: z.string().trim().min(1).max(120),
  recording_title: z.string().trim().max(240).optional().nullable(),
  recorded_at: date,
});

const subtask = z.union([
  z.string().trim().min(2).max(240),
  z.object({ title: z.string().trim().min(2).max(240) }),
]);

export const plaudActionSchema = z.object({
  title: z.string().trim().min(2).max(240),
  description: z.string().trim().max(10000).optional().nullable(),
  phase: z.enum(["Plan", "Do", "Check", "Act", "Done"]).optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).optional().nullable(),
  start_date: date,
  due_date: date,
  status_note: z.string().trim().max(2000).optional().nullable(),
  tasks: z.array(subtask).max(30).optional().nullable(),
  source: plaudSourceSchema.optional().nullable(),
});

export const plaudPayloadSchema = z.object({
  source: plaudSourceSchema.optional().nullable(),
  actions: z.array(plaudActionSchema).min(1).max(100),
});

export type PlaudPayload = z.infer<typeof plaudPayloadSchema>;
export type PlaudAction = z.infer<typeof plaudActionSchema>;
export type PlaudSource = z.infer<typeof plaudSourceSchema>;

export const phaseMap = {
  Plan: "PLAN",
  Do: "DO",
  Check: "CHECK",
  Act: "ACT",
  Done: "ACT",
} as const;

export const priorityMap = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
} as const;

/** Parses the pasted text; throws a readable message on the first problem. */
export function parsePlaudPayload(text: string): PlaudPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("O texto não é JSON válido.");
  }
  const result = plaudPayloadSchema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Campo ${issue?.path.join(".") || "(raiz)"}: ${issue?.message ?? "inválido"}`,
    );
  }
  return result.data;
}

export function sourceOf(payload: PlaudPayload, action: PlaudAction) {
  const source = action.source ?? payload.source;
  if (!source) throw new Error("Cada acção precisa de uma gravação (source).");
  return source;
}

/** Stable key kept in the PDCA text; a later import recognises it. */
export function importKey(source: PlaudSource, action: PlaudAction) {
  const slug = action.title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `plaud:${source.recording_id}:${slug}`;
}

/** Human line that goes into the PDCA problem statement. */
export function sourceLine(source: PlaudSource) {
  const parts = [
    "Origem: gravação Plaud",
    source.recording_title ?? null,
    source.recorded_at ?? null,
    `ref ${source.recording_id}`,
  ].filter((part): part is string => part !== null);
  return parts.join(" · ");
}

export interface PlannedItem {
  readonly key: string;
  readonly title: string;
  readonly problem: string;
  readonly objective: string;
  readonly phase: (typeof phaseMap)[keyof typeof phaseMap];
  readonly done: boolean;
  readonly priority: (typeof priorityMap)[keyof typeof priorityMap];
  readonly startDate: string | null;
  readonly dueDate: string | null;
  readonly closureNote: string | null;
  readonly tasks: readonly string[];
  /** Same origin line for the subtasks, so they stay traceable too. */
  readonly sourceText: string;
}

/** Everything the import needs, computed once and shown in the preview. */
export function planImport(payload: PlaudPayload): PlannedItem[] {
  return payload.actions.map((action) => {
    const source = sourceOf(payload, action);
    const key = importKey(source, action);
    const description = action.description?.trim() ?? "";
    return {
      key,
      title: action.title,
      problem: [description || action.title, sourceLine(source), key].join(
        "\n\n",
      ),
      objective:
        action.status_note?.trim() || "Por definir a partir da gravação.",
      phase: phaseMap[action.phase ?? "Plan"],
      done: action.phase === "Done",
      priority: priorityMap[action.priority ?? "medium"],
      startDate: action.start_date ?? null,
      // A finished action needs a date to be closed; the recording date will do.
      dueDate:
        action.due_date ??
        (action.phase === "Done"
          ? (source.recorded_at ?? new Date().toISOString().slice(0, 10))
          : null),
      closureNote: action.phase === "Done" ? "Concluído na gravação." : null,
      sourceText: sourceLine(source),
      tasks: (action.tasks ?? []).map((task) =>
        typeof task === "string" ? task : task.title,
      ),
    };
  });
}
