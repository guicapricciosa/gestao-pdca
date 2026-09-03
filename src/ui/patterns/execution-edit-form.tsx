import {
  updateDecisionAction,
  updatePdcaAction,
  updateTaskAction,
} from "@/app/actions/execution";

const input = "rounded-lg border bg-white px-3 py-2 text-sm";
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

export function ExecutionEditForm(props: Props) {
  if (props.kind === "Decision") {
    return (
      <form
        action={updateDecisionAction}
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Editar Decision</h2>
        <HiddenIdentity props={props} />
        <input
          className={input}
          name="title"
          defaultValue={props.title}
          required
          maxLength={240}
        />
        <textarea
          className={input}
          name="description"
          defaultValue={props.description ?? ""}
          maxLength={20000}
        />
        <input
          className={input}
          name="decisionDate"
          type="date"
          defaultValue={props.decisionDate}
          required
        />
        <input
          type="hidden"
          name="decidedByProfileId"
          value={props.decidedByProfileId ?? ""}
        />
        <button className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
          Guardar alterações
        </button>
      </form>
    );
  }

  if (props.kind === "Task") {
    return (
      <form
        action={updateTaskAction}
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Editar Task</h2>
        <HiddenIdentity props={props} />
        <input
          className={input}
          name="title"
          defaultValue={props.title}
          required
          maxLength={240}
        />
        <textarea
          className={input}
          name="description"
          defaultValue={props.description ?? ""}
          maxLength={20000}
        />
        <select className={input} name="priority" defaultValue={props.priority}>
          {dimensions.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <input
          className={input}
          name="startDate"
          type="date"
          defaultValue={props.startDate ?? ""}
        />
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
          Prazo, scope e atribuições são alterados nas operações próprias, com
          validação e histórico.
        </p>
        <button className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
          Guardar alterações
        </button>
      </form>
    );
  }

  return (
    <form
      action={updatePdcaAction}
      className="grid gap-3 rounded-2xl border bg-white p-5 lg:col-span-2"
    >
      <h2 className="font-semibold">Editar PDCA</h2>
      <HiddenIdentity props={props} />
      <input
        className={input}
        name="title"
        defaultValue={props.title}
        required
        maxLength={240}
      />
      <textarea
        className={input}
        name="problemStatement"
        defaultValue={props.problemStatement ?? ""}
        placeholder="PLAN · Problema"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="objective"
        defaultValue={props.objective ?? ""}
        placeholder="PLAN · Objetivo"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="rootCauseOrHypothesis"
        defaultValue={props.rootCauseOrHypothesis ?? ""}
        placeholder="PLAN · Causa raiz ou hipótese"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="expectedResult"
        defaultValue={props.expectedResult ?? ""}
        placeholder="PLAN · Resultado esperado"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="actualResult"
        defaultValue={props.actualResult ?? ""}
        placeholder="CHECK · Resultado real"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="checkNotes"
        defaultValue={props.checkNotes ?? ""}
        placeholder="CHECK · Notas"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="correctiveAction"
        defaultValue={props.correctiveAction ?? ""}
        placeholder="ACT · Ação corretiva"
        maxLength={20000}
      />
      <textarea
        className={input}
        name="outcomeNotes"
        defaultValue={props.outcomeNotes ?? ""}
        placeholder="ACT · Standardização / resultado"
        maxLength={20000}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {(["priority", "impact", "risk"] as const).map((name) => (
          <label
            className="grid gap-1 text-xs font-medium uppercase"
            key={name}
          >
            {name}
            <select className={input} name={name} defaultValue={props[name]}>
              {dimensions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <input
        className={input}
        name="startDate"
        type="date"
        defaultValue={props.startDate ?? ""}
      />
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
        Prazo, scope, fase e atribuições mantêm operações próprias para
        preservar autorização e histórico.
      </p>
      <button className="w-fit rounded-full bg-black px-4 py-2 text-sm text-white">
        Guardar alterações
      </button>
    </form>
  );
}
