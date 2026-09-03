import Link from "next/link";
import { notFound } from "next/navigation";

import {
  deactivateMeetingSeriesAction,
  updateMeetingSeriesAction,
} from "@/app/actions/meetings";
import { replaceScopeAction } from "@/app/actions/execution";
import { loadCreationOptions } from "@/modules/execution/application/creation-options";
import { loadExecutionDetailContext } from "@/modules/execution/application/detail-context";
import { createSupabaseServerClient } from "@/platform/supabase/server";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";
export const dynamic = "force-dynamic";
export default async function MeetingSeriesDetailPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const [{ data: series }, { data: sessions }, { data: profiles }] =
    await Promise.all([
      client.from("meeting_series").select("*").eq("id", id).single(),
      client
        .from("meeting_sessions")
        .select("id,title,status,scheduled_start_at")
        .eq("meeting_series_id", id)
        .order("scheduled_start_at", { ascending: false })
        .limit(20),
      client
        .from("profiles")
        .select("id,display_name")
        .eq("is_active", true)
        .order("display_name"),
    ]);
  if (series === null) notFound();
  const [context, scopeOptions] = await Promise.all([
    loadExecutionDetailContext(client, series.security_object_id),
    loadCreationOptions("meeting.scope.update"),
  ]);
  return (
    <div className="space-y-8">
      <header>
        <p className="text-accent text-sm font-medium">Meeting Series</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {series.title}
        </h1>
        <p className="text-muted-foreground mt-2">
          {series.meeting_type} ·{" "}
          {series.recurrence_rule ?? "sem recorrência automática"}
        </p>
      </header>
      <Link
        className="inline-flex rounded-full bg-black px-4 py-2 text-sm text-white"
        href={`/meetings/new?seriesId=${id}`}
      >
        Criar próxima sessão
      </Link>
      <section className="rounded-2xl border bg-white">
        <h2 className="border-b p-5 font-semibold">Sessões</h2>
        {(sessions ?? []).map((session) => (
          <Link
            className="flex justify-between border-b p-4 last:border-0"
            href={`/meetings/${session.id}`}
            key={session.id}
          >
            <span>{session.title}</span>
            <span className="text-xs">{session.status}</span>
          </Link>
        ))}
      </section>
      <form
        action={updateMeetingSeriesAction}
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Editar série</h2>
        <input type="hidden" name="meetingSeriesId" value={id} />
        <input type="hidden" name="version" value={series.version} />
        <input
          className={field}
          name="title"
          defaultValue={series.title}
          required
        />
        <textarea
          className={field}
          name="description"
          defaultValue={series.description ?? ""}
        />
        <select
          className={field}
          name="meetingType"
          defaultValue={series.meeting_type}
        >
          {["OPERATIONS", "MANAGEMENT", "SUPPORT", "ONE_TO_ONE", "AD_HOC"].map(
            (type) => (
              <option key={type}>{type}</option>
            ),
          )}
        </select>
        <select
          className={field}
          name="defaultChairProfileId"
          defaultValue={series.default_chair_profile_id ?? ""}
        >
          <option value="">Sem Chair</option>
          {(profiles ?? []).map((profile) => (
            <option value={profile.id} key={profile.id}>
              {profile.display_name}
            </option>
          ))}
        </select>
        <input
          className={field}
          name="recurrenceRule"
          defaultValue={series.recurrence_rule ?? ""}
        />
        <button className="w-fit rounded-full border px-4 py-2 text-sm">
          Guardar
        </button>
      </form>
      <form
        action={replaceScopeAction}
        className="grid gap-3 rounded-2xl border bg-white p-5"
      >
        <h2 className="font-semibold">Default scope da série</h2>
        <input
          type="hidden"
          name="securityObjectId"
          value={series.security_object_id}
        />
        <input
          type="hidden"
          name="securityVersion"
          value={context.securityVersion}
        />
        <input
          type="hidden"
          name="returnPath"
          value={`/meeting-series/${id}`}
        />
        <fieldset>
          <legend className="text-xs uppercase">Unidades</legend>
          {scopeOptions.units.map((unit) => (
            <label className="mt-1 flex gap-2 text-sm" key={unit.id}>
              <input
                type="checkbox"
                name="unitIds"
                value={unit.id}
                defaultChecked={context.unitScopeIds.includes(unit.id)}
              />
              {unit.name}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="text-xs uppercase">Restaurantes</legend>
          {scopeOptions.restaurants.map((restaurant) => (
            <label className="mt-1 flex gap-2 text-sm" key={restaurant.id}>
              <input
                type="checkbox"
                name="restaurantIds"
                value={restaurant.id}
                defaultChecked={context.restaurantScopeIds.includes(
                  restaurant.id,
                )}
              />
              {restaurant.name}
            </label>
          ))}
        </fieldset>
        <input
          className={field}
          name="reason"
          minLength={3}
          required
          placeholder="Motivo"
        />
        <button className="w-fit rounded-full border px-4 py-2 text-sm">
          Guardar default scope
        </button>
      </form>
      {series.is_active && (
        <form
          action={deactivateMeetingSeriesAction}
          className="flex gap-3 rounded-2xl border p-5"
        >
          <input type="hidden" name="meetingSeriesId" value={id} />
          <input type="hidden" name="version" value={series.version} />
          <input
            className={field}
            name="reason"
            required
            minLength={3}
            placeholder="Motivo da desativação"
          />
          <button className="rounded-full border px-4 py-2 text-sm">
            Desativar série
          </button>
        </form>
      )}
    </div>
  );
}
