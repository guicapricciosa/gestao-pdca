import Link from "next/link";

import type { ListOptions } from "@/modules/execution/application/creation-options";
import { priorityLabel } from "@/ui/labels";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";

export type FilterValues = Readonly<
  Record<string, string | string[] | undefined>
>;

function value(values: FilterValues, name: string) {
  const raw = values[name];
  return typeof raw === "string" ? raw : "";
}

/**
 * Essential filters visible; the rest under "Mais filtros". Values survive
 * a submit so people always see what is applied.
 */
export function ListFilters({
  basePath,
  values = {},
  showPriority = true,
  showPeople = true,
  options,
  statuses,
  statusLabel,
}: {
  readonly basePath: string;
  readonly values?: FilterValues;
  readonly showPriority?: boolean;
  readonly showPeople?: boolean;
  readonly options: ListOptions;
  readonly statuses: readonly string[];
  readonly statusLabel: (code: string) => string;
}) {
  const active = Object.entries(values).filter(
    ([key, raw]) => key !== "page" && typeof raw === "string" && raw !== "",
  ).length;
  const advancedActive = ["ownerId", "priority", "unitId"].some(
    (key) => value(values, key) !== "",
  );
  const departments = options.units.filter(
    (unit) => unit.unitType !== "SHARED_SERVICE",
  );
  const services = options.units.filter(
    (unit) => unit.unitType === "SHARED_SERVICE",
  );
  return (
    <form aria-label="Filtros" className="mb-6 rounded-2xl border bg-white p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <input
          aria-label="Pesquisar"
          className={`${field} md:col-span-2`}
          name="query"
          placeholder="Pesquisar por título…"
          defaultValue={value(values, "query")}
        />
        <select
          aria-label="Estado"
          className={field}
          name="status"
          defaultValue={value(values, "status")}
        >
          <option value="">Qualquer estado</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
        <select
          aria-label="Restaurante"
          className={field}
          name="restaurantId"
          defaultValue={value(values, "restaurantId")}
        >
          <option value="">Qualquer restaurante</option>
          {options.restaurants.map((restaurant) => (
            <option value={restaurant.id} key={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
        {showPeople && (
          <select
            aria-label="Responsável"
            className={field}
            name="responsibleId"
            defaultValue={value(values, "responsibleId")}
          >
            <option value="">Qualquer responsável</option>
            {options.people.map((person) => (
              <option value={person.id} key={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        )}
        {showPeople && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="overdue"
              value="true"
              defaultChecked={value(values, "overdue") === "true"}
            />
            Só atrasados
          </label>
        )}
      </div>
      <details className="mt-3" open={advancedActive}>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Mais filtros
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {showPeople && (
            <select
              aria-label="Owner"
              className={field}
              name="ownerId"
              defaultValue={value(values, "ownerId")}
            >
              <option value="">Qualquer Owner</option>
              {options.people.map((person) => (
                <option value={person.id} key={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          )}
          {showPriority && (
            <select
              aria-label="Prioridade"
              className={field}
              name="priority"
              defaultValue={value(values, "priority")}
            >
              <option value="">Qualquer prioridade</option>
              {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => (
                <option key={priority} value={priority}>
                  {priorityLabel(priority)}
                </option>
              ))}
            </select>
          )}
          <select
            aria-label="Área"
            className={field}
            name="unitId"
            defaultValue={value(values, "unitId")}
          >
            <option value="">Qualquer área</option>
            {departments.length > 0 && (
              <optgroup label="Departamentos">
                {departments.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </optgroup>
            )}
            {services.length > 0 && (
              <optgroup label="Serviços partilhados">
                {services.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Filtrar
        </button>
        {active > 0 && (
          <Link
            className="text-muted-foreground text-sm underline underline-offset-4"
            href={basePath}
          >
            Limpar filtros ({active})
          </Link>
        )}
      </div>
    </form>
  );
}
