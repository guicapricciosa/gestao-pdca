import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { loadExecutionDetailContext } from "@/modules/execution/application/detail-context";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { ExecutionDetail } from "@/ui/patterns/execution-detail";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { ExecutionEditForm } from "@/ui/patterns/execution-edit-form";
export const dynamic = "force-dynamic";
export default async function TaskDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  ]);
  return (
    <>
      <ExecutionDetail
        kind="Task"
        title={task.title}
        status={task.status}
        version={task.version}
        description={task.description}
        priority={task.priority}
        owner={task.owner_profile_id}
        responsible={task.responsible_profile_id}
        dueDate={task.due_date}
        {...context}
        comments={comments ?? []}
        attachments={attachments ?? []}
        activity={activity ?? []}
        dueDateHistory={dueDateHistory ?? []}
      />
      <ExecutionActions
        kind="Task"
        id={task.id}
        securityObjectId={task.security_object_id}
        version={task.version}
        people={people ?? []}
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
    </>
  );
}
