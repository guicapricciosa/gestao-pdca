import {
  blockAction,
  changeDueDateAction,
  changePdcaPhaseAction,
  completeAction,
  transitionPdcaAction,
  transitionTaskAction,
  unblockAction,
} from "@/app/actions/execution";
import { canTransition } from "@/modules/execution/domain/lifecycle";
import type { ExecutionStatus } from "@/modules/execution/domain/types";
import { SideSheet } from "@/ui/components/side-sheet";
import { SubmitButton } from "@/ui/components/submit-button";
import {
  formatDate,
  pdcaStatusLabel,
  phaseLabel,
  taskStatusLabel,
} from "@/ui/labels";

const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

const verbs: Partial<Record<ExecutionStatus, string>> = {
  OPEN: "Reabrir",
  PLANNED: "Marcar como planeada",
  IN_PROGRESS: "Começar",
  WAITING: "Colocar em espera",
  UNDER_REVIEW: "Enviar para validação",
  CANCELLED: "Cancelar",
  ARCHIVED: "Arquivar",
};

/**
 * Verb-first actions: what a person does with a record, not which state
 * code it moves to. Every button still runs the normal transition command.
 */
export function RecordActions({
  kind,
  id,
  version,
  status,
  dueDate,
  activeBlocker,
  phase,
}: {
  readonly kind: "Task" | "PDCA";
  readonly id: string;
  readonly version: number;
  readonly status: string;
  readonly dueDate: string | null;
  readonly activeBlocker: { id: string; reason: string } | null;
  readonly phase?: string;
}) {
  const current = status as ExecutionStatus;
  const label = kind === "Task" ? taskStatusLabel : pdcaStatusLabel;
  const terminal = ["COMPLETED", "CANCELLED", "ARCHIVED"].includes(status);
  const canComplete =
    canTransition(current, "COMPLETED") &&
    activeBlocker === null &&
    (kind === "Task" || phase === "ACT");
  const canBlock = activeBlocker === null && canTransition(current, "BLOCKED");
  const canStart =
    current === "DRAFT"
      ? false
      : canTransition(current, "IN_PROGRESS") && !activeBlocker;
  const more = (
    [
      "OPEN",
      "PLANNED",
      "IN_PROGRESS",
      "WAITING",
      "UNDER_REVIEW",
      "CANCELLED",
      "ARCHIVED",
    ] as ExecutionStatus[]
  ).filter((target) => canTransition(current, target) && verbs[target]);
  const phases = ["PLAN", "DO", "CHECK", "ACT"] as const;
  const phaseIndex = phases.indexOf(
    (phase ?? "PLAN") as (typeof phases)[number],
  );
  const nextPhase = phases[phaseIndex + 1];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="record-actions"
    >
      {current === "DRAFT" && (
        <form
          action={kind === "Task" ? transitionTaskAction : transitionPdcaAction}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="status" value="OPEN" />
          <SubmitButton pendingLabel="…">Activar</SubmitButton>
        </form>
      )}
      {canStart && current !== "IN_PROGRESS" && (
        <form
          action={kind === "Task" ? transitionTaskAction : transitionPdcaAction}
        >
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="status" value="IN_PROGRESS" />
          <SubmitButton pendingLabel="…">Começar</SubmitButton>
        </form>
      )}
      {kind === "PDCA" && nextPhase && !terminal && (
        <form action={changePdcaPhaseAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="version" value={version} />
          <input type="hidden" name="phase" value={nextPhase} />
          <SubmitButton pendingLabel="…">
            Avançar para {phaseLabel(nextPhase)} →
          </SubmitButton>
        </form>
      )}
      {canComplete && (
        <SideSheet
          label={kind === "Task" ? "Marcar concluída" : "Concluir PDCA"}
          title={kind === "Task" ? "Marcar concluída" : "Concluir PDCA"}
          description={
            kind === "Task"
              ? "Uma linha sobre o que foi feito chega. Fica no histórico."
              : "O PDCA fecha com o resultado real e as notas de fecho."
          }
          testId="open-complete-sheet"
        >
          <form action={completeAction} className="grid gap-4">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <label className="block text-sm font-medium">
              O que foi feito?
              <textarea
                className={`${input} min-h-24`}
                name="completionNotes"
                required
                minLength={2}
                autoFocus
              />
            </label>
            <div>
              <SubmitButton pendingLabel="A concluir…">
                Confirmar conclusão
              </SubmitButton>
            </div>
          </form>
        </SideSheet>
      )}
      {kind === "PDCA" &&
        canTransition(current, "COMPLETED") &&
        phase !== "ACT" &&
        !activeBlocker && (
          <span className="text-muted-foreground text-xs">
            Concluir só na fase Actuar.
          </span>
        )}
      {!terminal && (
        <SideSheet
          label="Alterar prazo"
          title="Alterar prazo"
          description={
            dueDate
              ? `Prazo actual: ${formatDate(dueDate)}. O anterior fica no histórico.`
              : "Ainda sem prazo."
          }
          variant="secondary"
          testId="open-due-sheet"
        >
          <form action={changeDueDateAction} className="grid gap-4">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="version" value={version} />
            <label className="block text-sm font-medium">
              Novo prazo
              <input
                className={input}
                type="date"
                name="newDueDate"
                required
                autoFocus
              />
            </label>
            <label className="block text-sm font-medium">
              Motivo
              <input
                className={input}
                name="reason"
                minLength={3}
                required
                placeholder="Ex.: fornecedor atrasou a entrega"
              />
            </label>
            <div>
              <SubmitButton pendingLabel="A guardar…">
                Guardar prazo
              </SubmitButton>
            </div>
          </form>
        </SideSheet>
      )}
      {canBlock && (
        <SideSheet
          label="Bloquear"
          title="Bloquear"
          description="Regista o que impede o avanço. Fica visível para quem acompanha."
          variant="secondary"
          testId="open-block-sheet"
        >
          <form action={blockAction} className="grid gap-4">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <label className="block text-sm font-medium">
              O que está a bloquear?
              <textarea
                className={`${input} min-h-20`}
                name="reason"
                required
                minLength={3}
                autoFocus
              />
            </label>
            <div>
              <SubmitButton pendingLabel="A bloquear…">Bloquear</SubmitButton>
            </div>
          </form>
        </SideSheet>
      )}
      {activeBlocker && (
        <SideSheet
          label="Desbloquear"
          title="Desbloquear"
          description={`Bloqueio actual: ${activeBlocker.reason}`}
          testId="open-unblock-sheet"
        >
          <form action={unblockAction} className="grid gap-4">
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="version" value={version} />
            <input type="hidden" name="blockerId" value={activeBlocker.id} />
            <label className="block text-sm font-medium">
              Como foi resolvido?
              <textarea
                className={`${input} min-h-20`}
                name="resolutionNotes"
                autoFocus
              />
            </label>
            <div>
              <SubmitButton pendingLabel="A retomar…">
                Desbloquear e retomar
              </SubmitButton>
            </div>
          </form>
        </SideSheet>
      )}
      {more.length > 0 && (
        <details className="relative">
          <summary className="cursor-pointer rounded-full border bg-white px-4 py-2 text-sm">
            Mais ▾
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border bg-white p-4 shadow-lg">
            <form
              action={
                kind === "Task" ? transitionTaskAction : transitionPdcaAction
              }
              className="grid gap-3"
            >
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="version" value={version} />
              <label className="block text-sm font-medium">
                Acção
                <select className={input} name="status">
                  {more.map((target) => (
                    <option key={target} value={target}>
                      {verbs[target]} ({label(target)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Motivo (obrigatório ao cancelar ou reabrir)
                <input className={input} name="reason" />
              </label>
              <div>
                <SubmitButton variant="secondary" pendingLabel="…">
                  Aplicar
                </SubmitButton>
              </div>
            </form>
          </div>
        </details>
      )}
    </div>
  );
}
