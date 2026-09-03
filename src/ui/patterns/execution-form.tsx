import type { CreationOptions } from "@/modules/execution/application/creation-options";

interface ExecutionFormProps {
  readonly kind: "Decision" | "Task" | "PDCA";
  readonly options: CreationOptions;
  readonly action: (formData: FormData) => Promise<void>;
  readonly pdcaId?: string | undefined;
}

const fieldClass = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm";

export function ExecutionForm({
  kind,
  options,
  action,
  pdcaId,
}: ExecutionFormProps) {
  const isPdca = kind === "PDCA";
  const isDecision = kind === "Decision";
  return (
    <form
      action={action}
      className="grid gap-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      {pdcaId !== undefined && (
        <input type="hidden" name="pdcaId" value={pdcaId} />
      )}
      <label className="text-sm font-medium">
        Título
        <input
          className={fieldClass}
          name="title"
          required
          minLength={2}
          maxLength={240}
        />
      </label>
      <label className="text-sm font-medium">
        Descrição
        <textarea
          className={`${fieldClass} min-h-28`}
          name={isPdca ? "problemStatement" : "description"}
        />
      </label>
      {isPdca && (
        <>
          <label className="text-sm font-medium">
            Objetivo
            <textarea className={`${fieldClass} min-h-24`} name="objective" />
          </label>
          <label className="text-sm font-medium">
            Causa raiz ou hipótese
            <textarea
              className={`${fieldClass} min-h-24`}
              name="rootCauseOrHypothesis"
            />
          </label>
        </>
      )}
      {isDecision ? (
        <label className="text-sm font-medium">
          Data da decisão
          <input
            className={fieldClass}
            type="date"
            name="decisionDate"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </label>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Início
            <input className={fieldClass} type="date" name="startDate" />
          </label>
          <label className="text-sm font-medium">
            Prazo
            <input className={fieldClass} type="date" name="dueDate" />
          </label>
        </div>
      )}
      {!isDecision && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["priority", ...(isPdca ? ["impact", "risk"] : [])] as const).map(
            (name) => (
              <label className="text-sm font-medium capitalize" key={name}>
                {name}
                <select
                  className={fieldClass}
                  name={name}
                  defaultValue="MEDIUM"
                >
                  {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ),
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Empresa
          <select className={fieldClass} name="companyId" required>
            {options.companies.map((company) => (
              <option value={company.id} key={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Visibilidade
          <select
            className={fieldClass}
            name="visibility"
            defaultValue="NORMAL"
          >
            <option>NORMAL</option>
            <option>RESTRICTED</option>
            <option>PRIVATE</option>
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">
          Departamentos / serviços autorizados
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.units.map((unit) => (
            <label className="flex gap-2 text-sm" key={unit.id}>
              <input type="checkbox" name="unitIds" value={unit.id} />
              {unit.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium">
          Restaurantes autorizados
        </legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.restaurants.map((restaurant) => (
            <label className="flex gap-2 text-sm" key={restaurant.id}>
              <input
                type="checkbox"
                name="restaurantIds"
                value={restaurant.id}
              />
              {restaurant.name}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-muted-foreground text-xs">
        Owner, Responsible, Collaborators e Watchers são atribuídos depois de
        validar que já têm acesso. Nenhum grant é criado automaticamente.
      </p>
      <button
        className="bg-foreground text-background w-fit rounded-full px-5 py-2.5 text-sm font-semibold"
        type="submit"
        disabled={options.companies.length === 0}
      >
        Criar {kind}
      </button>
    </form>
  );
}
