import type {
  GatewayRequest,
  GatewayResult,
  ModelGateway,
} from "@/modules/ai/application/gateway";
import type {
  ContextCandidates,
  ContextSegment,
} from "@/modules/ai/domain/types";

const LINE = /^(decis[aã]o|decision|tarefa|task|pdca)\s*:\s*(.+)$/i;

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

function resolvePerson(
  name: string | undefined,
  candidates: ContextCandidates,
) {
  if (!name) return { id: null, unresolved: [] as string[] };
  const match = candidates.people.find(
    (person) => normalize(person.name) === normalize(name),
  );
  return match
    ? { id: match.id, unresolved: [] as string[] }
    : { id: null, unresolved: [name.trim()] };
}

function parseFields(rest: string) {
  const [head, ...pairs] = rest.split("|").map((part) => part.trim());
  const fields = new Map<string, string>();
  for (const pair of pairs) {
    const index = pair.indexOf(":");
    if (index > 0)
      fields.set(normalize(pair.slice(0, index)), pair.slice(index + 1).trim());
  }
  return { title: head ?? "", fields };
}

function assistant(
  segments: readonly ContextSegment[],
  candidates: ContextCandidates,
) {
  const proposals = [];
  for (const segment of segments) {
    for (const rawLine of segment.text.split("\n")) {
      const match = LINE.exec(rawLine.trim());
      if (match === null) continue;
      const keyword = normalize(match[1] ?? "");
      const { title, fields } = parseFields(match[2] ?? "");
      const type =
        keyword === "pdca"
          ? "PDCA"
          : keyword.startsWith("decis")
            ? "DECISION"
            : "TASK";
      const responsible = resolvePerson(
        fields.get("responsavel") ?? fields.get("responsible"),
        candidates,
      );
      const owner = resolvePerson(
        fields.get("owner") ?? fields.get("dono"),
        candidates,
      );
      proposals.push({
        type,
        title,
        description:
          fields.get("descricao") ?? fields.get("description") ?? title,
        objective: fields.get("objetivo") ?? fields.get("objective") ?? null,
        priority: fields.get("prioridade") ?? fields.get("priority") ?? null,
        ownerCandidateId: owner.id,
        responsibleCandidateId: responsible.id,
        unresolvedNames: [...owner.unresolved, ...responsible.unresolved],
        dueDate: fields.get("prazo") ?? fields.get("due") ?? null,
        agendaItemId: null,
        citations: [segment.id],
        confidence: 0.75,
        rationale: `Linha marcada como ${match[1]} em ${segment.id}.`,
      });
    }
  }
  return { proposals };
}

function summary(segments: readonly ContextSegment[]) {
  const agenda = segments.filter((segment) => segment.role === "AGENDA");
  const notes = segments.filter((segment) => segment.role === "NOTE");
  const links = segments.filter((segment) => segment.role === "LINK");
  const lines = [
    `Reunião com ${agenda.length} item(ns) de agenda, ${notes.length} nota(s) e ${links.length} objeto(s) ligado(s).`,
    ...agenda.map((segment) => `Agenda: ${segment.text.split("\n")[0]}`),
    ...notes.map((segment) => `Nota: ${segment.text.slice(0, 200)}`),
  ];
  return {
    summary: lines.join("\n"),
    highlights: agenda.map((segment) => segment.text.split("\n")[0] ?? ""),
    openQuestions: [],
    citations: segments.map((segment) => segment.id),
  };
}

function validator(segments: readonly ContextSegment[]) {
  const findings = [];
  for (const segment of segments) {
    const objective = /objective:\s*(.*)/i.exec(segment.text)?.[1]?.trim();
    if (objective !== undefined && objective.split(/\s+/).length < 4)
      findings.push({
        code: "OBJECTIVE_UNCLEAR",
        severity: "WARNING",
        message: "O objetivo é demasiado curto para ser verificável.",
        confidence: 0.6,
        citations: [segment.id],
      });
  }
  return { findings };
}

/**
 * Deterministic gateway for local development and end-to-end tests. It only
 * echoes structured markers found in the supplied segments, so behaviour is
 * reproducible and nothing leaves the machine.
 */
export class FakeModelGateway implements ModelGateway {
  readonly provider = "fake";
  readonly model = "fake";

  async complete(request: GatewayRequest): Promise<GatewayResult> {
    const started = Date.now();
    const output =
      request.useCase === "MEETING_ASSISTANT"
        ? assistant(request.segments, request.candidates)
        : request.useCase === "MEETING_SUMMARY"
          ? summary(request.segments)
          : validator(request.segments);
    return {
      output,
      provider: this.provider,
      model: "fake",
      inputTokens: null,
      outputTokens: null,
      latencyMs: Date.now() - started,
    };
  }
}
