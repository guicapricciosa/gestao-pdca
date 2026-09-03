import { OrganizationValidationError } from "./errors";
import type { OrganizationRepository } from "./repository";
import {
  createAssignmentSchema,
  createCompanySchema,
  createHierarchyRelationshipSchema,
  createOrganizationalUnitSchema,
  createProfileSchema,
  createRestaurantAssignmentSchema,
  createRestaurantSchema,
  type CreateAssignmentInput,
  type CreateCompanyInput,
  type CreateHierarchyRelationshipInput,
  type CreateOrganizationalUnitInput,
  type CreateProfileInput,
  type CreateRestaurantAssignmentInput,
  type CreateRestaurantInput,
} from "../domain/validation";

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  createCompany(input: CreateCompanyInput) {
    return this.repository.createCompany(createCompanySchema.parse(input));
  }

  createOrganizationalUnit(input: CreateOrganizationalUnitInput) {
    return this.repository.createOrganizationalUnit(
      createOrganizationalUnitSchema.parse(input),
    );
  }

  createRestaurant(input: CreateRestaurantInput) {
    return this.repository.createRestaurant(
      createRestaurantSchema.parse(input),
    );
  }

  createProfile(input: CreateProfileInput) {
    return this.repository.createProfile(createProfileSchema.parse(input));
  }

  async createAssignment(input: CreateAssignmentInput) {
    const parsed = createAssignmentSchema.parse(input);
    if (parsed.organizationalUnitId !== null) {
      const unit = await this.repository.getOrganizationalUnit(
        parsed.organizationalUnitId,
      );
      if (unit === null || unit.companyId !== parsed.companyId) {
        throw new OrganizationValidationError(
          "Organizational unit must belong to the assignment company.",
        );
      }
    }
    return this.repository.createAssignment(parsed);
  }

  async createHierarchyRelationship(input: CreateHierarchyRelationshipInput) {
    const parsed = createHierarchyRelationshipSchema.parse(input);
    const [parent, child] = await Promise.all([
      this.repository.getAssignment(parsed.parentAssignmentId),
      this.repository.getAssignment(parsed.childAssignmentId),
    ]);

    if (
      parent === null ||
      child === null ||
      parent.companyId !== child.companyId
    ) {
      throw new OrganizationValidationError(
        "Hierarchy assignments must exist in the same company.",
      );
    }
    if (
      await this.repository.hasHierarchyPath(
        parsed.childAssignmentId,
        parsed.parentAssignmentId,
      )
    ) {
      throw new OrganizationValidationError(
        "Hierarchy relationship would create a cycle.",
      );
    }
    return this.repository.createHierarchyRelationship(parsed);
  }

  async createRestaurantAssignment(input: CreateRestaurantAssignmentInput) {
    const parsed = createRestaurantAssignmentSchema.parse(input);
    const [assignment, restaurant] = await Promise.all([
      this.repository.getAssignment(parsed.organizationalAssignmentId),
      this.repository.getRestaurant(parsed.restaurantId),
    ]);
    if (
      assignment === null ||
      restaurant === null ||
      assignment.companyId !== restaurant.companyId
    ) {
      throw new OrganizationValidationError(
        "Restaurant and assignment must belong to the same company.",
      );
    }
    return this.repository.createRestaurantAssignment(parsed);
  }
}
