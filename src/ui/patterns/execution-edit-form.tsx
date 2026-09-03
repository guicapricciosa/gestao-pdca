import {
  updateDecisionAction,
  updatePdcaAction,
  updateTaskAction,
} from "@/app/actions/execution";
import { SubmitButton } from "@/ui/components/submit-button";

const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const dimensions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

interface CommonProps {
  readonly id: string;
  readonly version: number;
  readonly title: string;
}

interface DecisionProps extends CommonProps {
  readonly kind: "Decision";
  readonly description: string | null;
  readonly decisionDate: string;
  readonly decidedByProfileId: string | null;
}

interface TaskProps extends CommonProps {
  readonly kind: "Task";
  readonly description: string | null;
  readonly priority: string;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  readonly startDate: string | null;
}

interface PdcaProps extends CommonProps {
  readonly kind: "PDCA";
  readonly problemStatement: string | null;
  readonly objective: string | null;
  readonly rootCauseOrHypothesis: string | null;
  readonly expectedResult: string | null;
  readonly actualResult: string | null;
  readonly checkNotes: string | null;
  readonly correctiveAction: string | null;
  readonly outcomeNotes: string | null;
  readonly priority: string;
  readonly impact: string;
  readonly risk: string;
  readonly ownerProfileId: string | null;
  readonly responsibleProfileId: string | null;
  readonly startDate: string | null;
}

type Props = DecisionProps | TaskProps | PdcaProps;

function HiddenIdentity({ props }: { readonly props: CommonProps }) {
  return (
    <>
      <input type="hidden" name="id" value={props.id} />
      <input type="hidden" name="version" value={props.version} />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {hint && (
        <span className="text-muted-foreground ml-2 text-xs font-normal">
          {hint}
        </span>
      )}
      {children}
    </label>
  );
}

function Levels({
  name,
  label,
  value,
}: {
  readonly name: string;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <Field label={label}>
      <select className={input} name={name} defaultValue={value}>
        {dimensions.map((level) => (
          <option key={level}>{level}</option>
        ))}
      </select>
    </Field>
  );
}

export function ExecutionEditForm(props: Props) {
  if (props.kind === "Decision") {
    return (
      <form
        action={updateDecisionAction}
        className="grid gap-4 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Editar decisão</h2>
        <HiddenIdentity props={props} />
        <Field label="Título">
          <input
            className={input}
            name="title"
            defaultValue={props.title}
            required
            maxLength={240}
          />
        </Field>
        <Field label="Descrição">
          <textarea
            className={`${input} min-h-24`}
            name="description"
            defaultValue={props.description ?? ""}
            maxLength={20000}
          />
        </Field>
        <Field label="Data da decisão">
          <input
            className={input}
            name="decisionDate"
            type="date"
            defaultValue={props.decisionDate}
            required
          />
        </Field>
        <input
          type="hidden"
          name="decidedByProfileId"
          value={props.decidedByProfileId ?? ""}
        />
        <div>
          <SubmitButton>Guardar alterações</SubmitButton>
        </div>
      </form>
    );
  }

  if (props.kind === "Task") {
    return (
      <form
        action={updateTaskAction}
        className="grid gap-4 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Editar tarefa</h2>
        <HiddenIdentity props={props} />
        <Field label="Título">
          <input
            className={input}
            name="title"
            defaultValue={props.title}
            required
            maxLength={240}
          />
        </Field>
        <Field label="Descrição">
          <textarea
            className={`${input} min-h-24`}
            name="description"
            defaultValue={props.description ?? ""}
            maxLength={20000}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Levels name="priority" label="Prioridade" value={props.priority} />
          <Field label="Início">
            <input
              className={input}
              name="startDate"
              type="date"
              defaultValue={props.startDate ?? ""}
            />
          </Field>
        </div>
        <input
          type="hidden"
          name="ownerProfileId"
          value={props.ownerProfileId ?? ""}
        />
        <input
          type="hidden"
          name="responsibleProfileId"
          value={props.responsibleProfileId ?? ""}
        />
        <p className="text-muted-foreground text-xs">
          Prazo, âmbito e pessoas alteram-se nas acções próprias, com motivo e
          histórico.
        </p>
        <div>
          <SubmitButton>Guardar alterações</SubmitButton>
        </div>
      </form>
    );
  }

  return (
    <form
      action={updatePdcaAction}
      className="grid gap-4 rounded-2xl border bg-white p-5 lg:col-span-2"
    >
      <h2 className="font-semibold">Editar PDCA</h2>
      <HiddenIdentity props={props} />
      <Field label="Título">
        <input
          className={input}
          name="title"
          defaultValue={props.title}
          required
          maxLength={240}
        />
      </Field>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="grid gap-4">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase">
            Plan
          </p>
          <Field label="Problema">
            <textarea
              className={input}
              name="problemStatement"
              defaultValue={props.problemStatement ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Objetivo">
            <textarea
              className={input}
              name="objective"
              defaultValue={props.objective ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Causa raiz ou hipótese">
            <textarea
              className={input}
              name="rootCauseOrHypothesis"
              defaultValue={props.rootCauseOrHypothesis ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Resultado esperado">
            <textarea
              className={input}
              name="expectedResult"
              defaultValue={props.expectedResult ?? ""}
              maxLength={20000}
            />
          </Field>
        </div>
        <div className="grid gap-4">
          <p className="text-xs font-semibold tracking-[0.12em] uppercase">
            Check · Act
          </p>
          <Field label="Resultado real">
            <textarea
              className={input}
              name="actualResult"
              defaultValue={props.actualResult ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Notas de verificação">
            <textarea
              className={input}
              name="checkNotes"
              defaultValue={props.checkNotes ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Ação corretiva">
            <textarea
              className={input}
              name="correctiveAction"
              defaultValue={props.correctiveAction ?? ""}
              maxLength={20000}
            />
          </Field>
          <Field label="Standardização e resultado">
            <textarea
              className={input}
              name="outcomeNotes"
              defaultValue={props.outcomeNotes ?? ""}
              maxLength={20000}
            />
          </Field>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Levels name="priority" label="Prioridade" value={props.priority} />
        <Levels name="impact" label="Impacto" value={props.impact} />
        <Levels name="risk" label="Risco" value={props.risk} />
        <Field label="Início">
          <input
            className={input}
            name="startDate"
            type="date"
            defaultValue={props.startDate ?? ""}
          />
        </Field>
      </div>
      <input
        type="hidden"
        name="ownerProfileId"
        value={props.ownerProfileId ?? ""}
      />
      <input
        type="hidden"
        name="responsibleProfileId"
        value={props.responsibleProfileId ?? ""}
      />
      <p className="text-muted-foreground text-xs">
        Prazo, âmbito, fase e atribuições alteram-se nos painéis próprios para
        preservar autorização e histórico.
      </p>
      <div>
        <SubmitButton>Guardar alterações</SubmitButton>
      </div>
    </form>
  );
}
