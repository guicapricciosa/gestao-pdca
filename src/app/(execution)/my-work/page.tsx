import Link from "next/link";

import { loadMyWorkValidation } from "@/modules/ai/application/services";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { DueDate, StatusBadge } from "@/ui/components/status-badge";
import {
  findingLabel,
  formatDateTime,
  objectTypeLabel,
  relativeDue,
} from "@/ui/labels";

export const dynamic = "force-dynamic";

const terminal = new Set(["COMPLETED", "CANCELLED", "ARCHIVED"]);

interface WorkItem {
  readonly object_type: string;
  readonly object_id: string;
  readonly title: string;
  readonly status: string;
  readonly priority: string;
  readonly due_date: string | null;
  readonly relationship: string;
}

function hrefOf(item: WorkItem) {
  return `/${item.object_type === "TASK" ? "tasks" : "pdcas"}/${item.object_id}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function WorkList({
  items,
  empty,
  notes,
}: {
  readonly items: readonly WorkItem[];
  readonly empty: string;
  readonly notes?: ReadonlyMap<string, readonly string[]>;
}) {
  if (items.length === 0)
    return <p className="text-muted-foreground p-5 text-sm">{empty}</p>;
  return (
    <ul>
      {items.map((item) => {
        const extra = notes?.get(item.object_id) ?? [];
        return (
          <li
            className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
            key={`${item.relationship}-${item.object_type}-${item.object_id}`}
          >
            <div className="min-w-0">
              <Link
                className="font-medium underline-offset-4 hover:underline"
                href={hrefOf(item)}
              >
                {item.title}
              </Link>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {objectTypeLabel(item.object_type)} ·{" "}
                <DueDate value={item.due_date} status={item.status} relative />
                {extra.length > 0 && (
                  <span className="text-amber-800"> · {extra.join(" · ")}</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(item.priority === "HIGH" || item.priority === "CRITICAL") && (
                <StatusBadge value={item.priority} kind="priority" />
              )}
              {item.status !== "OPEN" && item.status !== "IN_PROGRESS" && (
                <StatusBadge
                  value={item.status}
                  kind={item.object_type === "PDCA" ? "pdca" : "task"}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function MyWorkPage() {
  const client = await createSupabaseServerClient();
  const [{ data }, { data: meetingsData }] = await Promise.all([
    client.rpc("my_work"),
    client.rpc("my_meetings"),
  ]);
  const items: WorkItem[] = data ?? [];
  const meetings = meetingsData ?? [];
  const validation = await loadMyWorkValidation(
    client,
    items.filter(
      (item) =>
        item.relationship === "RESPONSIBLE" || item.relationship === "OWNER",
    ),
  );
  const notes = new Map<string, string[]>();
  for (const entry of validation)
    notes.set(
      entry.objectId,
      entry.findings
        .filter((finding) =>
          [
            "MISSING_DUE_DATE",
            "MISSING_OWNER",
            "STALE",
            "REPEATED_POSTPONEMENT",
          ].includes(finding.code),
        )
        .map((finding) => findingLabel(finding.code).toLowerCase()),
    );

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const distinct = new Map<string, WorkItem>();
  for (const item of items)
    if (!distinct.has(item.object_id)) distinct.set(item.object_id, item);
  const open = [...distinct.values()].filter(
    (item) => !terminal.has(item.status),
  );
  const mine = items.filter(
    (item) => item.relationship === "RESPONSIBLE" && !terminal.has(item.status),
  );
  const mineIds = new Set(mine.map((item) => item.object_id));
  const following = items.filter(
    (item) =>
      (item.relationship === "OWNER" || item.relationship === "WATCHER") &&
      !terminal.has(item.status) &&
      !mineIds.has(item.object_id),
  );
  const overdue = open.filter(
    (item) => item.due_date !== null && item.due_date < today,
  );
  const blocked = open.filter((item) => item.status === "BLOCKED");
  const dueToday = open.filter((item) => item.due_date === today);
  const toValidate = meetings.filter(
    (meeting) =>
      meeting.status === "REVIEW" && meeting.relationship === "CHAIR",
  );
  const live = meetings.filter((meeting) => meeting.status === "IN_PROGRESS");
  const upcoming = meetings.filter((meeting) => meeting.status !== "REVIEW");
  const soon = (start: string) => {
    const diff = new Date(start).getTime() - now.getTime();
    return diff > 0 && diff <= 60 * 60 * 1000;
  };
  const attention = [
    ...toValidate.map((meeting) => ({
      key: `m-${meeting.meeting_session_id}`,
      href: `/meetings/${meeting.meeting_session_id}/finish`,
      title: meeting.title,
      why: "reunião por terminar e distribuir",
      tone: "text-amber-200",
    })),
    ...live.map((meeting) => ({
      key: `l-${meeting.meeting_session_id}`,
      href: `/meetings/${meeting.meeting_session_id}/run`,
      title: meeting.title,
      why: "reunião a decorrer agora",
      tone: "text-white",
    })),
    ...overdue.map((item) => ({
      key: `o-${item.object_id}`,
      href: hrefOf(item),
      title: item.title,
      why: relativeDue(item.due_date),
      tone: "text-[#ffb4a2]",
    })),
    ...blocked
      .filter((item) => !overdue.includes(item))
      .map((item) => ({
        key: `b-${item.object_id}`,
        href: hrefOf(item),
        title: item.title,
        why: "bloqueado",
        tone: "text-amber-200",
      })),
    ...dueToday
      .filter((item) => !overdue.includes(item) && !blocked.includes(item))
      .map((item) => ({
        key: `t-${item.object_id}`,
        href: hrefOf(item),
        title: item.title,
        why: "para hoje",
        tone: "text-white",
      })),
  ];
  const summary = [
    overdue.length > 0
      ? plural(overdue.length, "item atrasado", "itens atrasados")
      : null,
    blocked.length > 0
      ? plural(blocked.length, "bloqueado", "bloqueados")
      : null,
    dueToday.length > 0
      ? plural(dueToday.length, "para hoje", "para hoje")
      : null,
    toValidate.length > 0
      ? plural(
          toValidate.length,
          "reunião por terminar",
          "reuniões por terminar",
        )
      : null,
  ].filter((part): part is string => part !== null);

  return (
    <>
      <header className="mb-8">
        <p className="text-accent text-sm font-medium">
          {now.toLocaleDateString("pt-PT", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
          O meu trabalho
        </h1>
        <Link
          className="mt-3 inline-flex rounded-full border bg-white px-4 py-2 text-sm lg:hidden"
          href="/painel"
        >
          Dashboard geral
        </Link>
        <p className="text-muted-foreground mt-3" data-testid="my-work-summary">
          {summary.length > 0
            ? `Tens ${summary.join(", ")}.`
            : mine.length > 0
              ? `Nada urgente. Tens ${plural(mine.length, "item em curso", "itens em curso")}.`
              : "Nada urgente e nada atribuído a ti."}
        </p>
      </header>

      {/* On a phone the header sentence already says how many are late; the
          items themselves are one scroll below, marked in red. Only meetings
          (not in the lists) keep a card there. */}
      <section
        className={`mb-8 rounded-2xl bg-[#21100d] text-white ${
          attention.some(
            (entry) => entry.key.startsWith("m-") || entry.key.startsWith("l-"),
          )
            ? ""
            : "hidden lg:block"
        }`}
        data-testid="attention"
      >
        <div className="border-b border-white/10 p-5">
          <h2 className="text-xl font-semibold">Precisa da minha atenção</h2>
        </div>
        {attention.length === 0 ? (
          <p className="p-5 text-sm text-white/60">Nada urgente. Bom sinal.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {attention.map((entry) => (
              <li
                className={`items-center justify-between gap-3 px-5 py-3 text-sm ${
                  entry.key.startsWith("m-") || entry.key.startsWith("l-")
                    ? "flex"
                    : "hidden lg:flex"
                }`}
                key={entry.key}
              >
                <Link
                  className="underline-offset-4 hover:underline"
                  href={entry.href}
                >
                  {entry.title}
                </Link>
                <span className={`text-xs ${entry.tone}`}>{entry.why}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white" data-testid="to-do">
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">Para eu fazer</h2>
            <p className="text-muted-foreground text-xs">
              Sou responsável por executar.
            </p>
          </div>
          <WorkList
            items={mine}
            empty="Nada atribuído a ti neste momento."
            notes={notes}
          />
        </section>
        <section
          className="rounded-2xl border bg-white"
          data-testid="following"
        >
          <div className="border-b p-5">
            <h2 className="text-lg font-semibold">A acompanhar</h2>
            <p className="text-muted-foreground text-xs">
              Sou Owner ou sigo estes assuntos.
            </p>
          </div>
          <WorkList
            items={following}
            empty="Não acompanhas nenhum assunto em aberto."
            notes={notes}
          />
        </section>
        <section
          className="rounded-2xl border bg-white lg:col-span-2"
          data-testid="upcoming-meetings"
        >
          <h2 className="border-b p-5 text-lg font-semibold">
            Próximas reuniões
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Sem reuniões marcadas em que participes.
            </p>
          ) : (
            <ul>
              {upcoming.map((meeting) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                  key={meeting.meeting_session_id}
                >
                  <div>
                    <Link
                      className="font-medium underline-offset-4 hover:underline"
                      href={`/meetings/${meeting.meeting_session_id}/run`}
                    >
                      {meeting.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {formatDateTime(meeting.scheduled_start_at)} ·{" "}
                      {meeting.relationship === "CHAIR"
                        ? "conduzo eu"
                        : "participo"}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    {meeting.status === "IN_PROGRESS" ? (
                      <span className="text-xs font-medium text-emerald-800">
                        ● A decorrer agora
                      </span>
                    ) : soon(meeting.scheduled_start_at) ? (
                      <span className="text-xs font-medium text-amber-800">
                        Começa em breve
                      </span>
                    ) : (
                      <StatusBadge value={meeting.status} kind="meeting" />
                    )}
                    <Link
                      className={`rounded-full px-3 py-1.5 text-xs ${
                        meeting.status === "IN_PROGRESS" ||
                        soon(meeting.scheduled_start_at)
                          ? "bg-black text-white"
                          : "border bg-white"
                      }`}
                      data-testid="enter-meeting"
                      href={`/meetings/${meeting.meeting_session_id}/run`}
                    >
                      Entrar na reunião
                    </Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
