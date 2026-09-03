import { beforeEach, describe, expect, it } from "vitest";

import type {
  CompanyId,
  OrganizationalAssignmentId,
  OrganizationalUnitId,
  ProfileId,
  RestaurantId,
  SecurityObjectId,
} from "@/shared/types/branded";

import { PermissionEngine } from "./engine";
import { InMemoryAuthorizationRepository } from "./repository";
import type {
  AuthorizationAssignment,
  AuthorizationHierarchyEdge,
  AuthorizationProfile,
  AuthorizationRestaurantAssignment,
  AuthorizationSnapshot,
  ExplicitAccessGrant,
  PermissionKey,
  SecurableObject,
} from "../domain/types";

const now = new Date("2026-09-03T10:00:00.000Z");
const activeFrom = new Date("2026-01-01T00:00:00.000Z");
const company = "10000000-0000-0000-0000-000000000001" as CompanyId;
const otherCompany = "10000000-0000-0000-0000-000000000002" as CompanyId;

const units = {
  it: "30000000-0000-0000-0000-000000000003" as OrganizationalUnitId,
  marketing: "30000000-0000-0000-0000-000000000004" as OrganizationalUnitId,
  happyPeople: "30000000-0000-0000-0000-000000000005" as OrganizationalUnitId,
  dol: "30000000-0000-0000-0000-000000000007" as OrganizationalUnitId,
  haccp: "30000000-0000-0000-0000-000000000011" as OrganizationalUnitId,
};

const restaurants = {
  a: "40000000-0000-0000-0000-000000000001" as RestaurantId,
  b: "40000000-0000-0000-0000-000000000002" as RestaurantId,
  c: "40000000-0000-0000-0000-000000000003" as RestaurantId,
  other: "40000000-0000-0000-0000-000000000099" as RestaurantId,
};

const profiles = {
  ceo: "21000000-0000-0000-0000-000000000001" as ProfileId,
  globalManagement: "21000000-0000-0000-0000-000000000002" as ProfileId,
  support: "21000000-0000-0000-0000-000000000003" as ProfileId,
  dolDirector: "21000000-0000-0000-0000-000000000007" as ProfileId,
  subdirector: "21000000-0000-0000-0000-000000000008" as ProfileId,
  supervisorA: "21000000-0000-0000-0000-000000000015" as ProfileId,
  supervisorB: "21000000-0000-0000-0000-000000000016" as ProfileId,
  managerA: "21000000-0000-0000-0000-000000000017" as ProfileId,
  managerB: "21000000-0000-0000-0000-000000000018" as ProfileId,
  kitchenSupervisor: "21000000-0000-0000-0000-000000000019" as ProfileId,
  kitchenManager: "21000000-0000-0000-0000-000000000020" as ProfileId,
  sharedService: "21000000-0000-0000-0000-000000000011" as ProfileId,
  inactive: "21000000-0000-0000-0000-000000000090" as ProfileId,
  expired: "21000000-0000-0000-0000-000000000091" as ProfileId,
  splitPath: "21000000-0000-0000-0000-000000000092" as ProfileId,
};

const assignments = {
  ceo: "70000000-0000-0000-0000-000000000001" as OrganizationalAssignmentId,
  globalManagement:
    "70000000-0000-0000-0000-000000000002" as OrganizationalAssignmentId,
  support: "70000000-0000-0000-0000-000000000003" as OrganizationalAssignmentId,
  dolDirector:
    "70000000-0000-0000-0000-000000000007" as OrganizationalAssignmentId,
  subdirector:
    "70000000-0000-0000-0000-000000000008" as OrganizationalAssignmentId,
  supervisorA:
    "70000000-0000-0000-0000-000000000015" as OrganizationalAssignmentId,
  supervisorB:
    "70000000-0000-0000-0000-000000000016" as OrganizationalAssignmentId,
  managerA:
    "70000000-0000-0000-0000-000000000017" as OrganizationalAssignmentId,
  managerB:
    "70000000-0000-0000-0000-000000000018" as OrganizationalAssignmentId,
  kitchenSupervisor:
    "70000000-0000-0000-0000-000000000019" as OrganizationalAssignmentId,
  kitchenManager:
    "70000000-0000-0000-0000-000000000020" as OrganizationalAssignmentId,
  sharedService:
    "70000000-0000-0000-0000-000000000011" as OrganizationalAssignmentId,
  inactive:
    "70000000-0000-0000-0000-000000000090" as OrganizationalAssignmentId,
  expired: "70000000-0000-0000-0000-000000000091" as OrganizationalAssignmentId,
  splitRead:
    "70000000-0000-0000-0000-000000000092" as OrganizationalAssignmentId,
  splitScope:
    "70000000-0000-0000-0000-000000000093" as OrganizationalAssignmentId,
};

