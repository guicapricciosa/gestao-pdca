import type { CreationOptions } from "@/modules/execution/application/creation-options";
import { SubmitButton } from "@/ui/components/submit-button";
import { ScopeFields, VisibilityField } from "@/ui/patterns/scope-fields";

interface ExecutionFormProps {
  readonly kind: "Decision" | "Task" | "PDCA";
  readonly options: CreationOptions;
  readonly action: (formData: FormData) => Promise<void>;
  readonly pdcaId?: string | undefined;
}

const fieldClass = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const levels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
const dimensionLabel = {
  priority: "Prioridade",
  impact: "Impacto",
  risk: "Risco",
} as const;

function Section({
  title,
  hint,
  children,
}: {
  readonly title: string;
  readonly hint?: string | undefined;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
          {title}
        </h2>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function ExecutionForm({
  kind,
  options,
  action,
  pdcaId,
}: ExecutionFormProps) {
  const isPdca = kind === "PDCA";
  const isDecision = kind === "Decision";
  const noScope = options.companies.length === 0;
  const dimensions: readonly (keyof typeof dimensionLabel)[] = isPdca
    ? ["priority", "impact", "risk"]
    : ["priority"];
  return (
    <form
      action={action}
      className="grid gap-6 rounded-2xl border bg-white p-6 shadow-sm"
    >
      {pdcaId !== undefined && (
        <input type="hidden" name="pdcaId" value={pdcaId} />
      )}
      <Section
        title="O quê"
        hint={
          isPdca
            ? "Um PDCA descreve um problema e um objectivo mensurável; as Tasks vêm depois."
            : isDecision
              ? "Uma decisão fica registada mesmo sem gerar tarefas."
              : "Uma Task é uma acção concreta com entrega e prazo."
        }
      >
        <label className="text-sm font-medium">
          Título
          <input
            className={fieldClass}
            name="title"
            required
            minLength={2}
            maxLength={240}
            placeholder={
              isPdca
                ? "Ex.: Reduzir desperdício alimentar no Restaurant A"
                : isDecision
                  ? "Ex.: Fechar esplanadas às 23h"
                  : "Ex.: Substituir impressoras de cozinha"
            }
          />
        </label>
        <label className="text-sm font-medium">
          {isPdca ? "Descrição do problema" : "Descrição"}
          <textarea
            className={`${fieldClass} min-h-28`}
            name={isPdca ? "problemStatement" : "description"}
            placeholder={
              isPdca
                ? "O que está a acontecer, onde e com que impacto."
                : "Contexto suficiente para quem pegar nisto sem estar na reunião."
            }
          />
        </label>
        {isPdca && (
          <>
            <label className="text-sm font-medium">
              Objetivo
              <textarea
                className={`${fieldClass} min-h-24`}
                name="objective"
                placeholder="Resultado mensurável e até quando."
              />
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
      </Section>

      <Section
        title={isDecision ? "Quando" : "Prazos e prioridade"}
        hint={
          isDecision
            ? undefined
            : "Owner e Responsible atribuem-se no detalhe, depois de criar."
        }
      >
        {isDecision ? (
          <label className="text-sm font-medium sm:max-w-xs">
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
            {dimensions.map((name) => (
              <label className="text-sm font-medium" key={name}>
                {dimensionLabel[name]}
                <select
                  className={fieldClass}
                  name={name}
                  defaultValue="MEDIUM"
                >
                  {levels.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Quem pode ver"
        hint="Escolhe o âmbito real do assunto. Só aparecem departamentos, serviços e restaurantes que cobres."
      >
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
          <VisibilityField />
        </div>
        <ScopeFields options={options} />
      </Section>

      {noScope && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Não tens autorização para criar {kind} em nenhum âmbito.
        </p>
      )}
      <div>
        <SubmitButton pendingLabel="A criar…" disabled={noScope}>
          Criar {kind}
        </SubmitButton>
      </div>
    </form>
  );
}
