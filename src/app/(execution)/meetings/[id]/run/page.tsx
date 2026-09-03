import { notFound } from "next/navigation";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { loadExecutionDetailContext } from "@/modules/execution/application/detail-context";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { MeetingMode } from "@/ui/patterns/meeting-mode";

export const dynamic = "force-dynamic";
export default async function RunMeetingPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const [context, scopeOptions, decisions, tasks, pdcas] = await Promise.all([
    loadExecutionDetailContext(
      detail.client,
      detail.session.security_object_id,
    ),
    loadCreationOptions("meeting.link.manage"),
    detail.client
      .from("decision_list_items")
      .select("security_object_id,title")
      .neq("status", "ARCHIVED")
      .limit(25),
    detail.client
      .from("task_list_items")
      .select("security_object_id,title")
      .neq("status", "ARCHIVED")
      .limit(25),
    detail.client
      .from("pdca_list_items")
      .select("security_object_id,title")
      .neq("status", "ARCHIVED")
      .limit(25),
  ]);
  const existingObjects = [
    ...(decisions.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `Decision · ${row.title}`,
    })),
    ...(tasks.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `Task · ${row.title}`,
    })),
    ...(pdcas.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `PDCA · ${row.title}`,
    })),
  ];
  return (
    <MeetingMode
      meeting={detail.session}
      agenda={detail.agenda}
      notes={detail.notes}
      links={detail.links}
      followups={detail.followups}
      people={detail.people}
      scopeOptions={scopeOptions}
      unitScopeIds={context.unitScopeIds}
      restaurantScopeIds={context.restaurantScopeIds}
      existingObjects={existingObjects}
    />
  );
}
