import Link from "next/link";

import {
  confirmAiProposalAction,
  rejectAiProposalAction,
} from "@/app/actions/ai";
import type { ProposalView } from "@/modules/ai/application/services";
import type {
  ExecutionProposalPayload,
  SummaryProposalPayload,
} from "@/modules/ai/domain/types";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

interface AiProposalsProps {
  readonly meetingSessionId: string;
  readonly proposals: readonly ProposalView[];
  readonly people: readonly { profile_id: string; display_name: string }[];
  readonly agenda: readonly { id: string; title: string }[];
  readonly canReview: boolean;
}

function recordHref(type: string | null, id: string | null) {
  if (type === null || id === null) return null;
  if (type === "TASK") return `/tasks/${id}`;
  if (type === "PDCA") return `/pdcas/${id}`;
  if (type === "DECISION") return `/decisions/${id}`;
  return null;
}

function Warnings({ warnings }: { readonly warnings: readonly string[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="mt-3 list-disc rounded-lg bg-amber-50 p-3 pl-7 text-xs text-amber-900">
      {warnings.map((warning) => (
        <li key={warning}>{warning}</li>
      ))}
    </ul>
  );
}

function Provenance({ proposal }: { readonly proposal: ProposalView }) {
  const citations =
    "citations" in proposal.payload ? proposal.payload.citations : [];
  return (
    <p className="text-muted-foreground mt-3 text-xs">
      Gerado por AI ({proposal.run.provider}/{proposal.run.model}) em{" "}
      {new Date(proposal.createdAt).toLocaleString("pt-PT")}
      {citations.length > 0 && <> · fontes: {citations.join(", ")}</>}
    </p>
  );
}

function ExecutionProposalForm({
  proposal,
  payload,
  meetingSessionId,
  people,
  agenda,
}: {
  readonly proposal: ProposalView;
  readonly payload: ExecutionProposalPayload;
  readonly meetingSessionId: string;
  readonly people: AiProposalsProps["people"];
  readonly agenda: AiProposalsProps["agenda"];
}) {
  const accountable = payload.type !== "DECISION";
  return (
    <form action={confirmAiProposalAction} className="grid gap-3">
      <input type="hidden" name="meetingSessionId" value={meetingSessionId} />
      <input type="hidden" name="proposalId" value={proposal.id} />
      <input type="hidden" name="version" value={proposal.version} />
      <input type="hidden" name="proposalType" value={payload.type} />
      <label className="text-xs font-medium">
        Título
        <input
          className={`${field} mt-1 w-full`}
          name="title"
          defaultValue={payload.title}
          required
        />
      </label>
      <label className="text-xs font-medium">
        {payload.type === "PDCA" ? "Problem statement" : "Descrição"}
        <textarea
          className={`${field} mt-1 w-full`}
          name="description"
          defaultValue={payload.description}
          rows={3}
          required
        />
      </label>
      {payload.type === "PDCA" && (
        <label className="text-xs font-medium">
          Objetivo
          <textarea
            className={`${field} mt-1 w-full`}
            name="objective"
            defaultValue={payload.objective ?? ""}
            rows={2}
            required
          />
        </label>
      )}
      {payload.type === "DECISION" && (
        <label className="text-xs font-medium">
          Data da decisão
          <input
            className={`${field} mt-1 w-full`}
            name="decisionDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
      )}
      {accountable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Owner
            <select
              className={`${field} mt-1 w-full`}
              name="ownerProfileId"
              defaultValue={payload.ownerProfileId ?? ""}
            >
              <option value="">Escolher</option>
              {people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Responsible
            <select
              className={`${field} mt-1 w-full`}
              name="responsibleProfileId"
              defaultValue={payload.responsibleProfileId ?? ""}
            >
              <option value="">Escolher</option>
              {people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Prioridade
            <select
              className={`${field} mt-1 w-full`}
              name="priority"
              defaultValue={payload.priority}
            >
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium">
            Prazo
            <input
              className={`${field} mt-1 w-full`}
              name="dueDate"
              type="date"
              defaultValue={payload.dueDate ?? ""}
            />
          </label>
        </div>
      )}
      <label className="text-xs font-medium">
        Item de agenda
        <select
          className={`${field} mt-1 w-full`}
          name="agendaItemId"
          defaultValue={payload.agendaItemId ?? ""}
        >
          <option value="">Sem item</option>
          {agenda.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {payload.unresolvedNames.length > 0 && (
        <p className="text-xs text-amber-900">
          Nomes não resolvidos pela AI: {payload.unresolvedNames.join(", ")}.
          Escolhe as pessoas certas acima.
        </p>
      )}
      <Warnings warnings={payload.warnings} />
      <p className="text-muted-foreground text-xs">
        Confiança {Math.round(payload.confidence * 100)}% · {payload.rationale}
      </p>
      <div>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Confirmar e criar {payload.type} draft
        </button>
      </div>
    </form>
  );
}

function SummaryProposalForm({
  proposal,
  payload,
  meetingSessionId,
}: {
  readonly proposal: ProposalView;
  readonly payload: SummaryProposalPayload;
  readonly meetingSessionId: string;
}) {
  return (
    <form action={confirmAiProposalAction} className="grid gap-3">
      <input type="hidden" name="meetingSessionId" value={meetingSessionId} />
      <input type="hidden" name="proposalId" value={proposal.id} />
      <input type="hidden" name="version" value={proposal.version} />
      <input type="hidden" name="proposalType" value="SUMMARY" />
      <label className="text-xs font-medium">
        Resumo (editável antes de confirmar)
        <textarea
          className={`${field} mt-1 w-full`}
          name="summary"
          defaultValue={payload.summary}
          rows={8}
          required
        />
      </label>
      {payload.highlights.length > 0 && (
        <p className="text-xs">
          <span className="font-medium">Destaques:</span>{" "}
          {payload.highlights.join(" · ")}
        </p>
      )}
      {payload.openQuestions.length > 0 && (
        <p className="text-xs">
          <span className="font-medium">Questões em aberto:</span>{" "}
          {payload.openQuestions.join(" · ")}
        </p>
      )}
      <Warnings warnings={payload.warnings} />
      <div>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Confirmar e guardar como nota da reunião
        </button>
      </div>
    </form>
  );
}

function RejectForm({
  proposal,
  returnPath,
}: {
  readonly proposal: ProposalView;
  readonly returnPath: string;
}) {
  return (
    <form action={rejectAiProposalAction} className="mt-3 flex flex-wrap gap-2">
      <input type="hidden" name="proposalId" value={proposal.id} />
      <input type="hidden" name="version" value={proposal.version} />
      <input type="hidden" name="returnPath" value={returnPath} />
      <input
        className={`${field} min-w-64 flex-1`}
        name="reason"
        placeholder="Motivo da rejeição"
        required
        minLength={2}
      />
      <button className="rounded-full border px-4 py-2 text-sm">
        Rejeitar proposta
      </button>
    </form>
  );
}

export function AiProposals({
  meetingSessionId,
  proposals,
  people,
  agenda,
  canReview,
}: AiProposalsProps) {
  const pending = proposals.filter((proposal) => proposal.status === "PENDING");
  const reviewed = proposals.filter(
    (proposal) => proposal.status !== "PENDING",
  );
  const returnPath = `/meetings/${meetingSessionId}/assistant`;
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-xl font-semibold">
          Propostas pendentes ({pending.length})
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Nada é criado sem confirmação humana. Ao confirmar, a autorização e as
          regras de negócio são reavaliadas no servidor e o objeto nasce em
          DRAFT ligado a esta reunião.
        </p>
        {pending.length === 0 && (
          <p className="text-muted-foreground mt-4 text-sm">
            Sem propostas pendentes.
          </p>
        )}
        <div className="mt-4 grid gap-4">
          {pending.map((proposal) => (
            <article
              className="rounded-2xl border bg-white p-5"
              key={proposal.id}
              data-testid="ai-proposal"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-black px-3 py-1 text-xs text-white">
                  {proposal.type}
                </span>
                <span className="rounded-full border px-3 py-1 text-xs">
                  Proposta AI
                </span>
              </div>
              <div className="mt-4">
                {!canReview ? (
                  <p className="text-sm text-amber-900">
                    A reunião já não aceita novos objetos; só é possível
                    rejeitar.
                  </p>
                ) : proposal.payload.type === "SUMMARY" ? (
                  <SummaryProposalForm
                    proposal={proposal}
                    payload={proposal.payload}
                    meetingSessionId={meetingSessionId}
                  />
                ) : proposal.payload.type === "FINDING" ? null : (
                  <ExecutionProposalForm
                    proposal={proposal}
                    payload={proposal.payload}
                    meetingSessionId={meetingSessionId}
                    people={people}
                    agenda={agenda}
                  />
                )}
              </div>
              <RejectForm proposal={proposal} returnPath={returnPath} />
              <Provenance proposal={proposal} />
            </article>
          ))}
        </div>
      </section>
      {reviewed.length > 0 && (
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">
            Histórico de revisão
          </h2>
          {reviewed.map((proposal) => {
            const href = recordHref(
              proposal.executedRecordType,
              proposal.executedRecordId,
            );
            const confirmedTitle = proposal.confirmedPayload?.title;
            const title =
              typeof confirmedTitle === "string" && confirmedTitle !== ""
                ? confirmedTitle
                : "title" in proposal.payload
                  ? proposal.payload.title
                  : proposal.payload.type === "SUMMARY"
                    ? "Resumo da reunião"
                    : proposal.payload.type;
            return (
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b p-4 text-sm last:border-0"
                key={proposal.id}
              >
                <span>
                  <span className="text-muted-foreground mr-2 text-xs">
                    {proposal.type}
                  </span>
                  {href ? (
                    <Link className="hover:underline" href={href}>
                      {title}
                    </Link>
                  ) : (
                    title
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {proposal.status}
                  {proposal.reviewReason ? ` · ${proposal.reviewReason}` : ""}
                  {proposal.reviewedAt
                    ? ` · ${new Date(proposal.reviewedAt).toLocaleString("pt-PT")}`
                    : ""}
                </span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
