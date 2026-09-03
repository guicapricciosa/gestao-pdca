import type { ListOptions } from "@/modules/execution/application/creation-options";

export function ListFilters({
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
  readonly showPriority?: boolean;
  readonly showPeople?: boolean;
  readonly options: ListOptions;
  readonly statuses?: readonly string[];
}) {
  return (
    <form className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-4">
      <input
        className="rounded-lg border px-3 py-2 text-sm"
        name="query"
        placeholder="Pesquisar…"
      />
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        name="status"
        defaultValue=""
      >
        <option value="">Todos os estados</option>
        {statuses.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </select>
      {showPriority && (
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          name="priority"
          defaultValue=""
        >
          <option value="">Todas as prioridades</option>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      )}
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        name="unitId"
        defaultValue=""
      >
        <option value="">Todos os departamentos/serviços</option>
        {options.units.map((unit) => (
          <option value={unit.id} key={unit.id}>
            {unit.name}
          </option>
        ))}
      </select>
      <select
        className="rounded-lg border px-3 py-2 text-sm"
        name="restaurantId"
        defaultValue=""
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
          className="rounded-lg border px-3 py-2 text-sm"
          name="ownerId"
          defaultValue=""
        >
          <option value="">Todos os Owners</option>
          {options.people.map((person) => (
            <option value={person.id} key={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      )}
      {showPeople && (
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          name="responsibleId"
          defaultValue=""
        >
          <option value="">Todos os Responsibles</option>
          {options.people.map((person) => (
            <option value={person.id} key={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      )}
      <label className="flex items-center gap-2 px-2 text-sm">
        <input type="checkbox" name="overdue" value="true" /> Overdue
      </label>
      <button className="rounded-lg bg-black px-4 py-2 text-sm text-white">
        Filtrar
      </button>
    </form>
  );
}
