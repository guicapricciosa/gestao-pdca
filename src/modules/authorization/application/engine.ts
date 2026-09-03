import type { Clock } from "@/shared/time/clock";
import { systemClock } from "@/shared/time/clock";
import type { ProfileId, RestaurantId } from "@/shared/types/branded";

import type {
  AccessDecision,
  AccessPath,
  AuthorizationAssignment,
  AuthorizationSnapshot,
  EffectiveScope,
  PermissionKey,
  SecurableObject,
} from "../domain/types";
import type { AuthorizationRepository } from "./repository";

const RESTRICTED_READ_PERMISSION: PermissionKey = "security.restricted.read";
const GRANT_MANAGE_PERMISSION: PermissionKey = "security.grant.manage";

function isCurrent(
  value: {
    readonly active: boolean;
    readonly validFrom: Date;
    readonly validTo: Date | null;
  },
  now: Date,
) {
  return (
    value.active &&
    value.validFrom <= now &&
    (value.validTo === null || value.validTo >= now)
  );
}

function intersects<T>(left: ReadonlySet<T>, right: ReadonlySet<T>) {
  for (const value of left) if (right.has(value)) return true;
  return false;
}

function covers<T>(available: ReadonlySet<T>, required: ReadonlySet<T>) {
  for (const value of required) if (!available.has(value)) return false;
  return true;
}

function descendantsOf(
  root: AuthorizationAssignment,
  snapshot: AuthorizationSnapshot,
  now: Date,
) {
  const visited = new Set<string>([root.id]);
  const queue: string[] = [root.id];

  while (queue.length > 0) {
    const parentId = queue.shift();
    if (parentId === undefined) break;
    for (const edge of snapshot.hierarchyEdges) {
      if (edge.parentAssignmentId !== parentId || !isCurrent(edge, now))
        continue;
      if (visited.has(edge.childAssignmentId)) continue;
      const child = snapshot.assignments.find(
        (candidate) => candidate.id === edge.childAssignmentId,
      );
      if (
        child === undefined ||
        child.companyId !== root.companyId ||
        !isCurrent(child, now)
      )
        continue;
      visited.add(child.id);
      queue.push(child.id);
    }
  }
  return visited;
}

function restaurantsForAssignment(
  assignment: AuthorizationAssignment,
  snapshot: AuthorizationSnapshot,
  now: Date,
) {
  if (assignment.restaurantScopeMode === "COMPANY_WIDE") {
    return new Set(
      snapshot.restaurants
        .filter(
          (restaurant) =>
            restaurant.companyId === assignment.companyId && restaurant.active,
        )
        .map((restaurant) => restaurant.id),
    );
  }
  if (assignment.restaurantScopeMode === "NONE") return new Set<RestaurantId>();

  const assignmentIds =
    assignment.restaurantScopeMode === "INHERITED"
      ? descendantsOf(assignment, snapshot, now)
      : new Set<string>([assignment.id]);
  return new Set(
    snapshot.restaurantAssignments
      .filter(
        (restaurantAssignment) =>
          assignmentIds.has(restaurantAssignment.assignmentId) &&
          isCurrent(restaurantAssignment, now) &&
          snapshot.restaurants.some(
            (restaurant) =>
              restaurant.id === restaurantAssignment.restaurantId &&
              restaurant.companyId === assignment.companyId &&
              restaurant.active,
          ),
      )
      .map((restaurantAssignment) => restaurantAssignment.restaurantId),
  );
}

function pathCoversObject(
  path: AccessPath,
  object: SecurableObject,
  fullCoverage: boolean,
) {
  if (path.companyId !== object.companyId) return false;

  const unitCompatible =
    object.organizationalUnitIds.size === 0
      ? path.allOrganizationalUnits
      : path.allOrganizationalUnits ||
        (fullCoverage
          ? covers(path.organizationalUnitIds, object.organizationalUnitIds)
          : intersects(
              path.organizationalUnitIds,
              object.organizationalUnitIds,
            ));
  if (!unitCompatible) return false;

  if (object.restaurantIds.size === 0) return true;
  if (path.allRestaurants) return true;
  return fullCoverage
    ? covers(path.restaurantIds, object.restaurantIds)
    : intersects(path.restaurantIds, object.restaurantIds);
}

export class PermissionEngine {
  constructor(
    private readonly repository: AuthorizationRepository,
    private readonly clock: Clock = systemClock,
  ) {}

