import Link from "next/link";
import { notFound } from "next/navigation";

import {
  runMeetingAssistantAction,
  runMeetingSummaryAction,
} from "@/app/actions/ai";
import { describeAiAvailability } from "@/modules/ai/application/provider";
import { listProposals, listRuns } from "@/modules/ai/application/services";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { AiProposals } from "@/ui/patterns/ai-proposals";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
const reviewable = new Set(["DRAFT", "SCHEDULED", "IN_PROGRESS", "REVIEW"]);

export const dynamic = "force-dynamic";
export default async function MeetingAssistantPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ ai_error?: string }>;
}) {
  const [{ id }, { ai_error: aiError }] = await Promise.all([
    params,
    searchParams,
  ]);
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const availability = describeAiAvailability();
  const [proposals, runs] = await Promise.all([
    listProposals(detail.client, detail.session.security_object_id),
    listRuns(detail.client, detail.session.security_object_id, 5),
  ]);
  const canReview = reviewable.has(detail.session.status);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">Assistente da reunião</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {detail.session.title}
          </h1>
          <span className="rounded-full border px-3 py-1 text-xs">
            {detail.session.status}
          </span>
          <span
            className="rounded-full border px-3 py-1 text-xs"
            data-testid="ai-availability"
          >
            {availability.enabled
              ? `AI: ${availability.provider}/${availability.model}`
              : "Assistente desactivado"}
          </span>
        </div>
        <p className="text-muted-foreground mt-2">
          O assistente propõe; uma pessoa revê, edita e confirma. Só vê o que tu
          podes ler e nunca escreve directamente na plataforma.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}`}
          >
            Reunião
          </Link>
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}/run`}
          >
            Entrar na reunião
          </Link>
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}/finish`}
          >
            Terminar reunião
          </Link>
        </div>
      </header>
      {aiError && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {aiError}
        </p>
      )}
      {!availability.enabled && (
        <p className="rounded-lg border p-3 text-sm">
          O assistente está desactivado neste ambiente. Reuniões, decisões,
          tarefas e PDCAs funcionam normalmente sem ele.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          action={runMeetingAssistantAction}
          className="rounded-2xl border bg-white p-5"
        >
          <input type="hidden" name="meetingSessionId" value={id} />
          <h2 className="font-semibold">Propor decisões, tarefas e PDCAs</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Usa a agenda, as notas e os objetos ligados desta reunião. Podes
            colar texto adicional (transcrição, apontamentos).
          </p>
          <textarea
            className={`${field} mt-3 w-full`}
            name="extraInput"
            rows={5}
            placeholder="Texto adicional (opcional). Linhas como “Tarefa: … | responsável: … | prazo: AAAA-MM-DD” são reconhecidas pelo provider de desenvolvimento."
          />
          <button
            className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!availability.enabled || !canReview}
          >
            Gerar propostas
          </button>
        </form>
        <form
          action={runMeetingSummaryAction}
          className="rounded-2xl border bg-white p-5"
        >
          <input type="hidden" name="meetingSessionId" value={id} />
          <h2 className="font-semibold">Resumo da reunião</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gera um resumo com citações. Depois de revisto, fica guardado como
            nota da reunião atribuída a quem confirma.
          </p>
          <button
            className="mt-3 rounded-full bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={!availability.enabled || !canReview}
          >
            Gerar resumo
          </button>
        </form>
      </div>
      <AiProposals
        meetingSessionId={id}
        proposals={proposals}
        people={detail.people}
        agenda={detail.agenda.map((item) => ({
          id: item.id,
          title: item.title,
        }))}
        canReview={canReview}
      />
      {runs.length > 0 && (
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">
            Pedidos recentes ao assistente
          </h2>
          {runs.map((run) => (
            <div
              className="flex flex-wrap justify-between gap-2 border-b p-4 text-sm last:border-0"
              key={run.id}
            >
              <span>
                {run.use_case} · {run.model_provider}/{run.model_name}
              </span>
              <span className="text-muted-foreground text-xs">
                {run.status}
                {run.error_category ? ` (${run.error_category})` : ""} ·{" "}
                {new Date(run.started_at).toLocaleString("pt-PT")}
                {run.latency_ms !== null ? ` · ${run.latency_ms} ms` : ""}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
