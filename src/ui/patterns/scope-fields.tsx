import type { CreationOptions } from "@/modules/execution/application/creation-options";

const field = "mt-2 w-full rounded-lg border bg-white px-3 py-2 text-sm";

export const visibilityOptions = [
  {
    value: "NORMAL",
    label: "Normal",
    hint: "Visível para quem cobre o departamento, serviço ou restaurante.",
  },
  {
    value: "RESTRICTED",
    label: "Restrita",
    hint: "Só pessoas explicitamente autorizadas e administradores com esse poder.",
  },
  {
    value: "PRIVATE",
    label: "Privada",
    hint: "Só quem cria e quem receber acesso explícito.",
  },
] as const;

export function VisibilityField({
  defaultValue = "NORMAL",
  compact = false,
}: {
  readonly defaultValue?: string;
  readonly compact?: boolean;
}) {
  return (
    <label className="text-sm font-medium">
      Visibilidade
      <select className={field} name="visibility" defaultValue={defaultValue}>
        {visibilityOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {!compact && (
        <span className="text-muted-foreground mt-1 block text-xs font-normal">
          Normal segue o âmbito organizacional; restrita e privada exigem
          acessos explícitos.
        </span>
      )}
    </label>
  );
}

/**
 * Departments, shared services and restaurants as business-language groups.
 * Checkbox labels contain only the name so the text stays selectable as-is.
 */
export function ScopeFields({
  options,
  unitIds = [],
  restaurantIds = [],
  dense = false,
}: {
  readonly options: CreationOptions;
  readonly unitIds?: readonly string[];
  readonly restaurantIds?: readonly string[];
  readonly dense?: boolean;
}) {
  const departments = options.units.filter(
    (unit) => unit.unitType !== "SHARED_SERVICE",
  );
  const services = options.units.filter(
    (unit) => unit.unitType === "SHARED_SERVICE",
  );
  const labelClass = dense ? "flex gap-2 text-xs" : "flex gap-2 text-sm";
  const legendClass = dense ? "text-xs font-medium" : "text-sm font-medium";
  const grid = dense ? "mt-1 grid gap-1" : "mt-2 grid gap-2 sm:grid-cols-2";
  return (
    <div className={dense ? "grid gap-3 sm:grid-cols-3" : "grid gap-5"}>
      <fieldset>
        <legend className={legendClass}>Departamentos</legend>
        <div className={grid}>
          {departments.length === 0 && (
            <p className="text-muted-foreground text-xs">Nenhum disponível.</p>
          )}
          {departments.map((unit) => (
            <label className={labelClass} key={unit.id}>
              <input
                type="checkbox"
                name="unitIds"
                value={unit.id}
                defaultChecked={unitIds.includes(unit.id)}
              />
              {unit.name}
            </label>
          ))}
        </div>
      </fieldset>
      {services.length > 0 && (
        <fieldset>
          <legend className={legendClass}>Serviços partilhados</legend>
          <div className={grid}>
            {services.map((unit) => (
              <label className={labelClass} key={unit.id}>
                <input
                  type="checkbox"
                  name="unitIds"
                  value={unit.id}
                  defaultChecked={unitIds.includes(unit.id)}
                />
                {unit.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className={legendClass}>Restaurantes</legend>
        <div className={grid}>
          {options.restaurants.length === 0 && (
            <p className="text-muted-foreground text-xs">Nenhum disponível.</p>
          )}
          {options.restaurants.map((restaurant) => (
            <label className={labelClass} key={restaurant.id}>
              <input
                type="checkbox"
                name="restaurantIds"
                value={restaurant.id}
                defaultChecked={restaurantIds.includes(restaurant.id)}
              />
              {restaurant.name}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