  async getAccessibleScope(profileId: ProfileId): Promise<EffectiveScope> {
    const snapshot = await this.repository.loadSnapshot();
    const now = this.clock.now();
    const profile = snapshot.profiles.find(
      (candidate) => candidate.id === profileId,
    );
    if (profile === undefined || !profile.active)
      return { profileId, paths: [] };

    const paths: AccessPath[] = snapshot.assignments
      .filter(
        (assignment) =>
          assignment.profileId === profileId && isCurrent(assignment, now),
      )
      .map((assignment) => ({
        assignmentId: assignment.id,
        companyId: assignment.companyId,
        organizationalUnitIds:
          assignment.organizationalUnitId === null
            ? new Set()
            : new Set([assignment.organizationalUnitId]),
        allOrganizationalUnits: assignment.unitScopeMode === "COMPANY_WIDE",
        restaurantIds: restaurantsForAssignment(assignment, snapshot, now),
        allRestaurants: assignment.restaurantScopeMode === "COMPANY_WIDE",
        permissionKeys: assignment.permissionKeys,
      }));

    return { profileId, paths };
  }

  async can(
    profileId: ProfileId,
    permissionKey: PermissionKey,
    object: SecurableObject,
  ): Promise<AccessDecision> {
    const snapshot = await this.repository.loadSnapshot();
    const now = this.clock.now();
    const profile = snapshot.profiles.find(
      (candidate) => candidate.id === profileId,
    );
    if (profile === undefined || !profile.active) {
      return { allowed: false, reason: "INACTIVE_PROFILE" };
    }
    if (object.archived) return { allowed: false, reason: "ARCHIVED_OBJECT" };

    const grant = snapshot.grants.find(
      (candidate) =>
        candidate.objectId === object.id &&
        candidate.granteeProfileId === profileId &&
        candidate.permissionKey === permissionKey &&
        candidate.revokedAt === null &&
        candidate.validFrom <= now &&
        (candidate.validTo === null || candidate.validTo > now),
    );
    if (grant !== undefined) return { allowed: true, source: "EXPLICIT_GRANT" };

    if (
      object.visibility === "PRIVATE" &&
      object.creatorProfileId === profileId &&
      permissionKey.endsWith(".read")
    ) {
      return { allowed: true, source: "PRIVATE_CREATOR" };
    }
    if (object.visibility === "PRIVATE")
      return { allowed: false, reason: "PRIVATE_OBJECT" };

    const scope = await this.getAccessibleScope(profileId);
    const permission = snapshot.permissions.find(
      (candidate) => candidate.key === permissionKey,
    );
    const fullCoverage = permission?.scopeRequirement === "COVER_ALL";
    const matchingPath = scope.paths.find(
      (path) =>
        path.permissionKeys.has(permissionKey) &&
        pathCoversObject(path, object, fullCoverage) &&
        (object.visibility === "NORMAL" ||
          path.permissionKeys.has(RESTRICTED_READ_PERMISSION)),
    );
    if (matchingPath !== undefined) return { allowed: true, source: "SCOPE" };

    return {
      allowed: false,
      reason:
        object.visibility === "RESTRICTED"
          ? "RESTRICTED_OBJECT"
          : "NO_PERMISSION_PATH",
    };
  }

  async canIssueGrant(
    profileId: ProfileId,
    grantedPermission: PermissionKey,
    object: SecurableObject,
  ) {
    const snapshot = await this.repository.loadSnapshot();
    const permission = snapshot.permissions.find(
      (candidate) => candidate.key === grantedPermission,
    );
    if (permission === undefined || !permission.delegable) return false;
    const scope = await this.getAccessibleScope(profileId);
    return scope.paths.some(
      (path) =>
        path.permissionKeys.has(GRANT_MANAGE_PERMISSION) &&
        path.permissionKeys.has(grantedPermission) &&
        pathCoversObject(path, object, true),
    );
  }

  async filterAccessibleObjects<T extends SecurableObject>(
    profileId: ProfileId,
    permissionKey: PermissionKey,
    objects: readonly T[],
  ): Promise<T[]> {
    const decisions = await Promise.all(
      objects.map(async (object) => ({
        object,
        decision: await this.can(profileId, permissionKey, object),
      })),
    );
    return decisions
      .filter(({ decision }) => decision.allowed)
      .map(({ object }) => object);
  }

  async buildAuthorizedContextIds(
    profileId: ProfileId,
    permissionKey: PermissionKey,
    objects: readonly SecurableObject[],
  ) {
    const authorizedObjects = await this.filterAccessibleObjects(
      profileId,
      permissionKey,
      objects,
    );
    return authorizedObjects.map((object) => object.id);
  }
}
