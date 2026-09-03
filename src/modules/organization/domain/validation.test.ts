import { describe, expect, it } from "vitest";

import {
  createAssignmentSchema,
  createHierarchyRelationshipSchema,
  createOrganizationalUnitSchema,
} from "./validation";

describe("organization validation", () => {
  it("accepts configurable department and shared-service types", () => {
    expect(
      createOrganizationalUnitSchema.parse({
        companyId: "10000000-0000-0000-0000-000000000001",
        type: "SHARED_SERVICE",
        code: "HACCP",
        name: "HACCP",
      }),
    ).toMatchObject({ type: "SHARED_SERVICE" });
  });

  it("requires an assigned organizational unit unless scope is company-wide", () => {
    const result = createAssignmentSchema.safeParse({
      profileId: "21000000-0000-0000-0000-000000000001",
      companyId: "10000000-0000-0000-0000-000000000001",
      organizationalUnitId: null,
      roleId: "60000000-0000-0000-0000-000000000001",
      unitScopeMode: "ASSIGNED",
      restaurantScopeMode: "NONE",
      validFrom: "2026-09-03",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid temporal ranges and direct hierarchy self-cycles", () => {
    expect(
      createHierarchyRelationshipSchema.safeParse({
        parentAssignmentId: "70000000-0000-0000-0000-000000000001",
        childAssignmentId: "70000000-0000-0000-0000-000000000001",
        relationshipType: "REPORTS_TO",
        validFrom: "2026-09-03",
        validTo: "2026-09-02",
      }).success,
    ).toBe(false);
  });
});
