import type {
  CompanyId,
  OrganizationalAssignmentId,
  OrganizationalUnitId,
  ProfileId,
  RestaurantId,
} from "@/shared/types/branded";

export type IsoDate = string;
export type IsoDateTime = string;

export interface TemporalState {
  readonly validFrom: IsoDate;
  readonly validTo: IsoDate | null;
  readonly isActive: boolean;
}

export interface Company {
  readonly id: CompanyId;
  readonly code: string;
  readonly name: string;
  readonly legalName: string | null;
  readonly timezone: string;
  readonly isActive: boolean;
}

export type OrganizationalUnitType = "DEPARTMENT" | "SHARED_SERVICE";

export interface OrganizationalUnit {
  readonly id: OrganizationalUnitId;
  readonly companyId: CompanyId;
  readonly type: OrganizationalUnitType;
  readonly code: string;
  readonly name: string;
  readonly isActive: boolean;
}

export interface Restaurant {
  readonly id: RestaurantId;
  readonly companyId: CompanyId;
  readonly code: string;
  readonly name: string;
  readonly timezone: string;
  readonly isActive: boolean;
}

export interface Profile {
  readonly id: ProfileId;
  readonly authUserId: string;
  readonly displayName: string;
  readonly email: string;
  readonly isActive: boolean;
}

export type UnitScopeMode = "ASSIGNED" | "COMPANY_WIDE";
export type RestaurantScopeMode =
  "NONE" | "ASSIGNED" | "INHERITED" | "COMPANY_WIDE";

export interface OrganizationalAssignment extends TemporalState {
  readonly id: OrganizationalAssignmentId;
  readonly profileId: ProfileId;
  readonly companyId: CompanyId;
  readonly organizationalUnitId: OrganizationalUnitId | null;
  readonly roleId: string;
  readonly title: string | null;
  readonly unitScopeMode: UnitScopeMode;
  readonly restaurantScopeMode: RestaurantScopeMode;
}

export interface HierarchyRelationship extends TemporalState {
  readonly id: string;
  readonly parentAssignmentId: OrganizationalAssignmentId;
  readonly childAssignmentId: OrganizationalAssignmentId;
  readonly relationshipType: "REPORTS_TO" | "OPERATIONAL_RESPONSIBILITY";
}

export interface RestaurantAssignment extends TemporalState {
  readonly id: string;
  readonly organizationalAssignmentId: OrganizationalAssignmentId;
  readonly restaurantId: RestaurantId;
  readonly responsibilityType: "PRIMARY" | "SECONDARY" | "COVERAGE";
}
