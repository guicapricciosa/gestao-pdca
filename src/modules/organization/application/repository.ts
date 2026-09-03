import type {
  Company,
  HierarchyRelationship,
  OrganizationalAssignment,
  OrganizationalUnit,
  Profile,
  Restaurant,
  RestaurantAssignment,
} from "../domain/types";
import type {
  CreateAssignmentInput,
  CreateCompanyInput,
  CreateHierarchyRelationshipInput,
  CreateOrganizationalUnitInput,
  CreateProfileInput,
  CreateRestaurantAssignmentInput,
  CreateRestaurantInput,
} from "../domain/validation";

export interface OrganizationRepository {
  createCompany(input: CreateCompanyInput): Promise<Company>;
  createOrganizationalUnit(
    input: CreateOrganizationalUnitInput,
  ): Promise<OrganizationalUnit>;
  createRestaurant(input: CreateRestaurantInput): Promise<Restaurant>;
  createProfile(input: CreateProfileInput): Promise<Profile>;
  createAssignment(
    input: CreateAssignmentInput,
  ): Promise<OrganizationalAssignment>;
  createHierarchyRelationship(
    input: CreateHierarchyRelationshipInput,
  ): Promise<HierarchyRelationship>;
  createRestaurantAssignment(
    input: CreateRestaurantAssignmentInput,
  ): Promise<RestaurantAssignment>;
  getAssignment(id: string): Promise<OrganizationalAssignment | null>;
  hasHierarchyPath(
    fromAssignmentId: string,
    toAssignmentId: string,
  ): Promise<boolean>;
  getRestaurant(id: string): Promise<Restaurant | null>;
  getOrganizationalUnit(id: string): Promise<OrganizationalUnit | null>;
}
