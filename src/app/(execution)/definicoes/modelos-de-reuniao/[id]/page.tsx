import Link from "next/link";
import { notFound } from "next/navigation";

import { saveMeetingTemplateAction } from "@/app/actions/meetings";
import { loadMeetingCreationOptions } from "@/modules/meetings/application/options";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { RecurrencePicker } from "@/ui/components/recurrence-picker";
import { SubmitButton } from "@/ui/components/submit-button";
import { visibility } from "@/ui/labels";

export const dynamic = "force-dynamic";
const field = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

export default async function MeetingTemplatePage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await createSupabaseServerClient();
  const options = await loadMeetingCreationOptions();
  const isNew = id === "novo";
  const { data: template } = isNew
    ? { data: null }
    : await client.from("meeting_templates").select("*").eq("id", id).single();
  if (!isNew && template === null) notFound();
  const agenda = Array.isArray(template?.agenda)
    ? (template!.agenda as unknown[]).filter(
        (item): item is string => typeof item === "string",
      )
    : [];
  const participants = template?.participant_profile_ids ?? [];
  const units = template?.unit_ids ?? [];
  const restaurants = template?.restaurant_ids ?? [];
  const scopeMode = template
    ? template.all_restaurants
      ? "all"
      : restaurants.length > 0
        ? "some"
        : "none"
    : "all";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link
            className="hover:underline"
            href="/definicoes/modelos-de-reuniao"
          >
            Modelos de reunião
          </Link>
          {" › "}
          {isNew ? "Novo" : template!.name}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          {isNew ? "Novo modelo de reunião" : template!.name}
        </h1>
      </header>
      <form
        action={saveMeetingTemplateAction}
        className="grid gap-5 rounded-2xl border bg-white p-6"
        data-testid="template-form"
      >
        {options.companies[0] && (
          <input
            type="hidden"
            name="companyId"
            value={template?.company_id ?? options.companies[0].id}
          />
        )}
        {template && (
          <input type="hidden" name="templateId" value={template.id} />
        )}
        <input type="hidden" name="version" value={template?.version ?? 1} />
        <label className="block text-sm font-medium">
          Nome <span className="text-accent">*</span>
          <input
            className={field}
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={template?.name ?? ""}
            placeholder="Ex.: Reunião de Direção"
          />
        </label>
        <label className="block text-sm font-medium">
          Duração
          <select
            className={field}
            name="durationMinutes"
            defaultValue={String(template?.default_duration_minutes ?? 60)}
          >
            {[20, 30, 40, 50, 60, 90, 120, 180, 240].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutos
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-medium">
            Participantes habituais
          </legend>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {options.profiles.map((profile) => (
              <label className="flex gap-2 text-sm" key={profile.id}>
                <input
                  type="checkbox"
                  name="participantIds"
                  value={profile.id}
                  defaultChecked={participants.includes(profile.id)}
                />
                {profile.display_name}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-sm font-medium">Onde se aplica?</legend>
          <div className="mt-2 grid gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeMode"
                value="all"
                defaultChecked={scopeMode === "all"}
              />
              Todos os restaurantes
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeMode"
                value="some"
                defaultChecked={scopeMode === "some"}
              />
              Escolher restaurantes
            </label>
            <div className="ml-6 grid gap-1 sm:grid-cols-2">
              {options.restaurants.map((restaurant) => (
                <label className="flex gap-2 text-sm" key={restaurant.id}>
                  <input
                    type="checkbox"
                    name="restaurantIds"
                    value={restaurant.id}
                    defaultChecked={restaurants.includes(restaurant.id)}
                  />
                  {restaurant.name}
                </label>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="scopeMode"
                value="none"
                defaultChecked={scopeMode === "none"}
              />
              Nenhum restaurante em concreto (só a área)
            </label>
          </div>
        </fieldset>
        <label className="block text-sm font-medium">
          Agenda habitual
          <textarea
            className={`${field} min-h-32`}
            name="agenda"
            defaultValue={agenda.join("\n")}
            placeholder={"Operações\nComercial\nMarketing\nHappy People\nIT"}
          />
          <span className="text-muted-foreground mt-1 block text-xs font-normal">
            Um tema por linha, pela ordem habitual.
          </span>
        </label>
        <RecurrencePicker
          initial={JSON.stringify(template?.recurrence ?? { freq: "NONE" })}
        />
        <details
          className="rounded-lg border bg-white/60 p-4"
          open={
            units.length > 0 || (template?.visibility ?? "NORMAL") !== "NORMAL"
          }
        >
          <summary className="cursor-pointer text-sm font-medium">
            Opções avançadas
          </summary>
          <div className="mt-4 grid gap-4">
            <label className="block text-sm font-medium">
              Visibilidade
              <select
                className={field}
                name="visibility"
                defaultValue={template?.visibility ?? "NORMAL"}
              >
                {Object.entries(visibility).map(([code, option]) => (
                  <option key={code} value={code}>
                    {option.label} — {option.hint}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="text-sm font-medium">Área</legend>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {options.units.map((unit) => (
                  <label className="flex gap-2 text-sm" key={unit.id}>
                    <input
                      type="checkbox"
                      name="unitIds"
                      value={unit.id}
                      defaultChecked={units.includes(unit.id)}
                    />
                    {unit.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </details>
        <div>
          <SubmitButton pendingLabel="A guardar…">Guardar modelo</SubmitButton>
        </div>
      </form>
    </div>
  );
}
