import type { CreationOptions } from "@/modules/execution/application/creation-options";
import { ScopePicker } from "@/ui/components/scope-picker";
import { SubmitButton } from "@/ui/components/submit-button";
import { visibility } from "@/ui/labels";

const field = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const priorityText: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

export interface QuickContext {
  readonly companyId: string;
  readonly meetingId?: string;
  readonly agendaItemId?: string | null;
  readonly options: CreationOptions;
  readonly contextRestaurantIds: readonly string[];
  readonly contextUnitIds: readonly string[];
  readonly contextLabel: string;
  readonly companyWide: boolean;
  readonly people: readonly { profile_id: string; display_name: string }[];
  readonly currentProfileId?: string | null;
}

function PeopleSelect({
  name,
  label,
  people,
  required = false,
  defaultValue = "",
  hint,
}: {
  readonly name: string;
  readonly label: string;
  readonly people: QuickContext["people"];
  readonly required?: boolean;
  readonly defaultValue?: string;
  readonly hint?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required && <span className="text-accent"> *</span>}
      <select
        className={field}
        name={name}
        required={required}
        defaultValue={defaultValue}
      >
        <option value="">{required ? "Escolher pessoa" : "Sem Owner"}</option>
        {people.map((person) => (
          <option key={person.profile_id} value={person.profile_id}>
            {person.display_name}
          </option>
        ))}
      </select>
      {hint && (
        <span className="text-muted-foreground mt-1 block text-xs font-normal">
          {hint}
        </span>
      )}
    </label>
  );
}

