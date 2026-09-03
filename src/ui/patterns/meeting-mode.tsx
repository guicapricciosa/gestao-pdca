import Link from "next/link";

import {
  addMeetingAgendaItemAction,
  addMeetingNoteAction,
  createMeetingObjectAction,
  linkMeetingObjectAction,
  setMeetingAgendaStatusAction,
  transitionMeetingAction,
  updateMeetingNoteAction,
} from "@/app/actions/meetings";
import type { CreationOptions } from "@/modules/execution/application/creation-options";
import { StatusBadge } from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import { ScopeFields } from "@/ui/patterns/scope-fields";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
const steps = [
  "SCHEDULED",
  "IN_PROGRESS",
  "REVIEW",
  "PUBLISHED",
  "CLOSED",
] as const;
const stepLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  SCHEDULED: "Agendada",
  IN_PROGRESS: "A decorrer",
  REVIEW: "Em revisão",
  PUBLISHED: "Publicada",
  CLOSED: "Fechada",
  CANCELLED: "Cancelada",
};

interface MeetingModeProps {
  readonly meeting: {
    id: string;
    company_id: string;
    title: string;
    status: string;
    version: number;
    scheduled_start_at: string;
  };
  readonly agenda: readonly {
    id: string;
    title: string;
    description: string | null;
    status: string;
    position: number;
    version: number;
  }[];
  readonly notes: readonly {
    id: string;
    content: string;
    version: number;
    created_at: string;
    meeting_agenda_item_id: string | null;
    author: { display_name: string };
  }[];
  readonly links: readonly {
    id: string;
    relation_type: string;
    objectType: string;
    record: { id: string; title: string; status: string };
  }[];
  readonly followups: readonly {
    kind: string;
    record_id: string;
    title: string;
    status: string;
    source_session_id: string;
  }[];
  readonly people: readonly { profile_id: string; display_name: string }[];
  readonly scopeOptions: CreationOptions;
  readonly unitScopeIds: readonly string[];
  readonly restaurantScopeIds: readonly string[];
  readonly existingObjects: readonly {
    securityObjectId: string;
    label: string;
  }[];
}

function recordHref(objectType: string, id: string) {
  return `/${objectType === "TASK" ? "tasks" : objectType === "PDCA" ? "pdcas" : "decisions"}/${id}`;
}

function Transition({
  meeting,
  status,
  label,
  primary = true,
}: {
  readonly meeting: MeetingModeProps["meeting"];
  readonly status: string;
  readonly label: string;
  readonly primary?: boolean;
}) {
  return (
    <form action={transitionMeetingAction}>
      <input type="hidden" name="meetingSessionId" value={meeting.id} />
      <input type="hidden" name="version" value={meeting.version} />
      <input type="hidden" name="status" value={status} />
      <input
        type="hidden"
        name="returnPath"
        value={`/meetings/${meeting.id}/run`}
      />
      <SubmitButton
        variant={primary ? "primary" : "secondary"}
        pendingLabel="A actualizar…"
      >
        {label}
      </SubmitButton>
    </form>
  );
}

function PeopleSelect({
  name,
  label,
  people,
}: {
  readonly name: string;
  readonly label: string;
  readonly people: MeetingModeProps["people"];
}) {
  return (
    <label className="text-xs font-medium">
      {label}
      <select className={`${field} mt-1 w-full`} name={name} required>
        <option value="">Escolher</option>
        {people.map((person) => (
          <option key={person.profile_id} value={person.profile_id}>
            {person.display_name}
          </option>
        ))}
      </select>
    </label>
  );
}