const read: PermissionKey = "work_item.read";
const update: PermissionKey = "work_item.update";
const scopeUpdate: PermissionKey = "work_item.scope.update";
const grantManage: PermissionKey = "security.grant.manage";
const restrictedRead: PermissionKey = "security.restricted.read";

function profile(id: ProfileId, active = true): AuthorizationProfile {
  return { id, active };
}

function assignment(
  id: OrganizationalAssignmentId,
  profileId: ProfileId,
  options: Partial<AuthorizationAssignment> &
    Pick<AuthorizationAssignment, "organizationalUnitId">,
): AuthorizationAssignment {
  return {
    id,
    profileId,
    companyId: company,
    organizationalUnitId: options.organizationalUnitId,
    unitScopeMode: options.unitScopeMode ?? "ASSIGNED",
    restaurantScopeMode: options.restaurantScopeMode ?? "ASSIGNED",
    permissionKeys: options.permissionKeys ?? new Set([read, update]),
    active: options.active ?? true,
    validFrom: options.validFrom ?? activeFrom,
    validTo: options.validTo ?? null,
  };
}

function edge(
  parentAssignmentId: OrganizationalAssignmentId,
  childAssignmentId: OrganizationalAssignmentId,
): AuthorizationHierarchyEdge {
  return {
    parentAssignmentId,
    childAssignmentId,
    active: true,
    validFrom: activeFrom,
    validTo: null,
  };
}

function restaurantAssignment(
  assignmentId: OrganizationalAssignmentId,
  restaurantId: RestaurantId,
): AuthorizationRestaurantAssignment {
  return {
    assignmentId,
    restaurantId,
    active: true,
    validFrom: activeFrom,
    validTo: null,
  };
}

function object(
  suffix: string,
  organizationalUnitIds: readonly OrganizationalUnitId[],
  restaurantIds: readonly RestaurantId[],
  options: Partial<
    Pick<SecurableObject, "visibility" | "creatorProfileId" | "companyId">
  > = {},
): SecurableObject {
  return {
    id: `a0000000-0000-0000-0000-${suffix.padStart(12, "0")}` as SecurityObjectId,
    companyId: options.companyId ?? company,
    creatorProfileId: options.creatorProfileId ?? profiles.ceo,
    visibility: options.visibility ?? "NORMAL",
    organizationalUnitIds: new Set(organizationalUnitIds),
    restaurantIds: new Set(restaurantIds),
    archived: false,
  };
}

