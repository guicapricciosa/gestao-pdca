import Link from "next/link";

import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { createSupabaseServerClient } from "@/platform/supabase/server";

export const dynamic = "force-dynamic";
export default async function MeetingsPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = await searchParams;
  const client = await createSupabaseServerClient();
  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = 25;
  const [options, profilesResult, seriesResult] = await Promise.all([
    loadCreationOptions("meeting.create"),
    client
      .from("profiles")
      .select("id,display_name")
      .eq("is_active", true)
      .order("display_name"),
    client
      .from("meeting_series")
      .select("id,title")
      .eq("is_active", true)
      .order("title"),
  ]);
  let query = client
    .from("meeting_list_items")
    .select("*", { count: "exact" })
    .order("scheduled_start_at", { ascending: filters.period !== "past" })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.chair) query = query.eq("chair_profile_id", filters.chair);
  if (filters.participant)
    query = query.contains("participant_ids", [filters.participant]);
  if (filters.restaurant)
    query = query.contains("restaurant_ids", [filters.restaurant]);
  if (filters.unit) query = query.contains("unit_ids", [filters.unit]);
  if (filters.series) query = query.eq("meeting_series_id", filters.series);
  if (filters.period === "upcoming")
    query = query.gte("scheduled_start_at", new Date().toISOString());
  if (filters.period === "past")
    query = query.lt("scheduled_start_at", new Date().toISOString());
  const { data, count } = await query;
  return (
    <>
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-accent text-sm font-medium">Shared execution</p>
          <h1 className="mt-2 text-5xl font-semibold tracking-[-0.05em]">
            Meetings
          </h1>
        </div>
        <Link
          className="rounded-full bg-black px-5 py-2.5 text-sm text-white"
          href="/meetings/new"
        >
          Nova sessão
        </Link>
      </header>
      <form className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4">
        <select name="period" defaultValue={filters.period ?? "upcoming"}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
        <select name="status" defaultValue={filters.status ?? ""}>
          <option value="">Todos os estados</option>
          {[
            "DRAFT",
            "SCHEDULED",
            "IN_PROGRESS",
            "REVIEW",
            "PUBLISHED",
            "CLOSED",
            "CANCELLED",
          ].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select name="chair" defaultValue={filters.chair ?? ""}>
          <option value="">Todos os Chairs</option>
          {(profilesResult.data ?? []).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name}
            </option>
          ))}
        </select>
        <select name="participant" defaultValue={filters.participant ?? ""}>
          <option value="">Todos os participantes</option>
          {(profilesResult.data ?? []).map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name}
            </option>
          ))}
        </select>
        <select name="restaurant" defaultValue={filters.restaurant ?? ""}>
          <option value="">Todos os restaurantes</option>
          {options.restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
        <select name="unit" defaultValue={filters.unit ?? ""}>
          <option value="">Todos os departamentos/serviços</option>
          {options.units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.name}
            </option>
          ))}
        </select>
        <select name="series" defaultValue={filters.series ?? ""}>
          <option value="">Todas as séries</option>
          {(seriesResult.data ?? []).map((series) => (
            <option key={series.id} value={series.id}>
              {series.title}
            </option>
          ))}
        </select>
        <button className="rounded-full border px-4 py-2 text-sm">
          Filtrar
        </button>
      </form>
      <div className="rounded-2xl border bg-white">
        {(data ?? []).length === 0 ? (
          <p className="text-muted-foreground p-6">Sem reuniões acessíveis.</p>
        ) : (
          data!.map((meeting) => (
            <Link
              className="flex items-center justify-between border-b p-5 last:border-0"
              href={`/meetings/${meeting.id}`}
              key={meeting.id}
            >
              <div>
                <h2 className="font-semibold">{meeting.title}</h2>
                <p className="text-muted-foreground text-sm">
                  {new Date(meeting.scheduled_start_at!).toLocaleString(
                    "pt-PT",
                  )}
                </p>
              </div>
              <span className="rounded-full border px-3 py-1 text-xs">
                {meeting.status}
              </span>
            </Link>
          ))
        )}
      </div>
      <p className="text-muted-foreground mt-4 text-sm">
        {count ?? 0} resultado(s) · página {page}
      </p>
    </>
  );
}
