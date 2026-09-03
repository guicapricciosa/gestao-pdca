import type {
  AiContext,
  ContextSegment,
  ContextSource,
} from "@/modules/ai/domain/types";

/** Structural view of an authorized meeting detail (already RLS-filtered). */
export interface MeetingContextInput {
  readonly session: {
    readonly id: string;
    readonly title: string;
    readonly status: string;
    readonly scheduled_start_at: string;
    readonly scheduled_end_at: string;
  };
  readonly agenda: readonly {
    readonly id: string;
    readonly title: string;
    readonly description: string | null;
    readonly status: string;
    readonly position: number;
  }[];
  readonly notes: readonly {
    readonly id: string;
    readonly content: string;
    readonly meeting_agenda_item_id: string | null;
    readonly author: { readonly display_name: string };
  }[];
  readonly links: readonly {
    readonly security_object_id: string;
    readonly relation_type: string;
    readonly objectType: string;
    readonly record: { readonly title: string; readonly status: string };
  }[];
  readonly people: readonly {
    readonly profile_id: string;
    readonly display_name: string;
  }[];
}

export interface MeetingContextOptions {
  readonly extraInput: string | null;
  readonly today: string;
  readonly maxChars: number;
}

/**
 * Builds the minimized, labelled context for meeting use cases. Everything
 * comes from a detail already filtered by RLS, so inaccessible notes or links
 * never reach this function. Segment ids double as citation targets.
 */
export function buildMeetingContext(
  input: MeetingContextInput,
  options: MeetingContextOptions,
): AiContext {
  const segments: ContextSegment[] = [];
  segments.push({
    id: `meeting:${input.session.id}`,
    role: "TARGET",
    text: `${input.session.title}\nEstado: ${input.session.status}\nAgendada: ${input.session.scheduled_start_at} – ${input.session.scheduled_end_at}`,
  });
  for (const item of [...input.agenda].sort((a, b) => a.position - b.position))
    segments.push({
      id: `agenda:${item.id}`,
      role: "AGENDA",
      text: `${item.position}. ${item.title} · ${item.status}${item.description ? `\n${item.description}` : ""}`,
    });
  for (const link of input.links)
    segments.push({
      id: `link:${link.security_object_id}`,
      role: "LINK",
      text: `${link.objectType} (${link.relation_type}): ${link.record.title} · ${link.record.status}`,
    });
  for (const note of input.notes)
    segments.push({
      id: `note:${note.id}`,
      role: "NOTE",
      text: `${note.author.display_name}${note.meeting_agenda_item_id ? ` (agenda:${note.meeting_agenda_item_id})` : ""}: ${note.content}`,
    });
  const extra = options.extraInput?.trim();
  if (extra) segments.push({ id: "input:1", role: "INPUT", text: extra });

  let budget = options.maxChars;
  let truncated = false;
  const bounded: ContextSegment[] = [];
  for (const segment of segments) {
    if (budget <= 0) {
      truncated = true;
      break;
    }
    if (segment.text.length > budget) {
      bounded.push({ ...segment, text: segment.text.slice(0, budget) });
      truncated = true;
      budget = 0;
    } else {
      bounded.push(segment);
      budget -= segment.text.length;
    }
  }

  const sources: ContextSource[] = input.links.map((link) => ({
    securityObjectId: link.security_object_id,
    sourceVersion: null,
    contextRole: "LINK",
  }));

  return {
    segments: bounded,
    candidates: {
      people: input.people.map((person) => ({
        id: person.profile_id,
        name: person.display_name,
      })),
      agendaItems: input.agenda.map((item) => ({
        id: item.id,
        title: item.title,
      })),
      today: options.today,
    },
    sources,
    truncated,
  };
}