function CommonObjectFields({
  props,
  descriptionLabel,
}: {
  readonly props: MeetingModeProps;
  readonly descriptionLabel: string;
}) {
  return (
    <>
      <input type="hidden" name="meetingSessionId" value={props.meeting.id} />
      <input type="hidden" name="companyId" value={props.meeting.company_id} />
      <input type="hidden" name="visibility" value="NORMAL" />
      <label className="text-xs font-medium">
        Título
        <input
          className={`${field} mt-1 w-full`}
          name="title"
          minLength={2}
          required
        />
      </label>
      <label className="text-xs font-medium">
        {descriptionLabel}
        <textarea
          className={`${field} mt-1 w-full`}
          name="description"
          rows={2}
        />
      </label>
      <details className="rounded-lg border p-3">
        <summary className="cursor-pointer text-xs font-medium">
          Âmbito (herda o da reunião)
        </summary>
        <div className="mt-3">
          <ScopeFields
            options={props.scopeOptions}
            unitIds={props.unitScopeIds}
            restaurantIds={props.restaurantScopeIds}
            dense
          />
        </div>
      </details>
    </>
  );
}

export function MeetingMode(props: MeetingModeProps) {
  const { meeting } = props;
  const current =
    props.agenda.find((item) => item.status === "PENDING") ?? props.agenda[0];
  const editable = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "REVIEW"].includes(
    meeting.status,
  );
  const live = meeting.status === "IN_PROGRESS";
  const pending = props.agenda.filter(
    (item) => item.status === "PENDING",
  ).length;
  const stepIndex = steps.indexOf(meeting.status as (typeof steps)[number]);
  const created = props.links.filter(
    (link) => link.relation_type === "CREATED",
  );
  const linked = props.links.filter((link) => link.relation_type !== "CREATED");
  const priorities = ["MEDIUM", "HIGH", "CRITICAL", "LOW"];

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 -mx-5 border-b bg-[#f7f6f2]/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-12 lg:px-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-accent text-xs font-semibold uppercase">
              Meeting Mode · {meeting.status}
            </p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight">
              {meeting.title}
            </h1>
            <ol className="mt-3 flex flex-wrap items-center gap-1 text-[11px] font-medium tracking-[0.08em] uppercase">
              {steps.map((step, index) => (
                <li className="flex items-center gap-1" key={step}>
                  <span
                    className={
                      index < stepIndex
                        ? "text-muted-foreground line-through decoration-1"
                        : index === stepIndex
                          ? "rounded-full bg-black px-2 py-0.5 text-white"
                          : "text-muted-foreground"
                    }
                  >
                    {stepLabel[step]}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="text-muted-foreground" aria-hidden="true">
                      ›
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="rounded-full border px-4 py-2 text-sm"
              href={`/meetings/${meeting.id}`}
            >
              Detalhe
            </Link>
            {meeting.status === "DRAFT" && (
              <Transition
                meeting={meeting}
                status="SCHEDULED"
                label="Agendar"
              />
            )}
            {meeting.status === "SCHEDULED" && (
              <Transition
                meeting={meeting}
                status="IN_PROGRESS"
                label="Start"
              />
            )}
            {meeting.status === "IN_PROGRESS" && (
              <Transition meeting={meeting} status="REVIEW" label="Review" />
            )}
            {meeting.status === "REVIEW" && (
              <>
                <Transition
                  meeting={meeting}
                  status="IN_PROGRESS"
                  label="Retomar reunião"
                  primary={false}
                />
                <Link
                  className="rounded-full bg-black px-4 py-2 text-sm text-white"
                  href={`/meetings/${meeting.id}/review`}
                >
                  Rever e publicar
                </Link>
              </>
            )}
            {(meeting.status === "PUBLISHED" ||
              meeting.status === "CLOSED") && (
              <Link
                className="rounded-full bg-black px-4 py-2 text-sm text-white"
                href={`/meetings/${meeting.id}/review`}
              >
                Ver publicação
              </Link>
            )}
          </div>
        </div>
        {meeting.status === "SCHEDULED" && (
          <p className="text-muted-foreground mt-3 text-sm">
            Prepara a agenda e carrega em Start quando a reunião começar.
          </p>
        )}
        {live && (
          <p className="text-muted-foreground mt-3 text-sm">
            {pending === 0
              ? "Todos os temas têm resultado. Quando terminar, carrega em Review."
              : `${pending} tema${pending === 1 ? "" : "s"} sem resultado. Marca cada um como discutido, adiado ou fechado.`}
          </p>
        )}
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.9fr)]">
        <main className="space-y-5">
          <section className="rounded-3xl bg-black p-7 text-white">
            <p className="text-xs font-semibold text-white/50 uppercase">
              {current?.status === "PENDING" ? "Tema actual" : "Último tema"}
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {current?.title ?? "Agenda ainda vazia"}
            </h2>
            {current?.description && (
              <p className="mt-2 text-white/60">{current.description}</p>
            )}
            {!current && (
              <p className="mt-2 text-white/60">
                Adiciona o primeiro tema na secção Agenda.
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="text-lg font-semibold">Agenda</h2>
              <span className="text-muted-foreground text-xs">
                {props.agenda.length} tema{props.agenda.length === 1 ? "" : "s"}
              </span>
            </div>
            {props.agenda.length === 0 && (
              <p className="text-muted-foreground p-5 text-sm">
                Sem temas. Uma reunião só pode ser publicada quando cada tema
                tiver um resultado.
              </p>
            )}
            {props.agenda.map((item) => (
              <article
                className={`border-b p-5 last:border-0 ${item.id === current?.id && item.status === "PENDING" ? "bg-amber-50/70" : ""}`}
                key={item.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      <span className="text-muted-foreground mr-2 tabular-nums">
                        {item.position}.
                      </span>
                      {item.title}
                    </p>
                    {item.description && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {item.description}
                      </p>
                    )}
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                {editable && (
                  <form
                    action={setMeetingAgendaStatusAction}
                    className="mt-3 flex flex-wrap items-center gap-2"
                  >
                    <input
                      type="hidden"
                      name="meetingSessionId"
                      value={meeting.id}
                    />
                    <input type="hidden" name="agendaItemId" value={item.id} />
                    <input type="hidden" name="version" value={item.version} />
                    <select
                      aria-label={`Resultado de ${item.title}`}
                      className={field}
                      name="status"
                      defaultValue={item.status}
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="DISCUSSED">Discutido</option>
                      <option value="POSTPONED">Adiado</option>
                      <option value="CLOSED">Fechado</option>
                    </select>
                    <input
                      aria-label="Motivo"
                      className={`${field} min-w-48 flex-1`}
                      name="reason"
                      placeholder="Motivo (obrigatório ao adiar)"
                    />
                    <SubmitButton variant="secondary" pendingLabel="A guardar…">
                      Guardar outcome
                    </SubmitButton>
                  </form>
                )}
              </article>
            ))}
            {editable && (
              <form
                action={addMeetingAgendaItemAction}
                className="grid gap-2 border-t bg-neutral-50/60 p-5"
              >
                <p className="text-xs font-semibold tracking-[0.08em] uppercase">
                  Novo tema
                </p>
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={meeting.id}
                />
                <input
                  aria-label="Tema"
                  className={field}
                  name="title"
                  placeholder="Tema a discutir"
                  required
                />
                <textarea
                  aria-label="Contexto"
                  className={field}
                  name="description"
                  placeholder="Contexto (opcional)"
                  rows={2}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    aria-label="Minutos estimados"
                    className={`${field} w-40`}
                    type="number"
                    name="estimatedMinutes"
                    min="1"
                    max="1440"
                    placeholder="Minutos"
                  />
                  <SubmitButton variant="secondary" pendingLabel="A adicionar…">
                    Adicionar à agenda
                  </SubmitButton>
                </div>
              </form>
            )}
          </section>

          <section className="rounded-2xl border bg-white">
            <h2 className="border-b p-5 text-lg font-semibold">Notas</h2>
            {props.notes.length === 0 && (
              <p className="text-muted-foreground p-5 text-sm">
                Ainda sem notas partilhadas.
              </p>
            )}
            {props.notes.map((note) => (
              <article className="border-b p-4 last:border-0" key={note.id}>
                {editable ? (
                  <form action={updateMeetingNoteAction} className="grid gap-2">
                    <input
                      type="hidden"
                      name="meetingSessionId"
                      value={meeting.id}
                    />
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="version" value={note.version} />
                    <textarea
                      aria-label={`Editar nota de ${note.author.display_name}`}
                      className={field}
                      name="content"
                      defaultValue={note.content}
                      required
                      rows={2}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-muted-foreground text-xs">
                        {note.author.display_name} ·{" "}
                        {new Date(note.created_at).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {note.meeting_agenda_item_id
                          ? ` · ${props.agenda.find((item) => item.id === note.meeting_agenda_item_id)?.title ?? "tema"}`
                          : ""}
                      </p>
                      <button className="rounded-full border px-3 py-1 text-xs">
                        Guardar nota
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {note.author.display_name} ·{" "}
                      {new Date(note.created_at).toLocaleString("pt-PT")}
                    </p>
                  </>
                )}
              </article>
            ))}
            {editable && (
              <form
                action={addMeetingNoteAction}
                className="grid gap-2 border-t bg-neutral-50/60 p-5"
              >
                <p className="text-xs font-semibold tracking-[0.08em] uppercase">
                  Nova nota
                </p>
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={meeting.id}
                />
                <textarea
                  aria-label="Nota"
                  className={field}
                  name="content"
                  required
                  rows={3}
                  placeholder="O que foi dito, decidido ou pedido"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Tema da nota"
                    className={field}
                    name="agendaItemId"
                    defaultValue={
                      current?.status === "PENDING" ? current.id : ""
                    }
                  >
                    <option value="">Nota geral</option>
                    {props.agenda.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <SubmitButton variant="secondary" pendingLabel="A guardar…">
                    Adicionar nota
                  </SubmitButton>
                </div>
              </form>
            )}
          </section>
        </main>

        <aside className="space-y-5">
          {editable && (
            <section className="rounded-2xl border bg-white">
              <div className="border-b p-5">
                <h2 className="text-lg font-semibold">Ações rápidas</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  Nascem em rascunho e só entram em execução quando a reunião
                  for publicada.
                </p>
              </div>
              <form
                action={createMeetingObjectAction}
                className="grid gap-2 border-b p-5"
              >
                <h3 className="text-sm font-semibold">Quick Decision</h3>
                <input type="hidden" name="kind" value="DECISION" />
                <CommonObjectFields
                  props={props}
                  descriptionLabel="Descrição"
                />
                <label className="text-xs font-medium">
                  Data da decisão
                  <input
                    className={`${field} mt-1 w-full`}
                    type="date"
                    name="decisionDate"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </label>
                <div>
                  <SubmitButton pendingLabel="A criar…">
                    Criar Decision draft
                  </SubmitButton>
                </div>
              </form>
              <form
                action={createMeetingObjectAction}
                className="grid gap-2 border-b p-5"
              >
                <h3 className="text-sm font-semibold">Quick Task</h3>
                <input type="hidden" name="kind" value="TASK" />
                <CommonObjectFields
                  props={props}
                  descriptionLabel="Descrição"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <PeopleSelect
                    name="ownerProfileId"
                    label="Owner"
                    people={props.people}
                  />
                  <PeopleSelect
                    name="responsibleProfileId"
                    label="Responsible"
                    people={props.people}
                  />
                  <label className="text-xs font-medium">
                    Prioridade
                    <select className={`${field} mt-1 w-full`} name="priority">
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Prazo
                    <input
                      className={`${field} mt-1 w-full`}
                      type="date"
                      name="dueDate"
                      required
                    />
                  </label>
                </div>
                <div>
                  <SubmitButton pendingLabel="A criar…">
                    Criar Task draft
                  </SubmitButton>
                </div>
              </form>
              <form
                action={createMeetingObjectAction}
                className="grid gap-2 p-5"
              >
                <h3 className="text-sm font-semibold">Quick PDCA</h3>
                <input type="hidden" name="kind" value="PDCA" />
                <CommonObjectFields props={props} descriptionLabel="Problema" />
                <label className="text-xs font-medium">
                  Objetivo
                  <textarea
                    className={`${field} mt-1 w-full`}
                    name="objective"
                    rows={2}
                    required
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <PeopleSelect
                    name="ownerProfileId"
                    label="Owner"
                    people={props.people}
                  />
                  <PeopleSelect
                    name="responsibleProfileId"
                    label="Responsible"
                    people={props.people}
                  />
                  <label className="text-xs font-medium">
                    Prioridade
                    <select className={`${field} mt-1 w-full`} name="priority">
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium">
                    Prazo
                    <input
                      className={`${field} mt-1 w-full`}
                      type="date"
                      name="dueDate"
                      required
                    />
                  </label>
                </div>
                <div>
                  <SubmitButton pendingLabel="A criar…">
                    Criar PDCA draft
                  </SubmitButton>
                </div>
              </form>
            </section>
          )}

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Objetos ligados</h2>
            {created.length > 0 && (
              <p className="text-muted-foreground mt-1 text-xs">
                Criados nesta reunião ({created.length})
              </p>
            )}
            {props.links.length === 0 && (
              <p className="text-muted-foreground mt-3 text-sm">
                Nada criado nem associado ainda.
              </p>
            )}
            {[...created, ...linked].map((link) => (
              <Link
                className="mt-3 block border-t pt-3"
                href={recordHref(link.objectType, link.record.id)}
                key={link.id}
              >
                <p className="text-sm font-medium">{link.record.title}</p>
                <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span>{link.objectType}</span>
                  <span>·</span>
                  <span>
                    {link.relation_type === "CREATED"
                      ? "criado aqui"
                      : link.relation_type.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <StatusBadge value={link.record.status} />
                </p>
              </Link>
            ))}
          </section>

          {editable && (
            <form
              action={linkMeetingObjectAction}
              className="grid gap-2 rounded-2xl border bg-white p-5"
            >
              <h2 className="font-semibold">Associar existente</h2>
              <p className="text-muted-foreground text-xs">
                Traz para a reunião um item que já existe, sem o duplicar.
              </p>
              <input type="hidden" name="meetingSessionId" value={meeting.id} />
              <select
                aria-label="Objeto"
                className={field}
                name="securityObjectId"
                required
              >
                <option value="">Escolher item acessível</option>
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
              >
                <option value="DISCUSSED">Discutido</option>
                <option value="REVIEWED">Revisto</option>
                <option value="FOLLOW_UP">Follow-up</option>
                <option value="CLOSED_IN_MEETING">Fechado na reunião</option>
              </select>
              <div>
                <SubmitButton variant="secondary" pendingLabel="A associar…">
                  Associar sem duplicar
                </SubmitButton>
              </div>
            </form>
          )}

          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Pending anterior</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              O que ficou em aberto nas sessões anteriores desta série.
            </p>
            {props.followups.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Nada pendente das sessões anteriores.
              </p>
            ) : (
              props.followups.map((item) => (
                <div
                  className="mt-3 border-t pt-3 text-sm"
                  key={`${item.kind}-${item.record_id}`}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                    <span>{item.kind}</span>
                    <StatusBadge value={item.status} />
                  </p>
                  {editable && item.kind === "AGENDA" && (
                    <form action={addMeetingAgendaItemAction} className="mt-2">
                      <input
                        type="hidden"
                        name="meetingSessionId"
                        value={meeting.id}
                      />
                      <input type="hidden" name="title" value={item.title} />
                      <input
                        type="hidden"
                        name="carriedForwardFromId"
                        value={item.record_id}
                      />
                      <button className="rounded-full border px-3 py-1 text-xs">
                        Trazer para esta agenda
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
