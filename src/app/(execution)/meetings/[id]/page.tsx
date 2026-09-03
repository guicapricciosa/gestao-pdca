import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addMeetingParticipantAction,
  changeMeetingChairAction,
  removeMeetingParticipantAction,
  reopenMeetingAction,
  reorderMeetingAgendaItemAction,
  transitionMeetingAction,
  updateMeetingSessionAction,
} from "@/app/actions/meetings";
import { replaceScopeAction } from "@/app/actions/execution";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { loadExecutionDetailContext } from "@/modules/execution/application/detail-context";
import { ScopeFields } from "@/ui/patterns/scope-fields";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
const nextStatuses: Record<string, readonly string[]> = {
  DRAFT: ["SCHEDULED", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["REVIEW", "CANCELLED"],
  REVIEW: ["IN_PROGRESS", "PUBLISHED", "CANCELLED"],
  PUBLISHED: ["CLOSED"],
};
export const dynamic = "force-dynamic";
export default async function MeetingDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const { session } = detail;
  const [context, scopeOptions] = await Promise.all([
    loadExecutionDetailContext(detail.client, session.security_object_id),
    loadCreationOptions("meeting.scope.update"),
  ]);
  const local = (value: string) => {
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">Meeting Session</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            {session.title}
          </h1>
          <span className="rounded-full border px-3 py-1 text-xs">
            {session.status}
          </span>
        </div>
        <p className="text-muted-foreground mt-2">
          {new Date(session.scheduled_start_at).toLocaleString("pt-PT")} –{" "}
          {new Date(session.scheduled_end_at).toLocaleString("pt-PT")}
        </p>
      </header>
      <div className="flex flex-wrap gap-3">
        <Link
          className="rounded-full bg-black px-4 py-2 text-sm text-white"
          href={`/meetings/${id}/run`}
        >
          Meeting Mode
        </Link>
        <Link
          className="rounded-full border px-4 py-2 text-sm"
          href={`/meetings/${id}/review`}
        >
          Review Meeting
        </Link>
        <Link
          className="rounded-full border px-4 py-2 text-sm"
          href={`/meetings/${id}/assistant`}
        >
          AI Assistant
        </Link>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">Chair</p>
          <p className="mt-2 font-medium">
            {detail.participants.find(
              (participant) => participant.participant_role === "CHAIR",
            )?.profile.display_name ?? "Chair sem perfil visível"}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">Scope</p>
          <p className="mt-2 text-sm">
            {context.unitScopes.join(", ") || "Sem unidade"}
            <br />
            {context.restaurantScopes.join(", ") || "Sem restaurante"}
          </p>
        </div>
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-muted-foreground text-xs uppercase">Agenda</p>
          <p className="mt-2 text-2xl font-semibold">{detail.agenda.length}</p>
        </div>
      </section>
      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">Participants</h2>
        {detail.participants.map((participant) => (
          <div
            className="flex items-center justify-between border-b p-4 last:border-0"
            key={participant.id}
          >
            <span>
              {participant.profile.display_name} ·{" "}
              {participant.participant_role}
            </span>
            {participant.participant_role !== "CHAIR" && (
              <form action={removeMeetingParticipantAction}>
                <input type="hidden" name="meetingSessionId" value={id} />
                <input
                  type="hidden"
                  name="participantId"
                  value={participant.id}
                />
                <button className="text-muted-foreground text-sm">
                  Remover
                </button>
              </form>
            )}
          </div>
        ))}
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <form action={addMeetingParticipantAction} className="flex gap-2">
            <input type="hidden" name="meetingSessionId" value={id} />
            <select
              aria-label="Novo participante"
              className={field}
              name="profileId"
              required
            >
              <option value="">Adicionar participante com acesso</option>
              {detail.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <button className="rounded-full border px-4 text-sm">
              Adicionar
            </button>
          </form>
          <form action={changeMeetingChairAction} className="flex gap-2">
            <input type="hidden" name="meetingSessionId" value={id} />
            <input type="hidden" name="version" value={session.version} />
            <select
              aria-label="Novo Chair"
              className={field}
              name="profileId"
              required
            >
              <option value="">Alterar Chair</option>
              {detail.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <button className="rounded-full border px-4 text-sm">
              Aplicar
            </button>
          </form>
        </div>
        <p className="text-muted-foreground px-4 pb-4 text-xs">
          Participação e o papel de Chair não criam acesso. Pessoas sem
          scope/grant válido não podem ser selecionadas.
        </p>
      </section>
      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">Agenda</h2>
        {detail.agenda.map((item) => (
          <div
            className="flex items-center justify-between border-b p-4 last:border-0"
            key={item.id}
          >
            <span>
              {item.position}. {item.title}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{item.status}</span>
              {detail.agenda.length > 1 && (
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
      <div className="grid gap-5 lg:grid-cols-2">
        <form
          action={transitionMeetingAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Lifecycle</h2>
          <input type="hidden" name="meetingSessionId" value={id} />
          <input type="hidden" name="version" value={session.version} />
          <select className={field} name="status">
            {(nextStatuses[session.status] ?? []).map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <input
            className={field}
            name="reason"
            placeholder="Motivo quando obrigatório"
          />
          <button className="w-fit rounded-full border px-4 py-2 text-sm">
            Aplicar transição
          </button>
        </form>
        {(session.status === "PUBLISHED" || session.status === "CLOSED") && (
          <form
            action={reopenMeetingAction}
            className="grid gap-3 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-semibold">Reabrir reunião</h2>
            <input type="hidden" name="meetingSessionId" value={id} />
            <input type="hidden" name="version" value={session.version} />
            <input
              className={field}
              name="reason"
              minLength={3}
              required
              placeholder="Motivo da reabertura"
            />
            <button className="w-fit rounded-full border px-4 py-2 text-sm">
              Reabrir para Review
            </button>
          </form>
        )}
        <form
          action={updateMeetingSessionAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Editar sessão</h2>
          <input type="hidden" name="meetingSessionId" value={id} />
          <input type="hidden" name="version" value={session.version} />
          <input
            className={field}
            name="title"
            defaultValue={session.title}
            required
          />
          <input
            className={field}
            type="datetime-local"
            name="scheduledStartAt"
            defaultValue={local(session.scheduled_start_at)}
            required
          />
          <input
            className={field}
            type="datetime-local"
            name="scheduledEndAt"
            defaultValue={local(session.scheduled_end_at)}
            required
          />
          <button className="w-fit rounded-full border px-4 py-2 text-sm">
            Guardar sessão
          </button>
        </form>
        <form
          action={replaceScopeAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Alterar scope</h2>
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
          <input type="hidden" name="returnPath" value={`/meetings/${id}`} />
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
            placeholder="Motivo"
          />
          <button className="w-fit rounded-full border px-4 py-2 text-sm">
            Guardar scope
          </button>
        </form>
      </div>
      <section>
        <h2 className="mb-3 text-xl font-semibold">Activity</h2>
        <div className="rounded-2xl border bg-white">
          {detail.activity.map((event) => (
            <div
              className="flex justify-between border-b p-4 text-sm last:border-0"
              key={event.id}
            >
              <span>
                {event.action}
                {event.reason ? ` — ${event.reason}` : ""}
              </span>
              <span className="text-muted-foreground">
                {event.occurred_at
                  ? new Date(event.occurred_at).toLocaleString("pt-PT")
                  : ""}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
