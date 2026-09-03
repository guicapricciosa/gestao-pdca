import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { loadExecutionDetailContext } from "@/modules/execution/application/detail-context";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionDetail } from "@/ui/patterns/execution-detail";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { ExecutionEditForm } from "@/ui/patterns/execution-edit-form";
export const dynamic = "force-dynamic";
export default async function DecisionDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const { data: decision } = await client
    .from("decisions")
    .select("*")
    .eq("id", id)
    .single();
  if (!decision) notFound();
  const [
    { data: comments },
    { data: attachments },
    { data: activity },
    context,
    scopeOptions,
  ] = await Promise.all([
    client
      .from("comments")
      .select("id,body,created_at")
      .eq("security_object_id", decision.security_object_id)
      .order("created_at"),
    client
      .from("attachments")
      .select("id,filename,mime_type,size_bytes")
      .eq("security_object_id", decision.security_object_id),
    client
      .from("execution_activity")
      .select("id,action,occurred_at,reason")
      .eq("security_object_id", decision.security_object_id)
      .order("occurred_at", { ascending: false }),
    loadExecutionDetailContext(client, decision.security_object_id),
    loadCreationOptions("decision.scope.update"),
  ]);
  return (
    <>
      <ExecutionDetail
        kind="Decision"
        title={decision.title}
        status={decision.status}
        version={decision.version}
        description={decision.description}
        {...context}
        comments={comments ?? []}
        attachments={attachments ?? []}
        activity={activity ?? []}
      />
      <ExecutionActions
        kind="Decision"
        id={decision.id}
        securityObjectId={decision.security_object_id}
        version={decision.version}
        securityVersion={context.securityVersion}
        scopeOptions={scopeOptions}
        unitScopeIds={context.unitScopeIds}
        restaurantScopeIds={context.restaurantScopeIds}
        collaborators={context.collaborators}
        watchers={context.watchers}
      />
      <ExecutionEditForm
        kind="Decision"
        id={decision.id}
        version={decision.version}
        title={decision.title}
        description={decision.description}
        decisionDate={decision.decision_date}
        decidedByProfileId={decision.decided_by_profile_id}
      />
    </>
  );
}