function baseSnapshot(
  grants: readonly ExplicitAccessGrant[] = [],
): AuthorizationSnapshot {
  return {
    profiles: Object.values(profiles).map((id) =>
      profile(id, id !== profiles.inactive),
    ),
    permissions: [
      { key: read, scopeRequirement: "INTERSECT", delegable: true },
      { key: update, scopeRequirement: "INTERSECT", delegable: true },
      { key: scopeUpdate, scopeRequirement: "COVER_ALL", delegable: true },
      { key: grantManage, scopeRequirement: "COVER_ALL", delegable: false },
      { key: restrictedRead, scopeRequirement: "INTERSECT", delegable: false },
    ],
    assignments: [
      assignment(assignments.ceo, profiles.ceo, {
        organizationalUnitId: null,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "COMPANY_WIDE",
        permissionKeys: new Set([
          read,
          update,
          scopeUpdate,
          grantManage,
          restrictedRead,
        ]),
      }),
      assignment(assignments.globalManagement, profiles.globalManagement, {
        organizationalUnitId: null,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "COMPANY_WIDE",
        permissionKeys: new Set([
          read,
          update,
          scopeUpdate,
          grantManage,
          restrictedRead,
        ]),
      }),
      assignment(assignments.support, profiles.support, {
        organizationalUnitId: units.it,
        restaurantScopeMode: "COMPANY_WIDE",
        permissionKeys: new Set([read, update, scopeUpdate]),
      }),
      assignment(assignments.dolDirector, profiles.dolDirector, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "INHERITED",
      }),
      assignment(assignments.subdirector, profiles.subdirector, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "INHERITED",
      }),
      assignment(assignments.supervisorA, profiles.supervisorA, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "INHERITED",
      }),
      assignment(assignments.supervisorB, profiles.supervisorB, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
      }),
      assignment(assignments.managerA, profiles.managerA, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
        permissionKeys: new Set([read, update, scopeUpdate]),
      }),
      assignment(assignments.managerB, profiles.managerB, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
      }),
      assignment(assignments.kitchenSupervisor, profiles.kitchenSupervisor, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "INHERITED",
      }),
      assignment(assignments.kitchenManager, profiles.kitchenManager, {
        organizationalUnitId: units.dol,
        unitScopeMode: "COMPANY_WIDE",
      }),
      assignment(assignments.sharedService, profiles.sharedService, {
        organizationalUnitId: units.haccp,
        restaurantScopeMode: "COMPANY_WIDE",
      }),
      assignment(assignments.inactive, profiles.inactive, {
        organizationalUnitId: units.it,
        restaurantScopeMode: "COMPANY_WIDE",
      }),
      assignment(assignments.expired, profiles.expired, {
        organizationalUnitId: units.it,
        restaurantScopeMode: "COMPANY_WIDE",
        validTo: new Date("2026-08-01T00:00:00.000Z"),
      }),
      assignment(assignments.splitRead, profiles.splitPath, {
        organizationalUnitId: units.it,
        restaurantScopeMode: "NONE",
        permissionKeys: new Set([read]),
      }),
      assignment(assignments.splitScope, profiles.splitPath, {
        organizationalUnitId: null,
        unitScopeMode: "COMPANY_WIDE",
        restaurantScopeMode: "COMPANY_WIDE",
        permissionKeys: new Set([update]),
      }),
    ],
    hierarchyEdges: [
      edge(assignments.dolDirector, assignments.subdirector),
      edge(assignments.dolDirector, assignments.kitchenSupervisor),
      edge(assignments.subdirector, assignments.supervisorA),
      edge(assignments.subdirector, assignments.supervisorB),
      edge(assignments.supervisorA, assignments.managerA),
      edge(assignments.supervisorA, assignments.managerB),
      edge(assignments.kitchenSupervisor, assignments.kitchenManager),
    ],
    restaurants: [
      { id: restaurants.a, companyId: company, active: true },
      { id: restaurants.b, companyId: company, active: true },
      { id: restaurants.c, companyId: company, active: true },
      { id: restaurants.other, companyId: otherCompany, active: true },
    ],
    restaurantAssignments: [
      restaurantAssignment(assignments.supervisorA, restaurants.a),
      restaurantAssignment(assignments.supervisorB, restaurants.b),
      restaurantAssignment(assignments.managerA, restaurants.a),
      restaurantAssignment(assignments.managerB, restaurants.b),
      restaurantAssignment(assignments.kitchenSupervisor, restaurants.c),
      restaurantAssignment(assignments.kitchenManager, restaurants.c),
    ],
    grants,
  };
}

function engine(grants: readonly ExplicitAccessGrant[] = []) {
  return new PermissionEngine(
    new InMemoryAuthorizationRepository(baseSnapshot(grants)),
    { now: () => now },
  );
}

