import Link from "next/link";
import { notFound } from "next/navigation";

import {
  saveRestaurantAction,
  saveUnitAction,
} from "@/app/actions/organization";
import { createSupabaseServerClient } from "@/platform/supabase/server";
import { SubmitButton } from "@/ui/components/submit-button";

export const dynamic = "force-dynamic";
const input = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";

/**
 * Definições › Organização: restaurants and departments/services. Nothing is
 * deleted; things are deactivated and keep their history.
 */
export default async function OrganizationPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "restaurantes" } = await searchParams;
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
  const company = companyIds[0]!;
  const [{ data: restaurants }, { data: units }] = await Promise.all([
    client
      .from("restaurants")
      .select("id,code,name,is_active,closed_on")
      .in("company_id", companyIds)
      .order("is_active", { ascending: false })
      .order("name"),
    client
      .from("organizational_units")
      .select("id,code,name,unit_type,is_active")
      .in("company_id", companyIds)
      .order("is_active", { ascending: false })
      .order("unit_type")
      .order("name"),
  ]);
  const tabs = [
    { key: "restaurantes", label: "Restaurantes" },
    { key: "departamentos", label: "Departamentos e serviços" },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-accent text-sm font-medium">
          <Link className="hover:underline" href="/definicoes">
            Definições
          </Link>
          {" › "}Organização
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">
          Organização
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Restaurantes e departamentos definem onde as coisas acontecem e quem
          as vê. Nada se apaga: o que deixa de existir fica inactivo com o seu
          histórico.
        </p>
      </header>

      <nav aria-label="Secções" className="flex gap-2">
        {tabs.map((item) => (
          <Link
            aria-current={tab === item.key ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm ${
              tab === item.key ? "bg-black text-white" : "border bg-white"
            }`}
            href={`/definicoes/organizacao?tab=${item.key}`}
            key={item.key}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "departamentos" ? (
        <>
          <section
            className="rounded-2xl border bg-white"
            data-testid="unit-list"
          >
            <h2 className="border-b px-5 py-4 font-semibold">
              Departamentos e serviços partilhados ({(units ?? []).length})
            </h2>
            <ul>
              {(units ?? []).map((unit) => (
                <li className="border-b px-5 py-3 last:border-0" key={unit.id}>
                  <form
                    action={saveUnitAction}
                    className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                  >
                    <input type="hidden" name="unitId" value={unit.id} />
                    <input type="hidden" name="companyId" value={company} />
                    <input type="hidden" name="code" value={unit.code} />
                    <input
                      type="hidden"
                      name="unitType"
                      value={unit.unit_type}
                    />
                    <label className="block text-sm font-medium">
                      <span className="text-muted-foreground text-xs">
                        {unit.unit_type === "SHARED_SERVICE"
                          ? "Serviço partilhado"
                          : "Departamento"}{" "}
                        · {unit.code}
                        {unit.is_active ? "" : " · inactivo"}
                      </span>
                      <input
                        aria-label={`Nome de ${unit.name}`}
                        className={input}
                        defaultValue={unit.name}
                        minLength={2}
                        name="name"
                        required
                      />
                    </label>
                    <input
                      type="hidden"
                      name="isActive"
                      value={unit.is_active ? "true" : "false"}
                    />
                    <SubmitButton variant="secondary" pendingLabel="…">
                      Guardar
                    </SubmitButton>
                    <button
                      className="rounded-full border bg-white px-4 py-2 text-sm"
                      formAction={async (formData) => {
                        "use server";
                        formData.set(
                          "isActive",
                          unit.is_active ? "false" : "true",
                        );
                        await saveUnitAction(formData);
                      }}
                    >
                      {unit.is_active ? "Desactivar" : "Reactivar"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Novo departamento ou serviço</h2>
            <form
              action={saveUnitAction}
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
              data-testid="new-unit-form"
            >
              <input type="hidden" name="companyId" value={company} />
              <label className="block text-sm font-medium">
                Nome
                <input className={input} minLength={2} name="name" required />
              </label>
              <label className="block text-sm font-medium">
                Tipo
                <select
                  className={input}
                  name="unitType"
                  defaultValue="DEPARTMENT"
                >
                  <option value="DEPARTMENT">Departamento</option>
                  <option value="SHARED_SERVICE">Serviço partilhado</option>
                </select>
              </label>
              <SubmitButton pendingLabel="A criar…">Criar</SubmitButton>
            </form>
          </section>
        </>
      ) : (
        <>
          <section
            className="rounded-2xl border bg-white"
            data-testid="restaurant-list"
          >
            <h2 className="border-b px-5 py-4 font-semibold">
              Restaurantes ({(restaurants ?? []).length})
            </h2>
            <ul>
              {(restaurants ?? []).map((restaurant) => (
                <li
                  className="border-b px-5 py-3 last:border-0"
                  key={restaurant.id}
                >
                  <form
                    action={saveRestaurantAction}
                    className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                  >
                    <input
                      type="hidden"
                      name="restaurantId"
                      value={restaurant.id}
                    />
                    <input type="hidden" name="companyId" value={company} />
                    <input type="hidden" name="code" value={restaurant.code} />
                    <label className="block text-sm font-medium">
                      <span className="text-muted-foreground text-xs">
                        {restaurant.code}
                        {restaurant.is_active ? "" : " · inactivo"}
                      </span>
                      <input
                        aria-label={`Nome de ${restaurant.name}`}
                        className={input}
                        defaultValue={restaurant.name}
                        minLength={2}
                        name="name"
                        required
                      />
                    </label>
                    <input
                      type="hidden"
                      name="isActive"
                      value={restaurant.is_active ? "true" : "false"}
                    />
                    <SubmitButton variant="secondary" pendingLabel="…">
                      Guardar
                    </SubmitButton>
                    <button
                      className="rounded-full border bg-white px-4 py-2 text-sm"
                      formAction={async (formData) => {
                        "use server";
                        formData.set(
                          "isActive",
                          restaurant.is_active ? "false" : "true",
                        );
                        await saveRestaurantAction(formData);
                      }}
                    >
                      {restaurant.is_active ? "Desactivar" : "Reactivar"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Novo restaurante</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              O código é gerado a partir do nome e serve para integrações (por
              exemplo, o Zonesoft).
            </p>
            <form
              action={saveRestaurantAction}
              className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
              data-testid="new-restaurant-form"
            >
              <input type="hidden" name="companyId" value={company} />
              <label className="block text-sm font-medium">
                Nome
                <input className={input} minLength={2} name="name" required />
              </label>
              <label className="block text-sm font-medium">
                Código (opcional)
                <input
                  className={input}
                  name="code"
                  pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,63}"
                  placeholder="Ex.: SOPHIA_LX"
                />
              </label>
              <SubmitButton pendingLabel="A criar…">Criar</SubmitButton>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
