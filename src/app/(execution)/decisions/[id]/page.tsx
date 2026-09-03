import Link from "next/link";
import { notFound } from "next/navigation";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { formatDate, objectTypeLabel } from "@/ui/labels";
import { ExecutionActions } from "@/ui/patterns/execution-actions";
import { ExecutionEditForm } from "@/ui/patterns/execution-edit-form";
import {
  DescriptionSection,
  HistorySection,
  ProgressSection,
  RecordHeader,
} from "@/ui/patterns/record-page";

export const dynamic = "force-dynamic";
export default async function DecisionDetailPage({
  params,
  searchParams,
}: {
  readonly params: Promise<{ id: string }>;
  readonly searchParams: Promise<{ from?: string }>;
}) {
  const [{ id }, { from }] = await Promise.all([params, searchParams]);
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
    { data: taskLinks },
    { data: pdcaLinks },
    { data: origin },
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
    client
      .from("tasks")
      .select("id,title,status")
      .eq("originating_decision_id", id),
    client
      .from("pdcas")
      .select("id,title,status")
      .eq("originating_decision_id", id),
    client
      .from("meeting_object_links")
      .select(
        "meeting_session_id,relation_type,session:meeting_sessions!meeting_object_links_meeting_session_id_fkey(title)",
      )
      .eq("security_object_id", decision.security_object_id)
      .is("unlinked_at", null)
      .limit(5),
  ]);
  const names = await resolveProfileNames(client, [
    decision.decided_by_profile_id,
    decision.created_by_profile_id,
  ]);
  const path = `/decisions/${id}`;
  const related = [
    ...(taskLinks ?? []).map((task) => ({
      href: `/tasks/${task.id}`,
      title: task.title,
      type: "TASK",
    })),
    ...(pdcaLinks ?? []).map((pdca) => ({
      href: `/pdcas/${pdca.id}`,
      title: pdca.title,
      type: "PDCA",
    })),
  ];
  return (
    <div className="space-y-6">
      <RecordHeader
        kindLabel="Decisão"
        backHref="/decisions"
        backLabel="Decisões"
        from={from}
        title={decision.title}
        status={decision.status}
        badgeKind="decision"
        facts={[
          { label: "Decidida a", value: formatDate(decision.decision_date) },
          {
            label: "Onde",
            value:
              context.restaurantScopes.join(", ") ||
              context.unitScopes.join(", ") ||
              "sem restaurante",
          },
          ...(context.unitScopes.length > 0 &&
          context.restaurantScopes.length > 0
            ? [{ label: "Área", value: context.unitScopes.join(", ") }]
            : []),
          {
            label: "Registada por",
            value:
              names.get(
                decision.decided_by_profile_id ??
                  decision.created_by_profile_id,
              ) ?? "—",
          },
        ]}
      />
      <DescriptionSection title="Detalhe" text={decision.description} />
      {(origin ?? []).length > 0 || related.length > 0 ? (
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="font-semibold">Origem e acções</h2>
          {(origin ?? []).map((link) => (
            <p
              className="text-muted-foreground mt-2 text-sm"
              key={link.meeting_session_id}
            >
              Reunião:{" "}
              <Link
                className="text-foreground underline-offset-4 hover:underline"
                href={`/meetings/${link.meeting_session_id}/run`}
              >
                {link.session.title}
              </Link>
            </p>
          ))}
          {related.length > 0 && (
            <ul className="mt-2 text-sm">
              {related.map((item) => (
                <li key={item.href}>
                  <span className="text-muted-foreground mr-2 text-xs">
                    {objectTypeLabel(item.type)}
                  </span>
                  <Link
                    className="underline-offset-4 hover:underline"
                    href={item.href}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            className="mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs"
            href="/tasks/new"
          >
            + Tarefa a partir desta decisão
          </Link>
        </section>
      ) : (
        <Link
          className="inline-flex rounded-full border px-4 py-2 text-sm"
          href="/tasks/new"
        >
          + Tarefa a partir desta decisão
        </Link>
      )}
      <ProgressSection
        securityObjectId={decision.security_object_id}
        returnPath={path}
        comments={comments ?? []}
        attachments={attachments ?? []}
      />
      <HistorySection activity={activity ?? []} />
      <details
        className="rounded-2xl border bg-white p-5"
        data-testid="advanced-options"
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Opções avançadas
        </summary>
        <div className="mt-5 space-y-5">
          <ExecutionActions
            advancedOnly
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
        </div>
      </details>
    </div>
  );
}
