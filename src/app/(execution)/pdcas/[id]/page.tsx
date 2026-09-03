import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionDetail } from "@/ui/patterns/execution-detail";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { ExecutionEditForm } from "@/ui/patterns/execution-edit-form";
import { describeAiAvailability } from "@/modules/ai/application/provider";
import {
  listProposals,
  listRuns,
  loadExecutionValidation,
} from "@/modules/ai/application/services";
import { ValidationPanel } from "@/ui/patterns/validation-panel";
export const dynamic = "force-dynamic";
export default async function PdcaDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ ai_error?: string }>;
}) {
  const [{ id }, { ai_error: aiError }] = await Promise.all([
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
    client.from("tasks").select("id,title,status").eq("pdca_id", id),
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
  ]);
  const names = await resolveProfileNames(client, [
    pdca.owner_profile_id,
    pdca.responsible_profile_id,
  ]);
  return (
    <>
      <ExecutionDetail
        kind="PDCA"
        title={pdca.title}
        status={pdca.status}
        version={pdca.version}
        description={pdca.problem_statement}
        phase={pdca.phase}
        priority={pdca.priority}
        impact={pdca.impact}
        risk={pdca.risk}
        owner={
          pdca.owner_profile_id === null
            ? null
            : (names.get(pdca.owner_profile_id) ?? "Sem acesso ao perfil")
        }
        responsible={
          pdca.responsible_profile_id === null
            ? null
            : (names.get(pdca.responsible_profile_id) ?? "Sem acesso ao perfil")
        }
        dueDate={pdca.due_date}
        {...context}
        comments={comments ?? []}
        attachments={attachments ?? []}
        activity={activity ?? []}
        tasks={tasks ?? []}
        dueDateHistory={dueDateHistory ?? []}
      />
      <Link
        className="inline-flex rounded-full bg-black px-4 py-2 text-sm text-white"
        href={`/tasks/new?pdcaId=${pdca.id}`}
      >
        Adicionar Task ao PDCA
      </Link>
      <ExecutionActions
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
      <ExecutionEditForm
        kind="PDCA"
        id={pdca.id}
        version={pdca.version}
        title={pdca.title}
        problemStatement={pdca.problem_statement}
        objective={pdca.objective}
        rootCauseOrHypothesis={pdca.root_cause_or_hypothesis}
        expectedResult={pdca.expected_result}
        actualResult={pdca.actual_result}
        checkNotes={pdca.check_notes}
        correctiveAction={pdca.corrective_action}
        outcomeNotes={pdca.outcome_notes}
        priority={pdca.priority}
        impact={pdca.impact}
        risk={pdca.risk}
        ownerProfileId={pdca.owner_profile_id}
        responsibleProfileId={pdca.responsible_profile_id}
        startDate={pdca.start_date}
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
    </>
  );
}
