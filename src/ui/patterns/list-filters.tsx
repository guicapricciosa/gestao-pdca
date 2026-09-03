import Link from "next/link";

import type { ListOptions } from "@/modules/execution/application/creation-options";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";

export type FilterValues = Readonly<
  Record<string, string | string[] | undefined>
>;

function value(values: FilterValues, name: string) {
  const raw = values[name];
  return typeof raw === "string" ? raw : "";
}

export function ListFilters({
  basePath,
  values = {},
  showPriority = true,
  showPeople = true,
  options,
  statuses = [
    "DRAFT",
    "OPEN",
    "PLANNED",
    "IN_PROGRESS",
    "BLOCKED",
    "WAITING",
    "UNDER_REVIEW",
    "COMPLETED",
    "CANCELLED",
    "ARCHIVED",
  ],
}: {
  readonly basePath: string;
  readonly values?: FilterValues;
  readonly showPriority?: boolean;
  readonly showPeople?: boolean;
  readonly options: ListOptions;
  readonly statuses?: readonly string[];
}) {
  const active = Object.entries(values).filter(
    ([key, raw]) => key !== "page" && typeof raw === "string" && raw !== "",
  ).length;
  const departments = options.units.filter(
    (unit) => unit.unitType !== "SHARED_SERVICE",
  );
  const services = options.units.filter(
    (unit) => unit.unitType === "SHARED_SERVICE",
  );
  return (
    <form
      aria-label="Filtros"
      className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4"
    >
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
        <option value="">Todos os estados</option>
        {statuses.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll("_", " ")}
          </option>
        ))}
      </select>
      {showPriority ? (
        <select
          aria-label="Prioridade"
          className={field}
          name="priority"
          defaultValue={value(values, "priority")}
        >
          <option value="">Todas as prioridades</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
      ) : (
        <span className="hidden md:block" />
      )}
      <select
        aria-label="Departamento ou serviço"
        className={field}
        name="unitId"
        defaultValue={value(values, "unitId")}
      >
        <option value="">Todos os departamentos e serviços</option>
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
      <select
        aria-label="Restaurante"
        className={field}
        name="restaurantId"
        defaultValue={value(values, "restaurantId")}
      >
        <option value="">Todos os restaurantes</option>
        {options.restaurants.map((restaurant) => (
          <option value={restaurant.id} key={restaurant.id}>
            {restaurant.name}
          </option>
        ))}
      </select>
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
      {showPeople && (
        <select
          aria-label="Responsible"
          className={field}
          name="responsibleId"
          defaultValue={value(values, "responsibleId")}
        >
          <option value="">Qualquer Responsible</option>
          {options.people.map((person) => (
            <option value={person.id} key={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      )}
      <div className="flex flex-wrap items-center gap-4 md:col-span-4">
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
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Aplicar filtros
        </button>
        {active > 0 && (
          <Link
            className="text-muted-foreground text-sm underline underline-offset-4"
            href={basePath}
          >
            Limpar ({active})
          </Link>
        )}
      </div>
    </form>
  );
}
