import Link from "next/link";
import { notFound } from "next/navigation";

import { invitePersonAction, resendInviteAction } from "@/app/actions/people";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { SubmitButton } from "@/ui/components/submit-button";
import { formatDateTime, organizationalRoleLabel } from "@/ui/labels";

export const dynamic = "force-dynamic";
const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

/**
 * Definições › Pessoas: who has access, with what role and scope, and the
 * invite form. Only for people who manage the organization.
 */
export default async function PeoplePage() {
  const client = await createSupabaseServerClient();
  const { data: scope } = await client.rpc("get_accessible_scope");
  const companyIds = [
    ...new Set(
      (scope ?? [])
        .filter((path) => path.permission_key === "organization.manage")
        .map((path) => path.company_id),
    ),
  ];
  if (companyIds.length === 0) notFound();
  const [{ data: people }, { data: roles }, { data: units }, { data: rests }] =
    await Promise.all([
      client
        .from("people_directory")
        .select("*")
        .in("company_id", companyIds)
        .order("display_name"),
      client
        .from("roles")
        .select("id,code,name,company_id")
        .eq("is_active", true)
        .order("name"),
      client
        .from("organizational_units")
        .select("id,name,unit_type,company_id")
        .eq("is_active", true)
        .in("company_id", companyIds)
        .order("name"),
      client
        .from("restaurants")
        .select("id,name,company_id")
        .eq("is_active", true)
        .in("company_id", companyIds)
        .order("name"),
    ]);
  const company = companyIds[0]!;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link className="hover:underline" href="/definicoes">
            Definições
          </Link>
          {" › "}Pessoas
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pessoas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Quem entra na plataforma, com que papel e sobre que restaurantes. Cada
          convite envia um email com um link para definir a palavra-passe.
        </p>
      </header>

      <section
        className="rounded-2xl border bg-white"
        data-testid="people-list"
      >
        <h2 className="border-b px-5 py-4 font-semibold">
          Com acesso ({(people ?? []).length})
        </h2>
        {(people ?? []).length === 0 ? (
          <p className="text-muted-foreground p-5 text-sm">Ainda ninguém.</p>
        ) : (
          <ul>
            {(people ?? []).map((person) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3 text-sm last:border-0"
                key={person.assignment_id ?? person.profile_id ?? ""}
              >
                <div className="min-w-0">
                  <p className="font-medium">{person.display_name}</p>
                  <p className="text-muted-foreground text-xs">
                    {person.email} ·{" "}
                    {organizationalRoleLabel(person.role_code ?? "")}
                    {person.title ? ` · ${person.title}` : ""}
                    {person.unit_scope_mode === "COMPANY_WIDE"
                      ? " · toda a empresa"
                      : person.unit_name
                        ? ` · ${person.unit_name}`
                        : ""}
                    {" · "}
                    {person.restaurant_scope_mode === "COMPANY_WIDE"
                      ? "todos os restaurantes"
                      : person.restaurant_scope_mode === "NONE"
                        ? "sem restaurantes"
                        : (person.restaurant_names ?? []).join(", ") ||
                          "restaurantes herdados"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">
                    {person.last_seen_at
                      ? `Visto ${formatDateTime(person.last_seen_at)}`
                      : "Ainda não entrou"}
                  </span>
                  {!person.last_seen_at && (
                    <form action={resendInviteAction}>
                      <input
                        type="hidden"
                        name="email"
                        value={person.email ?? ""}
                      />
                      <SubmitButton
                        variant="secondary"
                        pendingLabel="A enviar…"
                      >
                        Reenviar convite
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="font-semibold">Convidar pessoa</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          O papel define o que a pessoa pode fazer; o departamento e os
          restaurantes definem sobre o quê.
        </p>
        <form
          action={invitePersonAction}
          className="mt-4 grid gap-4 md:grid-cols-2"
          data-testid="invite-form"
        >
          <input type="hidden" name="companyId" value={company} />
          <label className="block text-sm font-medium">
            Nome
            <input
              className={input}
              name="displayName"
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm font-medium">
            Email da empresa
            <input className={input} name="email" type="email" required />
          </label>
          <label className="block text-sm font-medium">
            Papel
            <select className={input} name="roleId" required defaultValue="">
              <option value="" disabled>
                Escolhe…
              </option>
              {(roles ?? [])
                .filter(
                  (role) =>
                    role.company_id === null || role.company_id === company,
                )
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {organizationalRoleLabel(role.code)}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Cargo (opcional)
            <input
              className={input}
              name="title"
              placeholder="Ex.: Directora de Operações"
            />
          </label>
          <label className="block text-sm font-medium">
            Departamento ou serviço
            <select className={input} name="unitId" defaultValue="">
              <option value="">Toda a empresa</option>
              {(units ?? []).map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                  {unit.unit_type === "SHARED_SERVICE"
                    ? " (serviço partilhado)"
                    : ""}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground mt-1 block text-xs">
              «Toda a empresa» dá acesso a todos os departamentos.
            </span>
          </label>
          <fieldset className="text-sm font-medium">
            <legend>Restaurantes</legend>
            <div className="mt-1.5 grid gap-1.5 font-normal">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="restaurantScope"
                  value="COMPANY_WIDE"
                />
                Todos os restaurantes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="restaurantScope"
                  value="ASSIGNED"
                  defaultChecked
                />
                Só alguns
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="restaurantScope" value="NONE" />
                Nenhum (funções centrais sem restaurantes)
              </label>
            </div>
          </fieldset>
          <div className="md:col-span-2">
            <p className="text-sm font-medium">Quais</p>
            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-3">
              {(rests ?? []).map((restaurant) => (
                <label
                  className="flex items-center gap-2 text-sm"
                  key={restaurant.id}
                >
                  <input
                    type="checkbox"
                    name="restaurantIds"
                    value={restaurant.id}
                  />
                  {restaurant.name}
                </label>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <SubmitButton pendingLabel="A convidar…">
              Enviar convite
            </SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
