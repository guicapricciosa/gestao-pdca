import { describe, expect, it } from "vitest";

import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    expect(safeNextPath("/meetings/abc/run")).toBe("/meetings/abc/run");
    expect(safeNextPath("/tasks?status=OPEN")).toBe("/tasks?status=OPEN");
  });
  it("falls back for absolute, protocol-relative, login or empty targets", () => {
    expect(safeNextPath("https://example.com")).toBe("/my-work");
    expect(safeNextPath("//example.com")).toBe("/my-work");
    expect(safeNextPath("/login?next=/x")).toBe("/my-work");
    expect(safeNextPath(null)).toBe("/my-work");
    expect(safeNextPath("/\\\\evil")).toBe("/my-work");
  });
});
