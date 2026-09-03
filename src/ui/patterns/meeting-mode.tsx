import Link from "next/link";

import { CopyLinkButton } from "@/ui/components/copy-link-button";

import {
  addMeetingAgendaItemAction,
  createMeetingNoteAction,
  createMeetingObjectAction,
  linkMeetingObjectAction,
  openMeetingAction,
  saveMeetingNoteAction,
  setMeetingAgendaStatusAction,
} from "@/app/actions/meetings";
import { MeetingNotes, type NoteView } from "@/ui/components/meeting-notes";
import { SideSheet } from "@/ui/components/side-sheet";
import { DueDate, StatusBadge } from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import {
  formatDateTime,
  linkRelationLabel,
  objectTypeLabel,
} from "@/ui/labels";
import {
  QuickDecisionForm,
  QuickPdcaForm,
  QuickTaskForm,
  type QuickContext,
} from "@/ui/patterns/quick-forms";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";

interface MeetingModeProps {
  readonly meeting: {
    id: string;
    company_id: string;
    title: string;
    status: string;
    version: number;
    scheduled_start_at: string;
  };
  readonly chairName: string;
  readonly isChair: boolean;
  readonly live?: React.ReactNode;
  readonly participantCount: number;
  readonly scopeSummary: string;
  readonly agenda: readonly {
    id: string;
    title: string;
    description: string | null;
    status: string;
    position: number;
    version: number;
    carried_forward_from_id?: string | null;
  }[];
  readonly notes: readonly NoteView[];
  readonly links: readonly {
    id: string;
    relation_type: string;
    objectType: string;
    record: {
      id: string;
      title: string;
      status: string;
      owner_profile_id?: string | null;
      responsible_profile_id?: string | null;
      due_date?: string | null;
    };
  }[];
  readonly followups: readonly {
    kind: string;
    record_id: string;
    title: string;
    status: string;
    source_session_id: string;
  }[];
  readonly names: ReadonlyMap<string, string>;
  readonly quickContext: QuickContext;
  readonly existingObjects: readonly {
    securityObjectId: string;
    label: string;
  }[];
}

function recordHref(objectType: string, id: string) {
  return `/${objectType === "TASK" ? "tasks" : objectType === "PDCA" ? "pdcas" : "decisions"}/${id}`;
}

