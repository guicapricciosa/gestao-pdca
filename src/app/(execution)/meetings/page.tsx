import Link from "next/link";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { StatusBadge } from "@/ui/components/status-badge";
import { formatDateTime, statusOrder, meetingStatusLabel } from "@/ui/labels";

export const dynamic = "force-dynamic";
const field = "rounded-lg border bg-white px-3 py-2 text-sm";

export default async function MeetingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const client = await createSupabaseServerClient();
  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = 25;
  const period = filters.period ?? "upcoming";
  const [options, seriesResult] = await Promise.all([
    loadCreationOptions("meeting.create"),
    client
      .from("meeting_series")
      .select("id,title")
      .eq("is_active", true)
      .order("title"),
  ]);
  let query = client
    .from("meeting_list_items")
    .select("*", { count: "exact" })
    .order("scheduled_start_at", { ascending: period !== "past" })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.restaurant)
    query = query.contains("restaurant_ids", [filters.restaurant]);
  if (filters.series) query = query.eq("meeting_series_id", filters.series);
  if (period === "upcoming")
    query = query.or(
      `scheduled_end_at.gte.${new Date().toISOString()},status.in.(IN_PROGRESS,REVIEW)`,
    );
  if (period === "past")
    query = query.lt("scheduled_end_at", new Date().toISOString());
  const { data, count } = await query;
  const live = (data ?? []).filter(
    (meeting) =>
      meeting.status === "IN_PROGRESS" || meeting.status === "REVIEW",
  );
  const rest = (data ?? []).filter((meeting) => !live.includes(meeting));
  const active = Object.entries(filters).filter(
    ([key, value]) => key !== "page" && value,
  ).length;

  const Row = ({
    meeting,
  }: {
    readonly meeting: NonNullable<typeof data>[number];
  }) => (
    <Link
      className="flex flex-wrap items-center justify-between gap-3 border-b p-5 transition-colors last:border-0 hover:bg-black/[0.025]"
      href={`/meetings/${meeting.id}/run`}
    >
      <div>
        <h2 className="font-semibold">{meeting.title}</h2>
        <p className="text-muted-foreground text-sm">
          {formatDateTime(meeting.scheduled_start_at!)}
          {meeting.meeting_series_id ? " · repete-se" : ""}
        </p>
      </div>
      <StatusBadge value={meeting.status ?? ""} kind="meeting" />
    </Link>
  );

  return (
    <>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-sm font-medium">Reuniões</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            Reuniões
          </h1>
          <p className="text-muted-foreground mt-3">
            Agenda, pendentes, notas e acções num só sítio.
          </p>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/meetings/new"
        >
          Marcar reunião
        </Link>
      </header>
      <form
        aria-label="Filtros"
        className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4"
      >
        <select
          aria-label="Período"
          className={field}
          name="period"
          defaultValue={period}
        >
          <option value="upcoming">Próximas e a decorrer</option>
          <option value="past">Passadas</option>
          <option value="all">Todas</option>
        </select>
        <select
          aria-label="Estado"
          className={field}
          name="status"
          defaultValue={filters.status ?? ""}
        >
          <option value="">Qualquer estado</option>
          {statusOrder.meeting.map((status) => (
            <option key={status} value={status}>
              {meetingStatusLabel(status)}
            </option>
          ))}
        </select>
        <select
          aria-label="Restaurante"
          className={field}
          name="restaurant"
          defaultValue={filters.restaurant ?? ""}
        >
          <option value="">Qualquer restaurante</option>
          {options.restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Reunião recorrente"
          className={field}
          name="series"
          defaultValue={filters.series ?? ""}
        >
          <option value="">Qualquer reunião recorrente</option>
          {(seriesResult.data ?? []).map((series) => (
            <option key={series.id} value={series.id}>
              {series.title}
            </option>
          ))}
        </select>
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Filtrar
        </button>
        {active > 0 && (
          <Link
            className="text-muted-foreground text-sm underline underline-offset-4"
            href="/meetings"
          >
            Limpar filtros
          </Link>
        )}
      </form>
      {live.length > 0 && (
        <section
          className="mb-6 rounded-2xl border-2 border-black bg-white"
          data-testid="live-meetings"
        >
          <h2 className="border-b p-5 text-lg font-semibold">
            A decorrer agora
          </h2>
          {live.map((meeting) => (
            <Row key={meeting.id} meeting={meeting} />
          ))}
        </section>
      )}
      <div className="rounded-2xl border bg-white">
        {rest.length === 0 && live.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium">Sem reuniões neste período.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Marca a primeira ou muda o filtro para «Todas».
            </p>
          </div>
        ) : (
          rest.map((meeting) => <Row key={meeting.id} meeting={meeting} />)
        )}
      </div>
      <p className="text-muted-foreground mt-4 text-sm tabular-nums">
        {count ?? 0} {count === 1 ? "reunião" : "reuniões"} · página {page}
      </p>
    </>
  );
}
