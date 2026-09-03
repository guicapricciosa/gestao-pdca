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

function ScopeFields({
  options,
  unitIds,
  restaurantIds,
}: {
  readonly options: CreationOptions;
  readonly unitIds: readonly string[];
  readonly restaurantIds: readonly string[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <fieldset>
        <legend className="text-xs font-medium uppercase">Unidades</legend>
        {options.units.map((unit) => (
          <label className="mt-1 flex gap-2 text-xs" key={unit.id}>
            <input
              type="checkbox"
              name="unitIds"
              value={unit.id}
              defaultChecked={unitIds.includes(unit.id)}
            />
            {unit.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="text-xs font-medium uppercase">Restaurantes</legend>
        {options.restaurants.map((restaurant) => (
          <label className="mt-1 flex gap-2 text-xs" key={restaurant.id}>
            <input
              type="checkbox"
              name="restaurantIds"
              value={restaurant.id}
              defaultChecked={restaurantIds.includes(restaurant.id)}
            />
            {restaurant.name}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function CommonObjectFields({ props }: { readonly props: MeetingModeProps }) {
  return (
    <>
      <input type="hidden" name="meetingSessionId" value={props.meeting.id} />
      <input type="hidden" name="companyId" value={props.meeting.company_id} />
      <input type="hidden" name="visibility" value="NORMAL" />
      <input
        className={field}
        name="title"
        placeholder="Título"
        minLength={2}
        required
      />
      <textarea
        className={field}
        name="description"
        placeholder="Descrição / problema"
      />
      <ScopeFields
        options={props.scopeOptions}
        unitIds={props.unitScopeIds}
        restaurantIds={props.restaurantScopeIds}
      />
    </>
  );
}

export function MeetingMode(props: MeetingModeProps) {
  const current =
    props.agenda.find((item) => item.status === "PENDING") ?? props.agenda[0];
  const editable = ["DRAFT", "SCHEDULED", "IN_PROGRESS", "REVIEW"].includes(
    props.meeting.status,
  );
  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-4 border-b bg-[#f7f6f2]/95 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-accent text-xs font-semibold uppercase">
            Meeting Mode · {props.meeting.status}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {props.meeting.title}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${props.meeting.id}`}
          >
            Detalhe
          </Link>
          {props.meeting.status === "SCHEDULED" && (
            <form action={transitionMeetingAction}>
              <input
                type="hidden"
                name="meetingSessionId"
                value={props.meeting.id}
              />
              <input
                type="hidden"
                name="version"
                value={props.meeting.version}
              />
              <input type="hidden" name="status" value="IN_PROGRESS" />
              <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
                Start
              </button>
            </form>
          )}
          {props.meeting.status === "IN_PROGRESS" && (
            <form action={transitionMeetingAction}>
              <input
                type="hidden"
                name="meetingSessionId"
                value={props.meeting.id}
              />
              <input
                type="hidden"
                name="version"
                value={props.meeting.version}
              />
              <input type="hidden" name="status" value="REVIEW" />
              <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
                Review
              </button>
            </form>
          )}
        </div>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <main className="space-y-5">
          <section className="rounded-3xl bg-black p-7 text-white">
            <p className="text-xs font-semibold text-white/50 uppercase">
              Agenda atual
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {current?.title ?? "Agenda ainda vazia"}
            </h2>
            <p className="mt-2 text-white/60">{current?.description}</p>
          </section>
          <section className="rounded-2xl border bg-white">
            <h2 className="border-b p-5 text-lg font-semibold">Agenda</h2>
            {props.agenda.map((item) => (
              <article
                className={`border-b p-5 last:border-0 ${item.id === current?.id ? "bg-amber-50" : ""}`}
                key={item.id}
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">
                      {item.position}. {item.title}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-xs">{item.status}</span>
                </div>
                {editable && (
                  <form
                    action={setMeetingAgendaStatusAction}
                    className="mt-3 flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="meetingSessionId"
                      value={props.meeting.id}
                    />
                    <input type="hidden" name="agendaItemId" value={item.id} />
                    <input type="hidden" name="version" value={item.version} />
                    <select
                      className={field}
                      name="status"
                      defaultValue={item.status}
                    >
                      {["PENDING", "DISCUSSED", "POSTPONED", "CLOSED"].map(
                        (status) => (
                          <option key={status}>{status}</option>
                        ),
                      )}
                    </select>
                    <input
                      className={field}
                      name="reason"
                      placeholder="Motivo para adiar"
                    />
                    <button className="rounded-full border px-3 text-xs">
                      Guardar outcome
                    </button>
                  </form>
                )}
              </article>
            ))}
            {editable && (
              <form
                action={addMeetingAgendaItemAction}
                className="grid gap-2 p-5"
              >
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={props.meeting.id}
                />
                <input
                  className={field}
                  name="title"
                  placeholder="Novo tema"
                  required
                />
                <textarea
                  className={field}
                  name="description"
                  placeholder="Contexto"
                />
                <input
                  className={field}
                  type="number"
                  name="estimatedMinutes"
                  min="1"
                  max="1440"
                  placeholder="Minutos estimados"
                />
                <button className="w-fit rounded-full border px-4 py-2 text-sm">
                  Adicionar à agenda
                </button>
              </form>
            )}
          </section>
          <section className="rounded-2xl border bg-white">
            <h2 className="border-b p-5 text-lg font-semibold">Notes</h2>
            {props.notes.map((note) => (
              <article className="border-b p-4 last:border-0" key={note.id}>
                {editable ? (
                  <form action={updateMeetingNoteAction} className="grid gap-2">
                    <input
                      type="hidden"
                      name="meetingSessionId"
                      value={props.meeting.id}
                    />
                    <input type="hidden" name="noteId" value={note.id} />
                    <input type="hidden" name="version" value={note.version} />
                    <textarea
                      aria-label={`Editar nota de ${note.author.display_name}`}
                      className={field}
                      name="content"
                      defaultValue={note.content}
                      required
                    />
                    <button className="w-fit rounded-full border px-3 py-1 text-xs">
                      Guardar nota
                    </button>
                  </form>
                ) : (
                  <p>{note.content}</p>
                )}
                <p className="text-muted-foreground mt-1 text-xs">
                  {note.author.display_name} ·{" "}
                  {new Date(note.created_at).toLocaleTimeString("pt-PT")}
                </p>
              </article>
            ))}
            {editable && (
              <form action={addMeetingNoteAction} className="grid gap-2 p-5">
                <input
                  type="hidden"
                  name="meetingSessionId"
                  value={props.meeting.id}
                />
                <select className={field} name="agendaItemId">
                  <option value="">Nota geral</option>
                  {props.agenda.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
                <textarea
                  className={field}
                  name="content"
                  required
                  placeholder="Registar nota partilhada"
                />
                <button className="w-fit rounded-full border px-4 py-2 text-sm">
                  Adicionar nota
                </button>
              </form>
            )}
          </section>
        </main>
        <aside className="space-y-5">
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Pending anterior</h2>
            {props.followups.length === 0 ? (
              <p className="text-muted-foreground mt-3 text-sm">
                Sem follow-ups acessíveis.
              </p>
            ) : (
              props.followups.map((item) => (
                <div
                  className="mt-3 border-t pt-3 text-sm"
                  key={`${item.kind}-${item.record_id}`}
                >
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.kind} · {item.status}
                  </p>
                  {editable && item.kind === "AGENDA" && (
                    <form action={addMeetingAgendaItemAction} className="mt-2">
                      <input
                        type="hidden"
                        name="meetingSessionId"
                        value={props.meeting.id}
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
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Objetos ligados</h2>
            {props.links.map((link) => (
              <Link
                className="mt-3 block border-t pt-3"
                href={`/${link.objectType === "TASK" ? "tasks" : link.objectType === "PDCA" ? "pdcas" : "decisions"}/${link.record.id}`}
                key={link.id}
              >
                <p className="text-sm font-medium">{link.record.title}</p>
                <p className="text-muted-foreground text-xs">
                  {link.objectType} · {link.relation_type} ·{" "}
                  {link.record.status}
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
              <input
                type="hidden"
                name="meetingSessionId"
                value={props.meeting.id}
              />
              <select className={field} name="securityObjectId" required>
                <option value="">Objeto acessível</option>
                {props.existingObjects.map((object) => (
                  <option
                    key={object.securityObjectId}
                    value={object.securityObjectId}
                  >
                    {object.label}
                  </option>
                ))}
              </select>
              <select className={field} name="relationType">
                <option>DISCUSSED</option>
                <option>REVIEWED</option>
                <option>FOLLOW_UP</option>
                <option>CLOSED_IN_MEETING</option>
              </select>
              <button className="rounded-full border px-4 py-2 text-sm">
                Associar sem duplicar
              </button>
            </form>
          )}
        </aside>
      </div>
      {editable && (
        <section className="grid gap-5 xl:grid-cols-3">
          <form
            action={createMeetingObjectAction}
            className="grid gap-2 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-semibold">Quick Decision</h2>
            <input type="hidden" name="kind" value="DECISION" />
            <CommonObjectFields props={props} />
            <input
              className={field}
              type="date"
              name="decisionDate"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
            <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
              Criar Decision draft
            </button>
          </form>
          <form
            action={createMeetingObjectAction}
            className="grid gap-2 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-semibold">Quick Task</h2>
            <input type="hidden" name="kind" value="TASK" />
            <CommonObjectFields props={props} />
            <select className={field} name="priority">
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
              <option>LOW</option>
            </select>
            <select className={field} name="ownerProfileId" required>
              <option value="">Owner</option>
              {props.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <select className={field} name="responsibleProfileId" required>
              <option value="">Responsible</option>
              {props.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <input className={field} type="date" name="dueDate" required />
            <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
              Criar Task draft
            </button>
          </form>
          <form
            action={createMeetingObjectAction}
            className="grid gap-2 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-semibold">Quick PDCA</h2>
            <input type="hidden" name="kind" value="PDCA" />
            <CommonObjectFields props={props} />
            <textarea
              className={field}
              name="objective"
              placeholder="Objetivo"
              required
            />
            <select className={field} name="priority">
              <option>MEDIUM</option>
              <option>HIGH</option>
              <option>CRITICAL</option>
              <option>LOW</option>
            </select>
            <select className={field} name="ownerProfileId" required>
              <option value="">Owner</option>
              {props.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <select className={field} name="responsibleProfileId" required>
              <option value="">Responsible</option>
              {props.people.map((person) => (
                <option key={person.profile_id} value={person.profile_id}>
                  {person.display_name}
                </option>
              ))}
            </select>
            <input className={field} type="date" name="dueDate" required />
            <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
              Criar PDCA draft
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
