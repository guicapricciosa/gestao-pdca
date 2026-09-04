import Link from "next/link";

import { addCommentAction } from "@/app/actions/execution";
import {
  loadExecutionDetailContext,
  resolveProfileNames,
} from "@/modules/execution/application/detail-context";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { RecordPanel } from "@/ui/components/record-panel";
import { DueDate, StatusBadge } from "@/ui/components/status-badge";
import { SubmitButton } from "@/ui/components/submit-button";
import { formatDateTime, phaseLabel } from "@/ui/labels";
import { RecordActions } from "@/ui/patterns/record-actions";

const phases = ["PLAN", "DO", "CHECK", "ACT"] as const;

/**
 * Summary of one PDCA beside the list: enough to decide and act without
 * leaving the filtered list. The full page stays one click away.
 */
export async function PdcaPanel({
  id,
  returnPath,
  closeHref,
}: {
  readonly id: string;
  /** Current list URL including the open panel; commands land back here. */
  readonly returnPath: string;
  readonly closeHref: string;
}) {
  const client = await createSupabaseServerClient();
  const { data: pdca } = await client
    .from("pdcas")
    .select(
      "id,security_object_id,title,status,phase,priority,version,due_date,problem_statement,objective,owner_profile_id,responsible_profile_id,updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!pdca)
    return (
      <RecordPanel closeHref={closeHref} title="PDCA indisponível">
        <p className="text-muted-foreground text-sm">
          Este PDCA não existe ou está fora do teu âmbito.
        </p>
      </RecordPanel>
    );
  const [{ data: comments }, { data: blockers }, context, names, tasks] =
    await Promise.all([
      client
        .from("comments")
        .select("id,body,created_at")
        .eq("security_object_id", pdca.security_object_id)
        .order("created_at", { ascending: false })
        .limit(3),
      client
        .from("pdca_blockers")
        .select("id,reason")
        .eq("pdca_id", id)
        .is("resolved_at", null)
        .limit(1),
      loadExecutionDetailContext(client, pdca.security_object_id),
      resolveProfileNames(client, [
        pdca.owner_profile_id,
        pdca.responsible_profile_id,
      ]),
      client
        .from("tasks")
        .select("id,status", { count: "exact", head: true })
        .eq("pdca_id", id),
    ]);
  const nameOf = (profileId: string | null) =>
    profileId === null ? null : (names.get(profileId) ?? "Sem acesso");
  const fullPage = `/pdcas/${pdca.id}?back=${encodeURIComponent(closeHref)}`;
  const facts = [
    { label: "Responsável", value: nameOf(pdca.responsible_profile_id) },
    { label: "Owner", value: nameOf(pdca.owner_profile_id) },
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
  ];
  return (
    <RecordPanel
      closeHref={closeHref}
      eyebrow={
        <span className="flex flex-wrap items-center gap-2">
          PDCA
          <StatusBadge value={pdca.status} kind="pdca" />
          <StatusBadge value={pdca.phase} kind="phase" />
        </span>
      }
      title={pdca.title}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-muted-foreground text-xs">{fact.label}</dt>
            <dd className="font-medium">
              {fact.value ?? <span className="text-red-700">por atribuir</span>}
            </dd>
          </div>
        ))}
      </dl>

      <RecordActions
        kind="PDCA"
        id={pdca.id}
        version={pdca.version}
        status={pdca.status}
        phase={pdca.phase}
        dueDate={pdca.due_date}
        activeBlocker={blockers?.[0] ?? null}
        returnPath={returnPath}
      />

      <section className="rounded-2xl border bg-white p-5 text-sm">
        <h3 className="text-muted-foreground text-[11px] tracking-[0.12em] uppercase">
          Problema
        </h3>
        <p className="mt-1 whitespace-pre-wrap">
          {pdca.problem_statement ?? "Por definir."}
        </p>
        <h3 className="text-muted-foreground mt-4 text-[11px] tracking-[0.12em] uppercase">
          Objectivo
        </h3>
        <p className="mt-1 whitespace-pre-wrap">
          {pdca.objective ?? "Por definir."}
        </p>
      </section>

      <ol
        aria-label="Fases"
        className="grid grid-cols-4 overflow-hidden rounded-xl border text-center text-[11px] tracking-[0.1em] uppercase"
      >
        {phases.map((phase) => (
          <li
            aria-current={phase === pdca.phase ? "step" : undefined}
            className={`py-2 ${
              phase === pdca.phase
                ? "bg-black text-white"
                : phases.indexOf(phase) < phases.indexOf(pdca.phase)
                  ? "bg-neutral-100"
                  : "bg-white"
            }`}
            key={phase}
          >
            {phaseLabel(phase)}
          </li>
        ))}
      </ol>

      <section className="rounded-2xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h3 className="font-semibold">Últimas actualizações</h3>
          {(tasks.count ?? 0) > 0 && (
            <span className="text-muted-foreground text-xs">
              {tasks.count} {tasks.count === 1 ? "tarefa" : "tarefas"}
            </span>
          )}
        </div>
        {(comments ?? []).length === 0 ? (
          <p className="text-muted-foreground px-5 py-4 text-sm">
            Ainda sem actualizações.
          </p>
        ) : (
          (comments ?? []).map((comment) => (
            <article
              className="border-b px-5 py-3 last:border-0"
              key={comment.id}
            >
              <p className="line-clamp-4 text-sm whitespace-pre-wrap">
                {comment.body}
              </p>
              <time className="text-muted-foreground mt-1 block text-xs">
                {formatDateTime(comment.created_at)}
              </time>
            </article>
          ))
        )}
        <form action={addCommentAction} className="grid gap-2 p-5">
          <input
            type="hidden"
            name="securityObjectId"
            value={pdca.security_object_id}
          />
          <input type="hidden" name="returnPath" value={returnPath} />
          <textarea
            aria-label="Actualização"
            className="min-h-20 rounded-lg border bg-white px-3 py-2 text-sm"
            maxLength={10000}
            name="body"
            placeholder="Ponto de situação, decisão tomada, pedido a alguém…"
            required
          />
          <div>
            <SubmitButton variant="secondary" pendingLabel="A publicar…">
              Publicar actualização
            </SubmitButton>
          </div>
        </form>
      </section>

      <Link
        className="inline-flex rounded-full border bg-white px-4 py-2 text-sm hover:bg-neutral-50"
        data-testid="open-full-page"
        href={fullPage}
      >
        Abrir página completa →
      </Link>
    </RecordPanel>
  );
}
