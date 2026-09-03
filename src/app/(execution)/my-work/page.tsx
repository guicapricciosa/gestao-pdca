import Link from "next/link";

import { loadMyWorkValidation } from "@/modules/ai/application/services";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { DueDate, StatusBadge } from "@/ui/components/status-badge";
import { FindingList } from "@/ui/patterns/validation-panel";

export const dynamic = "force-dynamic";

const terminal = new Set(["COMPLETED", "CANCELLED", "ARCHIVED"]);

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

function WorkList({
  items,
  empty,
}: {
  readonly items: readonly WorkItem[];
  readonly empty: string;
}) {
  if (items.length === 0)
    return <p className="text-muted-foreground p-5 text-sm">{empty}</p>;
  return (
    <ul>
      {items.map((item) => (
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
              {item.object_type} ·{" "}
              <DueDate value={item.due_date} status={item.status} />
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge value={item.priority} kind="priority" />
            <StatusBadge value={item.status} />
          </div>
        </li>
      ))}
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

  const now = new Date();
  const today = isoDate(now);
  const weekEnd = isoDate(new Date(now.getTime() + 7 * 86_400_000));
  const distinct = new Map<string, WorkItem>();
  for (const item of items)
    if (!distinct.has(item.object_id)) distinct.set(item.object_id, item);
  const open = [...distinct.values()].filter(
    (item) => !terminal.has(item.status),
  );
  const assigned = items.filter((item) => item.relationship === "RESPONSIBLE");
  const owned = items.filter((item) => item.relationship === "OWNER");
  const overdue = open.filter(
    (item) => item.due_date !== null && item.due_date < today,
  );
  const blocked = open.filter((item) => item.status === "BLOCKED");
  const dueToday = open.filter((item) => item.due_date === today);
  const dueThisWeek = open.filter(
    (item) =>
      item.due_date !== null &&
      item.due_date > today &&
      item.due_date <= weekEnd,
  );
  const upcoming = meetings.filter((meeting) => meeting.status !== "REVIEW");
  const awaitingReview = meetings.filter(
    (meeting) => meeting.status === "REVIEW",
  );

  const tiles = [
    { label: "Assigned to me", value: assigned.length, tone: "" },
    { label: "Owned by me", value: owned.length, tone: "" },
    {
      label: "Overdue",
      value: overdue.length,
      tone: overdue.length > 0 ? "text-red-700" : "",
    },
    {
      label: "Blocked",
      value: blocked.length,
      tone: blocked.length > 0 ? "text-amber-800" : "",
    },
    { label: "Due today", value: dueToday.length, tone: "" },
    { label: "Due this week", value: dueThisWeek.length, tone: "" },
    { label: "Upcoming meetings", value: upcoming.length, tone: "" },
    {
      label: "Awaiting my review",
      value: awaitingReview.length,
      tone: awaitingReview.length > 0 ? "text-amber-800" : "",
    },
  ];

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
          My Work
        </h1>
        <p className="text-muted-foreground mt-3">
          O que é teu, o que está atrasado e as reuniões que precisam de ti.
        </p>
      </header>

      <section
        aria-label="Resumo"
        className="mb-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-[color:var(--border)] sm:grid-cols-4"
        data-testid="my-work-summary"
      >
        {tiles.map((tile) => (
          <div className="bg-white px-5 py-4" key={tile.label}>
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.12em] uppercase">
              {tile.label}
            </p>
            <p
              className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${tile.tone}`}
            >
              {tile.value}
            </p>
          </div>
        ))}
      </section>

      {(overdue.length > 0 ||
        blocked.length > 0 ||
        awaitingReview.length > 0) && (
        <section className="mb-8 rounded-2xl bg-[#21100d] text-white">
          <div className="border-b border-white/10 p-5">
            <h2 className="text-xl font-semibold">Precisa de atenção</h2>
            <p className="mt-1 text-sm text-white/60">
              Atrasos, bloqueios e reuniões à espera da tua revisão.
            </p>
          </div>
          <ul className="divide-y divide-white/10">
            {awaitingReview.map((meeting) => (
              <li
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                key={meeting.meeting_session_id}
              >
                <Link
                  className="underline-offset-4 hover:underline"
                  href={`/meetings/${meeting.meeting_session_id}/review`}
                >
                  {meeting.title}
                </Link>
                <span className="text-xs text-white/60">
                  Reunião à espera de revisão e publicação
                </span>
              </li>
            ))}
            {[
              ...overdue,
              ...blocked.filter((item) => !overdue.includes(item)),
            ].map((item) => (
              <li
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                key={`attention-${item.object_id}`}
              >
                <Link
                  className="underline-offset-4 hover:underline"
                  href={hrefOf(item)}
                >
                  {item.title}
                </Link>
                <span className="text-xs text-white/60">
                  {item.status === "BLOCKED" ? "Bloqueado" : "Atrasado"}
                  {item.due_date
                    ? ` · prazo ${new Date(`${item.due_date}T00:00:00`).toLocaleDateString("pt-PT")}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">Assigned to me</h2>
          <WorkList
            items={assigned}
            empty="Nada atribuído a ti como Responsible."
          />
        </section>
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">Owned by me</h2>
          <WorkList
            items={owned}
            empty="Não és Owner de nenhum item em aberto."
          />
        </section>
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">
            Due today · this week
          </h2>
          <WorkList
            items={[...dueToday, ...dueThisWeek]}
            empty="Nenhum prazo nos próximos sete dias."
          />
        </section>
        <section className="rounded-2xl border bg-white">
          <h2 className="border-b p-5 text-lg font-semibold">
            Upcoming meetings
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground p-5 text-sm">
              Sem reuniões agendadas em que participes.
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
                      href={`/meetings/${meeting.meeting_session_id}`}
                    >
                      {meeting.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {new Date(meeting.scheduled_start_at).toLocaleString(
                        "pt-PT",
                        { dateStyle: "medium", timeStyle: "short" },
                      )}{" "}
                      ·{" "}
                      {meeting.relationship === "CHAIR"
                        ? "Chair"
                        : "Participante"}
                    </p>
                  </div>
                  <StatusBadge value={meeting.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        {(items.some((item) => item.relationship === "COLLABORATOR") ||
          items.some((item) => item.relationship === "WATCHER")) && (
          <section className="rounded-2xl border bg-white lg:col-span-2">
            <h2 className="border-b p-5 text-lg font-semibold">
              Collaborating · Watching
            </h2>
            <WorkList
              items={items.filter(
                (item) =>
                  item.relationship === "COLLABORATOR" ||
                  item.relationship === "WATCHER",
              )}
              empty=""
            />
          </section>
        )}
        {validation.length > 0 && (
          <section
            className="rounded-2xl border bg-white lg:col-span-2"
            data-testid="my-work-validation"
          >
            <h2 className="border-b p-5 text-lg font-semibold">
              Execution Validator
            </h2>
            <p className="text-muted-foreground px-5 pt-4 text-sm">
              Alertas determinísticos sobre o que é teu. Nada é alterado
              automaticamente.
            </p>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {validation.map((entry) => (
                <div key={`${entry.objectType}-${entry.objectId}`}>
                  <Link
                    className="text-sm font-medium hover:underline"
                    href={`/${entry.objectType === "TASK" ? "tasks" : "pdcas"}/${entry.objectId}`}
                  >
                    {entry.objectType} · {entry.title}
                  </Link>
                  <div className="mt-2">
                    <FindingList findings={entry.findings} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
