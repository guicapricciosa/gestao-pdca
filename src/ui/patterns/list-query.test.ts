import { describe, expect, it } from "vitest";

import {
  activeFilterCount,
  listHref,
  listParam,
  parseListSearch,
  sortHref,
} from "./list-query";

describe("list query helpers", () => {
  it("reads repeated keys as multi-select values", () => {
    expect(
      listParam({ status: ["OPEN", "BLOCKED", "OPEN", ""] }, "status"),
    ).toEqual(["OPEN", "BLOCKED"]);
    expect(listParam({ status: "OPEN" }, "status")).toEqual(["OPEN"]);
    expect(listParam({}, "status")).toEqual([]);
  });

  it("parses filters, sort and page from the URL", () => {
    const parsed = parseListSearch({
      status: ["OPEN", "IN_PROGRESS"],
      restaurantId: "11111111-1111-4111-8111-111111111111",
      overdue: "true",
      sort: "due_date",
      dir: "desc",
      page: "3",
    });
    expect(parsed.status).toEqual(["OPEN", "IN_PROGRESS"]);
    expect(parsed.restaurantId).toEqual([
      "11111111-1111-4111-8111-111111111111",
    ]);
    expect(parsed.overdue).toBe(true);
    expect(parsed.sort).toBe("due_date");
    expect(parsed.direction).toBe("desc");
    expect(parsed.page).toBe(3);
    expect(parsed.priority).toBeUndefined();
  });

  it("ignores unknown sort keys and bad pages", () => {
    const parsed = parseListSearch({ sort: "drop table", page: "abc" });
    expect(parsed.sort).toBeUndefined();
    expect(parsed.direction).toBe("asc");
    expect(parsed.page).toBe(1);
  });

  it("keeps every filter when building links and resets the page", () => {
    const values = { status: ["OPEN", "BLOCKED"], page: "2", sort: "title" };
    expect(listHref("/pdcas", values, { open: "abc" })).toBe(
      "/pdcas?status=OPEN&status=BLOCKED&page=2&sort=title&open=abc",
    );
    expect(listHref("/pdcas", values, { status: ["OPEN"] })).toBe(
      "/pdcas?sort=title&status=OPEN",
    );
    expect(listHref("/pdcas", values, { status: null, sort: null })).toBe(
      "/pdcas",
    );
  });

  it("toggles sort direction on the same column", () => {
    expect(sortHref("/tasks", {}, "title")).toBe("/tasks?sort=title&dir=asc");
    expect(sortHref("/tasks", { sort: "title", dir: "asc" }, "title")).toBe(
      "/tasks?sort=title&dir=desc",
    );
    expect(sortHref("/tasks", {}, "updated_at")).toBe(
      "/tasks?sort=updated_at&dir=desc",
    );
  });

  it("counts active filters per selected value", () => {
    expect(
      activeFilterCount({ status: ["OPEN", "BLOCKED"], query: "x", page: "2" }),
    ).toBe(3);
  });
});
