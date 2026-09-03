import {
  addCommentAction,
  addObjectMemberAction,
  assignExecutionPeopleAction,
  changeDueDateAction,
  changePdcaPhaseAction,
  removeObjectMemberAction,
  replaceScopeAction,
  transitionPdcaAction,
  transitionTaskAction,
} from "@/app/actions/execution";
import type { CreationOptions } from "@/modules/execution/application/creation-options";

const input = "rounded-lg border bg-white px-3 py-2 text-sm";

export function ExecutionActions({
  kind,
  id,
  securityObjectId,
  version,
  people = [],
  currentDueDate = null,
  securityVersion,
  scopeOptions,
  unitScopeIds,
  restaurantScopeIds,
  collaborators,
  watchers,
}: {
  readonly kind: "Decision" | "Task" | "PDCA";
  readonly id: string;
  readonly securityObjectId: string;
  readonly version: number;
  readonly people?: readonly { profile_id: string; display_name: string }[];
  readonly currentDueDate?: string | null;
  readonly securityVersion: number;
  readonly scopeOptions: CreationOptions;
  readonly unitScopeIds: readonly string[];
  readonly restaurantScopeIds: readonly string[];
  readonly collaborators: readonly { id: string; name: string }[];
  readonly watchers: readonly { id: string; name: string }[];
}) {
  const path = `/${kind === "Decision" ? "decisions" : kind === "Task" ? "tasks" : "pdcas"}/${id}`;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {kind !== "Decision" && (
        <form
          action={kind === "Task" ? transitionTaskAction : transitionPdcaAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Alterar estado</h2>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <select className={input} name="status">
            {[
              "OPEN",
              "PLANNED",
              "IN_PROGRESS",
              "BLOCKED",
              "WAITING",
              "UNDER_REVIEW",
              "COMPLETED",
              "CANCELLED",
              "ARCHIVED",
            ].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
          <input
            className={input}
            name="reason"
            placeholder="Motivo quando obrigatório"
          />
          <textarea
            className={input}
            name="completionNotes"
            placeholder="Notas de conclusão"
          />
          <button className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
            Guardar transição
          </button>
        </form>
      )}
      {kind !== "Decision" && (
        <form
          action={changeDueDateAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Alterar prazo</h2>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="version" value={version} />
          <input className={input} type="date" name="newDueDate" required />
          <input
            className={input}
            name="reason"
            minLength={3}
            required
            placeholder={
              currentDueDate
                ? `Motivo para alterar ${currentDueDate}`
                : "Motivo para definir prazo"
            }
          />
          <button className="w-fit rounded-full border px-4 py-2 text-sm">
            Guardar prazo
          </button>
        </form>
      )}
      {kind === "PDCA" && (
        <form
          action={changePdcaPhaseAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Mudar fase PDCA</h2>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <select className={input} name="phase">
            {["PLAN", "DO", "CHECK", "ACT"].map((phase) => (
              <option key={phase}>{phase}</option>
            ))}
          </select>
          <input
            className={input}
            name="reason"
            placeholder="Motivo ao regressar de fase"
          />
          <button className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
            Guardar fase
          </button>
        </form>
      )}
      {kind !== "Decision" && people.length > 0 && (
        <form
          action={assignExecutionPeopleAction}
          className="grid gap-3 rounded-2xl border bg-white p-5"
        >
          <h2 className="font-semibold">Owner e Responsible</h2>
          <input
            type="hidden"
            name="securityObjectId"
            value={securityObjectId}
          />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="returnPath" value={path} />
          <select className={input} name="ownerProfileId" required>
            <option value="">Selecionar Owner</option>
            {people.map((person) => (
              <option
                value={person.profile_id}
                key={`owner-${person.profile_id}`}
              >
                {person.display_name}
              </option>
            ))}
          </select>
          <select className={input} name="responsibleProfileId" required>
            <option value="">Selecionar Responsible</option>
            {people.map((person) => (
              <option
                value={person.profile_id}
                key={`responsible-${person.profile_id}`}
              >
                {person.display_name}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Só aparecem pessoas que já conseguem ler este objeto. Esta operação
            nunca cria grants.
          </p>
          <button className="w-fit rounded-full border px-4 py-2 text-sm">
            Guardar atribuições
          </button>
        </form>
      )}
      <form
        action={replaceScopeAction}
        className="grid gap-3 rounded-2xl border bg-white p-5 lg:col-span-2"
      >
        <h2 className="font-semibold">Alterar scope</h2>
        <input type="hidden" name="securityObjectId" value={securityObjectId} />
        <input type="hidden" name="securityVersion" value={securityVersion} />
        <input type="hidden" name="returnPath" value={path} />
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium">
              Departamentos / serviços
            </legend>
            {scopeOptions.units.map((unit) => (
              <label className="mt-2 flex gap-2 text-sm" key={unit.id}>
                <input
                  type="checkbox"
                  name="unitIds"
                  value={unit.id}
                  defaultChecked={unitScopeIds.includes(unit.id)}
                />
                {unit.name}
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Restaurantes</legend>
            {scopeOptions.restaurants.map((restaurant) => (
              <label className="mt-2 flex gap-2 text-sm" key={restaurant.id}>
                <input
                  type="checkbox"
                  name="restaurantIds"
                  value={restaurant.id}
                  defaultChecked={restaurantScopeIds.includes(restaurant.id)}
                />
                {restaurant.name}
              </label>
            ))}
          </fieldset>
        </div>
        <input
          className={input}
          name="reason"
          minLength={3}
          required
          placeholder="Motivo da alteração de scope"
        />
        <button className="w-fit rounded-full border px-4 py-2 text-sm">
          Guardar scope
        </button>
      </form>
      <section className="grid gap-3 rounded-2xl border bg-white p-5 lg:col-span-2">
        <h2 className="font-semibold">Collaborators e Watchers</h2>
        <form action={addObjectMemberAction} className="flex flex-wrap gap-2">
          <input
            type="hidden"
            name="securityObjectId"
            value={securityObjectId}
          />
          <input type="hidden" name="returnPath" value={path} />
          <select className={input} name="profileId" required>
            <option value="">Selecionar pessoa com acesso</option>
            {people.map((person) => (
              <option key={person.profile_id} value={person.profile_id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <select className={input} name="membershipRole">
            <option>COLLABORATOR</option>
            <option>WATCHER</option>
          </select>
          <button className="rounded-full border px-4 py-2 text-sm">
            Adicionar
          </button>
        </form>
        <p className="text-muted-foreground text-xs">
          Se uma pessoa não aparecer, é necessário corrigir o scope ou emitir um
          explicit grant válido num fluxo autorizado. Esta operação nunca cria
          grants.
        </p>
        {[...collaborators, ...watchers].map((member) => (
          <form
            action={removeObjectMemberAction}
            className="flex items-center justify-between border-t pt-3 text-sm"
            key={member.id}
          >
            <input type="hidden" name="membershipId" value={member.id} />
            <input type="hidden" name="returnPath" value={path} />
            <span>{member.name}</span>
            <button className="text-muted-foreground hover:text-foreground">
              Remover
            </button>
          </form>
        ))}
      </section>
      <form
        action="/api/attachments"
        method="post"
        encType="multipart/form-data"
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Adicionar attachment</h2>
        <input type="hidden" name="securityObjectId" value={securityObjectId} />
        <input type="hidden" name="returnPath" value={path} />
        <input className={input} type="file" name="file" required />
        <p className="text-muted-foreground text-xs">
          PDF, PNG, JPEG ou texto. Limites configurados no servidor.
        </p>
        <button className="w-fit rounded-full border px-4 py-2 text-sm">
          Enviar ficheiro
        </button>
      </form>
      <form
        action={addCommentAction}
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Adicionar comentário</h2>
        <input type="hidden" name="securityObjectId" value={securityObjectId} />
        <input type="hidden" name="returnPath" value={path} />
        <textarea
          className={`${input} min-h-24`}
          name="body"
          required
          maxLength={10000}
        />
        <button className="w-fit rounded-full border px-4 py-2 text-sm">
          Comentar
        </button>
      </form>
    </div>
  );
}
