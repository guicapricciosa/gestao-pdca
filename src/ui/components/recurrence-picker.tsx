"use client";

import { useEffect, useState } from "react";

import {
  describeRecurrence,
  isoWeekday,
  none,
  parseRecurrence,
  presetRecurrence,
  weekdayShort,
  type Recurrence,
} from "@/modules/meetings/domain/recurrence";

const field = "mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-sm";
const small = "rounded-lg border bg-white px-2 py-1.5 text-sm";

type Preset = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";

function presetOf(recurrence: Recurrence): Preset {
  if (recurrence.freq === "NONE") return "NONE";
  if (recurrence.end.kind !== "never" || recurrence.interval !== 1)
    return "CUSTOM";
  if (recurrence.freq === "WEEKLY" && recurrence.weekdays.length !== 1)
    return "CUSTOM";
  if (recurrence.freq === "MONTHLY" && recurrence.monthly.kind !== "day")
    return "CUSTOM";
  return recurrence.freq;
}

/**
 * "Repetir": Não / Diariamente / Semanalmente / Mensalmente / Personalizado…
 * The custom panel mirrors a calendar: every N, weekdays, monthly by day or
 * by nth weekday, and an end. Submits `recurrence` (JSON) and `repeat`.
 */
export function RecurrencePicker({
  start,
  initial,
  name = "recurrence",
}: {
  /** ISO local datetime of the meeting start, used as the anchor. Defaults to now. */
  readonly start?: string | undefined;
  readonly initial?: string | undefined;
  readonly name?: string;
}) {
  const [fallback] = useState(() => new Date());
  const anchor = start ? new Date(start) : fallback;
  const [recurrence, setRecurrence] = useState<Recurrence>(() =>
    parseRecurrence(initial),
  );
  const [preset, setPreset] = useState<Preset>(() =>
    presetOf(parseRecurrence(initial)),
  );
  // A template's simple preset ("Semanalmente") follows the meeting's own
  // day; only custom rules keep their explicit days.
  useEffect(() => {
    const parsed = parseRecurrence(initial);
    const nextPreset = presetOf(parsed);
    const frame = setTimeout(() => {
      setPreset(nextPreset);
      setRecurrence(
        nextPreset === "CUSTOM" || nextPreset === "NONE"
          ? parsed
          : presetRecurrence(nextPreset, start ? new Date(start) : new Date()),
      );
    }, 0);
    return () => clearTimeout(frame);
  }, [initial, start]);

  const choose = (value: Preset) => {
    setPreset(value);
    if (value === "CUSTOM")
      setRecurrence((current) =>
        current.freq === "NONE" ? presetRecurrence("WEEKLY", anchor) : current,
      );
    else setRecurrence(presetRecurrence(value, anchor));
  };

  const custom =
    recurrence.freq === "NONE"
      ? presetRecurrence("WEEKLY", anchor)
      : recurrence;
  const update = (patch: Partial<Recurrence>) =>
    setRecurrence({ ...custom, ...patch } as Recurrence);

  return (
    <div className="grid gap-2" data-testid="recurrence-picker">
      <input type="hidden" name={name} value={JSON.stringify(recurrence)} />
      <label className="block text-sm font-medium">
        Repetir
        <select
          className={field}
          name="repeat"
          value={preset}
          onChange={(event) => choose(event.target.value as Preset)}
        >
          <option value="NONE">Não</option>
          <option value="DAILY">Diariamente</option>
          <option value="WEEKLY">Semanalmente</option>
          <option value="MONTHLY">Mensalmente</option>
          <option value="CUSTOM">Personalizado…</option>
        </select>
      </label>
      {preset === "CUSTOM" && custom.freq !== "NONE" && (
        <div
          className="grid gap-3 rounded-lg border bg-white/60 p-4 text-sm"
          data-testid="recurrence-custom"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span>Repetir</span>
            <select
              className={small}
              value={custom.freq}
              onChange={(event) => {
                const freq = event.target.value as
                  "DAILY" | "WEEKLY" | "MONTHLY";
                const base = presetRecurrence(freq, anchor);
                setRecurrence({
                  ...base,
                  interval: custom.interval,
                  end: custom.end,
                } as Recurrence);
              }}
            >
              <option value="DAILY">Diariamente</option>
              <option value="WEEKLY">Semanalmente</option>
              <option value="MONTHLY">Mensalmente</option>
            </select>
            <span>a cada</span>
            <input
              className={`${small} w-16`}
              type="number"
              min={1}
              max={52}
              value={custom.interval}
              onChange={(event) =>
                update({
                  interval: Math.max(1, Number(event.target.value) || 1),
                })
              }
            />
            <span>
              {custom.freq === "DAILY"
                ? "dia(s)"
                : custom.freq === "WEEKLY"
                  ? "semana(s)"
                  : "mês(es)"}
            </span>
          </div>
          {custom.freq === "WEEKLY" && (
            <div className="flex flex-wrap items-center gap-2">
              <span>Nos dias</span>
              {weekdayShort.map((label, index) => {
                const day = index + 1;
                const on = custom.weekdays.includes(day);
                return (
                  <button
                    aria-pressed={on}
                    className={`size-8 rounded-full border text-xs font-semibold ${on ? "bg-black text-white" : "bg-white"}`}
                    key={day}
                    onClick={() =>
                      update({
                        weekdays: on
                          ? custom.weekdays.filter((d) => d !== day)
                          : [...custom.weekdays, day].sort(),
                      })
                    }
                    title={
                      [
                        "segunda",
                        "terça",
                        "quarta",
                        "quinta",
                        "sexta",
                        "sábado",
                        "domingo",
                      ][index]
                    }
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {custom.freq === "MONTHLY" && (
            <div className="grid gap-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="monthly-kind"
                  checked={custom.monthly.kind === "day"}
                  onChange={() =>
                    update({ monthly: { kind: "day", day: anchor.getDate() } })
                  }
                />
                Dia
                <input
                  className={`${small} w-16`}
                  type="number"
                  min={1}
                  max={31}
                  disabled={custom.monthly.kind !== "day"}
                  value={
                    custom.monthly.kind === "day"
                      ? custom.monthly.day
                      : anchor.getDate()
                  }
                  onChange={(event) =>
                    update({
                      monthly: {
                        kind: "day",
                        day: Math.min(
                          31,
                          Math.max(1, Number(event.target.value) || 1),
                        ),
                      },
                    })
                  }
                />
                de cada mês
              </label>
              <label className="flex flex-wrap items-center gap-2">
                <input
                  type="radio"
                  name="monthly-kind"
                  checked={custom.monthly.kind === "nth"}
                  onChange={() =>
                    update({
                      monthly: {
                        kind: "nth",
                        nth: 1,
                        weekday: isoWeekday(anchor),
                      },
                    })
                  }
                />
                Na
                <select
                  className={small}
                  disabled={custom.monthly.kind !== "nth"}
                  value={custom.monthly.kind === "nth" ? custom.monthly.nth : 1}
                  onChange={(event) =>
                    update({
                      monthly: {
                        kind: "nth",
                        nth: Number(event.target.value) as 1 | 2 | 3 | 4 | -1,
                        weekday:
                          custom.monthly.kind === "nth"
                            ? custom.monthly.weekday
                            : isoWeekday(anchor),
                      },
                    })
                  }
                >
                  <option value={1}>primeira</option>
                  <option value={2}>segunda</option>
                  <option value={3}>terceira</option>
                  <option value={4}>quarta</option>
                  <option value={-1}>última</option>
                </select>
                <select
                  className={small}
                  disabled={custom.monthly.kind !== "nth"}
                  value={
                    custom.monthly.kind === "nth"
                      ? custom.monthly.weekday
                      : isoWeekday(anchor)
                  }
                  onChange={(event) =>
                    update({
                      monthly: {
                        kind: "nth",
                        nth:
                          custom.monthly.kind === "nth"
                            ? custom.monthly.nth
                            : 1,
                        weekday: Number(event.target.value),
                      },
                    })
                  }
                >
                  {[
                    "segunda-feira",
                    "terça-feira",
                    "quarta-feira",
                    "quinta-feira",
                    "sexta-feira",
                    "sábado",
                    "domingo",
                  ].map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                do mês
              </label>
            </div>
          )}
          <div className="grid gap-1">
            <span>Termina</span>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="end-kind"
                checked={custom.end.kind === "never"}
                onChange={() => update({ end: { kind: "never" } })}
              />
              Nunca
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="end-kind"
                checked={custom.end.kind === "until"}
                onChange={() =>
                  update({
                    end: {
                      kind: "until",
                      date: anchor.toISOString().slice(0, 10),
                    },
                  })
                }
              />
              Em determinada data
              <input
                className={small}
                type="date"
                disabled={custom.end.kind !== "until"}
                value={custom.end.kind === "until" ? custom.end.date : ""}
                onChange={(event) =>
                  update({ end: { kind: "until", date: event.target.value } })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="end-kind"
                checked={custom.end.kind === "count"}
                onChange={() => update({ end: { kind: "count", count: 10 } })}
              />
              Após
              <input
                className={`${small} w-16`}
                type="number"
                min={1}
                max={365}
                disabled={custom.end.kind !== "count"}
                value={custom.end.kind === "count" ? custom.end.count : 10}
                onChange={(event) =>
                  update({
                    end: {
                      kind: "count",
                      count: Math.max(1, Number(event.target.value) || 1),
                    },
                  })
                }
              />
              ocorrências
            </label>
          </div>
        </div>
      )}
      <p
        className="text-muted-foreground text-xs"
        data-testid="recurrence-summary"
      >
        {describeRecurrence(recurrence)}
        {recurrence.freq !== "NONE" &&
          " · As próximas reuniões marcam-se uma a uma e herdam agenda pendente, pessoas e âmbito."}
      </p>
    </div>
  );
}

export { none as noRecurrence };