export function MeetingMode(props: MeetingModeProps) {
  const { meeting } = props;
  const live = meeting.status === "IN_PROGRESS";
  const before = meeting.status === "DRAFT" || meeting.status === "SCHEDULED";
  const reviewing = meeting.status === "REVIEW";
  const done = meeting.status === "PUBLISHED" || meeting.status === "CLOSED";
  const editable = before || live || reviewing;
  const pending = props.agenda.filter((item) => item.status === "PENDING");
  const current = pending[0] ?? props.agenda[props.agenda.length - 1];
  const created = props.links.filter(
    (link) => link.relation_type === "CREATED",
  );
  const linked = props.links.filter((link) => link.relation_type !== "CREATED");
  // What was already brought into this meeting is no longer "pending".
  const followups = props.followups.filter((item) =>
    item.kind === "AGENDA"
      ? !props.agenda.some(
          (row) => row.carried_forward_from_id === item.record_id,
        )
      : !props.links.some((link) => link.record.id === item.record_id),
  );
  const quick: QuickContext = {
    ...props.quickContext,
    agendaItemId: current?.status === "PENDING" ? current.id : null,
  };

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 -mx-5 border-b bg-[#f7f6f2]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-accent text-xs font-semibold uppercase">
              <Link className="hover:underline" href="/meetings">
                Reuniões
              </Link>
              {" › "}
              {before
                ? "Agendada"
                : live
                  ? "A decorrer"
                  : reviewing
                    ? "A terminar"
                    : "Terminada"}
            </p>
            <h1
              className="mt-1 truncate text-3xl font-semibold tracking-tight"
              data-testid="meeting-title"
            >
              {meeting.title}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {formatDateTime(meeting.scheduled_start_at)} ·{" "}
              {props.scopeSummary} · Chair {props.chairName} ·{" "}
              {props.participantCount}{" "}
              {props.participantCount === 1 ? "pessoa" : "pessoas"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton path={`/meetings/${meeting.id}/run`} />
            <Link
              className="rounded-full border px-4 py-2 text-sm"
              href={`/meetings/${meeting.id}`}
            >
              Mais
            </Link>
            {before && (
              <form action={openMeetingAction}>
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={meeting.id}
                />
                <input type="hidden" name="version" value={meeting.version} />
                <input type="hidden" name="status" value={meeting.status} />
                <SubmitButton pendingLabel="A abrir…">
                  Abrir reunião
                </SubmitButton>
              </form>
            )}
            {(live || reviewing) && (
              <Link
                className="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-neutral-800"
                href={`/meetings/${meeting.id}/finish`}
                data-testid="finish-meeting"
              >
                Terminar reunião
              </Link>
            )}
            {done && (
              <Link
                className="rounded-full bg-black px-4 py-2 text-sm text-white"
                href={`/meetings/${meeting.id}/finish`}
              >
                Ver resumo
              </Link>
            )}
          </div>
        </div>
        {before && (
          <p className="text-muted-foreground mt-3 text-sm">
            Prepara a agenda e revê os pendentes. Quando a reunião começar,
            carrega em Abrir reunião.
          </p>
        )}
        {live && (
          <p className="text-muted-foreground mt-3 text-sm">
            {pending.length === 0
              ? "Todos os temas têm resultado. Quando terminar, carrega em Terminar reunião."
              : `${pending.length} ${pending.length === 1 ? "tema por discutir" : "temas por discutir"}. Marca cada um como discutido ou adiado; o que ficar em aberto decides ao terminar.`}
          </p>
        )}
        {reviewing && (
          <p className="text-muted-foreground mt-3 text-sm">
            A reunião está a terminar. Podes ainda acrescentar ou corrigir
            acções antes de distribuir.
          </p>
        )}
        {props.live && <div className="mt-2">{props.live}</div>}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <main className="space-y-5">
          {followups.length > 0 && (
            <section
              className="rounded-2xl border bg-white"
              data-testid="previous-pending"
            >
              <h2 className="border-b p-5 text-lg font-semibold">
                Pendentes da reunião anterior
              </h2>
              <ul>
                {followups.map((item) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm last:border-0"
                    key={`${item.kind}-${item.record_id}`}
                  >
                    <span>
                      <span className="text-muted-foreground mr-2">☐</span>
                      {item.kind === "AGENDA" ? (
                        item.title
                      ) : (
                        <Link
                          className="underline-offset-4 hover:underline"
                          href={recordHref(item.kind, item.record_id)}
                        >
                          {item.title}
                        </Link>
                      )}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {objectTypeLabel(item.kind)}
                      </span>
                      <StatusBadge
                        value={item.status}
                        kind={
                          item.kind === "AGENDA"
                            ? "agenda"
                            : item.kind === "PDCA"
                              ? "pdca"
                              : "task"
                        }
                      />
                      {editable && item.kind === "AGENDA" && (
                        <form action={addMeetingAgendaItemAction}>
                          <input
                            type="hidden"
                            name="meetingSessionId"
                            value={meeting.id}
                          />
                          <input
                            type="hidden"
                            name="title"
                            value={item.title}
                          />
                          <input
                            type="hidden"
                            name="carriedForwardFromId"
                            value={item.record_id}
                          />
                          <button className="rounded-full border px-3 py-1 text-xs">
                            Trazer para hoje
                          </button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-3xl bg-black p-7 text-white">
            <p className="text-xs font-semibold text-white/50 uppercase">
              {current?.status === "PENDING"
                ? `Tema actual · ${props.agenda.length - pending.length + 1} de ${props.agenda.length}`
                : props.agenda.length > 0
                  ? "Último tema"
                  : "Agenda"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {current?.title ?? "Ainda sem temas"}
            </h2>
            {current?.description && (
              <p className="mt-2 text-white/60">{current.description}</p>
            )}
            {!current && (
              <p className="mt-2 text-white/60">
                Adiciona o primeiro tema abaixo. Também podes trabalhar sem
                agenda: notas e acções ficam ligadas à reunião.
              </p>
            )}
            {editable && current?.status === "PENDING" && (
              <div className="mt-5 flex flex-wrap gap-2">
                <form action={setMeetingAgendaStatusAction}>
                  <input
                    type="hidden"
                    name="meetingSessionId"
                    value={meeting.id}
                  />
                  <input type="hidden" name="agendaItemId" value={current.id} />
                  <input type="hidden" name="version" value={current.version} />
                  <input type="hidden" name="status" value="DISCUSSED" />
                  <SubmitButton
                    className="!bg-white !text-black hover:!bg-neutral-200"
                    pendingLabel="A guardar…"
                  >
                    Discutido ✓
                  </SubmitButton>
                </form>
                <form
                  action={setMeetingAgendaStatusAction}
                  className="flex gap-2"
                >
                  <input
                    type="hidden"
                    name="meetingSessionId"
                    value={meeting.id}
                  />
                  <input type="hidden" name="agendaItemId" value={current.id} />
                  <input type="hidden" name="version" value={current.version} />
                  <input type="hidden" name="status" value="POSTPONED" />
                  <input
                    aria-label="Motivo para adiar"
                    className="rounded-full border border-white/30 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/40"
                    name="reason"
                    placeholder="Adiar porquê?"
                    required
                    minLength={3}
                  />
                  <SubmitButton
                    variant="secondary"
                    className="!border-white/30 !bg-transparent !text-white"
                    pendingLabel="A adiar…"
                  >
                    Adiar
                  </SubmitButton>
                </form>
              </div>
            )}
          </section>

          {editable && (
            <section
              className="flex flex-wrap items-center gap-2 rounded-2xl border bg-white p-4"
              data-testid="quick-actions"
            >
              <span className="mr-2 text-sm font-semibold">Acções</span>
              <SideSheet
                label="+ Tarefa"
                title="Nova tarefa"
                description="Fica em rascunho até a reunião terminar; depois aparece a quem for responsável."
                testId="open-task-sheet"
              >
                <QuickTaskForm
                  action={createMeetingObjectAction}
                  context={quick}
                />
              </SideSheet>
              <SideSheet
                label="+ PDCA"
                title="Novo PDCA"
                description="Problema, objectivo, quem executa e quem acompanha. O resto pode amadurecer depois."
                testId="open-pdca-sheet"
              >
                <QuickPdcaForm
                  action={createMeetingObjectAction}
                  context={quick}
                />
              </SideSheet>
              <SideSheet
                label="+ Decisão"
                title="Nova decisão"
                description="Um registo do que ficou decidido. Não precisa de responsável."
                testId="open-decision-sheet"
              >
                <QuickDecisionForm
                  action={createMeetingObjectAction}
                  context={quick}
                />
              </SideSheet>
              {current?.status === "PENDING" && (
                <span className="text-muted-foreground text-xs">
                  ficam ligadas ao tema «{current.title}»
                </span>
              )}
            </section>
          )}

          <MeetingNotes
            meetingId={meeting.id}
            notes={props.notes}
            agenda={props.agenda.map((item) => ({
              id: item.id,
              title: item.title,
            }))}
            currentAgendaId={current?.status === "PENDING" ? current.id : null}
            editable={editable}
            saveNote={saveMeetingNoteAction}
            createNote={createMeetingNoteAction}
          />

          <section className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-semibold">Agenda</h2>
              <span className="text-muted-foreground text-xs">
                {props.agenda.length}{" "}
                {props.agenda.length === 1 ? "tema" : "temas"}
              </span>
            </div>
            {props.agenda.length === 0 && (
              <p className="text-muted-foreground p-5 text-sm">
                Sem temas previstos.
              </p>
            )}
            <ol>
              {props.agenda.map((item) => (
                <li
                  className={`flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 text-sm last:border-0 ${item.id === current?.id && item.status === "PENDING" ? "bg-amber-50/70" : ""}`}
                  key={item.id}
                >
                  <span>
                    <span className="text-muted-foreground mr-2 tabular-nums">
                      {item.position}.
                    </span>
                    {item.title}
                  </span>
                  <StatusBadge value={item.status} kind="agenda" />
                </li>
              ))}
            </ol>
            {editable && (
              <form
                action={addMeetingAgendaItemAction}
                className="flex flex-wrap items-center gap-2 border-t bg-neutral-50/60 p-4"
              >
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={meeting.id}
                />
                <input
                  aria-label="Novo tema"
                  className={`${field} min-w-64 flex-1`}
                  name="title"
                  placeholder="Novo tema"
                  required
                  minLength={2}
                />
                <SubmitButton variant="secondary" pendingLabel="A adicionar…">
                  Adicionar à agenda
                </SubmitButton>
              </form>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          <section
            className="rounded-2xl border bg-white"
            data-testid="created-in-meeting"
          >
            <h2 className="border-b p-5 text-lg font-semibold">
              Acções criadas nesta reunião
            </h2>
            {created.length === 0 && (
              <p className="text-muted-foreground p-5 text-sm">
                Ainda nada. Usa + Tarefa, + PDCA ou + Decisão.
              </p>
            )}
            <ul>
              {created.map((link) => {
                const responsible = link.record.responsible_profile_id
                  ? props.names.get(link.record.responsible_profile_id)
                  : null;
                const needsResponsible =
                  link.objectType !== "DECISION" && !responsible;
                const needsOwner =
                  link.objectType === "PDCA" && !link.record.owner_profile_id;
                return (
                  <li
                    className="border-b px-5 py-3 text-sm last:border-0"
                    key={link.id}
                  >
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={recordHref(link.objectType, link.record.id)}
                    >
                      {link.record.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span>{objectTypeLabel(link.objectType)}</span>
                      {link.objectType !== "DECISION" && (
                        <>
                          <span>·</span>
                          <span
                            className={needsResponsible ? "text-red-700" : ""}
                          >
                            {responsible ?? "sem responsável"}
                          </span>
                          <span>·</span>
                          <DueDate
                            value={link.record.due_date}
                            status={link.record.status}
                            relative
                          />
                        </>
                      )}
                      {needsOwner && (
                        <span className="text-red-700">· sem Owner</span>
                      )}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {linked.length > 0 && (
            <section className="rounded-2xl border bg-white">
              <h2 className="border-b p-5 text-lg font-semibold">
                Assuntos ligados
              </h2>
              <ul>
                {linked.map((link) => (
                  <li
                    className="border-b px-5 py-3 text-sm last:border-0"
                    key={link.id}
                  >
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={recordHref(link.objectType, link.record.id)}
                    >
                      {link.record.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
                      <span>{objectTypeLabel(link.objectType)}</span>
                      <span>·</span>
                      <span>{linkRelationLabel(link.relation_type)}</span>
                      <StatusBadge
                        value={link.record.status}
                        kind={
                          link.objectType === "PDCA"
                            ? "pdca"
                            : link.objectType === "DECISION"
                              ? "decision"
                              : "task"
                        }
                      />
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {editable && props.existingObjects.length > 0 && (
            <details className="rounded-2xl border bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold">
                Ligar um assunto já existente
              </summary>
              <form
                action={linkMeetingObjectAction}
                className="mt-3 grid gap-2"
              >
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={meeting.id}
                />
                <select
                  aria-label="Assunto"
                  className={field}
                  name="securityObjectId"
                  required
                >
                  <option value="">Escolher assunto</option>
                  {props.existingObjects.map((object) => (
                    <option
                      key={object.securityObjectId}
                      value={object.securityObjectId}
                    >
                      {object.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Relação"
                  className={field}
                  name="relationType"
                  defaultValue="DISCUSSED"
                >
                  <option value="DISCUSSED">Discutido nesta reunião</option>
                  <option value="FOLLOW_UP">Para acompanhamento</option>
                  <option value="REVIEWED">Revisto</option>
                  <option value="CLOSED_IN_MEETING">Encerrado aqui</option>
                </select>
                <div>
                  <SubmitButton variant="secondary" pendingLabel="A ligar…">
                    Ligar
                  </SubmitButton>
                </div>
              </form>
            </details>
          )}
        </aside>
      </div>
    </div>
  );
}
