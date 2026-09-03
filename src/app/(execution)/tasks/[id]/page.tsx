import { notFound } from "next/navigation";

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
import { DueDate } from "@/ui/components/status-badge";
import { findingLabel, priorityLabel } from "@/ui/labels";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { ExecutionEditForm } from "@/ui/patterns/execution-edit-form";
import { RecordActions } from "@/ui/patterns/record-actions";
import {
  DescriptionSection,
  HistorySection,
  ProgressSection,
  RecordHeader,
} from "@/ui/patterns/record-page";
import { ValidationPanel } from "@/ui/patterns/validation-panel";

export const dynamic = "force-dynamic";
export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ ai_error?: string; from?: string }>;
}) {
  const [{ id }, { ai_error: aiError, from }] = await Promise.all([
    params,
    searchParams,
  ]);
  const client = await createSupabaseServerClient();
  const { data: task } = await client
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();
  if (!task) notFound();
  const [
    { data: comments },
    { data: attachments },
    { data: activity },
    { data: people },
    context,
    { data: dueDateHistory },
    scopeOptions,
    validation,
    aiProposals,
    aiRuns,
    { data: blockers },
    { data: pdca },
  ] = await Promise.all([
    client
      .from("comments")
      .select("id,body,created_at")
      .eq("security_object_id", task.security_object_id)
      .order("created_at"),
    client
      .from("attachments")
      .select("id,filename,mime_type,size_bytes")
      .eq("security_object_id", task.security_object_id),
    client
      .from("execution_activity")
      .select("id,action,occurred_at,reason")
      .eq("security_object_id", task.security_object_id)
      .order("occurred_at", { ascending: false }),
    client.rpc("get_assignable_profiles", {
      security_object_id: task.security_object_id,
    }),
    loadExecutionDetailContext(client, task.security_object_id),
    client
      .from("task_due_date_changes")
      .select("id,old_due_date,new_due_date,reason,changed_at")
      .eq("task_id", id)
      .order("changed_at", { ascending: false }),
    loadCreationOptions("task.scope.update"),
    loadExecutionValidation(client, "TASK", id),
    listProposals(client, task.security_object_id),
    listRuns(client, task.security_object_id, 1),
    client
      .from("task_blockers")
      .select("id,reason")
      .eq("task_id", id)
      .is("resolved_at", null)
      .limit(1),
    task.pdca_id
      ? client
          .from("pdcas")
          .select("id,title")
          .eq("id", task.pdca_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const names = await resolveProfileNames(client, [
    task.owner_profile_id,
    task.responsible_profile_id,
  ]);
  const nameOf = (profileId: string | null) =>
    profileId === null
      ? null
      : (names.get(profileId) ?? "Sem acesso ao perfil");
  const alerts = (validation?.findings ?? [])
    .filter((finding) =>
      [
        "MISSING_RESPONSIBLE",
        "MISSING_DUE_DATE",
        "OVERDUE",
        "OVERDUE_WITHOUT_UPDATE",
        "STALE",
        "LONG_BLOCKED",
      ].includes(finding.code),
    )
    .map((finding) => findingLabel(finding.code));
  const path = `/tasks/${id}`;

  return (
    <div className="space-y-6">
      <RecordHeader
        kindLabel="Tarefa"
        backHref="/tasks"
        backLabel="Tarefas"
        from={from}
        title={task.title}
        status={task.status}
        badgeKind="task"
        facts={[
          {
            label: "Responsável",
            value: nameOf(task.responsible_profile_id) ?? "por atribuir",
          },
          {
            label: "Prazo",
            value: <DueDate value={task.due_date} status={task.status} />,
          },
          {
            label: "Onde",
            value:
              context.restaurantScopes.join(", ") ||
              context.unitScopes.join(", ") ||
              "sem restaurante",
          },
          ...(context.restaurantScopes.length > 0 &&
          context.unitScopes.length > 0
            ? [{ label: "Área", value: context.unitScopes.join(", ") }]
            : []),
          ...(task.priority !== "MEDIUM"
            ? [{ label: "Prioridade", value: priorityLabel(task.priority) }]
            : []),
          ...(pdca ? [{ label: "PDCA", value: pdca.title }] : []),
        ]}
        alerts={alerts}
      />
      <RecordActions
        kind="Task"
        id={task.id}
        version={task.version}
        status={task.status}
        dueDate={task.due_date}
        activeBlocker={blockers?.[0] ?? null}
      />
      <DescriptionSection text={task.description} />
      <ProgressSection
        securityObjectId={task.security_object_id}
        returnPath={path}
        comments={comments ?? []}
        attachments={attachments ?? []}
      />
      <HistorySection
        activity={activity ?? []}
        dueDateHistory={dueDateHistory ?? []}
      />
      <ValidationPanel
        kind="TASK"
        recordId={task.id}
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
          Owner {nameOf(task.owner_profile_id) ?? "por atribuir"} · Prioridade{" "}
          {priorityLabel(task.priority)} · Colaboradores{" "}
          {context.collaborators.map((person) => person.name).join(", ") ||
            "nenhum"}{" "}
          · Seguidores{" "}
          {context.watchers.map((person) => person.name).join(", ") || "nenhum"}
        </p>
        <div className="mt-5 space-y-5">
          <ExecutionActions
            advancedOnly
            kind="Task"
            id={task.id}
            securityObjectId={task.security_object_id}
            version={task.version}
            status={task.status}
            people={people ?? []}
            ownerProfileId={task.owner_profile_id}
            responsibleProfileId={task.responsible_profile_id}
            currentDueDate={task.due_date}
            securityVersion={context.securityVersion}
            scopeOptions={scopeOptions}
            unitScopeIds={context.unitScopeIds}
            restaurantScopeIds={context.restaurantScopeIds}
            collaborators={context.collaborators}
            watchers={context.watchers}
          />
          <ExecutionEditForm
            kind="Task"
            id={task.id}
            version={task.version}
            title={task.title}
            description={task.description}
            priority={task.priority}
            ownerProfileId={task.owner_profile_id}
            responsibleProfileId={task.responsible_profile_id}
            startDate={task.start_date}
          />
        </div>
      </details>
    </div>
  );
}
