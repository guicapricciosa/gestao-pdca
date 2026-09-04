/**
 * Structured recurrence for meeting series, close to what a calendar
 * understands (RRULE-like) so a future Outlook sync maps directly.
 * Weekdays: 1 = Monday … 7 = Sunday (ISO).
 */
export type RecurrenceEnd =
  | { readonly kind: "never" }
  | { readonly kind: "until"; readonly date: string }
  | { readonly kind: "count"; readonly count: number };

export type Recurrence =
  | { readonly freq: "NONE" }
  | {
      readonly freq: "DAILY";
      readonly interval: number;
      readonly end: RecurrenceEnd;
    }
  | {
      readonly freq: "WEEKLY";
      readonly interval: number;
      readonly weekdays: readonly number[];
      readonly end: RecurrenceEnd;
    }
  | {
      readonly freq: "MONTHLY";
      readonly interval: number;
      readonly monthly:
        | { readonly kind: "day"; readonly day: number }
        | {
            readonly kind: "nth";
            readonly nth: 1 | 2 | 3 | 4 | -1;
            readonly weekday: number;
          };
      readonly end: RecurrenceEnd;
    };

export const weekdayShort = ["S", "T", "Q", "Q", "S", "S", "D"] as const;
export const weekdayLong = [
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
  "domingo",
] as const;
const nthLabel: Record<string, string> = {
  "1": "primeira",
  "2": "segunda",
  "3": "terceira",
  "4": "quarta",
  "-1": "última",
};

export const none: Recurrence = { freq: "NONE" };

/** Presets used by the simple "Repetir" select. */
export function presetRecurrence(preset: string, start: Date): Recurrence {
  const weekday = isoWeekday(start);
  switch (preset) {
    case "DAILY":
      return { freq: "DAILY", interval: 1, end: { kind: "never" } };
    case "WEEKLY":
      return {
        freq: "WEEKLY",
        interval: 1,
        weekdays: [weekday],
        end: { kind: "never" },
      };
    case "BIWEEKLY":
      return {
        freq: "WEEKLY",
        interval: 2,
        weekdays: [weekday],
        end: { kind: "never" },
      };
    case "MONTHLY":
      return {
        freq: "MONTHLY",
        interval: 1,
        monthly: { kind: "day", day: start.getDate() },
        end: { kind: "never" },
      };
    default:
      return none;
  }
}

