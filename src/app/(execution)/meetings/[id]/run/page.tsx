import { notFound } from "next/navigation";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { MeetingMode } from "@/ui/patterns/meeting-mode";
import { objectTypeLabel } from "@/ui/labels";

export const dynamic = "force-dynamic";
export default async function RunMeetingPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const client = detail.client;
  const [context, scopeOptions, decisions, tasks, pdcas, me] =
    await Promise.all([
      loadExecutionDetailContext(client, detail.session.security_object_id),
      loadCreationOptions("meeting.link.manage"),
      client
        .from("decision_list_items")
        .select("security_object_id,title")
        .neq("status", "ARCHIVED")
        .limit(25),
      client
        .from("task_list_items")
        .select("security_object_id,title")
        .not("status", "in", "(COMPLETED,CANCELLED,ARCHIVED)")
        .limit(25),
      client
        .from("pdca_list_items")
        .select("security_object_id,title")
        .not("status", "in", "(COMPLETED,CANCELLED,ARCHIVED)")
        .limit(25),
      client.auth.getUser(),
    ]);
  const { data: myProfile } = await client
    .from("profiles")
    .select("id")
    .eq("auth_user_id", me.data.user?.id ?? "")
    .maybeSingle();
  const names = await resolveProfileNames(client, [
    detail.session.chair_profile_id,
    ...detail.links.flatMap((link) =>
      link.record.kind === "DECISION"
        ? []
        : [link.record.owner_profile_id, link.record.responsible_profile_id],
    ),
  ]);
  const existingObjects = [
    ...(decisions.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `${objectTypeLabel("DECISION")} · ${row.title}`,
    })),
    ...(tasks.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `${objectTypeLabel("TASK")} · ${row.title}`,
    })),
    ...(pdcas.data ?? []).map((row) => ({
      securityObjectId: row.security_object_id!,
      label: `${objectTypeLabel("PDCA")} · ${row.title}`,
    })),
  ].filter(
    (object) =>
      !detail.links.some(
        (link) => link.security_object_id === object.securityObjectId,
      ),
  );
  const scopeSummary =
    context.restaurantScopes.length === 0
      ? context.unitScopes.join(", ") || "Sem restaurante"
      : context.restaurantScopes.length === scopeOptions.restaurants.length &&
          scopeOptions.restaurants.length > 1
        ? "Todos os restaurantes"
        : context.restaurantScopes.join(", ");
  return (
    <MeetingMode
      meeting={detail.session}
      chairName={
        names.get(detail.session.chair_profile_id) ?? "Chair sem perfil visível"
      }
      isChair={myProfile?.id === detail.session.chair_profile_id}
      participantCount={detail.participants.length}
      scopeSummary={scopeSummary}
      agenda={detail.agenda}
      notes={detail.notes}
      links={detail.links}
      followups={detail.followups}
      names={names}
      quickContext={{
        companyId: detail.session.company_id,
        meetingId: detail.session.id,
        options: scopeOptions,
        contextRestaurantIds: context.restaurantScopeIds,
        contextUnitIds: context.unitScopeIds,
        contextLabel: "desta reunião",
        companyWide: false,
        people: detail.people,
        currentProfileId: myProfile?.id ?? null,
      }}
      existingObjects={existingObjects}
    />
  );
}
