import Link from "next/link";
import { notFound } from "next/navigation";

import { updatePdcaAction } from "@/app/actions/execution";
import { describeAiAvailability } from "@/modules/ai/application/provider";
import {
  listProposals,
  listRuns,
  loadExecutionValidation,
} from "@/modules/ai/application/services";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { DueDate, StatusBadge } from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import { findingLabel, phaseLabel, priorityLabel } from "@/ui/labels";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { RecordActions } from "@/ui/patterns/record-actions";
import {
  HistorySection,
  ProgressSection,
  RecordHeader,
} from "@/ui/patterns/record-page";
import { ValidationPanel } from "@/ui/patterns/validation-panel";

export const dynamic = "force-dynamic";
const phases = ["PLAN", "DO", "CHECK", "ACT"] as const;
type Phase = (typeof phases)[number];
const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

const phaseFields: Record<
  Phase,
  readonly { name: string; label: string; hint?: string }[]
> = {
  PLAN: [
    { name: "problemStatement", label: "Problema" },
    { name: "objective", label: "Objectivo" },
    { name: "rootCauseOrHypothesis", label: "Causa raiz ou hipótese" },
    { name: "expectedResult", label: "Resultado esperado" },
  ],
  DO: [],
  CHECK: [
    { name: "actualResult", label: "Resultado real" },
    { name: "checkNotes", label: "Notas de verificação" },
  ],
  ACT: [
    { name: "correctiveAction", label: "Acção correctiva" },
    { name: "outcomeNotes", label: "Standardização e resultado" },
  ],
};
const allFields = [
  "problemStatement",
  "objective",
  "rootCauseOrHypothesis",
  "expectedResult",
  "actualResult",
  "checkNotes",
  "correctiveAction",
  "outcomeNotes",
] as const;
const columnOf: Record<(typeof allFields)[number], string> = {
  problemStatement: "problem_statement",
  objective: "objective",
  rootCauseOrHypothesis: "root_cause_or_hypothesis",
  expectedResult: "expected_result",
  actualResult: "actual_result",
  checkNotes: "check_notes",
  correctiveAction: "corrective_action",
  outcomeNotes: "outcome_notes",
};

