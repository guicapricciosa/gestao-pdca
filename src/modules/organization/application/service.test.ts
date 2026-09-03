import { describe, expect, it } from "vitest";

import type {
  CompanyId,
  OrganizationalAssignmentId,
  OrganizationalUnitId,
  ProfileId,
  RestaurantId,
} from "@/shared/types/branded";

import { OrganizationValidationError } from "./errors";
import type { OrganizationRepository } from "./repository";
import { OrganizationService } from "./service";
import type {
  OrganizationalAssignment,
  OrganizationalUnit,
  Restaurant,
} from "../domain/types";

const companyA = "10000000-0000-0000-0000-000000000001" as CompanyId;
const companyB = "10000000-0000-0000-0000-000000000002" as CompanyId;
const parentId =
  "70000000-0000-0000-0000-000000000001" as OrganizationalAssignmentId;
const childId =
  "70000000-0000-0000-0000-000000000002" as OrganizationalAssignmentId;

function assignment(
  id: OrganizationalAssignmentId,
  companyId: CompanyId,
): OrganizationalAssignment {
  return {
    id,
    profileId: "21000000-0000-0000-0000-000000000001" as ProfileId,
    companyId,
    organizationalUnitId:
      "30000000-0000-0000-0000-000000000001" as OrganizationalUnitId,
    roleId: "60000000-0000-0000-0000-000000000001",
    title: null,
    unitScopeMode: "ASSIGNED",
    restaurantScopeMode: "NONE",
    validFrom: "2026-01-01",
    validTo: null,
    isActive: true,
  };
}

function repository(
  overrides: Partial<OrganizationRepository>,
): OrganizationRepository {
  const notUsed = async (): Promise<never> => {
    throw new Error("Not used in this test");
  };
  return {
    createCompany: notUsed,
    createOrganizationalUnit: notUsed,
    createRestaurant: notUsed,
    createProfile: notUsed,
    createAssignment: notUsed,
    createHierarchyRelationship: notUsed,
    createRestaurantAssignment: notUsed,
    getAssignment: async () => null,
    hasHierarchyPath: async () => false,
    getRestaurant: async () => null,
    getOrganizationalUnit: async () => null,
    ...overrides,
  };
}

describe("OrganizationService", () => {
  it("rejects an organizational unit from another company", async () => {
    const unit: OrganizationalUnit = {
      id: "30000000-0000-0000-0000-000000000001" as OrganizationalUnitId,
      companyId: companyB,
      type: "DEPARTMENT",
      code: "IT",
      name: "IT",
      isActive: true,
    };
    const service = new OrganizationService(
      repository({ getOrganizationalUnit: async () => unit }),
    );
    await expect(
      service.createAssignment({
        profileId: "21000000-0000-0000-0000-000000000001",
        companyId: companyA,
        organizationalUnitId: unit.id,
        roleId: "60000000-0000-0000-0000-000000000001",
        unitScopeMode: "ASSIGNED",
        restaurantScopeMode: "NONE",
        validFrom: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(OrganizationValidationError);
  });

  it("rejects cross-company hierarchy relationships", async () => {
    const service = new OrganizationService(
      repository({
        getAssignment: async (id) =>
          id === parentId
            ? assignment(parentId, companyA)
            : assignment(childId, companyB),
      }),
    );
    await expect(
      service.createHierarchyRelationship({
        parentAssignmentId: parentId,
        childAssignmentId: childId,
        relationshipType: "REPORTS_TO",
        validFrom: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(OrganizationValidationError);
  });

  it("rejects an indirect hierarchy cycle", async () => {
    const service = new OrganizationService(
      repository({
        getAssignment: async (id) =>
          id === parentId
            ? assignment(parentId, companyA)
            : assignment(childId, companyA),
        hasHierarchyPath: async () => true,
      }),
    );
    await expect(
      service.createHierarchyRelationship({
        parentAssignmentId: parentId,
        childAssignmentId: childId,
        relationshipType: "REPORTS_TO",
        validFrom: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(OrganizationValidationError);
  });

  it("rejects restaurant assignments across companies", async () => {
    const targetRestaurant: Restaurant = {
      id: "40000000-0000-0000-0000-000000000001" as RestaurantId,
      companyId: companyB,
      code: "B",
      name: "Restaurant B",
      timezone: "Europe/Lisbon",
      isActive: true,
    };
    const service = new OrganizationService(
      repository({
        getAssignment: async () => assignment(parentId, companyA),
        getRestaurant: async () => targetRestaurant,
      }),
    );
    await expect(
      service.createRestaurantAssignment({
        organizationalAssignmentId: parentId,
        restaurantId: targetRestaurant.id,
        responsibilityType: "PRIMARY",
        validFrom: "2026-01-01",
      }),
    ).rejects.toBeInstanceOf(OrganizationValidationError);
  });
});
