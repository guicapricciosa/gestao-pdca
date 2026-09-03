import Link from "next/link";
import { notFound } from "next/navigation";

import { finishMeetingAction } from "@/app/actions/meetings";
import { resolveProfileNames } from "@/modules/execution/application/detail-context";
import { loadMeetingDetail } from "@/modules/meetings/application/detail";
import { SubmitButton } from "@/ui/components/submit-button";
import { formatDateTime, objectTypeLabel } from "@/ui/labels";

export const dynamic = "force-dynamic";

interface Issue {
  readonly href: string;
  readonly title: string;
  readonly type: string;
  readonly message: string;
}

function recordHref(objectType: string, id: string) {
  return `/${objectType === "TASK" ? "tasks" : objectType === "PDCA" ? "pdcas" : "decisions"}/${id}`;
}

export default async function FinishMeetingPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await loadMeetingDetail(id);
  if (detail === null) notFound();
  const { client, session } = detail;
  const me = await client.auth.getUser();
  const { data: myProfile } = await client
    .from("profiles")
    .select("id")
    .eq("auth_user_id", me.data.user?.id ?? "")
    .maybeSingle();
  const isChair = myProfile?.id === session.chair_profile_id;
  const done = session.status === "PUBLISHED" || session.status === "CLOSED";
  const created = detail.links.filter(
    (link) => link.relation_type === "CREATED",
  );
  const names = await resolveProfileNames(client, [
    session.chair_profile_id,
    ...created.flatMap((link) =>
      link.record.kind === "DECISION"
        ? []
        : [link.record.owner_profile_id, link.record.responsible_profile_id],
    ),
  ]);
  const accessible = new Map<string, Set<string>>();
  await Promise.all(
    created
      .filter((link) => link.record.kind !== "DECISION")
      .map(async (link) => {
        const { data } = await client.rpc("get_assignable_profiles", {
          security_object_id: link.security_object_id,
        });
        accessible.set(
          link.security_object_id,
          new Set((data ?? []).map((row) => row.profile_id)),
        );
      }),
  );

  const blocking: Issue[] = [];
  const warnings: Issue[] = [];
  for (const link of created) {
    const record = link.record;
    const base = {
      href: `${recordHref(link.objectType, record.id)}?from=${id}`,
      title: record.title,
      type: objectTypeLabel(link.objectType),
    };
    if (record.kind === "DECISION") continue;
    const allowed = accessible.get(link.security_object_id) ?? new Set();
    if (record.responsible_profile_id === null)
      blocking.push({ ...base, message: "Sem responsável" });
    else if (!allowed.has(record.responsible_profile_id))
      blocking.push({
        ...base,
        message: `${names.get(record.responsible_profile_id) ?? "Responsável"} não tem acesso a este assunto`,
      });
    if (record.kind === "PDCA") {
      if (record.owner_profile_id === null)
        blocking.push({ ...base, message: "Sem Owner" });
      else if (!allowed.has(record.owner_profile_id))
        blocking.push({
          ...base,
          message: `${names.get(record.owner_profile_id) ?? "Owner"} não tem acesso a este assunto`,
        });
      if (!record.problem_statement)
        blocking.push({ ...base, message: "Sem problema definido" });
      if (!record.objective)
        blocking.push({ ...base, message: "Sem objectivo definido" });
      if (!record.kpi_name)
        warnings.push({ ...base, message: "Ainda não tem KPI definido" });
      if (!record.root_cause_or_hypothesis)
        warnings.push({
          ...base,
          message: "Ainda não tem causa raiz ou hipótese",
        });
    } else if (
      record.owner_profile_id !== null &&
      !allowed.has(record.owner_profile_id)
    )
      blocking.push({
        ...base,
        message: `${names.get(record.owner_profile_id) ?? "Owner"} não tem acesso a este assunto`,
      });
    if (record.due_date === null)
      warnings.push({ ...base, message: "Ainda não tem prazo" });
    if (record.priority === "MEDIUM" && record.kind === "PDCA")
      warnings.push({
        ...base,
        message: "Prioridade ficou na omissão (Média)",
      });
  }
  if (!isChair && !done)
    blocking.unshift({
      href: `/meetings/${id}`,
      title: session.title,
      type: "Reunião",
      message: `Só o Chair (${names.get(session.chair_profile_id) ?? "—"}) pode terminar e distribuir`,
    });

  const pendingAgenda = detail.agenda.filter(
    (item) => item.status === "PENDING",
  );
  const counts = {
    tasks: created.filter((link) => link.objectType === "TASK").length,
    pdcas: created.filter((link) => link.objectType === "PDCA").length,
    decisions: created.filter((link) => link.objectType === "DECISION").length,
    discussed: detail.agenda.filter((item) => item.status === "DISCUSSED")
      .length,
    postponed: detail.agenda.filter((item) => item.status === "POSTPONED")
      .length,
  };
  const byPerson = new Map<string, { tasks: number; pdcas: number }>();
  for (const link of created) {
    if (link.record.kind === "DECISION") continue;
    const person = link.record.responsible_profile_id
      ? (names.get(link.record.responsible_profile_id) ??
        "Sem acesso ao perfil")
      : "(sem responsável)";
    const entry = byPerson.get(person) ?? { tasks: 0, pdcas: 0 };
    if (link.objectType === "TASK") entry.tasks += 1;
    else entry.pdcas += 1;
    byPerson.set(person, entry);
  }

  const plural = (n: number, one: string, many: string) =>
    `${n} ${n === 1 ? one : many}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link className="hover:underline" href={`/meetings/${id}/run`}>
            {session.title}
          </Link>
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {done ? "Resumo da reunião" : "Terminar reunião"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {done
            ? `Terminada e distribuída ${session.published_at ? formatDateTime(session.published_at) : ""}.`
            : "Confirma o que ficou definido e distribui as acções às pessoas responsáveis."}
        </p>
      </header>

      <section
        className="rounded-2xl border bg-white p-5"
        data-testid="finish-summary"
      >
        <h2 className="font-semibold">
          {done ? "Ficaram definidos" : "Nesta reunião ficaram definidos"}
        </h2>
        <p className="mt-2 text-2xl font-semibold tracking-tight">
          {plural(counts.tasks, "tarefa", "tarefas")} ·{" "}
          {plural(counts.pdcas, "PDCA", "PDCAs")} ·{" "}
          {plural(counts.decisions, "decisão", "decisões")}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {plural(counts.discussed, "tema discutido", "temas discutidos")}
          {counts.postponed > 0
            ? ` · ${plural(counts.postponed, "adiado", "adiados")}`
            : ""}
          {pendingAgenda.length > 0 && !done
            ? ` · ${plural(pendingAgenda.length, "tema sem conclusão", "temas sem conclusão")}`
            : ""}
        </p>
        {byPerson.size > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Quem fica com o quê</h3>
            <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
              {[...byPerson.entries()].map(([person, entry]) => (
                <li
                  className={
                    person === "(sem responsável)" ? "text-red-700" : ""
                  }
                  key={person}
                >
                  {person}: {plural(entry.tasks, "tarefa", "tarefas")}
                  {entry.pdcas > 0
                    ? ` · ${plural(entry.pdcas, "PDCA", "PDCAs")}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {done ? (
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href={`/meetings/${id}/run`}
          >
            Ver a reunião
          </Link>
          <Link
            className="rounded-full border px-4 py-2 text-sm"
            href="/meetings"
          >
            Voltar a Reuniões
          </Link>
        </div>
      ) : (
        <form action={finishMeetingAction} className="space-y-6">
          <input type="hidden" name="meetingSessionId" value={id} />
          <input type="hidden" name="version" value={session.version} />

          {blocking.length > 0 && (
            <section
              className="rounded-2xl border border-red-200 bg-red-50 p-5"
              data-testid="finish-blocking"
            >
              <h2 className="font-semibold text-red-900">
                Precisa de correcção antes de distribuir
              </h2>
              <ul className="mt-3 divide-y divide-red-200">
                {blocking.map((issue, index) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                    key={`${issue.href}-${index}`}
                  >
                    <span>
                      <span className="text-muted-foreground mr-2 text-xs">
                        {issue.type}
                      </span>
                      <span className="font-medium">{issue.title}</span>
                      <span className="text-red-800"> — {issue.message}</span>
                    </span>
                    {issue.href !== `/meetings/${id}` && (
                      <Link
                        className="rounded-full border border-red-300 bg-white px-3 py-1 text-xs"
                        href={issue.href}
                      >
                        Corrigir
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {pendingAgenda.length > 0 && (
            <section
              className="rounded-2xl border bg-white p-5"
              data-testid="finish-agenda"
            >
              <h2 className="font-semibold">Temas sem conclusão</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                O que fazemos com cada um? Levar para a próxima reunião
                mantém-no nos pendentes; dar como discutido encerra-o.
              </p>
              <ul className="mt-3 divide-y">
                {pendingAgenda.map((item) => (
                  <li
                    className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto]"
                    key={item.id}
                  >
                    <span className="font-medium">{item.title}</span>
                    <span className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`agenda:${item.id}`}
                          value="POSTPONED"
                          defaultChecked
                        />
                        Levar para a próxima reunião
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`agenda:${item.id}`}
                          value="DISCUSSED"
                        />
                        Dar como discutido
                      </label>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {warnings.length > 0 && (
            <section
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
              data-testid="finish-warnings"
            >
              <h2 className="font-semibold text-amber-900">
                Pode ficar para depois
              </h2>
              <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
                {warnings.map((issue, index) => (
                  <li key={`${issue.href}-${index}`}>
                    <Link
                      className="underline-offset-4 hover:underline"
                      href={issue.href}
                    >
                      {issue.type} «{issue.title}»
                    </Link>{" "}
                    {issue.message.toLowerCase()}.
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="rounded-full border px-4 py-2 text-sm"
              href={`/meetings/${id}/run`}
            >
              Voltar à reunião
            </Link>
            <SubmitButton
              disabled={blocking.length > 0}
              pendingLabel="A distribuir…"
            >
              Terminar e distribuir
            </SubmitButton>
            {blocking.length > 0 && (
              <span className="text-muted-foreground text-xs">
                Resolve os pontos acima para distribuir.
              </span>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
