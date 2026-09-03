import type {
  CompanyId,
  OrganizationalAssignmentId,
  OrganizationalUnitId,
  ProfileId,
  RestaurantId,
  SecurityObjectId,
} from "@/shared/types/branded";

export type PermissionKey = `${string}.${string}`;
export type VisibilityMode = "NORMAL" | "RESTRICTED" | "PRIVATE";
export type ScopeRequirement = "INTERSECT" | "COVER_ALL";

export interface PermissionDefinition {
  readonly key: PermissionKey;
  readonly scopeRequirement: ScopeRequirement;
  readonly delegable: boolean;
}

export interface AuthorizationProfile {
  readonly id: ProfileId;
  readonly active: boolean;
}

export interface AuthorizationAssignment {
  readonly id: OrganizationalAssignmentId;
  readonly profileId: ProfileId;
  readonly companyId: CompanyId;
  readonly organizationalUnitId: OrganizationalUnitId | null;
  readonly unitScopeMode: "ASSIGNED" | "COMPANY_WIDE";
  readonly restaurantScopeMode:
    "NONE" | "ASSIGNED" | "INHERITED" | "COMPANY_WIDE";
  readonly permissionKeys: ReadonlySet<PermissionKey>;
  readonly active: boolean;
  readonly validFrom: Date;
  readonly validTo: Date | null;
}

export interface AuthorizationHierarchyEdge {
  readonly parentAssignmentId: OrganizationalAssignmentId;
  readonly childAssignmentId: OrganizationalAssignmentId;
  readonly active: boolean;
  readonly validFrom: Date;
  readonly validTo: Date | null;
}

export interface AuthorizationRestaurantAssignment {
  readonly assignmentId: OrganizationalAssignmentId;
  readonly restaurantId: RestaurantId;
  readonly active: boolean;
  readonly validFrom: Date;
  readonly validTo: Date | null;
}

export interface AuthorizationRestaurant {
  readonly id: RestaurantId;
  readonly companyId: CompanyId;
  readonly active: boolean;
}

export interface ExplicitAccessGrant {
  readonly objectId: SecurityObjectId;
  readonly granteeProfileId: ProfileId;
  readonly permissionKey: PermissionKey;
  readonly grantedByProfileId: ProfileId;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly revokedAt: Date | null;
}

export interface SecurableObject {
  readonly id: SecurityObjectId;
  readonly companyId: CompanyId;
  readonly creatorProfileId: ProfileId;
  readonly visibility: VisibilityMode;
  readonly organizationalUnitIds: ReadonlySet<OrganizationalUnitId>;
  readonly restaurantIds: ReadonlySet<RestaurantId>;
  readonly archived: boolean;
}

export interface AuthorizationSnapshot {
  readonly profiles: readonly AuthorizationProfile[];
  readonly assignments: readonly AuthorizationAssignment[];
  readonly hierarchyEdges: readonly AuthorizationHierarchyEdge[];
  readonly restaurantAssignments: readonly AuthorizationRestaurantAssignment[];
  readonly restaurants: readonly AuthorizationRestaurant[];
  readonly permissions: readonly PermissionDefinition[];
  readonly grants: readonly ExplicitAccessGrant[];
}

export interface AccessPath {
  readonly assignmentId: OrganizationalAssignmentId;
  readonly companyId: CompanyId;
  readonly organizationalUnitIds: ReadonlySet<OrganizationalUnitId>;
  readonly allOrganizationalUnits: boolean;
  readonly restaurantIds: ReadonlySet<RestaurantId>;
  readonly allRestaurants: boolean;
  readonly permissionKeys: ReadonlySet<PermissionKey>;
}

export interface EffectiveScope {
  readonly profileId: ProfileId;
  readonly paths: readonly AccessPath[];
}

export type AccessDecision =
  | {
      readonly allowed: true;
      readonly source: "EXPLICIT_GRANT" | "PRIVATE_CREATOR" | "SCOPE";
    }
  | {
      readonly allowed: false;
      readonly reason:
        | "INACTIVE_PROFILE"
        | "ARCHIVED_OBJECT"
        | "PRIVATE_OBJECT"
        | "RESTRICTED_OBJECT"
        | "NO_PERMISSION_PATH";
    };
