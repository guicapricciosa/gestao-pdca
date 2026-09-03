import Link from "next/link";
import { notFound } from "next/navigation";

import { replaceScopeAction } from "@/app/actions/execution";
import {
  addMeetingParticipantAction,
  changeMeetingChairAction,
  removeMeetingParticipantAction,
  reopenMeetingAction,
  reorderMeetingAgendaItemAction,
  transitionMeetingAction,
  updateMeetingSessionAction,
} from "@/app/actions/meetings";
import { describeAiAvailability } from "@/modules/ai/application/provider";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { StatusBadge } from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import { activityLabel, formatDateTime, roleLabel } from "@/ui/labels";
import { ScopeFields } from "@/ui/patterns/scope-fields";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ finished?: string }>;
}) {
  const [{ id }, { finished }] = await Promise.all([params, searchParams]);
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const { session } = detail;
  const [context, scopeOptions, names, series] = await Promise.all([
    loadExecutionDetailContext(detail.client, session.security_object_id),
    loadCreationOptions("meeting.scope.update"),
    resolveProfileNames(detail.client, [session.chair_profile_id]),
    session.meeting_series_id
      ? detail.client
          .from("meeting_series")
          .select("id,title,recurrence_rule")
          .eq("id", session.meeting_series_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const created = detail.links.filter(
    (link) => link.relation_type === "CREATED",
  );
  const counts = {
    tasks: created.filter((link) => link.objectType === "TASK").length,
    pdcas: created.filter((link) => link.objectType === "PDCA").length,
    decisions: created.filter((link) => link.objectType === "DECISION").length,
  };
  const active = !["PUBLISHED", "CLOSED", "CANCELLED"].includes(session.status);
  const local = (value: string) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const ai = describeAiAvailability();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link className="hover:underline" href="/meetings">
            Reuniões
          </Link>
          {" › "}Reunião
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {session.title}
          </h1>
          <StatusBadge value={session.status} kind="meeting" />
        </div>
        <p className="text-muted-foreground mt-2">
          {formatDateTime(session.scheduled_start_at)} –{" "}
          {formatDateTime(session.scheduled_end_at)} · Chair{" "}
          {names.get(session.chair_profile_id) ?? "sem perfil visível"}
          {series.data
            ? ` · repete-se: ${series.data.recurrence_rule ?? series.data.title}`
            : ""}
        </p>
      </header>

      {finished === "1" && (
        <section
          className="rounded-2xl bg-[#21100d] p-6 text-white"
          role="status"
          data-testid="meeting-finished"
        >
          <h2 className="text-2xl font-semibold tracking-tight">
            Reunião terminada.
          </h2>
          <p className="mt-2 text-white/70">
            {counts.tasks}{" "}
            {counts.tasks === 1 ? "tarefa atribuída" : "tarefas atribuídas"} ·{" "}
            {counts.pdcas}{" "}
            {counts.pdcas === 1 ? "PDCA criado" : "PDCAs criados"} ·{" "}
            {counts.decisions}{" "}
            {counts.decisions === 1
              ? "decisão registada"
              : "decisões registadas"}
            . As pessoas responsáveis já as vêem em O meu trabalho.
          </p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-full bg-black px-4 py-2 text-sm text-white"
          href={`/meetings/${id}/run`}
        >
          {active ? "Entrar na reunião" : "Ver a reunião"}
        </Link>
        {!active && (
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}/finish`}
          >
            Resumo
          </Link>
        )}
        {ai.enabled && active && (
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}/assistant`}
          >
            Assistente
          </Link>
        )}
        {series.data && (
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meeting-series/${series.data.id}`}
          >
            Gerir repetição
          </Link>
        )}
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">
            Onde se aplica
          </p>
          <p className="mt-2 text-sm">
            {context.restaurantScopes.join(", ") || "Sem restaurante"}
            <br />
            <span className="text-muted-foreground">
              {context.unitScopes.join(", ") || "Sem área"}
            </span>
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">Temas</p>
          <p className="mt-2 text-2xl font-semibold">{detail.agenda.length}</p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">
            Acções criadas
          </p>
          <p className="mt-2 text-2xl font-semibold">{created.length}</p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">Participantes</h2>
        {detail.participants.map((participant) => (
          <div
            className="flex items-center justify-between border-b p-4 text-sm last:border-0"
            key={participant.id}
          >
            <span>
              {participant.profile.display_name}
              <span className="text-muted-foreground ml-2 text-xs">
                {roleLabel(participant.participant_role)}
              </span>
            </span>
            {participant.participant_role !== "CHAIR" && active && (
              <form action={removeMeetingParticipantAction}>
                <input type="hidden" name="meetingSessionId" value={id} />
                <input
                  type="hidden"
                  name="participantId"
                  value={participant.id}
                />
                <button className="text-muted-foreground hover:text-foreground text-xs">
                  Remover
                </button>
              </form>
            )}
          </div>
        ))}
        {active && (
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            <form action={addMeetingParticipantAction} className="flex gap-2">
              <input type="hidden" name="meetingSessionId" value={id} />
              <select
                aria-label="Novo participante"
                className={`${field} flex-1`}
                name="profileId"
                required
              >
                <option value="">Adicionar pessoa</option>
                {detail.people.map((person) => (
                  <option key={person.profile_id} value={person.profile_id}>
                    {person.display_name}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary" pendingLabel="…">
                Adicionar
              </SubmitButton>
            </form>
            <form action={changeMeetingChairAction} className="flex gap-2">
              <input type="hidden" name="meetingSessionId" value={id} />
              <input type="hidden" name="version" value={session.version} />
              <select
                aria-label="Novo Chair"
                className={`${field} flex-1`}
                name="profileId"
                required
              >
                <option value="">Passar a Chair a…</option>
                {detail.people.map((person) => (
                  <option key={person.profile_id} value={person.profile_id}>
                    {person.display_name}
                  </option>
                ))}
              </select>
              <SubmitButton variant="secondary" pendingLabel="…">
                Aplicar
              </SubmitButton>
            </form>
            <p className="text-muted-foreground text-xs sm:col-span-2">
              Só aparecem pessoas que já têm acesso a esta reunião. Participar
              não dá acesso a nada.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">Agenda</h2>
        {detail.agenda.length === 0 && (
          <p className="text-muted-foreground p-5 text-sm">
            Sem temas. Adiciona-os dentro da reunião.
          </p>
        )}
        {detail.agenda.map((item) => (
          <div
            className="flex items-center justify-between border-b p-4 text-sm last:border-0"
            key={item.id}
          >
            <span>
              {item.position}. {item.title}
            </span>
            <div className="flex items-center gap-2">
              <StatusBadge value={item.status} kind="agenda" />
              {active && detail.agenda.length > 1 && (
                <>
                  <form action={reorderMeetingAgendaItemAction}>
                    <input type="hidden" name="meetingSessionId" value={id} />
                    <input type="hidden" name="agendaItemId" value={item.id} />
                    <input type="hidden" name="version" value={item.version} />
                    <input
                      type="hidden"
                      name="position"
                      value={Math.max(1, item.position - 1)}
                    />
                    <button
                      aria-label={`Subir ${item.title}`}
                      className="rounded border px-2 text-xs"
                      disabled={item.position === 1}
                    >
                      ↑
                    </button>
                  </form>
                  <form action={reorderMeetingAgendaItemAction}>
                    <input type="hidden" name="meetingSessionId" value={id} />
                    <input type="hidden" name="agendaItemId" value={item.id} />
                    <input type="hidden" name="version" value={item.version} />
                    <input
                      type="hidden"
                      name="position"
                      value={Math.min(detail.agenda.length, item.position + 1)}
                    />
                    <button
                      aria-label={`Descer ${item.title}`}
                      className="rounded border px-2 text-xs"
                      disabled={item.position === detail.agenda.length}
                    >
                      ↓
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        ))}
      </section>

      <details className="rounded-2xl border bg-white p-5">
        <summary className="cursor-pointer text-sm font-semibold">
          Opções avançadas
        </summary>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          {active && (
            <form action={updateMeetingSessionAction} className="grid gap-3">
              <h3 className="font-semibold">Título e horário</h3>
              <input type="hidden" name="meetingSessionId" value={id} />
              <input type="hidden" name="version" value={session.version} />
              <label className="text-sm font-medium">
                Título
                <input
                  className={`${field} mt-1 w-full`}
                  name="title"
                  defaultValue={session.title}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Início
                <input
                  className={`${field} mt-1 w-full`}
                  type="datetime-local"
                  name="scheduledStartAt"
                  defaultValue={local(session.scheduled_start_at)}
                  required
                />
              </label>
              <label className="text-sm font-medium">
                Fim
                <input
                  className={`${field} mt-1 w-full`}
                  type="datetime-local"
                  name="scheduledEndAt"
                  defaultValue={local(session.scheduled_end_at)}
                  required
                />
              </label>
              <div>
                <SubmitButton variant="secondary">Guardar</SubmitButton>
              </div>
            </form>
          )}
          {active && (
            <form action={replaceScopeAction} className="grid gap-3">
              <h3 className="font-semibold">Onde se aplica</h3>
              <input
                type="hidden"
                name="securityObjectId"
                value={session.security_object_id}
              />
              <input
                type="hidden"
                name="securityVersion"
                value={context.securityVersion}
              />
              <input
                type="hidden"
                name="returnPath"
                value={`/meetings/${id}`}
              />
              <ScopeFields
                options={scopeOptions}
                unitIds={context.unitScopeIds}
                restaurantIds={context.restaurantScopeIds}
                dense
              />
              <input
                className={field}
                name="reason"
                minLength={3}
                required
                placeholder="Motivo da alteração"
              />
              <div>
                <SubmitButton variant="secondary">Guardar</SubmitButton>
              </div>
            </form>
          )}
          {(session.status === "PUBLISHED" || session.status === "CLOSED") && (
            <form action={reopenMeetingAction} className="grid gap-3">
              <h3 className="font-semibold">Reabrir reunião</h3>
              <p className="text-muted-foreground text-xs">
                Volta ao estado «a terminar». O que já foi distribuído
                mantém-se.
              </p>
              <input type="hidden" name="meetingSessionId" value={id} />
              <input type="hidden" name="version" value={session.version} />
              <input
                className={field}
                name="reason"
                minLength={3}
                required
                placeholder="Motivo da reabertura"
              />
              <div>
                <SubmitButton variant="secondary">Reabrir</SubmitButton>
              </div>
            </form>
          )}
          {active && (
            <form action={transitionMeetingAction} className="grid gap-3">
              <h3 className="font-semibold">Cancelar reunião</h3>
              <input type="hidden" name="meetingSessionId" value={id} />
              <input type="hidden" name="version" value={session.version} />
              <input type="hidden" name="status" value="CANCELLED" />
              <input
                className={field}
                name="reason"
                minLength={3}
                required
                placeholder="Motivo do cancelamento"
              />
              <div>
                <SubmitButton variant="danger">Cancelar reunião</SubmitButton>
              </div>
            </form>
          )}
        </div>
      </details>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Histórico</h2>
        <div className="rounded-2xl border bg-white">
          {detail.activity.slice(0, 20).map((event) => (
            <div
              className="flex justify-between gap-4 border-b p-4 text-sm last:border-0"
              key={event.id}
            >
              <span>
                {activityLabel(event.action)}
                {event.reason ? ` — ${event.reason}` : ""}
              </span>
              <span className="text-muted-foreground whitespace-nowrap">
                {event.occurred_at ? formatDateTime(event.occurred_at) : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