describe("PermissionEngine", () => {
  let normalItA: SecurableObject;
  let normalMarketingA: SecurableObject;

  beforeEach(() => {
    normalItA = object("1", [units.it], [restaurants.a]);
    normalMarketingA = object("2", [units.marketing], [restaurants.a]);
  });

  it("allows CEO and global management across departments and restaurants", async () => {
    await expect(
      engine().can(profiles.ceo, read, normalMarketingA),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.globalManagement, read, normalItA),
    ).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("gives a support department transversal restaurant scope but not another department", async () => {
    const itAtB = object("3", [units.it], [restaurants.b]);
    await expect(
      engine().can(profiles.support, read, itAtB),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.support, read, normalMarketingA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("resolves DOL Director and subdirector restaurant inheritance", async () => {
    const operationsB = object("4", [units.marketing], [restaurants.b]);
    const operationsC = object("5", [units.it], [restaurants.c]);
    await expect(
      engine().can(profiles.dolDirector, read, operationsB),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.dolDirector, read, operationsC),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.subdirector, read, operationsB),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.subdirector, read, operationsC),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("limits supervisors and restaurant managers to their restaurant branches", async () => {
    const operationsB = object("6", [units.happyPeople], [restaurants.b]);
    await expect(
      engine().can(profiles.supervisorA, read, operationsB),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.supervisorB, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
    await expect(
      engine().can(profiles.managerA, read, normalMarketingA),
    ).resolves.toMatchObject({
      allowed: true,
    });
    await expect(
      engine().can(profiles.managerB, read, normalMarketingA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("supports the parallel kitchen hierarchy without global restaurant access", async () => {
    const kitchenC = object("7", [units.haccp], [restaurants.c]);
    await expect(
      engine().can(profiles.kitchenSupervisor, read, kitchenC),
    ).resolves.toMatchObject({
      allowed: true,
    });
    await expect(
      engine().can(profiles.kitchenManager, read, kitchenC),
    ).resolves.toMatchObject({
      allowed: true,
    });
    await expect(
      engine().can(profiles.kitchenManager, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("gives a shared service its own domain across covered restaurants only", async () => {
    const haccpB = object("8", [units.haccp], [restaurants.b]);
    await expect(
      engine().can(profiles.sharedService, read, haccpB),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.sharedService, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("applies NORMAL, RESTRICTED and PRIVATE visibility independently", async () => {
    const restricted = { ...normalItA, visibility: "RESTRICTED" as const };
    const privateObject = {
      ...normalItA,
      visibility: "PRIVATE" as const,
      creatorProfileId: profiles.support,
    };
    await expect(
      engine().can(profiles.support, read, normalItA),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.support, read, restricted),
    ).resolves.toEqual({
      allowed: false,
      reason: "RESTRICTED_OBJECT",
    });
    await expect(
      engine().can(profiles.ceo, read, restricted),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.ceo, read, privateObject),
    ).resolves.toEqual({
      allowed: false,
      reason: "PRIVATE_OBJECT",
    });
    await expect(
      engine().can(profiles.support, read, privateObject),
    ).resolves.toEqual({
      allowed: true,
      source: "PRIVATE_CREATOR",
    });
  });

  it("allows an exact explicit grant without making relationships implicit", async () => {
    const grant: ExplicitAccessGrant = {
      objectId: normalMarketingA.id,
      granteeProfileId: profiles.support,
      permissionKey: read,
      grantedByProfileId: profiles.ceo,
      validFrom: activeFrom,
      validTo: null,
      revokedAt: null,
    };
    await expect(
      engine([grant]).can(profiles.support, read, normalMarketingA),
    ).resolves.toEqual({
      allowed: true,
      source: "EXPLICIT_GRANT",
    });
    await expect(
      engine([grant]).can(profiles.support, update, normalMarketingA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("ignores expired and revoked explicit grants", async () => {
    const expiredGrant: ExplicitAccessGrant = {
      objectId: normalMarketingA.id,
      granteeProfileId: profiles.support,
      permissionKey: read,
      grantedByProfileId: profiles.ceo,
      validFrom: activeFrom,
      validTo: new Date("2026-08-01T00:00:00.000Z"),
      revokedAt: null,
    };
    await expect(
      engine([expiredGrant]).can(profiles.support, read, normalMarketingA),
    ).resolves.toMatchObject({
      allowed: false,
    });
  });

  it("requires full coverage for multi-restaurant scope changes", async () => {
    const multiRestaurant = object(
      "9",
      [units.marketing],
      [restaurants.a, restaurants.b],
    );
    await expect(
      engine().can(profiles.managerA, read, multiRestaurant),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.managerA, scopeUpdate, multiRestaurant),
    ).resolves.toMatchObject({
      allowed: false,
    });
    await expect(
      engine().can(profiles.ceo, scopeUpdate, multiRestaurant),
    ).resolves.toMatchObject({
      allowed: true,
    });
  });

  it("uses intersection for reads and full coverage for multi-department scope changes", async () => {
    const multiDepartment = object(
      "10",
      [units.it, units.marketing],
      [restaurants.a],
    );
    await expect(
      engine().can(profiles.support, read, multiDepartment),
    ).resolves.toMatchObject({ allowed: true });
    await expect(
      engine().can(profiles.support, scopeUpdate, multiDepartment),
    ).resolves.toMatchObject({
      allowed: false,
    });
  });

  it("denies inactive profiles and expired assignments", async () => {
    await expect(
      engine().can(profiles.inactive, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "INACTIVE_PROFILE",
    });
    await expect(
      engine().can(profiles.expired, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("does not combine permission and scope from unrelated assignment paths", async () => {
    await expect(
      engine().can(profiles.splitPath, read, normalItA),
    ).resolves.toEqual({
      allowed: false,
      reason: "NO_PERMISSION_PATH",
    });
  });

  it("allows grants only when one path can delegate the permission over the full object scope", async () => {
    await expect(
      engine().canIssueGrant(profiles.ceo, read, normalMarketingA),
    ).resolves.toBe(true);
    await expect(
      engine().canIssueGrant(profiles.support, read, normalItA),
    ).resolves.toBe(false);
    await expect(
      engine().canIssueGrant(profiles.ceo, restrictedRead, normalItA),
    ).resolves.toBe(false);
  });

  it("filters query results before they reach search foundations", async () => {
    const results = await engine().filterAccessibleObjects(
      profiles.managerA,
      read,
      [normalItA, object("11", [units.it], [restaurants.b])],
    );
    expect(results.map((result) => result.id)).toEqual([normalItA.id]);
  });

  it("builds AI authorization context from the same filtered population", async () => {
    const contextIds = await engine().buildAuthorizedContextIds(
      profiles.support,
      read,
      [normalItA, normalMarketingA],
    );
    expect(contextIds).toEqual([normalItA.id]);
  });
});