export function isoWeekday(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function plural(n: number, one: string, many: string) {
  return n === 1 ? one : `${n} ${many}`;
}

function endText(end: RecurrenceEnd): string {
  if (end.kind === "until")
    return ` até ${new Date(`${end.date}T00:00:00`).toLocaleDateString("pt-PT")}`;
  if (end.kind === "count") return `, ${end.count} vezes`;
  return "";
}

/** Human label in PT-PT, e.g. "A cada 2 semanas à terça e quinta". */
export function describeRecurrence(recurrence: Recurrence): string {
  switch (recurrence.freq) {
    case "NONE":
      return "Não se repete";
    case "DAILY":
      return (
        (recurrence.interval === 1
          ? "Diariamente"
          : `A cada ${recurrence.interval} dias`) + endText(recurrence.end)
      );
    case "WEEKLY": {
      const days = [...recurrence.weekdays]
        .sort((a, b) => a - b)
        .map((day) => weekdayLong[day - 1]?.replace("-feira", "") ?? "")
        .filter(Boolean);
      const every =
        recurrence.interval === 1
          ? "Semanalmente"
          : recurrence.interval === 2
            ? "Quinzenalmente"
            : `A cada ${recurrence.interval} semanas`;
      const on = days.length > 0 ? ` à ${days.join(", ")}` : "";
      return every + on + endText(recurrence.end);
    }
    case "MONTHLY": {
      const every =
        recurrence.interval === 1
          ? "Mensalmente"
          : `A cada ${plural(recurrence.interval, "mês", "meses")}`;
      const when =
        recurrence.monthly.kind === "day"
          ? `, dia ${recurrence.monthly.day}`
          : `, na ${nthLabel[String(recurrence.monthly.nth)]} ${weekdayLong[recurrence.monthly.weekday - 1]}`;
      return every + when + endText(recurrence.end);
    }
  }
}

function sameTime(base: Date, date: Date): Date {
  const next = new Date(date);
  next.setHours(base.getHours(), base.getMinutes(), 0, 0);
  return next;
}

function nthWeekdayOfMonth(
  year: number,
  month: number,
  nth: number,
  weekday: number,
): Date | null {
  if (nth === -1) {
    const last = new Date(year, month + 1, 0);
    const offset = (isoWeekday(last) - weekday + 7) % 7;
    return new Date(year, month, last.getDate() - offset);
  }
  const first = new Date(year, month, 1);
  const offset = (weekday - isoWeekday(first) + 7) % 7;
  const day = 1 + offset + (nth - 1) * 7;
  if (day > new Date(year, month + 1, 0).getDate()) return null;
  return new Date(year, month, day);
}

/**
 * Next occurrence strictly after `after`, given the series start (which fixes
 * the time of day and the anchor for intervals). Returns null when the
 * series has ended. Bounded search keeps it total.
 */
export function nextOccurrence(
  recurrence: Recurrence,
  start: Date,
  after: Date,
  occurrencesSoFar = 0,
): Date | null {
  if (recurrence.freq === "NONE") return null;
  const end = recurrence.end;
  if (end.kind === "count" && occurrencesSoFar >= end.count) return null;
  const until = end.kind === "until" ? new Date(`${end.date}T23:59:59`) : null;
  const accept = (candidate: Date) =>
    candidate > after &&
    candidate >= start &&
    (until === null || candidate <= until);

  if (recurrence.freq === "DAILY") {
    const days = Math.max(
      0,
      Math.floor((after.getTime() - start.getTime()) / 86_400_000),
    );
    for (let k = Math.floor(days / recurrence.interval); k < 1000; k += 1) {
      const candidate = sameTime(
        start,
        new Date(start.getTime() + k * recurrence.interval * 86_400_000),
      );
      if (accept(candidate)) return candidate;
    }
    return null;
  }
  if (recurrence.freq === "WEEKLY") {
    const weekdays =
      recurrence.weekdays.length > 0
        ? recurrence.weekdays
        : [isoWeekday(start)];
    const anchor = new Date(start);
    anchor.setDate(anchor.getDate() - (isoWeekday(anchor) - 1)); // Monday of start week
    for (let week = 0; week < 520; week += recurrence.interval) {
      for (const weekday of [...weekdays].sort((a, b) => a - b)) {
        const candidate = sameTime(
          start,
          new Date(
            anchor.getFullYear(),
            anchor.getMonth(),
            anchor.getDate() + week * 7 + (weekday - 1),
          ),
        );
        if (accept(candidate)) return candidate;
        if (until !== null && candidate > until) return null;
      }
    }
    return null;
  }
  for (let months = 0; months < 240; months += recurrence.interval) {
    const year = start.getFullYear();
    const month = start.getMonth() + months;
    const candidateDay =
      recurrence.monthly.kind === "day"
        ? new Date(
            year,
            month,
            Math.min(
              recurrence.monthly.day,
              new Date(year, month + 1, 0).getDate(),
            ),
          )
        : nthWeekdayOfMonth(
            new Date(year, month, 1).getFullYear(),
            new Date(year, month, 1).getMonth(),
            recurrence.monthly.nth,
            recurrence.monthly.weekday,
          );
    if (candidateDay === null) continue;
    const candidate = sameTime(start, candidateDay);
    if (accept(candidate)) return candidate;
    if (until !== null && candidate > until) return null;
  }
  return null;
}

/** Parses the JSON the form submits; anything malformed means "no repeat". */
export function parseRecurrence(raw: unknown): Recurrence {
  if (typeof raw !== "string" || raw.trim() === "") return none;
  try {
    const value = JSON.parse(raw) as Partial<Recurrence> & { freq?: string };
    if (value.freq === "DAILY" && "interval" in value)
      return {
        freq: "DAILY",
        interval: clampInterval(value.interval),
        end: parseEnd(value.end),
      };
    if (value.freq === "WEEKLY" && "weekdays" in value)
      return {
        freq: "WEEKLY",
        interval: clampInterval(value.interval),
        weekdays: (value.weekdays as number[])
          .filter((d) => d >= 1 && d <= 7)
          .slice(0, 7),
        end: parseEnd(value.end),
      };
    if (value.freq === "MONTHLY" && "monthly" in value) {
      const monthly = value.monthly as {
        kind: string;
        day?: number;
        nth?: number;
        weekday?: number;
      };
      return {
        freq: "MONTHLY",
        interval: clampInterval(value.interval),
        monthly:
          monthly.kind === "nth"
            ? {
                kind: "nth",
                nth: ([1, 2, 3, 4, -1].includes(monthly.nth ?? 0)
                  ? monthly.nth
                  : 1) as 1 | 2 | 3 | 4 | -1,
                weekday: Math.min(7, Math.max(1, monthly.weekday ?? 1)),
              }
            : { kind: "day", day: Math.min(31, Math.max(1, monthly.day ?? 1)) },
        end: parseEnd(value.end),
      };
    }
  } catch {
    /* fall through */
  }
  return none;
}

function clampInterval(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.min(52, Math.max(1, Math.round(n))) : 1;
}

function parseEnd(value: unknown): RecurrenceEnd {
  const end = value as Partial<RecurrenceEnd> | undefined;
  if (
    end?.kind === "until" &&
    typeof (end as { date?: string }).date === "string"
  )
    return { kind: "until", date: (end as { date: string }).date.slice(0, 10) };
  if (end?.kind === "count")
    return {
      kind: "count",
      count: Math.min(
        365,
        Math.max(1, Math.round(Number((end as { count?: number }).count ?? 1))),
      ),
    };
  return { kind: "never" };
}
