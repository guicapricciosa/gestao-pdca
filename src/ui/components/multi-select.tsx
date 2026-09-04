"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface MultiSelectOption {
  readonly value: string;
  readonly label: string;
  readonly group?: string;
}

/**
 * Several choices in one filter. Submits as repeated hidden inputs
 * (`name=value` per choice) so the surrounding form and the URL stay plain.
 */
export function MultiSelect({
  name,
  label,
  options,
  selected,
  className = "",
}: {
  readonly name: string;
  readonly label: string;
  readonly options: readonly MultiSelectOption[];
  readonly selected: readonly string[];
  readonly className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<readonly string[]>(selected);
  const root = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (value: string) =>
    setChosen((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  const groups = [...new Set(options.map((option) => option.group ?? ""))];
  const summary =
    chosen.length === 0
      ? label
      : chosen.length === 1
        ? (options.find((option) => option.value === chosen[0])?.label ?? label)
        : `${label} · ${chosen.length}`;

  return (
    <div className={`relative ${className}`} ref={root}>
      {chosen.map((value) => (
        <input key={value} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm ${
          chosen.length > 0 ? "border-black" : ""
        }`}
        data-testid={`filter-${name}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate">{summary}</span>
        <span aria-hidden className="text-muted-foreground text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div
          className="absolute left-0 z-30 mt-1 max-h-72 w-full min-w-56 overflow-y-auto rounded-xl border bg-white p-2 shadow-lg"
          id={listId}
          role="listbox"
          aria-multiselectable
          aria-label={label}
        >
          {groups.map((group) => (
            <div key={group}>
              {group !== "" && (
                <p className="text-muted-foreground px-2 pt-2 pb-1 text-[11px] tracking-[0.12em] uppercase">
                  {group}
                </p>
              )}
              {options
                .filter((option) => (option.group ?? "") === group)
                .map((option) => (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-black/[0.04]"
                    key={option.value}
                  >
                    <input
                      checked={chosen.includes(option.value)}
                      onChange={() => toggle(option.value)}
                      type="checkbox"
                    />
                    {option.label}
                  </label>
                ))}
            </div>
          ))}
          {chosen.length > 0 && (
            <button
              className="text-muted-foreground mt-1 w-full rounded-lg px-2 py-1.5 text-left text-xs underline-offset-4 hover:underline"
              onClick={() => setChosen([])}
              type="button"
            >
              Limpar {label.toLowerCase()}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
