import Link from "next/link";

import { createSupabaseServerClient } from "@/platform/supabase/server";

export const dynamic = "force-dynamic";
export default async function MeetingSeriesPage() {
  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("meeting_series")
    .select("id,title,meeting_type,recurrence_rule,is_active")
    .order("updated_at", { ascending: false })
    .limit(50);
  return (
    <>
      <header className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="text-accent text-sm font-medium">Recurring contexts</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            Meeting Series
          </h1>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/meeting-series/new"
        >
          Nova série
        </Link>
      </header>
      <div className="rounded-2xl border bg-white">
        {(data ?? []).length === 0 ? (
          <p className="text-muted-foreground p-6">Sem séries acessíveis.</p>
        ) : (
          data!.map((series) => (
            <Link
              className="flex items-center justify-between border-b p-5 last:border-0"
              href={`/meeting-series/${series.id}`}
              key={series.id}
            >
              <div>
                <h2 className="font-semibold">{series.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {series.meeting_type} ·{" "}
                  {series.recurrence_rule ?? "sem recorrência automática"}
                </p>
              </div>
              <span className="text-xs">
                {series.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
