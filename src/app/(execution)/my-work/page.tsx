import Link from "next/link";
import { createSupabaseServerClient } from "@/platform/supabase/server";
export const dynamic = "force-dynamic";
const groups = ["RESPONSIBLE", "OWNER", "COLLABORATOR", "WATCHER"] as const;
export default async function MyWorkPage() {
  const client = await createSupabaseServerClient();
  const [{ data }, { data: meetings }] = await Promise.all([
    client.rpc("my_work"),
    client.rpc("my_meetings"),
  ]);
  const items = data ?? [];
  const attention = items.filter(
    (item) =>
      item.status === "BLOCKED" ||
      (item.due_date &&
        item.due_date < new Date().toISOString().slice(0, 10) &&
        !["COMPLETED", "CANCELLED", "ARCHIVED"].includes(item.status)),
  );
  return (
    <>
      <header className="mb-10">
        <p className="text-accent text-sm font-medium">Personal execution</p>
        <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
          My Work
        </h1>
        <p className="text-muted-foreground mt-3">
          Apenas relações cujo objeto continua acessível.
        </p>
      </header>
      {attention.length > 0 && (
        <section className="mb-8 rounded-2xl bg-[#21100d] p-6 text-white">
          <h2 className="text-xl font-semibold">Attention</h2>
          <p className="mt-1 text-sm text-white/60">
            {attention.length} item(ns) overdue ou blocked.
          </p>
        </section>
      )}
      <section className="mb-8 rounded-2xl border bg-white">
        <h2 className="border-b p-5 text-lg font-semibold">
          Upcoming / review meetings
        </h2>
        {(meetings ?? []).length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">Sem reuniões.</p>
        ) : (
          meetings!.map((meeting) => (
            <Link
              className="flex justify-between border-b p-4 text-sm last:border-0"
              href={`/meetings/${meeting.meeting_session_id}`}
              key={meeting.meeting_session_id}
            >
              <span>
                {meeting.title} · {meeting.relationship}
              </span>
              <span className="text-muted-foreground">{meeting.status}</span>
            </Link>
          ))
        )}
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group) => (
          <section className="rounded-2xl border bg-white" key={group}>
            <h2 className="border-b p-5 text-lg font-semibold">
              {group === "RESPONSIBLE"
                ? "Assigned to me"
                : group === "OWNER"
                  ? "Owned by me"
                  : group === "COLLABORATOR"
                    ? "Collaborating"
                    : "Watching"}
            </h2>
            {items.filter((item) => item.relationship === group).length ===
            0 ? (
              <p className="text-muted-foreground p-5 text-sm">Sem itens.</p>
            ) : (
              items
                .filter((item) => item.relationship === group)
                .map((item) => (
                  <Link
                    className="flex justify-between border-b p-4 text-sm last:border-0"
                    href={`/${item.object_type === "TASK" ? "tasks" : "pdcas"}/${item.object_id}`}
                    key={`${item.object_type}-${item.object_id}`}
                  >
                    <span>{item.title}</span>
                    <span className="text-muted-foreground">{item.status}</span>
                  </Link>
                ))
            )}
          </section>
        ))}
      </div>
    </>
  );
}
