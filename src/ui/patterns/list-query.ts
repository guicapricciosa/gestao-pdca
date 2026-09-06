import {
  listSortKeys,
  type ListSortKey,
  type SortDirection,
} from "@/modules/execution/domain/types";

/** Raw Next.js search params: a key may repeat (`status=A&status=B`). */
export type SearchValues = Readonly<
  Record<string, string | string[] | undefined>
>;

const multiKeys = [
  "status",
  "priority",
  "ownerId",
  "responsibleId",
  "restaurantId",
  "unitId",
] as const;
export type MultiKey = (typeof multiKeys)[number];

/** All non-empty values for a key, in URL order, without duplicates. */
export function listParam(values: SearchValues, key: string): string[] {
  const raw = values[key];
  const list = typeof raw === "string" ? [raw] : (raw ?? []);
  return [...new Set(list.filter((value) => value !== ""))];
}

export function singleParam(values: SearchValues, key: string): string {
  return listParam(values, key)[0] ?? "";
}

export function sortOf(values: SearchValues): {
  readonly sort: ListSortKey | undefined;
  readonly direction: SortDirection;
} {
  const sort = singleParam(values, "sort");
  const direction = singleParam(values, "dir") === "desc" ? "desc" : "asc";
  return {
    sort: (listSortKeys as readonly string[]).includes(sort)
      ? (sort as ListSortKey)
      : undefined,
    direction,
  };
}

/**
 * Filters for the execution lists straight from the URL. Unknown values are
 * passed through: the domain schema rejects them with a clear error.
 */
export function parseListSearch(values: SearchValues) {
  const many = (key: MultiKey) => {
    const list = listParam(values, key);
    return list.length > 0 ? list : undefined;
  };
  const query = singleParam(values, "query");
  const page = Number(singleParam(values, "page") || "1");
  return {
    query: query === "" ? undefined : query,
    status: many("status"),
    priority: many("priority"),
    ownerId: many("ownerId"),
    responsibleId: many("responsibleId"),
    restaurantId: many("restaurantId"),
    unitId: many("unitId"),
    overdue: singleParam(values, "overdue") === "true",
    unassigned: singleParam(values, "unassigned") === "true",
    ...sortOf(values),
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Keys that describe the list itself (not navigation state). */
const filterKeys = new Set<string>([
  ...multiKeys,
  "query",
  "overdue",
  "unassigned",
  "sort",
  "dir",
]);

export function activeFilterCount(values: SearchValues) {
  return [...multiKeys, "query", "overdue", "unassigned"].reduce(
    (total, key) => total + listParam(values, key).length,
    0,
  );
}

/**
 * Builds a list URL that keeps every filter and sort, applying overrides.
 * An override set to `null` removes the key; an array replaces all values.
 * Changing anything but `page`/`open` resets pagination to the first page.
 */
export function listHref(
  basePath: string,
  values: SearchValues,
  overrides: Readonly<Record<string, string | readonly string[] | null>> = {},
) {
  const params = new URLSearchParams();
  const keep = new Set([...filterKeys, "page", "open"]);
  for (const key of Object.keys(values))
    if (keep.has(key) && !(key in overrides))
      for (const value of listParam(values, key)) params.append(key, value);
  const resetsPage = Object.keys(overrides).some(
    (key) => key !== "page" && key !== "open",
  );
  if (resetsPage) params.delete("page");
  for (const [key, override] of Object.entries(overrides)) {
    if (override === null) continue;
    for (const value of typeof override === "string" ? [override] : override)
      if (value !== "") params.append(key, value);
  }
  const search = params.toString();
  return search === "" ? basePath : `${basePath}?${search}`;
}

/** Header link: first click sorts ascending, second flips, dates start desc. */
export function sortHref(
  basePath: string,
  values: SearchValues,
  key: ListSortKey,
) {
  const current = sortOf(values);
  const startsDescending = key === "updated_at" || key === "decision_date";
  const next: SortDirection =
    current.sort === key
      ? current.direction === "asc"
        ? "desc"
        : "asc"
      : startsDescending
        ? "desc"
        : "asc";
  return listHref(basePath, values, { sort: key, dir: next });
}