function AreaField({ context }: { readonly context: QuickContext }) {
  const departments = context.options.units.filter(
    (unit) => unit.unitType !== "SHARED_SERVICE",
  );
  const services = context.options.units.filter(
    (unit) => unit.unitType === "SHARED_SERVICE",
  );
  return (
    <fieldset>
      <legend className="text-sm font-medium">Área</legend>
      <p className="text-muted-foreground mt-1 text-xs">
        Departamentos e serviços a que o assunto diz respeito.
      </p>
      <div className="mt-2 grid gap-1 sm:grid-cols-2">
        {[...departments, ...services].map((unit) => (
          <label className="flex gap-2 text-sm" key={unit.id}>
            <input
              type="checkbox"
              name="unitIds"
              value={unit.id}
              defaultChecked={context.contextUnitIds.includes(unit.id)}
            />
            {unit.name}
            {unit.unitType === "SHARED_SERVICE" && (
              <span className="text-muted-foreground text-xs">serviço</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function VisibilitySelect() {
  return (
    <label className="block text-sm font-medium">
      Visibilidade
      <select className={field} name="visibility" defaultValue="NORMAL">
        {Object.entries(visibility).map(([code, option]) => (
          <option key={code} value={code}>
            {option.label} — {option.hint}
          </option>
        ))}
      </select>
    </label>
  );
}

function Advanced({ children }: { readonly children: React.ReactNode }) {
  return (
    <details className="rounded-lg border bg-white/60 p-4">
      <summary className="cursor-pointer text-sm font-medium">
        Opções avançadas
      </summary>
      <div className="mt-4 grid gap-4">{children}</div>
    </details>
  );
}

function Hidden({ context }: { readonly context: QuickContext }) {
  return (
    <>
      <input type="hidden" name="companyId" value={context.companyId} />
      {context.meetingId && (
        <input
          type="hidden"
          name="meetingSessionId"
          value={context.meetingId}
        />
      )}
      {context.agendaItemId && (
        <input type="hidden" name="agendaItemId" value={context.agendaItemId} />
      )}
    </>
  );
}

function Where({ context }: { readonly context: QuickContext }) {
  return (
    <ScopePicker
      restaurants={context.options.restaurants}
      contextIds={context.contextRestaurantIds}
      contextLabel={context.contextLabel}
      companyWide={context.companyWide}
    />
  );
}

export function QuickTaskForm({
  action,
  context,
  pdcaId,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly context: QuickContext;
  readonly pdcaId?: string | undefined;
}) {
  return (
    <form action={action} className="grid gap-4" data-testid="quick-task-form">
      <input type="hidden" name="kind" value="TASK" />
      <Hidden context={context} />
      {pdcaId && <input type="hidden" name="pdcaId" value={pdcaId} />}
      <label className="block text-sm font-medium">
        O que é preciso fazer? <span className="text-accent">*</span>
        <input
          className={field}
          name="title"
          required
          minLength={2}
          maxLength={240}
          placeholder="Ex.: Contactar o fornecedor das câmaras"
          autoFocus
        />
      </label>
      <PeopleSelect
        name="responsibleProfileId"
        label="Responsável"
        people={context.people}
        required
        hint="Quem executa. Só aparece quem tem acesso a este assunto."
      />
      <label className="block text-sm font-medium">
        Prazo
        <input className={field} type="date" name="dueDate" />
      </label>
      <Where context={context} />
      <Advanced>
        <PeopleSelect
          name="ownerProfileId"
          label="Owner"
          people={context.people}
          hint="Quem garante que o assunto não fica esquecido. Opcional."
        />
        <label className="block text-sm font-medium">
          Prioridade
          <select className={field} name="priority" defaultValue="MEDIUM">
            {priorities.map((priority) => (
              <option key={priority} value={priority}>
                {priorityText[priority]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Descrição
          <textarea className={`${field} min-h-20`} name="description" />
        </label>
        <AreaField context={context} />
        <VisibilitySelect />
      </Advanced>
      <div>
        <SubmitButton pendingLabel="A adicionar…">
          Adicionar tarefa
        </SubmitButton>
      </div>
    </form>
  );
}

export function QuickPdcaForm({
  action,
  context,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly context: QuickContext;
}) {
  return (
    <form action={action} className="grid gap-4" data-testid="quick-pdca-form">
      <input type="hidden" name="kind" value="PDCA" />
      <Hidden context={context} />
      <label className="block text-sm font-medium">
        Qual é o problema? <span className="text-accent">*</span>
        <textarea
          className={`${field} min-h-20`}
          name="description"
          required
          minLength={2}
          placeholder="O que está a acontecer, onde e com que impacto."
          autoFocus
        />
      </label>
      <label className="block text-sm font-medium">
        O que queremos atingir? <span className="text-accent">*</span>
        <textarea
          className={`${field} min-h-16`}
          name="objective"
          required
          minLength={2}
          placeholder="Resultado mensurável e até quando."
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <PeopleSelect
          name="responsibleProfileId"
          label="Responsável"
          people={context.people}
          required
        />
        <PeopleSelect
          name="ownerProfileId"
          label="Owner"
          people={context.people}
          required
          hint="Quem acompanha e garante o resultado."
        />
      </div>
      <label className="block text-sm font-medium">
        Prazo
        <input className={field} type="date" name="dueDate" />
      </label>
      <Where context={context} />
      <Advanced>
        <label className="block text-sm font-medium">
          Título curto
          <input
            className={field}
            name="title"
            maxLength={240}
            placeholder="Por omissão, a primeira frase do problema"
          />
        </label>
        <label className="block text-sm font-medium">
          Causa raiz ou hipótese
          <textarea
            className={`${field} min-h-16`}
            name="rootCauseOrHypothesis"
          />
        </label>
        <label className="block text-sm font-medium">
          Resultado esperado
          <textarea className={`${field} min-h-16`} name="expectedResult" />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["priority", "impact", "risk"] as const).map((name) => (
            <label className="block text-sm font-medium" key={name}>
              {name === "priority"
                ? "Prioridade"
                : name === "impact"
                  ? "Impacto"
                  : "Risco"}
              <select className={field} name={name} defaultValue="MEDIUM">
                {priorities.map((level) => (
                  <option key={level} value={level}>
                    {priorityText[level]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <AreaField context={context} />
        <VisibilitySelect />
      </Advanced>
      <div>
        <SubmitButton pendingLabel="A adicionar…">Adicionar PDCA</SubmitButton>
      </div>
    </form>
  );
}

export function QuickDecisionForm({
  action,
  context,
}: {
  readonly action: (formData: FormData) => Promise<void>;
  readonly context: QuickContext;
}) {
  return (
    <form
      action={action}
      className="grid gap-4"
      data-testid="quick-decision-form"
    >
      <input type="hidden" name="kind" value="DECISION" />
      <Hidden context={context} />
      <label className="block text-sm font-medium">
        O que ficou decidido? <span className="text-accent">*</span>
        <textarea
          className={`${field} min-h-20`}
          name="title"
          required
          minLength={2}
          maxLength={240}
          placeholder="Ex.: Fechar as esplanadas às 23h em todos os restaurantes"
          autoFocus
        />
      </label>
      <Where context={context} />
      <Advanced>
        <label className="block text-sm font-medium">
          Data da decisão
          <input
            className={field}
            type="date"
            name="decisionDate"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
        <label className="block text-sm font-medium">
          Detalhe ou justificação
          <textarea className={`${field} min-h-20`} name="description" />
        </label>
        <AreaField context={context} />
        <VisibilitySelect />
      </Advanced>
      <div>
        <SubmitButton pendingLabel="A registar…">Registar decisão</SubmitButton>
      </div>
    </form>
  );
}
