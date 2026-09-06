import Link from "next/link";

import type { ListOptions } from "@/modules/execution/application/creation-options";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/ui/components/multi-select";
import { priorityLabel } from "@/ui/labels";
import {
  activeFilterCount,
  listHref,
  listParam,
  singleParam,
  type SearchValues,
} from "@/ui/patterns/list-query";

const field = "rounded-lg border bg-white px-3 py-2 text-sm";

export type FilterValues = SearchValues;

/**
 * Essential filters visible; the rest under "Mais filtros". Every selector
 * takes several values; the choices show as chips that can be removed one
 * by one, so people always see what is applied.
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
  const active = activeFilterCount(values);
  const advancedActive = ["ownerId", "priority", "unitId"].some(
    (key) => listParam(values, key).length > 0,
  );
  const people: MultiSelectOption[] = options.people.map((person) => ({
    value: person.id,
    label: person.name,
  }));
  const units: MultiSelectOption[] = options.units.map((unit) => ({
    value: unit.id,
    label: unit.name,
    group:
      unit.unitType === "SHARED_SERVICE"
        ? "Serviços partilhados"
        : "Departamentos",
  }));
  const selectors: readonly {
    readonly name: string;
    readonly label: string;
    readonly options: readonly MultiSelectOption[];
  }[] = [
    {
      name: "status",
      label: "Estado",
      options: statuses.map((status) => ({
        value: status,
        label: statusLabel(status),
      })),
    },
    {
      name: "restaurantId",
      label: "Restaurante",
      options: options.restaurants.map((restaurant) => ({
        value: restaurant.id,
        label: restaurant.name,
      })),
    },
    { name: "responsibleId", label: "Responsável", options: people },
    { name: "ownerId", label: "Owner", options: people },
    {
      name: "priority",
      label: "Prioridade",
      options: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priority) => ({
        value: priority,
        label: priorityLabel(priority),
      })),
    },
    { name: "unitId", label: "Área", options: units },
  ];
  const chips = selectors.flatMap((selector) =>
    listParam(values, selector.name).map((value) => ({
      key: `${selector.name}:${value}`,
      label: `${selector.label}: ${
        selector.options.find((option) => option.value === value)?.label ??
        value
      }`,
      href: listHref(basePath, values, {
        [selector.name]: listParam(values, selector.name).filter(
          (item) => item !== value,
        ),
      }),
    })),
  );
  const selector = (name: string) => {
    const definition = selectors.find((item) => item.name === name);
    if (!definition) return null;
    return (
      <MultiSelect
        // Remount when the URL changes the selection (chips, "Limpar").
        key={`${definition.name}:${listParam(values, definition.name).join("|")}`}
        label={definition.label}
        name={definition.name}
        options={definition.options}
        selected={listParam(values, definition.name)}
      />
    );
  };
  return (
    <form aria-label="Filtros" className="mb-6 rounded-2xl border bg-white p-4">
      {/* Sort survives filtering; it lives in the URL, not in the form fields. */}
      {listParam(values, "sort").map((value) => (
        <input key={value} name="sort" type="hidden" value={value} />
      ))}
      {listParam(values, "dir").map((value) => (
        <input key={value} name="dir" type="hidden" value={value} />
      ))}
      <div className="grid gap-3 md:grid-cols-4">
        <input
          aria-label="Pesquisar por título"
          className={`${field} md:col-span-2`}
          name="query"
          placeholder="Pesquisar por título…"
          defaultValue={singleParam(values, "query")}
        />
        {selector("status")}
        {selector("restaurantId")}
        {showPeople && selector("responsibleId")}
        {showPeople && (
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="overdue"
                value="true"
                defaultChecked={singleParam(values, "overdue") === "true"}
              />
              Só atrasados
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="unassigned"
                value="true"
                defaultChecked={singleParam(values, "unassigned") === "true"}
              />
              Sem responsável
            </label>
          </div>
        )}
      </div>
      <details className="mt-3" open={advancedActive}>
        <summary className="text-muted-foreground cursor-pointer text-xs">
          Mais filtros
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {showPeople && selector("ownerId")}
          {showPriority && selector("priority")}
          {selector("unitId")}
        </div>
      </details>
      {chips.length > 0 && (
        <ul
          className="mt-3 flex flex-wrap gap-2"
          data-testid="filter-chips"
          aria-label="Filtros aplicados"
        >
          {chips.map((chip) => (
            <li key={chip.key}>
              <Link
                className="inline-flex items-center gap-1.5 rounded-full border bg-neutral-50 px-3 py-1 text-xs hover:bg-neutral-100"
                href={chip.href}
                aria-label={`Retirar ${chip.label}`}
              >
                {chip.label}
                <span aria-hidden>×</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
          Filtrar
        </button>
        {active > 0 && (
          <Link
            className="text-muted-foreground text-sm underline underline-offset-4"
            href={listHref(basePath, values, {
              query: null,
              overdue: null,
              unassigned: null,
              status: null,
              restaurantId: null,
              responsibleId: null,
              ownerId: null,
              priority: null,
              unitId: null,
            })}
          >
            Limpar filtros ({active})
          </Link>
        )}
      </div>
    </form>
  );
}
