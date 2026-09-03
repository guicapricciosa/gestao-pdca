"use client";

import { useId, useState } from "react";

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
}

interface ScopePickerProps {
  /** Restaurants the current person is allowed to use. */
  readonly restaurants: readonly ScopeOption[];
  /** Restaurants inferred from the context (meeting, own assignment). */
  readonly contextIds: readonly string[];
  /** Human name of the context, e.g. "desta reunião" or "que cobres". */
  readonly contextLabel: string;
  readonly name?: string;
  readonly companyWide?: boolean;
}

const field = "w-full rounded-lg border bg-white px-3 py-2 text-sm";

/**
 * "Onde se aplica?" — the person always sees the final scope before adding.
 * With one context restaurant it is pre-filled; with several, the choice is
 * explicit: all of them, one of them, or an authorized combination.
 */
export function ScopePicker({
  restaurants,
  contextIds,
  contextLabel,
  name = "restaurantIds",
  companyWide = false,
}: ScopePickerProps) {
  const id = useId();
  const context = restaurants.filter((restaurant) =>
    contextIds.includes(restaurant.id),
  );
  const initial =
    context.length === 1
      ? `one:${context[0]!.id}`
      : context.length > 1
        ? "context"
        : companyWide
          ? "all"
          : "custom";
  const [choice, setChoice] = useState<string>(initial);
  const [custom, setCustom] = useState<string[]>(
    context.map((restaurant) => restaurant.id),
  );

  const selected =
    choice === "context"
      ? context.map((restaurant) => restaurant.id)
      : choice === "all"
        ? restaurants.map((restaurant) => restaurant.id)
        : choice === "none"
          ? []
          : choice.startsWith("one:")
            ? [choice.slice(4)]
            : custom;
  const summary =
    selected.length === 0
      ? "Sem restaurante (aplica-se à área, não a um restaurante)"
      : selected.length === restaurants.length && restaurants.length > 1
        ? "Todos os restaurantes"
        : restaurants
            .filter((restaurant) => selected.includes(restaurant.id))
            .map((restaurant) => restaurant.name)
            .join(" + ");

  return (
    <div className="grid gap-2">
      <label className="text-sm font-medium" htmlFor={id}>
        Onde se aplica?
      </label>
      <select
        className={field}
        id={id}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        data-testid="scope-picker"
      >
        {context.length > 1 && (
          <option value="context">
            Todos os restaurantes {contextLabel} ({context.length})
          </option>
        )}
        {context.map((restaurant) => (
          <option key={restaurant.id} value={`one:${restaurant.id}`}>
            {restaurant.name}
          </option>
        ))}
        {companyWide && restaurants.length > 1 && (
          <option value="all">Todos os restaurantes</option>
        )}
        {restaurants
          .filter((restaurant) => !contextIds.includes(restaurant.id))
          .slice(0, context.length === 0 ? restaurants.length : 0)
          .map((restaurant) => (
            <option key={restaurant.id} value={`one:${restaurant.id}`}>
              {restaurant.name}
            </option>
          ))}
        <option value="custom">Escolher uma combinação…</option>
        <option value="none">Nenhum restaurante em concreto</option>
      </select>
      {choice === "custom" && (
        <fieldset className="grid gap-1 rounded-lg border p-3 sm:grid-cols-2">
          <legend className="px-1 text-xs font-medium">
            Restaurantes autorizados
          </legend>
          {restaurants.map((restaurant) => (
            <label className="flex gap-2 text-sm" key={restaurant.id}>
              <input
                type="checkbox"
                checked={custom.includes(restaurant.id)}
                onChange={(event) =>
                  setCustom((current) =>
                    event.target.checked
                      ? [...current, restaurant.id]
                      : current.filter((value) => value !== restaurant.id),
                  )
                }
              />
              {restaurant.name}
            </label>
          ))}
        </fieldset>
      )}
      <p className="text-muted-foreground text-xs" data-testid="scope-summary">
        Aplica-se a: <span className="text-foreground">{summary}</span>
      </p>
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
