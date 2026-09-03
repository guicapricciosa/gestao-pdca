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
import { canTransition } from "@/modules/execution/domain/lifecycle";
import type { ExecutionStatus } from "@/modules/execution/domain/types";
import { FilePicker } from "@/ui/components/file-picker";
import { SubmitButton } from "@/ui/components/submit-button";
import { ScopeFields } from "@/ui/patterns/scope-fields";

const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const allStatuses: readonly ExecutionStatus[] = [
  "OPEN",
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "WAITING",
  "UNDER_REVIEW",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];
const statusHint: Partial<Record<ExecutionStatus, string>> = {
  OPEN: "Sai de rascunho; exige Owner, Responsible e prazo.",
  BLOCKED: "Regista antes o bloqueio (motivo) nesta página.",
  COMPLETED: "Exige notas de conclusão e nenhum bloqueio activo.",
  CANCELLED: "Exige motivo.",
};

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  readonly title: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <section className={`rounded-2xl border bg-white p-5 ${className}`}>
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function ExecutionActions({
  kind,
  id,
  securityObjectId,
  version,
  status,
  people = [],
  ownerProfileId = null,
  responsibleProfileId = null,
  currentDueDate = null,
  securityVersion,
  scopeOptions,
  unitScopeIds,
  restaurantScopeIds,
  collaborators,
  watchers,
  advancedOnly = false,
}: {
  readonly advancedOnly?: boolean;
  readonly kind: "Decision" | "Task" | "PDCA";
  readonly id: string;
  readonly securityObjectId: string;
  readonly version: number;
  readonly status?: string;
  readonly people?: readonly { profile_id: string; display_name: string }[];
  readonly ownerProfileId?: string | null;
  readonly responsibleProfileId?: string | null;
  readonly currentDueDate?: string | null;
  readonly securityVersion: number;
  readonly scopeOptions: CreationOptions;
  readonly unitScopeIds: readonly string[];
  readonly restaurantScopeIds: readonly string[];
  readonly collaborators: readonly { id: string; name: string }[];
  readonly watchers: readonly { id: string; name: string }[];
}) {
  const path = `/${kind === "Decision" ? "decisions" : kind === "Task" ? "tasks" : "pdcas"}/${id}`;
  const current = status as ExecutionStatus | undefined;
  const nextStatuses = allStatuses.filter((target) =>
    current === undefined ? true : canTransition(current, target),
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {kind !== "Decision" && !advancedOnly && (
        <form
          action={kind === "Task" ? transitionTaskAction : transitionPdcaAction}
        >
          <Panel
            title="Alterar estado"
            hint="Só aparecem os estados permitidos a partir do estado actual. Cada mudança fica no histórico."
          >
            <div className="grid gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={version} />
              <Field label="Novo estado">
                <select className={input} name="status">
                  {nextStatuses.map((target) => (
                    <option key={target} value={target}>
                      {target.replaceAll("_", " ")}
                      {statusHint[target] ? ` — ${statusHint[target]}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Motivo (obrigatório para cancelar ou reabrir)">
                <input className={input} name="reason" />
              </Field>
              <Field label="Notas de conclusão (ao concluir)">
                <textarea className={input} name="completionNotes" />
              </Field>
              <div>
                <SubmitButton>Guardar transição</SubmitButton>
              </div>
            </div>
          </Panel>
        </form>
      )}
      {kind !== "Decision" && !advancedOnly && (
        <form action={changeDueDateAction}>
          <Panel
            title="Alterar prazo"
            hint={
              currentDueDate
                ? `Prazo actual: ${new Date(`${currentDueDate}T00:00:00`).toLocaleDateString("pt-PT")}. Cada alteração guarda o prazo anterior e o motivo.`
                : "Ainda sem prazo. O motivo fica no histórico."
            }
          >
            <div className="grid gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="version" value={version} />
              <Field label="Novo prazo">
                <input
                  className={input}
                  type="date"
                  name="newDueDate"
                  required
                />
              </Field>
              <Field label="Motivo">
                <input className={input} name="reason" minLength={3} required />
              </Field>
              <div>
                <SubmitButton variant="secondary">Guardar prazo</SubmitButton>
              </div>
            </div>
          </Panel>
        </form>
      )}
      {kind === "PDCA" && !advancedOnly && (
        <form action={changePdcaPhaseAction}>
          <Panel
            title="Mudar fase PDCA"
            hint="Plan → Do → Check → Act. Voltar atrás exige motivo."
          >
            <div className="grid gap-3">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={version} />
              <Field label="Fase">
                <select className={input} name="phase">
                  {["PLAN", "DO", "CHECK", "ACT"].map((phase) => (
                    <option key={phase}>{phase}</option>
                  ))}
                </select>
              </Field>
              <Field label="Motivo (se regressar de fase)">
                <input className={input} name="reason" />
              </Field>
              <div>
                <SubmitButton>Guardar fase</SubmitButton>
              </div>
            </div>
          </Panel>
        </form>
      )}
      {kind !== "Decision" && people.length > 0 && (
        <form action={assignExecutionPeopleAction}>
          <Panel
            title="Owner e Responsável"
            hint="Owner acompanha e garante o resultado; Responsável executa. Só aparecem pessoas que já conseguem ler este registo."
          >
            <div className="grid gap-3">
              <input
                type="hidden"
                name="securityObjectId"
                value={securityObjectId}
              />
              <input type="hidden" name="version" value={version} />
              <input type="hidden" name="returnPath" value={path} />
              <Field label="Owner">
                <select
                  className={input}
                  name="ownerProfileId"
                  defaultValue={ownerProfileId ?? ""}
                  required={kind === "PDCA"}
                >
                  <option value="">
                    {kind === "PDCA" ? "Seleccionar Owner" : "Sem Owner"}
                  </option>
                  {people.map((person) => (
                    <option
                      value={person.profile_id}
                      key={`owner-${person.profile_id}`}
                    >
                      {person.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Responsável">
                <select
                  className={input}
                  name="responsibleProfileId"
                  defaultValue={responsibleProfileId ?? ""}
                  required
                >
                  <option value="">Seleccionar responsável</option>
                  {people.map((person) => (
                    <option
                      value={person.profile_id}
                      key={`responsible-${person.profile_id}`}
                    >
                      {person.display_name}
                    </option>
                  ))}
                </select>
              </Field>
              <div>
                <SubmitButton variant="secondary">
                  Guardar atribuições
                </SubmitButton>
              </div>
            </div>
          </Panel>
        </form>
      )}
      <form action={replaceScopeAction} className="lg:col-span-2">
        <Panel
          title="Onde se aplica"
          hint="Quem cobre estes restaurantes e áreas passa a ver o registo. Precisas de cobrir o âmbito completo."
        >
          <div className="grid gap-4">
            <input
              type="hidden"
              name="securityObjectId"
              value={securityObjectId}
            />
            <input
              type="hidden"
              name="securityVersion"
              value={securityVersion}
            />
            <input type="hidden" name="returnPath" value={path} />
            <ScopeFields
              options={scopeOptions}
              unitIds={unitScopeIds}
              restaurantIds={restaurantScopeIds}
              dense
            />
            <Field label="Motivo da alteração">
              <input className={input} name="reason" minLength={3} required />
            </Field>
            <div>
              <SubmitButton variant="secondary">Guardar âmbito</SubmitButton>
            </div>
          </div>
        </Panel>
      </form>
      <Panel
        title="Colaboradores e seguidores"
        hint="Colaboradores contribuem; seguidores acompanham. Nenhum dos dois cria acesso: se alguém não aparece, ajusta o âmbito."
        className="lg:col-span-2"
      >
        <form action={addObjectMemberAction} className="flex flex-wrap gap-2">
          <input
            type="hidden"
            name="securityObjectId"
            value={securityObjectId}
          />
          <input type="hidden" name="returnPath" value={path} />
          <select
            aria-label="Pessoa"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            name="profileId"
            required
          >
            <option value="">Selecionar pessoa com acesso</option>
            {people.map((person) => (
              <option key={person.profile_id} value={person.profile_id}>
                {person.display_name}
              </option>
            ))}
          </select>
          <select
            aria-label="Papel"
            className="rounded-lg border bg-white px-3 py-2 text-sm"
            name="membershipRole"
          >
            <option value="COLLABORATOR">Colaborador</option>
            <option value="WATCHER">Seguidor</option>
          </select>
          <SubmitButton variant="secondary" pendingLabel="A adicionar…">
            Adicionar
          </SubmitButton>
        </form>
        {[...collaborators, ...watchers].length > 0 && (
          <ul className="mt-4 divide-y">
            {[...collaborators, ...watchers].map((member) => (
              <li key={member.id}>
                <form
                  action={removeObjectMemberAction}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <input type="hidden" name="membershipId" value={member.id} />
                  <input type="hidden" name="returnPath" value={path} />
                  <span>
                    {member.name}
                    <span className="text-muted-foreground ml-2 text-xs">
                      {collaborators.includes(member)
                        ? "Colaborador"
                        : "Seguidor"}
                    </span>
                  </span>
                  <button className="text-muted-foreground hover:text-foreground text-xs">
                    Remover
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {!advancedOnly && (
        <form
          action="/api/attachments"
          method="post"
          encType="multipart/form-data"
        >
          <Panel
            title="Anexar ficheiro"
            hint="PDF, PNG, JPEG ou texto. Fica privado e só quem lê o registo o pode descarregar."
          >
            <div className="grid gap-3">
              <input
                type="hidden"
                name="securityObjectId"
                value={securityObjectId}
              />
              <input type="hidden" name="returnPath" value={path} />
              <FilePicker submitLabel="Enviar ficheiro" />
            </div>
          </Panel>
        </form>
      )}
      {!advancedOnly && (
        <form action={addCommentAction}>
          <Panel title="Adicionar comentário">
            <div className="grid gap-3">
              <input
                type="hidden"
                name="securityObjectId"
                value={securityObjectId}
              />
              <input type="hidden" name="returnPath" value={path} />
              <textarea
                aria-label="Comentário"
                className={`${input} min-h-24`}
                name="body"
                required
                maxLength={10000}
                placeholder="Ponto de situação, decisão tomada, pedido a alguém…"
              />
              <div>
                <SubmitButton variant="secondary" pendingLabel="A publicar…">
                  Comentar
                </SubmitButton>
              </div>
            </div>
          </Panel>
        </form>
      )}
    </div>
  );
}
