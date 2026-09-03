import {
  rejectAiProposalAction,
  runExecutionValidatorAction,
} from "@/app/actions/ai";
import type { ProposalView } from "@/modules/ai/application/services";
import type { Finding } from "@/modules/ai/domain/types";
import { findingLabel } from "@/ui/labels";

const severityStyle: Record<Finding["severity"], string> = {
  CRITICAL: "bg-red-50 text-red-900 border-red-200",
  WARNING: "bg-amber-50 text-amber-900 border-amber-200",
  INFO: "bg-neutral-50 text-neutral-800 border-neutral-200",
};

interface ValidationPanelProps {
  readonly kind: "TASK" | "PDCA";
  readonly recordId: string;
  readonly findings: readonly Finding[];
  readonly aiFindings: readonly ProposalView[];
  readonly aiEnabled: boolean;
  readonly aiError: string | null;
  readonly lastRun: {
    readonly status: string;
    readonly error_category: string | null;
    readonly started_at: string;
  } | null;
}

export function FindingList({
  findings,
}: {
  readonly findings: readonly Finding[];
}) {
  return (
    <ul className="grid gap-2">
      {findings.map((finding, index) => (
        <li
          className={`rounded-lg border p-3 text-sm ${severityStyle[finding.severity]}`}
          key={`${finding.code}-${index}`}
          data-testid="validation-finding"
        >
          <span
            className="mr-2 text-xs font-semibold tracking-wide uppercase"
            data-code={finding.code}
          >
            {finding.severity === "CRITICAL"
              ? "Atenção"
              : finding.severity === "WARNING"
                ? "Aviso"
                : "Nota"}{" "}
            · {findingLabel(finding.code)}
          </span>
          {finding.message}
          {finding.evidence.length > 0 && (
            <span className="mt-1 block text-xs opacity-80">
              Evidência: {finding.evidence.join(" · ")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function ValidationPanel({
  kind,
  recordId,
  findings,
  aiFindings,
  aiEnabled,
  aiError,
  lastRun,
}: ValidationPanelProps) {
  const returnPath = `/${kind === "TASK" ? "tasks" : "pdcas"}/${recordId}`;
  return (
    <section
      className="rounded-2xl border bg-white p-5"
      data-testid="validation-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Alertas</h2>
          <p className="text-muted-foreground text-sm">
            O que falta ou está a atrasar. A análise do assistente é opcional e
            só acrescenta recomendações.
          </p>
        </div>
        <form action={runExecutionValidatorAction}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="recordId" value={recordId} />
          <button
            className="rounded-full border px-4 py-2 text-sm disabled:opacity-50"
            disabled={!aiEnabled}
            title={
              aiEnabled
                ? "Pedir uma leitura qualitativa ao assistente"
                : "Assistente desactivado neste ambiente"
            }
          >
            Pedir análise ao assistente
          </button>
        </form>
      </div>
      {aiError && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          O assistente não respondeu: {aiError}. O registo e os alertas
          continuam disponíveis.
        </p>
      )}
      <div className="mt-4">
        {findings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Sem alertas. Está tudo o que é preciso.
          </p>
        ) : (
          <FindingList findings={findings} />
        )}
      </div>
      {aiFindings.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Recomendações do assistente</h3>
          <ul className="mt-2 grid gap-2">
            {aiFindings.map((proposal) =>
              proposal.payload.type === "FINDING" ? (
                <li
                  className={`rounded-lg border p-3 text-sm ${severityStyle[proposal.payload.severity]}`}
                  key={proposal.id}
                  data-testid="ai-finding"
                >
                  <span className="mr-2 text-xs font-semibold tracking-wide uppercase">
                    Assistente · {findingLabel(proposal.payload.code)}
                  </span>
                  {proposal.payload.message}
                  <span className="mt-1 block text-xs opacity-80">
                    Confiança{" "}
                    {Math.round((proposal.payload.confidence ?? 0) * 100)}% ·{" "}
                    {proposal.run.provider}/{proposal.run.model}
                  </span>
                  <form
                    action={rejectAiProposalAction}
                    className="mt-2 flex flex-wrap gap-2"
                  >
                    <input
                      type="hidden"
                      name="proposalId"
                      value={proposal.id}
                    />
                    <input
                      type="hidden"
                      name="version"
                      value={proposal.version}
                    />
                    <input type="hidden" name="returnPath" value={returnPath} />
                    <input
                      type="hidden"
                      name="reason"
                      value="Revisto pelo responsável"
                    />
                    <button className="rounded-full border bg-white px-3 py-1 text-xs">
                      Dispensar
                    </button>
                  </form>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}
      {lastRun && (
        <p className="text-muted-foreground mt-4 text-xs">
          Última análise do assistente: {lastRun.status}
          {lastRun.error_category ? ` (${lastRun.error_category})` : ""} ·{" "}
          {new Date(lastRun.started_at).toLocaleString("pt-PT")}
        </p>
      )}
    </section>
  );
}
