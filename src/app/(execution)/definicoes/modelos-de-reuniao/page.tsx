import Link from "next/link";

import { deactivateMeetingTemplateAction } from "@/app/actions/meetings";
import {
  describeRecurrence,
  parseRecurrence,
} from "@/modules/meetings/domain/recurrence";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { SubmitButton } from "@/ui/components/submit-button";
import { visibilityLabel } from "@/ui/labels";

export const dynamic = "force-dynamic";
export default async function MeetingTemplatesPage() {
  const client = await createSupabaseServerClient();
  const { data } = await client
    .from("meeting_templates")
    .select(
      "id,name,default_duration_minutes,visibility,participant_profile_ids,all_restaurants,restaurant_ids,agenda,recurrence,version",
    )
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  const templates = data ?? [];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-accent text-sm font-medium">
            <Link className="hover:underline" href="/definicoes">
              Definições
            </Link>
            {" › "}Modelos de reunião
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Modelos de reunião
          </h1>
        </div>
        <Link
          className="rounded-full bg-black px-4 py-2 text-sm text-white"
          href="/definicoes/modelos-de-reuniao/novo"
        >
          Novo modelo
        </Link>
      </header>
      <section
        className="rounded-2xl border bg-white"
        data-testid="template-list"
      >
        {templates.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">
            Ainda não há modelos. Cria «Reunião de Direção», «Reunião DOL» ou
            «Visita técnica» para marcar reuniões em segundos.
          </p>
        ) : (
          <ul>
            {templates.map((template) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 last:border-0"
                key={template.id}
              >
                <div>
                  <Link
                    className="font-semibold underline-offset-4 hover:underline"
                    href={`/definicoes/modelos-de-reuniao/${template.id}`}
                  >
                    {template.name}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {template.default_duration_minutes} min ·{" "}
                    {template.participant_profile_ids.length} pessoas ·{" "}
                    {template.all_restaurants
                      ? "todos os restaurantes"
                      : `${template.restaurant_ids.length} restaurante(s)`}{" "}
                    ·{" "}
                    {describeRecurrence(
                      parseRecurrence(JSON.stringify(template.recurrence)),
                    )}{" "}
                    · {visibilityLabel(template.visibility)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    className="rounded-full border bg-white px-4 py-2 text-sm"
                    data-testid="edit-template"
                    href={`/definicoes/modelos-de-reuniao/${template.id}`}
                  >
                    Editar
                  </Link>
                  <form action={deactivateMeetingTemplateAction}>
                    <input
                      type="hidden"
                      name="templateId"
                      value={template.id}
                    />
                    <input
                      type="hidden"
                      name="version"
                      value={template.version}
                    />
                    <SubmitButton variant="secondary" pendingLabel="…">
                      Remover
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