export default async function PdcaDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{
    ai_error?: string;
    from?: string;
    fase?: string;
    back?: string;
  }>;
}) {
  const [{ id }, { ai_error: aiError, from, fase, back }] = await Promise.all([
    params,
    searchParams,
  ]);
  const client = await createSupabaseServerClient();
  const { data: pdca } = await client
    .from("pdcas")
    .select("*")
    .eq("id", id)
    .single();
  if (!pdca) notFound();
  const [
    { data: comments },
    { data: attachments },
    { data: activity },
    { data: tasks },
    { data: people },
    context,
    { data: dueDateHistory },
    scopeOptions,
    validation,
    aiProposals,
    aiRuns,
    { data: blockers },
  ] = await Promise.all([
    client
      .from("comments")
      .select("id,body,created_at")
      .eq("security_object_id", pdca.security_object_id)
      .order("created_at"),
    client
      .from("attachments")
      .select("id,filename,mime_type,size_bytes")
      .eq("security_object_id", pdca.security_object_id),
    client
      .from("execution_activity")
      .select("id,action,occurred_at,reason")
      .eq("security_object_id", pdca.security_object_id)
      .order("occurred_at", { ascending: false }),
    client
      .from("tasks")
      .select("id,title,status,due_date,responsible_profile_id")
      .eq("pdca_id", id)
      .order("created_at"),
    client.rpc("get_assignable_profiles", {
      security_object_id: pdca.security_object_id,
    }),
    loadExecutionDetailContext(client, pdca.security_object_id),
    client
      .from("pdca_due_date_changes")
      .select("id,old_due_date,new_due_date,reason,changed_at")
      .eq("pdca_id", id)
      .order("changed_at", { ascending: false }),
    loadCreationOptions("pdca.scope.update"),
    loadExecutionValidation(client, "PDCA", id),
    listProposals(client, pdca.security_object_id),
    listRuns(client, pdca.security_object_id, 1),
    client
      .from("pdca_blockers")
      .select("id,reason")
      .eq("pdca_id", id)
      .is("resolved_at", null)
      .limit(1),
  ]);
  const names = await resolveProfileNames(client, [
    pdca.owner_profile_id,
    pdca.responsible_profile_id,
    ...(tasks ?? []).map((task) => task.responsible_profile_id),
  ]);
  const nameOf = (profileId: string | null) =>
    profileId === null
      ? null
      : (names.get(profileId) ?? "Sem acesso ao perfil");
  const activePhase: Phase = phases.includes(fase as Phase)
    ? (fase as Phase)
    : (pdca.phase as Phase);
  const values = pdca as unknown as Record<string, string | null>;
  const alerts = (validation?.findings ?? [])
    .filter((finding) =>
      [
        "MISSING_RESPONSIBLE",
        "MISSING_OWNER",
        "PDCA_MISSING_PROBLEM",
        "PDCA_MISSING_OBJECTIVE",
        "OVERDUE",
        "OVERDUE_WITHOUT_UPDATE",
        "STALE",
        "LONG_BLOCKED",
      ].includes(finding.code),
    )
    .map((finding) => findingLabel(finding.code));
  const path = `/pdcas/${id}`;

  return (
    <div className="space-y-6">
      <RecordHeader
        kindLabel="PDCA"
        backHref={back?.startsWith("/pdcas") ? back : "/pdcas"}
        backLabel="PDCAs"
        from={from}
        title={pdca.title}
        status={pdca.status}
        badgeKind="pdca"
        facts={[
          {
            label: "Responsável",
            value: nameOf(pdca.responsible_profile_id) ?? "por atribuir",
          },
          {
            label: "Owner",
            value: nameOf(pdca.owner_profile_id) ?? "por atribuir",
          },
          {
            label: "Prazo",
            value: <DueDate value={pdca.due_date} status={pdca.status} />,
          },
          {
            label: "Onde",
            value:
              context.restaurantScopes.join(", ") ||
              context.unitScopes.join(", ") ||
              "sem restaurante",
          },
          { label: "Fase", value: phaseLabel(pdca.phase) },
          ...(pdca.priority !== "MEDIUM"
            ? [{ label: "Prioridade", value: priorityLabel(pdca.priority) }]
            : []),
        ]}
        alerts={alerts}
      />
      <section className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
            Problema
          </h2>
          <p className="text-muted-foreground mt-2 leading-7 whitespace-pre-wrap">
            {pdca.problem_statement ?? "Por definir."}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold tracking-[0.08em] uppercase">
            Objectivo
          </h2>
          <p className="text-muted-foreground mt-2 leading-7 whitespace-pre-wrap">
            {pdca.objective ?? "Por definir."}
          </p>
        </div>
      </section>
      <RecordActions
        kind="PDCA"
        id={pdca.id}
        version={pdca.version}
        status={pdca.status}
        dueDate={pdca.due_date}
        activeBlocker={blockers?.[0] ?? null}
        phase={pdca.phase}
      />

      <section className="rounded-2xl border bg-white">
        <nav aria-label="Fases" className="grid grid-cols-4 border-b">
          {phases.map((phase) => (
            <Link
              aria-current={phase === activePhase ? "page" : undefined}
              className={`p-4 text-center text-xs font-semibold tracking-[0.08em] uppercase ${
                phase === activePhase
                  ? "bg-black text-white"
                  : phase === pdca.phase
                    ? "underline underline-offset-8"
                    : ""
              }`}
              href={`${path}?fase=${phase}`}
              key={phase}
            >
              {phaseLabel(phase)}
              {phase === pdca.phase && phase !== activePhase ? " ●" : ""}
            </Link>
          ))}
        </nav>
        <div className="p-6">
          {activePhase === "DO" ? (
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Tarefas deste PDCA</h2>
                <Link
                  className="rounded-full border px-3 py-1.5 text-xs"
                  href={`/tasks/new?pdcaId=${id}`}
                >
                  + Tarefa
                </Link>
              </div>
              {(tasks ?? []).length === 0 ? (
                <p className="text-muted-foreground mt-3 text-sm">
                  Ainda sem tarefas. As acções concretas do plano vivem aqui.
                </p>
              ) : (
                <ul className="mt-3 divide-y">
                  {(tasks ?? []).map((task) => (
                    <li
                      className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                      key={task.id}
                    >
                      <span>
                        <Link
                          className="font-medium underline-offset-4 hover:underline"
                          href={`/tasks/${task.id}`}
                        >
                          {task.title}
                        </Link>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {nameOf(task.responsible_profile_id) ??
                            "sem responsável"}{" "}
                          ·{" "}
                          <DueDate
                            value={task.due_date}
                            status={task.status}
                            relative
                          />
                        </span>
                      </span>
                      <StatusBadge value={task.status} kind="task" />
                    </li>
                  ))}
                </ul>
              )}
              {blockers?.[0] && (
                <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  Bloqueado: {blockers[0].reason}
                </p>
              )}
            </div>
          ) : (
            <form action={updatePdcaAction} className="grid gap-4">
              <input type="hidden" name="id" value={pdca.id} />
              <input type="hidden" name="version" value={pdca.version} />
              <input type="hidden" name="title" value={pdca.title} />
              <input type="hidden" name="priority" value={pdca.priority} />
              <input type="hidden" name="impact" value={pdca.impact} />
              <input type="hidden" name="risk" value={pdca.risk} />
              <input
                type="hidden"
                name="ownerProfileId"
                value={pdca.owner_profile_id ?? ""}
              />
              <input
                type="hidden"
                name="responsibleProfileId"
                value={pdca.responsible_profile_id ?? ""}
              />
              <input
                type="hidden"
                name="startDate"
                value={pdca.start_date ?? ""}
              />
              {allFields
                .filter(
                  (name) =>
                    !phaseFields[activePhase].some(
                      (field) => field.name === name,
                    ),
                )
                .map((name) => (
                  <input
                    key={name}
                    type="hidden"
                    name={name}
                    value={values[columnOf[name]] ?? ""}
                  />
                ))}
              {phaseFields[activePhase].map((field) => (
                <label className="block text-sm font-medium" key={field.name}>
                  {field.label}
                  <textarea
                    className={`${input} min-h-20`}
                    name={field.name}
                    defaultValue={
                      values[
                        columnOf[field.name as (typeof allFields)[number]]
                      ] ?? ""
                    }
                    maxLength={20000}
                  />
                </label>
              ))}
              {activePhase === "PLAN" && (
                <p className="text-muted-foreground text-xs">
                  KPI: {pdca.kpi_name ?? "por definir"}
                  {pdca.kpi_target !== null
                    ? ` · meta ${pdca.kpi_target}${pdca.kpi_unit ?? ""}`
                    : ""}{" "}
                  — edita em Opções avançadas.
                </p>
              )}
              <div>
                <SubmitButton variant="secondary">
                  Guardar {phaseLabel(activePhase).toLowerCase()}
                </SubmitButton>
              </div>
            </form>
          )}
        </div>
      </section>

      <ProgressSection
        securityObjectId={pdca.security_object_id}
        returnPath={path}
        comments={comments ?? []}
        attachments={attachments ?? []}
      />
      <HistorySection
        activity={activity ?? []}
        dueDateHistory={dueDateHistory ?? []}
      />
      <ValidationPanel
        kind="PDCA"
        recordId={pdca.id}
        findings={validation?.findings ?? []}
        aiFindings={aiProposals.filter(
          (proposal) =>
            proposal.status === "PENDING" && proposal.type === "FINDING",
        )}
        aiEnabled={describeAiAvailability().enabled}
        aiError={aiError ?? null}
        lastRun={aiRuns[0] ?? null}
      />
      <details
        className="rounded-2xl border bg-white p-5"
        data-testid="advanced-options"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Opções avançadas
        </summary>
        <p className="text-muted-foreground mt-1 text-xs">
          Prioridade {priorityLabel(pdca.priority)} · Impacto{" "}
          {priorityLabel(pdca.impact)} · Risco {priorityLabel(pdca.risk)} ·
          Colaboradores{" "}
          {context.collaborators.map((person) => person.name).join(", ") ||
            "nenhum"}{" "}
          · Seguidores{" "}
          {context.watchers.map((person) => person.name).join(", ") || "nenhum"}
        </p>
        <div className="mt-5 space-y-5">
          <ExecutionActions
            advancedOnly
            kind="PDCA"
            id={pdca.id}
            securityObjectId={pdca.security_object_id}
            version={pdca.version}
            status={pdca.status}
            people={people ?? []}
            ownerProfileId={pdca.owner_profile_id}
            responsibleProfileId={pdca.responsible_profile_id}
            currentDueDate={pdca.due_date}
            securityVersion={context.securityVersion}
            scopeOptions={scopeOptions}
            unitScopeIds={context.unitScopeIds}
            restaurantScopeIds={context.restaurantScopeIds}
            collaborators={context.collaborators}
            watchers={context.watchers}
          />
          <form
            action={updatePdcaAction}
            className="grid gap-4 rounded-2xl border bg-white p-5"
          >
            <h2 className="font-semibold">
              Título, prioridade, impacto e risco
            </h2>
            <input type="hidden" name="id" value={pdca.id} />
            <input type="hidden" name="version" value={pdca.version} />
            {allFields.map((name) => (
              <input
                key={name}
                type="hidden"
                name={name}
                value={values[columnOf[name]] ?? ""}
              />
            ))}
            <input
              type="hidden"
              name="ownerProfileId"
              value={pdca.owner_profile_id ?? ""}
            />
            <input
              type="hidden"
              name="responsibleProfileId"
              value={pdca.responsible_profile_id ?? ""}
            />
            <label className="block text-sm font-medium">
              Título
              <input
                className={input}
                name="title"
                defaultValue={pdca.title}
                required
                maxLength={240}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-4">
              {(["priority", "impact", "risk"] as const).map((name) => (
                <label className="block text-sm font-medium" key={name}>
                  {name === "priority"
                    ? "Prioridade"
                    : name === "impact"
                      ? "Impacto"
                      : "Risco"}
                  <select
                    className={input}
                    name={name}
                    defaultValue={pdca[name]}
                  >
                    {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((level) => (
                      <option key={level} value={level}>
                        {priorityLabel(level)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="block text-sm font-medium">
                Início
                <input
                  className={input}
                  name="startDate"
                  type="date"
                  defaultValue={pdca.start_date ?? ""}
                />
              </label>
            </div>
            <div>
              <SubmitButton variant="secondary">Guardar</SubmitButton>
            </div>
          </form>
        </div>
      </details>
    </div>
  );
}
